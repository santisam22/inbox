// New-mail notifications and "Open at login" for Inbox.
//
// The mail engine notices new Inbox mail and prints `ICLOUD_MAIL_NOTIFY {json}`; this file
// turns those into macOS notifications. Clicking one opens that email. The Settings page
// talks to this code through the "notifications" message handler.

import Cocoa
import ServiceManagement
import UserNotifications

extension AppDelegate: UNUserNotificationCenterDelegate {

    func setUpNotifications() {
        UNUserNotificationCenter.current().delegate = self
    }

    /// A notification from the mail engine: {"id", "uid", "title", "subtitle", "body", "sound"}.
    func showMailNotification(_ json: String) {
        guard let data = json.data(using: .utf8),
              let note = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return }
        let center = UNUserNotificationCenter.current()
        center.getNotificationSettings { settings in
            switch settings.authorizationStatus {
            case .authorized, .provisional:
                self.deliver(note)
            case .notDetermined:
                center.requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
                    if granted { self.deliver(note) }
                    self.reportNotificationStatus()
                }
            default:
                break  // turned off in System Settings
            }
        }
    }

    private func deliver(_ note: [String: Any]) {
        let content = UNMutableNotificationContent()
        content.title = note["title"] as? String ?? "New email"
        content.subtitle = note["subtitle"] as? String ?? ""
        content.body = note["body"] as? String ?? ""
        if note["sound"] as? Bool ?? true { content.sound = .default }
        content.threadIdentifier = "inbox"
        if let uid = note["uid"] as? Int { content.userInfo = ["uid": uid] }
        let id = note["id"] as? String ?? UUID().uuidString
        UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: id, content: content, trigger: nil))
    }

    // While you're using Inbox you can already see new mail, so banners are held back
    // (except the test notification from Settings).
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        DispatchQueue.main.async {
            let isTest = notification.request.identifier == "inbox-test"
            let inFront = NSApp.isActive && self.window.isVisible && !self.window.isMiniaturized
            completionHandler(inFront && !isTest ? [] : [.banner, .list, .sound])
        }
    }

    // Clicking a notification opens that email.
    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        let uid = response.notification.request.content.userInfo["uid"] as? Int
        DispatchQueue.main.async {
            NSApp.activate(ignoringOtherApps: true)
            self.showMainWindow()
            if let uid { self.callJS("openMessage", ["INBOX", uid]) }
            completionHandler()
        }
    }

    // MARK: Settings page

    func handleNotificationCommand(_ command: String) {
        switch command {
        case "status":
            reportNotificationStatus()
        case "request":
            UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { _, _ in
                self.reportNotificationStatus()
            }
        case "openSystemSettings":
            if let url = URL(string: "x-apple.systempreferences:com.apple.Notifications-Settings.extension") {
                NSWorkspace.shared.open(url)
            }
        case "test":
            showMailNotification(#"{"id":"inbox-test","title":"Inbox","subtitle":"Notifications are on","body":"New email will appear like this.","sound":true}"#)
        case "loginOn", "loginOff":
            setOpenAtLogin(command == "loginOn")
        default:
            break
        }
    }

    func reportNotificationStatus() {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            let status: String
            switch settings.authorizationStatus {
            case .authorized, .provisional: status = "on"
            case .denied: status = "denied"
            case .notDetermined: status = "notDetermined"
            default: status = "off"
            }
            DispatchQueue.main.async { self.callJS("notificationStatus", [status, self.openAtLoginStatus()]) }
        }
    }

    // MARK: Open at login (macOS 13+)

    func openAtLoginStatus() -> String {
        guard #available(macOS 13.0, *) else { return "unsupported" }
        switch SMAppService.mainApp.status {
        case .enabled: return "on"
        case .requiresApproval: return "approval"
        default: return "off"
        }
    }

    func setOpenAtLogin(_ on: Bool) {
        if #available(macOS 13.0, *) {
            do {
                if on { try SMAppService.mainApp.register() } else { try SMAppService.mainApp.unregister() }
            } catch {
                callJS("loginItemError", [error.localizedDescription])
            }
        }
        reportNotificationStatus()
    }
}
