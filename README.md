# Inbox: a Gmail-style app for iCloud Mail

## Install

1. Open **Inbox.dmg** and drag **Inbox** into **Applications**.
2. Open Inbox and enter your iCloud email address, plus your name if you want it shown on emails you send.
3. Click **Open Apple Account**, create an app-specific password named "Inbox", copy it, and paste it into Inbox. It connects as soon as you paste.

That's all the setup. To switch accounts, use **Inbox → Sign Out…**.

Nothing else needs to be installed. Inbox includes its own copy of Python (Apple silicon and Intel).

## Security

- Inbox connects **directly to iCloud** over encrypted IMAP/SMTP. There's no forwarding and no third-party server.
- **User log:** when someone connects, Inbox sends their email address, the Inbox version and their macOS version to the developer's Supabase project, and checks in once a day after that. The setup screen says so before anyone connects. Signing out removes the entry. Passwords and email contents are never sent. See [supabase/SETUP.md](supabase/SETUP.md).
- The app-specific password is checked against iCloud, then stored in the **macOS Keychain**. Inbox only accepts Apple's `xxxx-xxxx-xxxx-xxxx` format, so your real Apple Account password can never be sent by mistake. Revoke the password at account.apple.com at any time.
- The mail engine runs on `127.0.0.1` only and requires a per-install secret. When the app quits, or even crashes, the engine stops too.
- Email bodies display in a sandbox with scripts disabled. **Remote images are blocked** until you allow them, which stops tracking pixels. Links open in your default browser. `mailto:` links open a new message in Inbox.
- Attachments are saved with a Save dialog and never opened inside the app.

## Build from source

```
./build.sh        # → dist/Inbox.app and dist/Inbox.dmg (Apple silicon + Intel)
```

You need Xcode or the Command Line Tools. The first build downloads a standalone Python 3.13 (python-build-standalone, checked against a pinned SHA-256) into `.cache/`. The layout:

- `server.py` and `static/`: the mail engine and web UI (Python standard library only)
- `macos/main.swift`: the native window (WKWebView), menus, Dock badge, downloads
- `macos/make_icon.swift`: draws the app icon

You can also run the engine without the app: `python3 server.py` opens it in your browser.

## Sharing with other Macs

The app is ad-hoc signed, not notarized. A Mac that downloads it will block the first launch. To allow it, right-click Inbox → **Open**, or go to System Settings → Privacy & Security → **Open Anyway**. Distributing it without that warning requires an Apple Developer account ($99/yr) for signing and notarization.

## Files Inbox keeps

- `~/.icloud-mail/config.json`: email, name and local secret (readable only by you)
- Keychain item "Inbox (iCloud Mail)": the app-specific password

## License

Inbox is released under the [MIT License](LICENSE): you're free to use, copy, modify and share it, as long as the copyright notice stays with it. It comes with no warranty. The bundled Python and its libraries have their own licenses, listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Inbox is an independent project and isn't affiliated with Apple.
