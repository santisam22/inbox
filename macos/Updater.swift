// Self-updating for Inbox.
//
// Checks update.json on the latest GitHub release (at launch and every 6 hours).
// When a newer version exists, the web UI shows a banner. Installing downloads
// Inbox-update.zip, and refuses it unless its Ed25519 signature verifies against
// the public key in Info.plist, it unpacks to an Inbox.app with the same bundle ID,
// a higher version and an intact code signature. Then Inbox swaps itself and relaunches.

import Cocoa
import CryptoKit

struct UpdateInfo: Decodable {
    let version: String
    let url: String
    let signature: String
    let notes: String?
}

struct UpdateError: LocalizedError {
    let errorDescription: String?
    init(_ message: String) { errorDescription = message }
}

final class Updater {
    var onAvailable: ((UpdateInfo) -> Void)?
    var onStatus: ((_ state: String, _ message: String) -> Void)?
    private(set) var available: UpdateInfo?
    private var installing = false
    private var timer: Timer?

    var currentVersion: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "0"
    }

    private var manifestURL: URL? {
        // The defaults override exists for testing; the signature check still applies.
        let s = UserDefaults.standard.string(forKey: "UpdateManifestURL")
            ?? Bundle.main.object(forInfoDictionaryKey: "InboxUpdateManifestURL") as? String
        return s.flatMap(URL.init(string:))
    }

    static func isNewer(_ a: String, than b: String) -> Bool {
        let pa = a.split(separator: ".").map { Int($0) ?? 0 }
        let pb = b.split(separator: ".").map { Int($0) ?? 0 }
        for i in 0..<max(pa.count, pb.count) {
            let x = i < pa.count ? pa[i] : 0, y = i < pb.count ? pb[i] : 0
            if x != y { return x > y }
        }
        return false
    }

    private func report(_ state: String, _ message: String) {
        NSLog("Inbox update [%@]: %@", state, message)
        onStatus?(state, message)
    }

    func start() {
        DispatchQueue.main.asyncAfter(deadline: .now() + 5) { self.check(userInitiated: false) }
        timer = Timer.scheduledTimer(withTimeInterval: 6 * 3600, repeats: true) { [weak self] _ in
            self?.check(userInitiated: false)
        }
    }

    /// `completion(nil)` means "up to date"; errors only matter when the user asked.
    func check(userInitiated: Bool, completion: ((Result<UpdateInfo?, Error>) -> Void)? = nil) {
        guard let url = manifestURL else { return }
        let request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 30)
        URLSession.shared.dataTask(with: request) { data, response, _ in
            DispatchQueue.main.async {
                guard let data, (response as? HTTPURLResponse)?.statusCode == 200,
                      let info = try? JSONDecoder().decode(UpdateInfo.self, from: data)
                else {
                    completion?(.failure(UpdateError("Couldn't check for updates. Check your internet connection and try again.")))
                    return
                }
                if Updater.isNewer(info.version, than: self.currentVersion) {
                    self.available = info
                    self.onAvailable?(info)
                    completion?(.success(info))
                } else {
                    completion?(.success(nil))
                }
            }
        }.resume()
    }

    func install() {
        guard let info = available, !installing, let url = URL(string: info.url) else { return }
        let appURL = Bundle.main.bundleURL
        let folder = appURL.deletingLastPathComponent()
        if appURL.path.contains("/AppTranslocation/") || appURL.path.hasPrefix("/Volumes/") {
            return report("error", "Move Inbox into your Applications folder, open it from there, then update.")
        }
        guard FileManager.default.isWritableFile(atPath: folder.path) else {
            return report("error", "Inbox doesn't have permission to replace itself in \(folder.path). Download the update from the website instead.")
        }

        installing = true
        report("downloading", "Downloading Inbox \(info.version)…")
        URLSession.shared.downloadTask(with: url) { tmp, response, error in
            do {
                guard let tmp, (response as? HTTPURLResponse)?.statusCode == 200 else {
                    throw UpdateError("The download failed. Check your internet connection and try again.")
                }
                let fm = FileManager.default
                let work = fm.temporaryDirectory.appendingPathComponent("inbox-update-\(UUID().uuidString)")
                try fm.createDirectory(at: work, withIntermediateDirectories: true)
                let zip = work.appendingPathComponent("update.zip")
                try fm.moveItem(at: tmp, to: zip)

                try self.verifySignature(of: zip, signature: info.signature)
                try self.run("/usr/bin/ditto", ["-x", "-k", zip.path, work.path])

                let newApp = work.appendingPathComponent("Inbox.app")
                let plist = NSDictionary(contentsOf: newApp.appendingPathComponent("Contents/Info.plist"))
                guard plist?["CFBundleIdentifier"] as? String == Bundle.main.bundleIdentifier,
                      let newVersion = plist?["CFBundleShortVersionString"] as? String,
                      Updater.isNewer(newVersion, than: self.currentVersion)
                else { throw UpdateError("The downloaded update isn't a newer version of Inbox. It was not installed.") }
                try self.run("/usr/bin/codesign", ["--verify", "--deep", "--strict", newApp.path])

                DispatchQueue.main.async {
                    self.report("restarting", "Restarting Inbox…")
                    self.relaunch(installing: newApp, over: appURL)
                }
            } catch {
                DispatchQueue.main.async {
                    self.installing = false
                    self.report("error", error.localizedDescription)
                }
            }
        }.resume()
    }

    private func verifySignature(of file: URL, signature: String) throws {
        guard let keyText = Bundle.main.object(forInfoDictionaryKey: "InboxUpdatePublicKey") as? String,
              let keyData = Data(base64Encoded: keyText),
              let key = try? Curve25519.Signing.PublicKey(rawRepresentation: keyData),
              let sig = Data(base64Encoded: signature)
        else { throw UpdateError("This update isn't signed. It was not installed.") }
        let data = try Data(contentsOf: file, options: .mappedIfSafe)
        guard key.isValidSignature(sig, for: data) else {
            throw UpdateError("This update's signature doesn't match Inbox's. It was not installed.")
        }
    }

    private func run(_ path: String, _ args: [String]) throws {
        let p = Process()
        p.executableURL = URL(fileURLWithPath: path)
        p.arguments = args
        p.standardOutput = FileHandle.nullDevice
        p.standardError = FileHandle.nullDevice
        try p.run()
        p.waitUntilExit()
        guard p.terminationStatus == 0 else {
            throw UpdateError("The update couldn't be verified (\(URL(fileURLWithPath: path).lastPathComponent) failed). It was not installed.")
        }
    }

    /// A tiny shell helper waits for Inbox to quit, swaps in the new app (restoring the
    /// old one if anything fails), then opens it. Paths travel in environment variables
    /// so they never need quoting.
    private func relaunch(installing newApp: URL, over oldApp: URL) {
        let script = """
        while kill -0 "$PARENT" 2>/dev/null; do sleep 0.2; done
        rm -rf "$OLD.previous"
        if mv "$OLD" "$OLD.previous" && mv "$NEW" "$OLD"; then rm -rf "$OLD.previous"
        else rm -rf "$OLD"; mv "$OLD.previous" "$OLD"; fi
        open "$OLD"
        """
        let p = Process()
        p.executableURL = URL(fileURLWithPath: "/bin/sh")
        p.arguments = ["-c", script]
        p.environment = ["PARENT": String(getpid()), "OLD": oldApp.path, "NEW": newApp.path,
                         "PATH": "/usr/bin:/bin:/usr/sbin:/sbin"]
        do {
            try p.run()
            NSApp.terminate(nil)
        } catch {
            installing = false
            report("error", "Couldn't restart Inbox: \(error.localizedDescription)")
        }
    }
}
