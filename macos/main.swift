// Inbox.app — a native window around the local iCloud Mail server (server.py).
//
// Starts the bundled Python server on 127.0.0.1, shows it in a WKWebView, and
// adds the Mac niceties: Dock badge, ⌘N, Save dialogs for attachments, links
// opening in the default browser, and mailto: links opening a new message.

import Cocoa
import WebKit

let preferredPort = 48025

final class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate,
    WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler, WKDownloadDelegate
{
    var window: NSWindow!
    var webView: WKWebView!
    var server: Process?
    var serverPort: Int?
    var stdoutBuffer = ""
    var stderrTail = ""
    var quitting = false

    // MARK: lifecycle

    func applicationDidFinishLaunching(_ notification: Notification) {
        buildMenu()
        buildWindow()
        startServer()
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { false }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        window.makeKeyAndOrderFront(nil)
        return true
    }

    func applicationWillTerminate(_ notification: Notification) {
        quitting = true
        server?.terminate()
    }

    // MARK: window

    func buildWindow() {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        config.userContentController.add(self, name: "badge")

        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsMagnification = true

        window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 1240, height: 820),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered, defer: false)
        window.title = "Inbox"
        window.minSize = NSSize(width: 720, height: 480)
        window.contentView = webView
        window.isReleasedWhenClosed = false
        window.delegate = self
        window.center()
        window.setFrameAutosaveName("InboxMainWindow")
        window.makeKeyAndOrderFront(nil)
        showStatus("Starting…", detail: nil)
    }

    func showStatus(_ title: String, detail: String?, retry: Bool = false) {
        let esc = { (s: String) in
            s.replacingOccurrences(of: "&", with: "&amp;").replacingOccurrences(of: "<", with: "&lt;")
        }
        let html = """
        <!doctype html><meta charset="utf-8"><style>
        :root{color-scheme:light dark}
        body{font:14px -apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:Canvas;color:CanvasText}
        div{max-width:520px;text-align:center;padding:24px}h1{font-weight:500;font-size:20px}
        pre{text-align:left;white-space:pre-wrap;font-size:11px;opacity:.7;max-height:200px;overflow:auto}
        a{display:inline-block;margin-top:12px;padding:8px 18px;border-radius:18px;background:#0b57d0;color:#fff;text-decoration:none}
        </style><div><h1>\(esc(title))</h1>\(detail.map { "<pre>\(esc($0))</pre>" } ?? "")\(retry ? "<a href=\"inbox-app://restart\">Try again</a>" : "")</div>
        """
        webView.loadHTMLString(html, baseURL: nil)
    }

    // MARK: server process

    /// The Python bundled in Contents/Resources/python/<arch>, if present.
    func bundledPython() -> String? {
        #if arch(arm64)
        let arch = "arm64"
        #else
        let arch = "x86_64"
        #endif
        guard let path = Bundle.main.resourceURL?.appendingPathComponent("python/\(arch)/bin/python3").path,
              FileManager.default.isExecutableFile(atPath: path) else { return nil }
        return path
    }

    /// Fallback for development builds without a bundled Python.
    func findSystemPython() -> String? {
        let fm = FileManager.default
        let candidates = [
            "/opt/homebrew/bin/python3",
            "/usr/local/bin/python3",
            "/Library/Frameworks/Python.framework/Versions/Current/bin/python3",
        ]
        for path in candidates where fm.isExecutableFile(atPath: path) && pythonWorks(path) {
            return path
        }
        // /usr/bin/python3 is only a real Python once Apple's developer tools are installed;
        // otherwise running it pops up an installer, which we'd rather offer explicitly.
        if run("/usr/bin/xcode-select", ["-p"]) == 0 && pythonWorks("/usr/bin/python3") {
            return "/usr/bin/python3"
        }
        return nil
    }

    func pythonWorks(_ path: String) -> Bool {
        run(path, ["-c", "import sys; sys.exit(0 if sys.version_info >= (3, 9) else 1)"]) == 0
    }

    @discardableResult
    func run(_ path: String, _ args: [String]) -> Int32 {
        let p = Process()
        p.executableURL = URL(fileURLWithPath: path)
        p.arguments = args
        p.standardOutput = FileHandle.nullDevice
        p.standardError = FileHandle.nullDevice
        do { try p.run() } catch { return -1 }
        p.waitUntilExit()
        return p.terminationStatus
    }

    func offerDeveloperTools() {
        let alert = NSAlert()
        alert.messageText = "Inbox needs Python"
        alert.informativeText = "It comes with Apple's free Command Line Tools. Click Install, follow the prompts (a few minutes), then open Inbox again."
        alert.addButton(withTitle: "Install")
        alert.addButton(withTitle: "Quit")
        if alert.runModal() == .alertFirstButtonReturn {
            run("/usr/bin/xcode-select", ["--install"])
        }
        NSApp.terminate(nil)
    }

    func startServer() {
        let bundled = bundledPython()
        guard let python = bundled ?? findSystemPython() else { return offerDeveloperTools() }
        guard let script = Bundle.main.resourceURL?.appendingPathComponent("server/server.py").path,
              FileManager.default.fileExists(atPath: script)
        else { return showStatus("Inbox is damaged", detail: "server.py is missing from the app bundle. Reinstall Inbox.") }

        stdoutBuffer = ""
        stderrTail = ""
        serverPort = nil
        showStatus("Starting…", detail: nil)

        let p = Process()
        p.executableURL = URL(fileURLWithPath: python)
        // -B: never write .pyc files into the (signed) app bundle.
        // -I: isolated mode for the bundled Python, so the user's PYTHON* settings can't interfere.
        p.arguments = (bundled != nil ? ["-I"] : []) + ["-B", "-u", script, "--app", "--port", String(preferredPort),
                       "--parent-pid", String(getpid())]
        let out = Pipe(), err = Pipe()
        p.standardOutput = out
        p.standardError = err

        out.fileHandleForReading.readabilityHandler = { [weak self] h in
            let data = h.availableData
            guard !data.isEmpty, let text = String(data: data, encoding: .utf8) else { return }
            DispatchQueue.main.async { self?.handleStdout(text) }
        }
        err.fileHandleForReading.readabilityHandler = { [weak self] h in
            let data = h.availableData
            guard !data.isEmpty, let text = String(data: data, encoding: .utf8) else { return }
            DispatchQueue.main.async {
                guard let self else { return }
                self.stderrTail = String((self.stderrTail + text).suffix(4000))
            }
        }
        p.terminationHandler = { [weak self] proc in
            out.fileHandleForReading.readabilityHandler = nil
            err.fileHandleForReading.readabilityHandler = nil
            DispatchQueue.main.async {
                guard let self, !self.quitting else { return }
                self.server = nil
                self.showStatus("Inbox stopped unexpectedly", detail: self.stderrTail.isEmpty ? nil : self.stderrTail, retry: true)
            }
        }
        do {
            try p.run()
            server = p
        } catch {
            showStatus("Couldn't start Inbox", detail: error.localizedDescription, retry: true)
        }
    }

    func handleStdout(_ text: String) {
        stdoutBuffer += text
        while let nl = stdoutBuffer.firstIndex(of: "\n") {
            let line = String(stdoutBuffer[..<nl])
            stdoutBuffer.removeSubrange(...nl)
            let prefix = "ICLOUD_MAIL_URL "
            if line.hasPrefix(prefix), let url = URL(string: String(line.dropFirst(prefix.count))) {
                serverPort = url.port
                webView.load(URLRequest(url: url))
            }
        }
    }

    func restartServer() {
        server?.terminate()
        server = nil
        startServer()
    }

    // MARK: menu

    func buildMenu() {
        let main = NSMenu()

        func submenu(_ title: String, _ items: [NSMenuItem]) -> NSMenu {
            let item = NSMenuItem(title: title, action: nil, keyEquivalent: "")
            let menu = NSMenu(title: title)
            items.forEach(menu.addItem)
            item.submenu = menu
            main.addItem(item)
            return menu
        }
        func item(_ title: String, _ action: Selector?, _ key: String = "", _ mods: NSEvent.ModifierFlags = [.command]) -> NSMenuItem {
            let i = NSMenuItem(title: title, action: action, keyEquivalent: key)
            i.keyEquivalentModifierMask = mods
            return i
        }

        _ = submenu("Inbox", [
            item("About Inbox", #selector(NSApplication.orderFrontStandardAboutPanel(_:))),
            .separator(),
            item("Sign Out…", #selector(signOut)),
            .separator(),
            item("Hide Inbox", #selector(NSApplication.hide(_:)), "h"),
            item("Hide Others", #selector(NSApplication.hideOtherApplications(_:)), "h", [.command, .option]),
            item("Show All", #selector(NSApplication.unhideAllApplications(_:))),
            .separator(),
            item("Quit Inbox", #selector(NSApplication.terminate(_:)), "q"),
        ])
        _ = submenu("File", [
            item("New Message", #selector(newMessage), "n"),
            .separator(),
            item("Close Window", #selector(NSWindow.performClose(_:)), "w"),
        ])
        _ = submenu("Edit", [
            item("Undo", Selector(("undo:")), "z"),
            item("Redo", Selector(("redo:")), "z", [.command, .shift]),
            .separator(),
            item("Cut", #selector(NSText.cut(_:)), "x"),
            item("Copy", #selector(NSText.copy(_:)), "c"),
            item("Paste", #selector(NSText.paste(_:)), "v"),
            item("Select All", #selector(NSText.selectAll(_:)), "a"),
        ])
        _ = submenu("View", [
            item("Reload", #selector(reload), "r"),
            .separator(),
            item("Actual Size", #selector(zoomReset), "0"),
            item("Zoom In", #selector(zoomIn), "+"),
            item("Zoom Out", #selector(zoomOut), "-"),
        ])
        let windowMenu = submenu("Window", [
            item("Minimize", #selector(NSWindow.performMiniaturize(_:)), "m"),
            item("Zoom", #selector(NSWindow.performZoom(_:))),
            .separator(),
            item("Inbox", #selector(showMainWindow), "1"),
        ])
        NSApp.mainMenu = main
        NSApp.windowsMenu = windowMenu
    }

    @objc func showMainWindow() { window.makeKeyAndOrderFront(nil) }
    @objc func reload() { if serverPort == nil { restartServer() } else { webView.reload() } }
    @objc func zoomReset() { webView.pageZoom = 1 }
    @objc func zoomIn() { webView.pageZoom = min(webView.pageZoom + 0.1, 2) }
    @objc func zoomOut() { webView.pageZoom = max(webView.pageZoom - 0.1, 0.6) }

    @objc func newMessage() {
        showMainWindow()
        webView.evaluateJavaScript("window.inboxApp && window.inboxApp.compose()")
    }

    @objc func signOut() {
        showMainWindow()
        webView.evaluateJavaScript("document.querySelector('.account')?.click()")
    }

    func compose(to address: String) {
        guard let data = try? JSONSerialization.data(withJSONObject: ["to": address]),
              let json = String(data: data, encoding: .utf8) else { return }
        showMainWindow()
        webView.evaluateJavaScript("window.inboxApp && window.inboxApp.compose(\(json))")
    }

    // MARK: JS → native

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == "badge", let count = message.body as? String {
            NSApp.dockTile.badgeLabel = (count == "0" || count.isEmpty) ? nil : count
        }
    }

    // MARK: navigation

    func isAppURL(_ url: URL) -> Bool {
        url.scheme == "http" && url.host == "127.0.0.1" && url.port != nil && url.port == serverPort
    }

    func openExternally(_ url: URL) {
        switch url.scheme?.lowercased() {
        case "http", "https":
            NSWorkspace.shared.open(url)
        case "mailto":
            let addr = url.absoluteString.dropFirst("mailto:".count).split(separator: "?").first.map(String.init) ?? ""
            compose(to: addr.removingPercentEncoding ?? addr)
        default:
            break  // ignore other schemes from untrusted email content
        }
    }

    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = action.request.url else { return decisionHandler(.allow) }
        if url.scheme == "inbox-app" {
            if url.host == "restart" { restartServer() }
            return decisionHandler(.cancel)
        }
        if action.shouldPerformDownload { return decisionHandler(.download) }
        if ["about", "blob", "data"].contains(url.scheme ?? "") || isAppURL(url) {
            return decisionHandler(.allow)
        }
        if action.navigationType == .linkActivated || action.targetFrame?.isMainFrame == true {
            openExternally(url)
        }
        decisionHandler(.cancel)
    }

    func webView(_ webView: WKWebView, decidePolicyFor response: WKNavigationResponse,
                 decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
        decisionHandler(response.canShowMIMEType ? .allow : .download)
    }

    // Links with target=_blank (all links inside emails).
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                 for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = action.request.url { openExternally(url) }
        return nil
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        webView.reload()
    }

    // MARK: downloads (attachments)

    func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) {
        download.delegate = self
    }

    func webView(_ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) {
        download.delegate = self
    }

    func download(_ download: WKDownload, decideDestinationUsing response: URLResponse,
                  suggestedFilename: String, completionHandler: @escaping (URL?) -> Void) {
        let panel = NSSavePanel()
        panel.nameFieldStringValue = suggestedFilename
        panel.directoryURL = FileManager.default.urls(for: .downloadsDirectory, in: .userDomainMask).first
        panel.beginSheetModal(for: window) { result in
            guard result == .OK, let url = panel.url else { return completionHandler(nil) }
            try? FileManager.default.removeItem(at: url)  // the panel already confirmed replacing
            completionHandler(url)
        }
    }

    func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) {
        let alert = NSAlert()
        alert.messageText = "Download failed"
        alert.informativeText = error.localizedDescription
        alert.beginSheetModal(for: window)
    }

    // MARK: JS dialogs & file picker

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let alert = NSAlert()
        alert.messageText = message
        alert.beginSheetModal(for: window) { _ in completionHandler() }
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let alert = NSAlert()
        alert.messageText = message
        alert.addButton(withTitle: "OK")
        alert.addButton(withTitle: "Cancel")
        alert.beginSheetModal(for: window) { completionHandler($0 == .alertFirstButtonReturn) }
    }

    func webView(_ webView: WKWebView, runOpenPanelWith parameters: WKOpenPanelParameters,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping ([URL]?) -> Void) {
        let panel = NSOpenPanel()
        panel.allowsMultipleSelection = parameters.allowsMultipleSelection
        panel.canChooseDirectories = false
        panel.beginSheetModal(for: window) { completionHandler($0 == .OK ? panel.urls : nil) }
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.activate(ignoringOtherApps: true)
app.run()
