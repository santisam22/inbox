#!/bin/zsh
# Builds dist/Inbox.app and dist/Inbox.dmg with Python bundled inside, plus the signed
# self-update files (dist/Inbox-update.zip and dist/update.json).  Usage: ./build.sh
set -euo pipefail
cd "$(dirname "$0")"
ROOT=$PWD
# Build in a temp folder: folders synced by iCloud Drive (like Documents) add file
# metadata that code signing rejects. Only the finished results are copied to dist/.
BUILD=$(mktemp -d)
trap 'rm -rf "$BUILD"' EXIT
DIST=$ROOT/dist
CACHE=$ROOT/.cache
APP=$BUILD/Inbox.app
RES=$APP/Contents/Resources
REPO=santisam22/inbox
VERSION=$(/usr/libexec/PlistBuddy -c "Print CFBundleShortVersionString" macos/Info.plist)

# Standalone CPython (https://github.com/astral-sh/python-build-standalone), pinned by checksum.
PY_RELEASE=20260929
PY_VERSION=3.13.15
typeset -A PY_SHA256=(
  aarch64 d66c67f16148c7454b1509c32747175f7669c8b8e105b97b92a0000d66af6e6e
  x86_64  73b503a2d3f47f0601265d7936744b77dc4ee75d2a3e88a470594a014dcf6822
)

rm -rf "$DIST"
mkdir -p "$DIST" "$CACHE" "$APP/Contents/MacOS" "$RES/server/static"

echo "→ Compiling (Apple silicon + Intel)…"
for arch in arm64 x86_64; do
  swiftc -O -target $arch-apple-macos12.0 -framework Cocoa -framework WebKit \
    macos/main.swift macos/Updater.swift macos/Notifications.swift -o "$BUILD/Inbox-$arch"
done
lipo -create "$BUILD/Inbox-arm64" "$BUILD/Inbox-x86_64" -output "$APP/Contents/MacOS/Inbox"

echo "→ Bundling Python $PY_VERSION (Universal)…"
# Both architectures are downloaded, then merged into ONE Universal Python: every binary
# holds Apple silicon and Intel code. macOS flags apps containing Intel-only parts as
# "Intel-based" (unsupported from macOS 28), even if those parts never run on your Mac.
for pyarch in aarch64 x86_64; do
  file="cpython-$PY_VERSION+$PY_RELEASE-$pyarch-apple-darwin-install_only_stripped.tar.gz"
  if [[ ! -f "$CACHE/$file" ]]; then
    curl -sSfL -o "$CACHE/$file.part" \
      "https://github.com/astral-sh/python-build-standalone/releases/download/$PY_RELEASE/${file//+/%2B}"
    mv "$CACHE/$file.part" "$CACHE/$file"
  fi
  echo "${PY_SHA256[$pyarch]}  $CACHE/$file" | shasum -a 256 -c --quiet - \
    || { echo "Checksum mismatch for $file"; rm -f "$CACHE/$file"; exit 1; }

  dest=$BUILD/python-$pyarch
  mkdir -p "$dest"
  tar -xzf "$CACHE/$file" -C "$dest" --strip-components 1

  # Keep only what the mail engine needs: drop Tk, pip, IDLE, headers, docs and dev tools.
  ( cd "$dest"
    rm -rf include share lib/pkgconfig lib/itcl* lib/tcl* lib/thread* lib/libtcl*
    find bin -mindepth 1 ! -name "python3.13" ! -name "python3" -delete
    cd lib/python3.13
    rm -rf tkinter idlelib ensurepip pydoc_data site-packages/* turtledemo test lib2to3 \
           turtle.py lib-dynload/_tkinter*.so )
done

# Merge: start from the Apple silicon tree, then fuse each binary with its Intel twin.
ditto "$BUILD/python-aarch64" "$RES/python"
( cd "$BUILD/python-aarch64" && find . -type f -print0 | xargs -0 file | grep "Mach-O" | cut -d: -f1 ) | while read -r bin; do
  [[ -f "$BUILD/python-x86_64/$bin" ]] || { echo "  missing Intel twin for $bin"; exit 1; }
  lipo -create "$BUILD/python-aarch64/$bin" "$BUILD/python-x86_64/$bin" -output "$RES/python/$bin"
done
( cd "$BUILD/python-x86_64" && find . -type f -print0 | xargs -0 file | grep "Mach-O" | cut -d: -f1 ) | while read -r bin; do
  [[ -f "$BUILD/python-aarch64/$bin" ]] || { echo "  Intel-only binary $bin has no Apple silicon twin"; exit 1; }
done
NOT_UNIVERSAL=$(find "$RES/python" -type f -print0 | xargs -0 file | grep "Mach-O" | grep -v "universal binary" | grep -v "(for architecture" || true)
[[ -z "$NOT_UNIVERSAL" ]] || { echo "Not Universal:"; echo "$NOT_UNIVERSAL"; exit 1; }

echo "→ Precompiling the Python modules Inbox uses…"
# Without bytecode, Python recompiles these on every launch (~0.3 s). Hash-based .pyc
# files stay valid however the app is copied.
PY=$RES/python/bin/python3
MODULES=$("$PY" -I -B -c '
import os, sys
sys.path.insert(0, sys.argv[1]); import server
lib = os.path.dirname(os.__file__)
print("\n".join(sorted({os.path.relpath(m.__file__, lib) for m in list(sys.modules.values())
    if (getattr(m, "__file__", None) or "").startswith(lib) and m.__file__.endswith(".py")})))' "$ROOT")
print -r -- "$MODULES" | "$PY" -I -B -c '
import py_compile, sys
for rel in sys.stdin.read().split():
    py_compile.compile(f"{sys.argv[1]}/{rel}", doraise=True,
                       invalidation_mode=py_compile.PycInvalidationMode.UNCHECKED_HASH)' "$RES/python/lib/python3.13"
echo "  $(print -r -- "$MODULES" | wc -l | tr -d ' ') modules"

echo "→ Drawing icon…"
swift macos/make_icon.swift "$BUILD/icon.png"
ICONSET=$BUILD/AppIcon.iconset
mkdir -p "$ICONSET"
for s in 16 32 128 256 512; do
  sips -z $s $s "$BUILD/icon.png" --out "$ICONSET/icon_${s}x${s}.png" >/dev/null
  sips -z $((s*2)) $((s*2)) "$BUILD/icon.png" --out "$ICONSET/icon_${s}x${s}@2x.png" >/dev/null
done
iconutil -c icns "$ICONSET" -o "$RES/AppIcon.icns"

echo "→ Assembling and signing app…"
cp macos/Info.plist "$APP/Contents/Info.plist"
# The "what's new" line, shown in the "installed successfully" banner after an update.
plutil -insert InboxWhatsNew -string "$(head -1 WHATS_NEW.txt 2>/dev/null)" "$APP/Contents/Info.plist"
cp server.py "$RES/server/"
[[ -f app_config.json ]] && cp app_config.json "$RES/server/"
cp static/index.html static/app.js static/app.css "$RES/server/static/"
# Sign every bundled binary first (inside-out), then the app itself.
find "$RES/python" -type f \( -name "*.so" -o -name "*.dylib" -o -perm -u+x \) -print0 \
  | xargs -0 file | grep "Mach-O" | grep -v "(for architecture" | cut -d: -f1 \
  | while read -r bin; do codesign --force --sign - "$bin" 2>/dev/null; done
xattr -cr "$APP"
codesign --force --sign - "$APP"
codesign --verify --deep --strict "$APP"

echo "→ Creating disk image…"
STAGE=$BUILD/dmg
mkdir -p "$STAGE"
cp -R "$APP" "$STAGE/"
ln -s /Applications "$STAGE/Applications"
hdiutil create -volname "Inbox" -srcfolder "$STAGE" -ov -format UDZO -quiet "$DIST/Inbox.dmg"
ditto "$APP" "$DIST/Inbox.app"

echo "→ Signing update package…"
ditto -c -k --keepParent "$APP" "$DIST/Inbox-update.zip"
if SIG=$(swift macos/sign_tool.swift sign "$DIST/Inbox-update.zip"); then
  NOTES=$(head -1 WHATS_NEW.txt 2>/dev/null || true)
  python3 - "$VERSION" "https://github.com/$REPO/releases/download/v$VERSION/Inbox-update.zip" "$SIG" "$NOTES" > "$DIST/update.json" <<'PY'
import json, sys
version, url, signature, notes = sys.argv[1:]
print(json.dumps({"version": version, "url": url, "signature": signature, "notes": notes}, indent=2))
PY
else
  echo "  (no signing key in this Keychain: skipped update.json; existing installs won't see this build)"
  rm -f "$DIST/Inbox-update.zip"
fi

echo "✓ Done: Inbox $VERSION → dist/Inbox.dmg ($(du -h "$DIST/Inbox.dmg" | cut -f1))"
