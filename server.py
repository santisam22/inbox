#!/usr/bin/env python3
"""iCloud Mail — a local, Gmail-style web client for iCloud Mail.

Talks to iCloud directly over IMAP/SMTP (TLS). Your app-specific password lives
in the macOS Keychain; the web UI is served only on 127.0.0.1 and requires a
secret cookie. Standard library only — no dependencies.

    python3 server.py             # run and open the browser (first run shows setup)

The Inbox.app wrapper runs this with --app, which prints the URL instead of
opening a browser and exits when the app does.
"""
import argparse
import base64
import email
import html
import imaplib
import json
import os
import plistlib
import pwd
import platform
import quopri
import re
import secrets
import shlex
import smtplib
import ssl
import subprocess
import sys
import threading
import time
import urllib.request
import uuid
import webbrowser
from collections import OrderedDict
from datetime import datetime
from email import policy
from email.message import EmailMessage
from email.utils import formataddr, formatdate, getaddresses, make_msgid, parsedate_to_datetime
from http import cookies
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, unquote, urlparse

IMAP_HOST, IMAP_PORT = "imap.mail.me.com", 993
SMTP_HOST, SMTP_PORT = "smtp.mail.me.com", 587
KEYCHAIN_SERVICE = "icloud-mail-local"
CONFIG_DIR = os.path.expanduser("~/.icloud-mail")
CONFIG_FILE = os.path.join(CONFIG_DIR, "config.json")
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
STATIC_FILES = {"app.js": "text/javascript", "app.css": "text/css"}
APP_CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app_config.json")
APP_VERSION = "dev"  # replaced by --app-version when run inside Inbox.app
PAGE_SIZE = 50
MAX_BODY = 40 * 1024 * 1024  # compose payload limit (attachments are base64 JSON)
COOKIE_NAME = "icm_session"


class MailError(Exception):
    pass


# ---------------------------------------------------------------- config & keychain

def load_config():
    try:
        with open(CONFIG_FILE) as f:
            return json.load(f)
    except FileNotFoundError:
        return {}


def save_config(cfg):
    os.makedirs(CONFIG_DIR, mode=0o700, exist_ok=True)
    fd = os.open(CONFIG_FILE, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as f:
        json.dump(cfg, f, indent=2)


# ---------------------------------------------------------------- appearance settings

SETTINGS_FILE = os.path.join(CONFIG_DIR, "settings.json")
BACKGROUND_FILE = os.path.join(CONFIG_DIR, "background")
CACHE_FILE = os.path.join(CONFIG_DIR, "cache.json")
INDEX_FILE = os.path.join(CONFIG_DIR, "index.json")

# Inbox tabs. A message goes in the FIRST enabled category whose keywords appear in its
# sender or subject (whole words). "people" also takes anyone who isn't an automated sender.
DEFAULT_CATEGORIES = [
    {"id": "transactions", "name": "Transactions", "enabled": True, "keywords": [
        "receipt", "invoice", "order", "payment", "paid", "statement", "bank", "banking", "transaction",
        "purchase", "refund", "billing", "bill", "paypal", "venmo", "zelle", "cash app", "deposit",
        "withdrawal", "transfer", "chase", "wells fargo", "bank of america", "capital one", "amex",
        "credit card", "debit", "subscription", "renewal", "shipped", "delivered", "your order"]},
    {"id": "school", "name": "School", "enabled": True, "keywords": [
        "university", "college", "school", ".edu", "course", "class", "canvas", "blackboard", "professor",
        "assignment", "homework", "semester", "tuition", "registrar", "campus", "exam", "quiz", "syllabus",
        "financial aid", "student", "lecture", "grades", "admissions"]},
    {"id": "work", "name": "Work", "enabled": True, "keywords": [
        "meeting", "project", "deadline", "standup", "agenda", "interview", "offer letter", "client",
        "proposal", "slack", "jira", "asana", "zoom", "calendar", "invitation", "schedule", "shift",
        "payroll", "onboarding", "timesheet", "linkedin", "recruiter"]},
    {"id": "person", "name": "Personal", "enabled": True, "people": True, "keywords": [], "senders": []},
    {"id": "ads", "name": "Ads", "enabled": True, "keywords": [
        "sale", "% off", "discount", "deal", "deals", "promo", "promotion", "coupon", "sponsored",
        "shop now", "limited time", "free shipping", "clearance", "exclusive", "new arrivals",
        "black friday", "cyber monday", "last chance", "ends tonight", "newsletter", "offer", "save big"]},
]
TOOL_IDS = ["refresh", "markAllRead", "emptyFolder", "archive", "spam", "delete",
            "markRead", "markUnread", "star", "unstar", "move"]
DEFAULT_TOOLBAR = [{"id": t, "on": t != "unstar"} for t in TOOL_IDS]

DEFAULT_SETTINGS = {
    "theme": "system",          # system | light | dark
    "accent": "#0b57d0",
    "background": "none",       # none | aurora | sunset | ocean | forest | sand | graphite | image
    "backgroundDim": 35,        # 0–85: how much the background is faded behind text
    "density": "comfortable",   # comfortable | compact
    "textSize": "medium",       # small | medium | large
    "snippets": True,
    "remoteImages": False,
    "categories": DEFAULT_CATEGORIES,
    "unsortedSenders": [],      # senders that stay in All mail only, whatever their keywords
    "photo": "icloud",          # icloud | custom | none: the avatar shown for your account
    "toolbar": DEFAULT_TOOLBAR,
}
SETTING_CHOICES = {
    "photo": {"icloud", "custom", "none"},
    "theme": {"system", "light", "dark"},
    "background": {"none", "aurora", "sunset", "ocean", "forest", "sand", "graphite", "image"},
    "density": {"comfortable", "compact"},
    "textSize": {"small", "medium", "large"},
}
IMAGE_TYPES = {  # magic bytes → MIME type; SVG is deliberately not accepted
    b"\x89PNG\r\n\x1a\n": "image/png", b"\xff\xd8\xff": "image/jpeg",
    b"GIF87a": "image/gif", b"GIF89a": "image/gif",
}


def _write_private(path, data):
    os.makedirs(CONFIG_DIR, mode=0o700, exist_ok=True)
    tmp = f"{path}.{os.getpid()}.tmp"
    fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "wb") as f:
        f.write(data)
    os.replace(tmp, path)


def load_settings():
    try:
        with open(SETTINGS_FILE) as f:
            saved = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        saved = {}
    settings = {**DEFAULT_SETTINGS, **{k: v for k, v in saved.items() if k in DEFAULT_SETTINGS}}
    known = {t["id"] for t in settings["toolbar"]}
    settings["toolbar"] = settings["toolbar"] + [t for t in DEFAULT_TOOLBAR if t["id"] not in known]
    return settings


def clean_categories(value):
    if not isinstance(value, list) or len(value) > 20:
        raise MailError("Invalid categories")
    out, seen = [], set()
    for c in value:
        cid = str(c.get("id", ""))
        if not re.fullmatch(r"[a-z0-9-]{1,40}", cid) or cid in seen:
            raise MailError("Invalid category")
        seen.add(cid)
        name = re.sub(r"\s+", " ", str(c.get("name", ""))).strip()[:30] or "Untitled"
        words = []
        for w in c.get("keywords", [])[:150]:
            w = re.sub(r"\s+", " ", str(w)).strip().lower()[:40]
            if w and w not in words and not re.search(r"[\x00-\x1f]", w):
                words.append(w)
        item = {"id": cid, "name": name, "enabled": bool(c.get("enabled", True)), "keywords": words,
                "senders": clean_senders(c.get("senders", []))}
        if cid == "person":
            item["people"] = True
        out.append(item)
    return out


def normalize_sender(value):
    """'Name <a@b.com>' / 'a@b.com' -> 'a@b.com'; 'b.com' / '@b.com' -> '@b.com'; else None."""
    v = str(value).strip().lower()
    if m := re.search(r"<([^<>]+)>", v):
        v = m.group(1)
    v = re.sub(r"\s+", "", v)
    if re.fullmatch(r"[^@\s<>\"']+@[a-z0-9.-]+\.[a-z]{2,}", v):
        return v
    v = v.lstrip("@")
    if re.fullmatch(r"(?:[a-z0-9-]+\.)+[a-z]{2,}", v):
        return "@" + v
    return None


def clean_senders(value):
    if not isinstance(value, list) or len(value) > 500:
        raise MailError("Invalid sender list")
    out = []
    for raw in value:
        sender = normalize_sender(raw)
        if not sender:
            raise MailError(f"“{str(raw)[:60]}” isn't an email address or domain")
        if sender not in out:
            out.append(sender)
    return out


def clean_toolbar(value):
    if not isinstance(value, list):
        raise MailError("Invalid toolbar")
    out, seen = [], set()
    for t in value:
        tid = t.get("id")
        if tid in TOOL_IDS and tid not in seen:
            seen.add(tid)
            out.append({"id": tid, "on": bool(t.get("on"))})
    return out + [t for t in DEFAULT_TOOLBAR if t["id"] not in seen]


_settings_lock = threading.Lock()


def save_settings(changes):
    with _settings_lock:  # requests run on parallel threads; don't lose a concurrent change
        return _save_settings(changes)


def _save_settings(changes):
    current = load_settings()
    for key, value in changes.items():
        if key not in DEFAULT_SETTINGS:
            continue
        if key in SETTING_CHOICES and value not in SETTING_CHOICES[key]:
            raise MailError(f"Invalid value for {key}")
        if key == "accent" and not (isinstance(value, str) and re.fullmatch(r"#[0-9a-fA-F]{6}", value)):
            raise MailError("Invalid accent color")
        if key == "backgroundDim":
            value = max(0, min(85, int(value)))
        if key in ("snippets", "remoteImages"):
            value = bool(value)
        if key == "unsortedSenders":
            value = clean_senders(value)
        if key == "categories":
            value = DEFAULT_CATEGORIES if value == "default" else clean_categories(value)
        if key == "toolbar":
            value = DEFAULT_TOOLBAR if value == "default" else clean_toolbar(value)
        if key == "background" and value == "image" and not os.path.exists(BACKGROUND_FILE):
            raise MailError("Choose an image first")
        current[key] = value
    _write_private(SETTINGS_FILE, json.dumps(current, indent=2).encode())
    return current


def image_type(data):
    for magic, mime in IMAGE_TYPES.items():
        if data.startswith(magic):
            return mime
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


# ---------------------------------------------------------------- profile photo

PHOTO_ICLOUD = os.path.join(CONFIG_DIR, "photo-icloud.jpg")
PHOTO_CUSTOM = os.path.join(CONFIG_DIR, "photo-custom")


def mac_icloud_addresses():
    """Addresses of the Apple Account this Mac is signed in to (used only for comparison)."""
    out = set()
    try:
        with open(os.path.expanduser("~/Library/Preferences/MobileMeAccounts.plist"), "rb") as f:
            accounts = plistlib.load(f).get("Accounts", [])
        for acct in accounts:
            if "@" in acct.get("AccountID", ""):
                out.add(acct["AccountID"].lower())
            for svc in acct.get("Services", []):
                if svc.get("Name") == "MAIL_AND_NOTES" and svc.get("EmailAddress"):
                    out.add(svc["EmailAddress"].lower())
    except Exception:
        pass
    return out


def sync_icloud_photo(email_addr):
    """Copy this Mac's account picture, which on a Mac signed in to iCloud is the Apple
    Account profile photo, as a small JPEG. Only when the Mac's Apple Account is the same
    account Inbox is signed in to, so a shared Mac never shows someone else's photo.
    Runs at every launch, so a new iCloud photo shows up on the next start."""
    try:
        if not email_addr or email_addr.lower() not in mac_icloud_addresses():
            raise FileNotFoundError
        r = subprocess.run(["dscl", ".", "-read", f"/Users/{pwd.getpwuid(os.getuid()).pw_name}", "JPEGPhoto"],
                           capture_output=True, text=True, timeout=10)
        hex_data = "".join(r.stdout.split("\n", 1)[1].split()) if r.returncode == 0 and "\n" in r.stdout else ""
        data = bytes.fromhex(hex_data) if hex_data else b""
        if not image_type(data):
            raise FileNotFoundError  # no custom picture set (only a stock one), so keep the initial
        os.makedirs(CONFIG_DIR, mode=0o700, exist_ok=True)
        raw = f"{PHOTO_ICLOUD}.{os.getpid()}.src"
        _write_private(raw, data)
        out = f"{PHOTO_ICLOUD}.{os.getpid()}.tmp"
        subprocess.run(["sips", "-s", "format", "jpeg", "-Z", "256", raw, "--out", out],
                       capture_output=True, timeout=30, check=True)
        os.chmod(out, 0o600)
        os.replace(out, PHOTO_ICLOUD)
        os.remove(raw)
        return True
    except Exception:
        for path in (PHOTO_ICLOUD, f"{PHOTO_ICLOUD}.{os.getpid()}.src", f"{PHOTO_ICLOUD}.{os.getpid()}.tmp"):
            try:
                os.remove(path)
            except FileNotFoundError:
                pass
        return False


def photo_file(settings=None):
    """The image to show for the account, following the user's choice."""
    choice = (settings or load_settings())["photo"]
    if choice == "custom" and os.path.exists(PHOTO_CUSTOM):
        return PHOTO_CUSTOM
    if choice == "icloud" and os.path.exists(PHOTO_ICLOUD):
        return PHOTO_ICLOUD
    return None


def save_photo(b64):
    try:
        data = base64.b64decode(b64, validate=True)
    except (ValueError, TypeError):
        raise MailError("That file couldn't be read")
    if len(data) > 10 * 1024 * 1024:
        raise MailError("Choose a photo smaller than 10 MB")
    if not image_type(data):
        raise MailError("Choose a JPEG, PNG, WebP or GIF image")
    _write_private(PHOTO_CUSTOM, data)
    return save_settings({"photo": "custom"})


def save_background(b64):
    try:
        data = base64.b64decode(b64, validate=True)
    except (ValueError, TypeError):
        raise MailError("That file couldn't be read")
    if len(data) > 20 * 1024 * 1024:
        raise MailError("Choose an image smaller than 20 MB")
    if not image_type(data):
        raise MailError("Choose a JPEG, PNG, WebP or GIF image")
    _write_private(BACKGROUND_FILE, data)
    return save_settings({"background": "image"})


# ---------------------------------------------------------------- startup cache
# The last-seen folder list and first page of the Inbox, so the app can show mail
# instantly at launch and refresh in the background. Stays on this Mac (0600).

_cache_lock = threading.Lock()


def save_cache(cfg, key, value):
    with _cache_lock:
        try:
            cache = load_cache(cfg)
            cache[key] = value
            cache["email"] = cfg.get("email")
            _write_private(CACHE_FILE, json.dumps(cache).encode())
        except Exception as e:
            print(f"warning: couldn't save cache: {e}", file=sys.stderr)


def load_cache(cfg):
    try:
        with open(CACHE_FILE) as f:
            cache = json.load(f)
        return cache if cache.get("email") == cfg.get("email") else {}
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def clear_cache():
    for path in (CACHE_FILE, INDEX_FILE):
        try:
            os.remove(path)
        except FileNotFoundError:
            pass


# ---------------------------------------------------------------- categories

AUTOMATED_SENDER = re.compile(
    r"(^|[.+_-])(no-?reply|do-?not-?reply|notifications?|newsletters?|news|mailer(-daemon)?|marketing|"
    r"bounces?|info|updates?|alerts?|support|hello|team|contact|service|accounts?|billing|receipts?|"
    r"orders?|offers?|promos?|promotions|digest|auto|automated|robot|members?|rewards|deals|shop|store)"
    r"([.+_-]|$)")


WORD_RE = re.compile(r"[a-z0-9]+")


class KeywordMatcher:
    """Whole-word, case-insensitive keyword match ("sale" won't match "wholesale").
    Plain single words are set lookups; phrases and words with symbols use a regex."""

    def __init__(self, words):
        self.simple = {w for w in words if WORD_RE.fullmatch(w)}
        self.complex = keyword_pattern([w for w in words if w not in self.simple])
        self.empty = not words

    def matches(self, text, tokens):
        return bool(self.simple & tokens) or bool(self.complex and self.complex.search(text))


def keyword_pattern(words):
    """Regex for keywords; word boundaries apply only where a keyword starts/ends with a letter or digit."""
    parts = []
    for w in words:
        p = re.escape(w)
        if w[0].isalnum():
            p = r"(?<![a-z0-9])" + p
        if w[-1].isalnum():
            p += r"(?![a-z0-9])"
        parts.append(p)
    return re.compile("|".join(parts)) if parts else None


def is_automated(address):
    return bool(AUTOMATED_SENDER.search(address.split("@", 1)[0])) if address else True


def sort_rules():
    settings = load_settings()
    return settings["categories"], settings["unsortedSenders"]


class SenderRules:
    """Senders pinned to a tab (or to All mail only). They win over keywords: exact
    addresses first, then domains, most specific first (b.com also covers mail.b.com)."""

    def __init__(self, categories, unsorted):
        self.exact, self.domains = {}, []
        targets = [(c["id"], c.get("senders", [])) for c in categories if c.get("enabled")] + [(None, unsorted)]
        for target, senders in targets:
            for sender in senders:
                if sender.startswith("@"):
                    self.domains.append((sender[1:], target))
                else:
                    self.exact.setdefault(sender, target)
        self.domains.sort(key=lambda d: -len(d[0]))

    def lookup(self, address):
        """(True, tab id or None for All mail only) when a rule applies, else (False, None)."""
        if address in self.exact:
            return True, self.exact[address]
        domain = address.rpartition("@")[2]
        for d, target in self.domains:
            if domain == d or domain.endswith("." + d):
                return True, target
        return False, None


class CategoryIndex:
    """Sender and subject of every Inbox message, kept on this Mac (0600) so tabs can be
    sorted locally: iCloud's own search can't express these rules reliably. Built once,
    newest first, on its own IMAP connection; after that only new messages are fetched."""

    def __init__(self, mail):
        self.mail = mail
        self.lane = Lane(mail.user, mail.password)
        self.lock = threading.Lock()
        self.refreshing = threading.Lock()
        self.entries = {}       # uid -> [sender name + address, address, subject], lowercase
        self.unseen = set()
        self.uidvalidity = None
        self.total = 0
        self.complete = False
        self.refreshed_at = 0.0
        self._memo = (None, None)
        try:
            with open(INDEX_FILE) as f:
                saved = json.load(f)
            if saved.get("email") == mail.user:
                self.entries = {int(k): v for k, v in saved["entries"].items()}
                self.uidvalidity = saved.get("uidvalidity")
                self.total = len(self.entries)
        except (FileNotFoundError, json.JSONDecodeError, KeyError, ValueError):
            pass

    def save(self):
        with self.lock:
            data = {"email": self.mail.user, "uidvalidity": self.uidvalidity,
                    "entries": {str(k): v for k, v in self.entries.items()}}
        _write_private(INDEX_FILE, json.dumps(data, separators=(",", ":")).encode())

    def status(self):
        return {"indexed": len(self.entries), "total": self.total, "complete": self.complete}

    def refresh_soon(self, max_age=45):
        if time.time() - self.refreshed_at > max_age:
            threading.Thread(target=self.refresh, daemon=True).start()

    def refresh(self):
        if not self.refreshing.acquire(blocking=False):
            return  # one already running
        try:
            self.lane.run(self._refresh)
            self.refreshed_at = time.time()
        except Exception as e:
            print(f"warning: category index refresh failed: {e}", file=sys.stderr)
        finally:
            self.refreshing.release()

    def _refresh(self, c):
        c.select(mbox("INBOX"), readonly=True)
        uidvalidity = (c.response("UIDVALIDITY")[1] or [None])[0]
        uidvalidity = uidvalidity.decode() if isinstance(uidvalidity, bytes) else uidvalidity
        _, d = c.uid("SEARCH", "ALL")
        current = {int(x) for x in (d[0] or b"").split()}
        _, d = c.uid("SEARCH", "UNSEEN")
        unseen = {int(x) for x in (d[0] or b"").split()}
        with self.lock:
            if uidvalidity != self.uidvalidity:  # mailbox was rebuilt: UIDs mean something else now
                self.entries, self.uidvalidity = {}, uidvalidity
            for gone in set(self.entries) - current:
                del self.entries[gone]
            self.unseen, self.total = unseen, len(current)
            new = sorted(current - set(self.entries), reverse=True)  # newest first
        for i in range(0, len(new), 500):
            _, data = c.uid("FETCH", ",".join(map(str, new[i:i + 500])),
                            "(UID BODY.PEEK[HEADER.FIELDS (FROM SUBJECT)])")
            rows = {}
            for uid, info in parse_fetch(data).items():
                h = email.message_from_bytes(part_by_prefix(info["parts"], "BODY[HEADER") or b"", policy=policy.default)
                frm = (addresses(h, "From") or [{"name": "", "email": ""}])[0]
                rows[uid] = [f"{frm['name']} {frm['email']}".lower(), frm["email"].lower(), safe_header(h, "Subject").lower()]
            with self.lock:
                self.entries.update(rows)
            if i % 2500 == 0:
                self.save()
        self.complete = True
        self.save()

    def assignments(self, categories, unsorted=()):
        """uid -> category id for the current rules, applied to every message (old and new); memoized."""
        rules = [(c["id"], KeywordMatcher(c["keywords"]), c.get("people", False))
                 for c in categories if c.get("enabled")]
        senders = SenderRules(categories, unsorted)
        with self.lock:
            key = (json.dumps([categories, list(unsorted)], sort_keys=True), len(self.entries), max(self.entries, default=0))
            if self._memo[0] == key:
                return self._memo[1]
            items = list(self.entries.items())
        result = {}
        for uid, (sender, address, subject) in items:
            pinned, target = senders.lookup(address)
            if pinned:
                if target:
                    result[uid] = target
                continue
            text = f"{sender} {subject}"
            tokens = set(WORD_RE.findall(text))
            automated = None
            for cid, matcher, people in rules:
                if people and automated is None:
                    automated = is_automated(address)
                if matcher.matches(text, tokens) or (people and not automated):
                    result[uid] = cid
                    break
        with self.lock:
            self._memo = (key, result)
        return result

    def uids_in(self, category, categories, unsorted=()):
        return sorted((u for u, c in self.assignments(categories, unsorted).items() if c == category), reverse=True)

    def unread_counts(self, categories, unsorted=()):
        assigned = self.assignments(categories, unsorted)
        counts = {}
        with self.lock:
            unseen = set(self.unseen)
        for uid in unseen:
            cid = assigned.get(uid)
            if cid:
                counts[cid] = counts.get(cid, 0) + 1
        return counts

    def note_seen(self, uids, seen):
        with self.lock:
            (self.unseen.difference_update if seen else self.unseen.update)(int(u) for u in uids)


def keychain_get(account):
    r = subprocess.run(
        ["security", "find-generic-password", "-s", KEYCHAIN_SERVICE, "-a", account, "-w"],
        capture_output=True, text=True,
    )
    return r.stdout.rstrip("\n") if r.returncode == 0 else None


def keychain_store(account, password):
    # Commands go to `security -i` on stdin so the password never shows up in a
    # process argument list. Inputs are validated to contain no quotes/backslashes.
    cmd = (f'add-generic-password -U -s "{KEYCHAIN_SERVICE}" -a "{account}" '
           f'-l "Inbox (iCloud Mail)" -w "{password}"\n')
    r = subprocess.run(["security", "-i"], input=cmd, capture_output=True, text=True)
    if r.returncode != 0 or keychain_get(account) != password:
        raise MailError("Couldn't save the password to your Keychain.")


def keychain_delete(account):
    subprocess.run(["security", "delete-generic-password", "-s", KEYCHAIN_SERVICE, "-a", account],
                   capture_output=True)


_ssl_ctx = None


def ssl_context():
    """A verifying TLS context. python.org builds of Python ship with no CA
    certificates until 'Install Certificates.command' is run, so fall back to
    the macOS system root certificates."""
    global _ssl_ctx
    if _ssl_ctx is None:
        ctx = ssl.create_default_context()
        if ctx.cert_store_stats().get("x509_ca", 0) == 0:
            pem = subprocess.run(
                ["security", "find-certificate", "-a", "-p",
                 "/System/Library/Keychains/SystemRootCertificates.keychain"],
                capture_output=True, text=True,
            ).stdout
            if pem:
                ctx.load_verify_locations(cadata=pem)
        _ssl_ctx = ctx
    return _ssl_ctx


# ---------------------------------------------------------------- user log (Supabase)

def load_app_config():
    try:
        with open(APP_CONFIG_FILE) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def supabase_rpc(fn, payload):
    """Call one of the user-log functions defined in supabase/setup.sql."""
    ac = load_app_config()
    url, key = ac.get("supabase_url"), ac.get("supabase_key")
    if not url or not key:
        return  # not configured (e.g. a development build)
    req = urllib.request.Request(
        f"{url.rstrip('/')}/rest/v1/rpc/{fn}", data=json.dumps(payload).encode(), method="POST",
        headers={"apikey": key, "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=15, context=ssl_context()) as r:
        r.read()


def checkin(cfg, force=False):
    """Record this install in the user log: at sign-in, then at most once a day."""
    if not cfg.get("email") or (not force and time.time() - cfg.get("last_checkin", 0) < 86400):
        return

    def run():
        try:
            supabase_rpc("inbox_checkin", {
                "p_install_id": cfg["install_id"], "p_email": cfg["email"],
                "p_app_version": APP_VERSION, "p_macos_version": platform.mac_ver()[0],
            })
            cfg["last_checkin"] = time.time()
            save_config(cfg)
        except Exception as e:
            print(f"warning: user log check-in failed: {e}", file=sys.stderr)
    threading.Thread(target=run, daemon=True).start()


def checkin_daily(cfg):
    while True:
        checkin(cfg)
        time.sleep(6 * 3600)


EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$")


def sign_in(app, data):
    """Validate credentials against iCloud, then store them. Used by the setup screen."""
    addr = (data.get("email") or "").strip()
    password = re.sub(r"\s+", "", data.get("password") or "")
    name = (data.get("name") or "").strip().replace("\n", " ")[:100]
    if not EMAIL_RE.match(addr):
        raise MailError("Enter your iCloud email address (for example you@icloud.com).")
    # Apple's app-specific passwords always look like abcd-efgh-ijkl-mnop. Requiring that
    # format also stops someone's real Apple Account password from ever being sent.
    if not re.fullmatch(r"[a-z]{4}-[a-z]{4}-[a-z]{4}-[a-z]{4}", password.lower()):
        raise MailError("That isn't an app-specific password. Apple's look like abcd-efgh-ijkl-mnop. "
                        "Don't use your Apple Account password here.")
    password = password.lower()
    try:
        c = imaplib.IMAP4_SSL(IMAP_HOST, IMAP_PORT, ssl_context=ssl_context(), timeout=30)
        try:
            c.login(addr, password)
        finally:
            try:
                c.logout()
            except Exception:
                pass
    except imaplib.IMAP4.error:
        raise MailError("iCloud didn't accept that. Make sure you pasted an app-specific password "
                        "(not your Apple Account password) and that the email is your iCloud Mail address.")
    except (OSError, ssl.SSLError) as e:
        raise MailError(f"Couldn't reach iCloud ({e}). Check your internet connection.")
    keychain_store(addr, password)
    cfg = app["cfg"]
    cfg.update(email=addr, name=name)
    save_config(cfg)
    app["mail"] = Mail(cfg, password)
    app["mail"].warm_up()
    threading.Thread(target=sync_icloud_photo, args=(addr,), daemon=True).start()
    checkin(cfg, force=True)


def sign_out(app):
    cfg = app["cfg"]
    if app["mail"]:
        with app["mail"].lock:
            app["mail"]._drop()
    if cfg.get("email"):
        keychain_delete(cfg["email"])
    try:
        supabase_rpc("inbox_forget", {"p_install_id": cfg["install_id"]})
    except Exception as e:
        print(f"warning: couldn't remove this install from the user log: {e}", file=sys.stderr)
    cfg.pop("email", None)
    cfg.pop("last_checkin", None)
    clear_cache()
    for path in (PHOTO_ICLOUD, PHOTO_CUSTOM):
        try:
            os.remove(path)
        except FileNotFoundError:
            pass
    save_config(cfg)
    app["mail"] = None


# ---------------------------------------------------------------- IMAP helpers

def imap_utf7_decode(s):
    def repl(m):
        b = m.group(1)
        if not b:
            return "&"
        b = b.replace(",", "/") + "=" * (-len(b) % 4)
        return base64.b64decode(b).decode("utf-16-be")
    return re.sub(r"&([A-Za-z0-9+,]*)-", repl, s)


def imap_utf7_encode(s):
    out, buf = [], []

    def flush():
        if buf:
            b = base64.b64encode("".join(buf).encode("utf-16-be")).decode().rstrip("=")
            out.append("&" + b.replace("/", ",") + "-")
            buf.clear()

    for ch in s:
        if 0x20 <= ord(ch) <= 0x7E:
            flush()
            out.append("&-" if ch == "&" else ch)
        else:
            buf.append(ch)
    flush()
    return "".join(out)


def q(s):
    """Quote a string for an IMAP command."""
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'


def mbox(name):
    return q(imap_utf7_encode(name))


def uid_set(uids):
    try:
        clean = [int(u) for u in uids]
    except (TypeError, ValueError):
        raise MailError("Bad message id")
    if not clean:
        raise MailError("No messages selected")
    return ",".join(map(str, clean))


LIST_FETCH_ITEMS = (
    "(UID FLAGS INTERNALDATE RFC822.SIZE "
    "BODY.PEEK[HEADER.FIELDS (FROM TO SUBJECT DATE CONTENT-TYPE CONTENT-TRANSFER-ENCODING)] "
    "BODY.PEEK[TEXT]<0.4096>)"
)
LIST_HEADER_ITEMS = (  # same as LIST_FETCH_ITEMS minus the preview text, which is slow for older mail
    "(UID FLAGS INTERNALDATE RFC822.SIZE "
    "BODY.PEEK[HEADER.FIELDS (FROM TO SUBJECT DATE CONTENT-TYPE CONTENT-TRANSFER-ENCODING)])"
)
PREVIEW_ITEMS = "(UID BODY.PEEK[HEADER.FIELDS (CONTENT-TYPE CONTENT-TRANSFER-ENCODING)] BODY.PEEK[TEXT]<0.4096>)"
LIST_RE = re.compile(rb'^\((?P<flags>[^)]*)\) (?P<delim>"(?:[^"\\]|\\.)*"|NIL) (?P<name>.*)$')
FETCH_START = re.compile(rb"^\d+ \(")
META_UID = re.compile(rb"\bUID (\d+)")
META_FLAGS = re.compile(rb"\bFLAGS \(([^)]*)\)")
META_DATE = re.compile(rb'\bINTERNALDATE "([^"]+)"')
META_SIZE = re.compile(rb"\bRFC822\.SIZE (\d+)")
LITERAL_KEY = re.compile(rb"(BODY\[[^\]]*\])(?:<\d+>)? \{\d+\}$")


def parse_fetch(data):
    """Turn imaplib's FETCH response into {uid: {flags, date, size, parts}}."""
    msgs, cur = [], None
    for item in data:
        if item is None:
            continue
        if isinstance(item, tuple):
            meta, lit = item
            if FETCH_START.match(meta):
                cur = {"meta": b"", "parts": {}}
                msgs.append(cur)
            if cur is None:
                continue
            cur["meta"] += meta
            m = LITERAL_KEY.search(meta)
            if m:
                cur["parts"][m.group(1).decode().upper()] = lit
        elif FETCH_START.match(item):
            cur = {"meta": item, "parts": {}}
            msgs.append(cur)
        elif cur is not None:
            cur["meta"] += b" " + item
    out = {}
    for m in msgs:
        meta = m["meta"]
        u = META_UID.search(meta)
        if not u:
            continue  # unsolicited flag update, not ours
        flags = META_FLAGS.search(meta)
        date = META_DATE.search(meta)
        size = META_SIZE.search(meta)
        ts = None
        if date:
            try:
                ts = datetime.strptime(date.group(1).decode().strip(), "%d-%b-%Y %H:%M:%S %z").timestamp()
            except ValueError:
                pass
        out[int(u.group(1))] = {
            "flags": flags.group(1).decode().split() if flags else [],
            "ts": ts,
            "size": int(size.group(1)) if size else 0,
            "parts": m["parts"],
        }
    return out


def part_by_prefix(parts, prefix):
    for k, v in parts.items():
        if k.startswith(prefix):
            return v
    return None


# ---------------------------------------------------------------- message parsing

def safe_header(msg, name):
    try:
        return str(msg.get(name, "") or "")
    except Exception:
        return ""


def addresses(msg, name):
    try:
        h = msg.get(name)
        if not h:
            return []
        return [{"name": a.display_name, "email": a.addr_spec} for a in h.addresses]
    except Exception:
        raw = safe_header(msg, name)
        return [{"name": n, "email": e} for n, e in getaddresses([raw])] if raw else []


def part_text(part):
    try:
        return part.get_content()
    except Exception:
        payload = part.get_payload(decode=True) or b""
        return payload.decode(part.get_content_charset() or "utf-8", errors="replace")


def html_to_text(s):
    s = re.sub(r"(?is)<(style|script|head|title)\b.*?</\1>", " ", s)
    s = re.sub(r"(?s)<[^>]+>", " ", s)
    return html.unescape(s)


def decode_cte(body, cte, charset):
    cte = (cte or "").lower()
    if cte == "base64":
        body = re.sub(rb"[^A-Za-z0-9+/=]", b"", body)
        body = body[: len(body) - len(body) % 4]
        try:
            body = base64.b64decode(body)
        except Exception:
            return ""
    elif cte == "quoted-printable":
        body = quopri.decodestring(body)
    return body.decode(charset or "utf-8", errors="replace")


def snippet_from(headers, body, depth=0):
    """Best-effort preview text from headers + the first few KB of the body."""
    if depth > 4 or not body:
        return ""
    h = email.message_from_bytes(headers, policy=policy.compat32)
    ctype = h.get_content_type()
    if ctype.startswith("multipart/"):
        boundary = h.get_boundary()
        if not boundary:
            return ""
        chunks = body.split(b"--" + boundary.encode("latin-1", "replace"))[1:]
        found_html = ""
        for chunk in chunks:
            chunk = chunk.lstrip(b"\r\n")
            m = re.search(rb"\r?\n\r?\n", chunk)
            if not m:
                continue
            sub_h, sub_b = chunk[: m.start()], chunk[m.end():]
            text = snippet_from(sub_h, sub_b, depth + 1)
            sub_type = email.message_from_bytes(sub_h, policy=policy.compat32).get_content_type()
            if text and sub_type != "text/html":
                return text
            found_html = found_html or text
        return found_html
    if ctype not in ("text/plain", "text/html"):
        return ""
    text = decode_cte(body, h.get("Content-Transfer-Encoding"), h.get_content_charset())
    if ctype == "text/html":
        text = html_to_text(text)
    return re.sub(r"\s+", " ", text).strip()[:200]


def summarize(uid, folder, info):
    hdr = part_by_prefix(info["parts"], "BODY[HEADER") or b""
    h = email.message_from_bytes(hdr, policy=policy.default)
    snippet = ""
    try:
        snippet = snippet_from(hdr, info["parts"].get("BODY[TEXT]") or b"")
    except Exception:
        pass
    ts = info["ts"]
    if ts is None:
        try:
            ts = parsedate_to_datetime(safe_header(h, "Date")).timestamp()
        except Exception:
            ts = 0
    ctype = safe_header(h, "Content-Type").lower()
    return {
        "uid": uid,
        "folder": folder,
        "from": addresses(h, "From"),
        "to": addresses(h, "To"),
        "subject": safe_header(h, "Subject"),
        "snippet": snippet,
        "date": int(ts * 1000),
        "size": info["size"],
        "seen": "\\Seen" in info["flags"],
        "flagged": "\\Flagged" in info["flags"],
        "answered": "\\Answered" in info["flags"],
        "hasAttachments": "multipart/mixed" in ctype,
    }


def build_search(query):
    """Gmail-ish operators: from: to: subject: is:unread/read/starred, rest = full text."""
    if not query.isascii():
        return None  # caller falls back to a single UTF-8 literal TEXT search
    try:
        tokens = shlex.split(query)
    except ValueError:
        tokens = query.split()
    crit = []
    for t in tokens:
        key, _, val = t.partition(":")
        k = key.lower()
        if val and k in ("from", "to", "cc", "subject"):
            crit += [k.upper(), q(val)]
        elif k == "is" and val.lower() in ("unread", "read", "starred", "unstarred"):
            crit.append({"unread": "UNSEEN", "read": "SEEN", "starred": "FLAGGED", "unstarred": "UNFLAGGED"}[val.lower()])
        else:
            crit += ["TEXT", q(t)]
    return crit or ["ALL"]


# ---------------------------------------------------------------- mail client

class Lane:
    """One IMAP connection with its own lock. Inbox uses two, so slow folder counts
    never hold up opening the message list."""

    def __init__(self, user, password):
        self.user, self.password = user, password
        self.lock = threading.RLock()
        self.conn = None
        self.selected = None

    def drop(self):
        try:
            if self.conn:
                self.conn.logout()
        except Exception:
            pass
        self.conn, self.selected = None, None

    def run(self, fn):
        with self.lock:
            for attempt in (0, 1):
                try:
                    if self.conn is None:
                        c = imaplib.IMAP4_SSL(IMAP_HOST, IMAP_PORT, ssl_context=ssl_context(), timeout=60)
                        c.login(self.user, self.password)
                        self.conn, self.selected = c, None
                    return fn(self.conn)
                except (imaplib.IMAP4.abort, OSError, EOFError):
                    self.drop()
                    if attempt:
                        raise MailError("Lost connection to iCloud. Check your network and try again.")

    def select(self, c, folder, fresh=False):
        """Open a folder; returns its message count when it (re)selects."""
        if self.selected == folder and not fresh:
            c.noop()  # pick up new mail on the already-selected folder
            return None
        typ, data = c.select(mbox(folder))
        if typ != "OK":
            raise MailError(f"Couldn't open folder “{folder}”")
        self.selected = folder
        try:
            return int(data[0])
        except (TypeError, ValueError, IndexError):
            return None


class Mail:
    def __init__(self, cfg, password):
        self.cfg = cfg
        self.user = cfg["email"]
        self.password = password
        self.main = Lane(self.user, password)   # message list, reading, actions
        self.side = Lane(self.user, password)   # folder list and unread counts
        self.index = CategoryIndex(self)        # its own connection, for sorting tabs
        self.lock = self.main.lock
        self.roles = {}
        self.raw_cache = OrderedDict()
        self.previews = OrderedDict()  # (folder, uid) -> preview text
        self._folders, self._folders_at = None, 0.0

    # connection management ---------------------------------------------------
    def _drop(self):
        self.main.drop()
        self.side.drop()

    def run(self, fn):
        return self.main.run(fn)

    def _select(self, c, folder):
        self.main.select(c, folder)

    def warm_up(self):
        """Sign in on both connections and load folders while the window is still opening."""
        threading.Thread(target=lambda: self._quietly(lambda: self.run(lambda c: None)), daemon=True).start()
        threading.Thread(target=lambda: self._quietly(self.folders), daemon=True).start()
        threading.Thread(target=self.index.refresh, daemon=True).start()

    @staticmethod
    def _quietly(fn):
        try:
            fn()
        except Exception as e:
            print(f"warning: warm-up failed: {e}", file=sys.stderr)

    # operations ---------------------------------------------------------------
    def folders(self, max_age=5.0):
        with self.side.lock:
            # A request that waited for the warm-up (or another tab) reuses its fresh result.
            if self._folders is not None and time.time() - self._folders_at < max_age:
                return self._folders
            self._folders = self.side.run(self._load_folders)
            self._folders_at = time.time()
            save_cache(self.cfg, "folders", self._folders)
            return self._folders

    def _load_folders(self, c):
        typ, data = c.list()
        if typ != "OK":
            raise MailError("Couldn't list folders")
        out = []
        for line in data:
            literal_name = None
            if isinstance(line, tuple):
                line, literal_name = line[0], line[1].decode()
            m = LIST_RE.match(line or b"")
            if not m:
                continue
            flags = m.group("flags").decode().split()
            if any(f.lower() in ("\\noselect", "\\nonexistent") for f in flags):
                continue
            name = literal_name or m.group("name").decode()
            if name.startswith('"'):
                name = name[1:-1].replace('\\"', '"').replace("\\\\", "\\")
            name = imap_utf7_decode(name)
            role = None
            for f in flags:
                if f.lower() in ("\\sent", "\\drafts", "\\trash", "\\junk", "\\archive"):
                    role = f[1:].lower()
            if name.upper() == "INBOX":
                name, role = "INBOX", "inbox"
            role = role or {
                "sent messages": "sent", "sent": "sent", "drafts": "drafts",
                "deleted messages": "trash", "trash": "trash", "junk": "junk",
                "spam": "junk", "archive": "archive",
            }.get(name.lower())
            out.append({"name": name, "role": role, "unread": 0, "total": 0})

        seen_roles = set()
        for f in out:
            if f["role"] in seen_roles:
                f["role"] = None
            elif f["role"]:
                seen_roles.add(f["role"])
            typ, d = c.status(mbox(f["name"]), "(MESSAGES UNSEEN)")
            if typ == "OK" and d and d[0]:
                s = d[0].decode(errors="replace")
                if m := re.search(r"UNSEEN (\d+)", s):
                    f["unread"] = int(m.group(1))
                if m := re.search(r"MESSAGES (\d+)", s):
                    f["total"] = int(m.group(1))
        order = ["inbox", "drafts", "sent", "archive", "junk", "trash"]
        out.sort(key=lambda f: (order.index(f["role"]) if f["role"] in order else len(order), f["name"].lower()))
        self.roles = {f["role"]: f["name"] for f in out if f["role"]}
        return out

    def role_folder(self, role):
        if role not in self.roles:
            self.folders()
        if role not in self.roles:
            raise MailError(f"Your account has no {role} folder")
        return self.roles[role]

    def list_messages(self, folder, page=0, query="", category=""):
        def op(c):
            if category and folder == "INBOX" and not query:
                return category_page(c)
            if not query:
                return newest_page(c)
            self._select(c, folder)
            if query:
                crit = build_search(query)
                if crit is None:
                    c.literal = query.encode("utf-8")
                    typ, d = c.uid("SEARCH", "CHARSET", "UTF-8", "TEXT")
                else:
                    typ, d = c.uid("SEARCH", *crit)
            else:
                typ, d = c.uid("SEARCH", "ALL")
            if typ != "OK":
                raise MailError("Search failed")
            uids = sorted((int(x) for x in (d[0] or b"").split()), reverse=True)
            chunk = uids[page * PAGE_SIZE:(page + 1) * PAGE_SIZE]
            msgs, pending = self._fast_page(c, folder, chunk)
            return {"folder": folder, "page": page, "pageSize": PAGE_SIZE, "total": len(uids),
                    "messages": msgs, "previewsPending": pending}

        def category_page(c):
            self.index.refresh_soon()
            uids = self.index.uids_in(category, *sort_rules())
            chunk = uids[page * PAGE_SIZE:(page + 1) * PAGE_SIZE]
            if chunk:
                self._select(c, folder)
            msgs, pending = self._fast_page(c, folder, chunk)
            return {"folder": folder, "category": category, "page": page, "pageSize": PAGE_SIZE,
                    "total": len(uids), "messages": msgs, "previewsPending": pending,
                    "indexing": self.index.status()}

        def newest_page(c):
            # Without a search, page by message number: no need to download every UID.
            total = self.main.select(c, folder, fresh=True) or 0
            hi = total - page * PAGE_SIZE
            msgs = []
            if hi >= 1:
                lo = max(1, hi - PAGE_SIZE + 1)
                typ, data = c.fetch(f"{lo}:{hi}", LIST_FETCH_ITEMS)
                parsed = parse_fetch(data)
                msgs = [summarize(u, folder, parsed[u]) for u in sorted(parsed, reverse=True)]
            result = {"folder": folder, "page": page, "pageSize": PAGE_SIZE, "total": total, "messages": msgs}
            if page == 0 and folder == "INBOX":
                save_cache(self.cfg, "inbox", result)
            return result

        return self.run(op)

    def _raw(self, c, folder, uid):
        key = (folder, uid)
        if key in self.raw_cache:
            self.raw_cache.move_to_end(key)
            return self.raw_cache[key]
        self._select(c, folder)
        typ, data = c.uid("FETCH", str(uid), "(UID FLAGS BODY.PEEK[])")
        info = parse_fetch(data).get(uid)
        if typ != "OK" or not info or "BODY[]" not in info["parts"]:
            raise MailError("Message not found — it may have been moved or deleted.")
        result = (info["parts"]["BODY[]"], info["flags"])
        self.raw_cache[key] = result
        while len(self.raw_cache) > 40:
            self.raw_cache.popitem(last=False)
        return result

    def get_message(self, folder, uid):
        def op(c):
            raw, flags = self._raw(c, folder, uid)
            if "\\Seen" not in flags:
                self._select(c, folder)
                c.uid("STORE", str(uid), "+FLAGS.SILENT", "(\\Seen)")
                flags.append("\\Seen")
                if folder == "INBOX":
                    self.index.note_seen([uid], True)
            return raw, flags
        raw, flags = self.run(op)
        msg = email.message_from_bytes(raw, policy=policy.default)

        body_html = body_text = None
        try:
            if b := msg.get_body(preferencelist=("html",)):
                body_html = part_text(b)
        except Exception:
            pass
        try:
            if b := msg.get_body(preferencelist=("plain",)):
                body_text = part_text(b)
        except Exception:
            pass

        attachments, cids, cid_bytes = [], {}, 0
        for i, part in enumerate(msg.walk()):
            if part.is_multipart():
                continue
            try:
                disp = part.get_content_disposition()
                filename = part.get_filename()
                cid = (part.get("Content-ID") or "").strip().strip("<>")
                ctype = part.get_content_type()
            except Exception:
                continue
            payload = None
            if cid and part.get_content_maintype() == "image":
                payload = part.get_payload(decode=True) or b""
                if cid_bytes + len(payload) < 15 * 1024 * 1024:
                    cid_bytes += len(payload)
                    cids[cid] = f"data:{ctype};base64,{base64.b64encode(payload).decode()}"
            if disp == "attachment" or (filename and not (cid and disp == "inline")):
                if payload is None:
                    payload = part.get_payload(decode=True) or b""
                attachments.append({"index": i, "filename": filename or f"attachment-{i}", "type": ctype, "size": len(payload)})

        if body_html and cids:
            body_html = re.sub(
                r"""cid:([^"'\s)>]+)""",
                lambda m: cids.get(unquote(m.group(1)), m.group(0)),
                body_html,
            )

        try:
            date = int(parsedate_to_datetime(safe_header(msg, "Date")).timestamp() * 1000)
        except Exception:
            date = None
        return {
            "uid": uid,
            "folder": folder,
            "from": addresses(msg, "From"),
            "to": addresses(msg, "To"),
            "cc": addresses(msg, "Cc"),
            "replyTo": addresses(msg, "Reply-To"),
            "subject": safe_header(msg, "Subject"),
            "date": date,
            "messageId": safe_header(msg, "Message-ID"),
            "references": safe_header(msg, "References"),
            "html": body_html,
            "text": body_text if body_text is not None else (html_to_text(body_html) if body_html else ""),
            "attachments": attachments,
            "flagged": "\\Flagged" in flags,
        }

    def get_attachment(self, folder, uid, index):
        raw, _ = self.run(lambda c: self._raw(c, folder, uid))
        msg = email.message_from_bytes(raw, policy=policy.default)
        for i, part in enumerate(msg.walk()):
            if i == index and not part.is_multipart():
                return part.get_filename() or f"attachment-{i}", part.get_payload(decode=True) or b"", part.get_content_type()
        raise MailError("Attachment not found")

    def set_flag(self, folder, uids, flag, on):
        if flag not in ("\\Seen", "\\Flagged"):
            raise MailError("Unsupported flag")
        uidstr = uid_set(uids)
        if folder == "INBOX" and flag == "\\Seen":
            self.index.note_seen(uidstr.split(","), on)

        def op(c):
            self._select(c, folder)
            typ, _ = c.uid("STORE", uidstr, "+FLAGS.SILENT" if on else "-FLAGS.SILENT", f"({flag})")
            if typ != "OK":
                raise MailError("Couldn't update messages")
            for u in uidstr.split(","):
                cached = self.raw_cache.get((folder, int(u)))
                if cached and on and flag not in cached[1]:
                    cached[1].append(flag)
                elif cached and not on and flag in cached[1]:
                    cached[1].remove(flag)
        self.run(op)

    def move(self, folder, uids, dest):
        uidstr = uid_set(uids)
        if dest == folder:
            return

        def op(c):
            self._select(c, folder)
            if "MOVE" in c.capabilities:
                typ, _ = c.uid("MOVE", uidstr, mbox(dest))
            else:
                typ, _ = c.uid("COPY", uidstr, mbox(dest))
                if typ == "OK":
                    c.uid("STORE", uidstr, "+FLAGS.SILENT", "(\\Deleted)")
                    c.expunge()
            if typ != "OK":
                raise MailError(f"Couldn't move to “{dest}”")
            for u in uidstr.split(","):
                self.raw_cache.pop((folder, int(u)), None)
        self.run(op)

    def _fast_page(self, c, folder, chunk):
        """Summaries without preview text (fast); previews come from previews()."""
        if not chunk:
            return [], []
        typ, data = c.uid("FETCH", ",".join(map(str, chunk)), LIST_HEADER_ITEMS)
        parsed = parse_fetch(data)
        msgs, pending = [], []
        for u in chunk:
            if u not in parsed:
                continue
            m = summarize(u, folder, parsed[u])
            m["snippet"] = self.previews.get((folder, u), "")
            if (folder, u) not in self.previews:
                pending.append(u)
            msgs.append(m)
        return msgs, pending

    def load_previews(self, folder, uids):
        uidstr = uid_set(uids[:100])

        def op(c):
            self.side.select(c, folder)
            _, data = c.uid("FETCH", uidstr, PREVIEW_ITEMS)
            out = {}
            for uid, info in parse_fetch(data).items():
                try:
                    text = snippet_from(part_by_prefix(info["parts"], "BODY[HEADER") or b"",
                                        info["parts"].get("BODY[TEXT]") or b"")
                except Exception:
                    text = ""
                out[uid] = text
                self.previews[(folder, uid)] = text
            while len(self.previews) > 20000:
                self.previews.popitem(last=False)
            return out
        return self.side.run(op)

    def categories_status(self):
        self.index.refresh_soon()
        return {"indexing": self.index.status(),
                "unread": self.index.unread_counts(*sort_rules())}

    def mark_all_read(self, folder, category=""):
        def op(c):
            self._select(c, folder)
            if category and folder == "INBOX":
                with self.index.lock:
                    unseen = set(self.index.unseen)
                uids = [u for u in self.index.uids_in(category, *sort_rules()) if u in unseen]
            else:
                _, d = c.uid("SEARCH", "UNSEEN")
                uids = [int(x) for x in (d[0] or b"").split()]
            for i in range(0, len(uids), 500):
                c.uid("STORE", ",".join(map(str, uids[i:i + 500])), "+FLAGS.SILENT", "(\\Seen)")
            return uids
        uids = self.run(op)
        if folder == "INBOX":
            self.index.note_seen(uids, True)
        self._folders_at = 0  # unread counts changed
        return {"marked": len(uids)}

    def empty_folder(self, folder):
        if folder not in (self.roles.get("trash"), self.roles.get("junk")):
            raise MailError("Only Trash and Spam can be emptied")

        def op(c):
            count = self.main.select(c, folder, fresh=True) or 0
            if count:
                c.store("1:*", "+FLAGS.SILENT", "(\\Deleted)")
                c.expunge()
            self.raw_cache.clear()
            return count
        deleted = self.run(op)
        self._folders_at = 0
        return {"deleted": deleted}

    def delete(self, folder, uids):
        trash = self.role_folder("trash")
        if folder != trash:
            return self.move(folder, uids, trash)
        uidstr = uid_set(uids)

        def op(c):  # already in Trash: delete for good
            self._select(c, folder)
            c.uid("STORE", uidstr, "+FLAGS.SILENT", "(\\Deleted)")
            if "UIDPLUS" in c.capabilities:
                c.uid("EXPUNGE", uidstr)
            else:
                c.expunge()
        self.run(op)

    def send(self, data):
        msg = EmailMessage()
        try:
            msg["From"] = formataddr((self.cfg.get("name") or "", self.user))
            for field in ("To", "Cc"):
                if data.get(field.lower(), "").strip():
                    msg[field] = data[field.lower()].strip()
            msg["Subject"] = data.get("subject", "")
            msg["Date"] = formatdate(localtime=True)
            msg["Message-ID"] = make_msgid(domain=self.user.split("@", 1)[1])
            if data.get("inReplyTo"):
                msg["In-Reply-To"] = data["inReplyTo"]
                msg["References"] = (data.get("references", "") + " " + data["inReplyTo"]).strip()
        except ValueError as e:  # e.g. line breaks in a header (injection attempt)
            raise MailError(f"Invalid header: {e}")
        msg.set_content(data.get("body", ""))
        for a in data.get("attachments", []):
            maintype, _, subtype = (a.get("type") or "application/octet-stream").partition("/")
            msg.add_attachment(
                base64.b64decode(a["data"]),
                maintype=maintype or "application", subtype=subtype or "octet-stream",
                filename=a.get("name") or "attachment",
            )
        fwd = data.get("forward")
        if fwd:
            for idx in fwd.get("indexes", []):
                name, payload, ctype = self.get_attachment(fwd["folder"], int(fwd["uid"]), int(idx))
                maintype, _, subtype = ctype.partition("/")
                msg.add_attachment(payload, maintype=maintype, subtype=subtype or "octet-stream", filename=name)
        recipients = [addr for _, addr in getaddresses([data.get(k, "") for k in ("to", "cc", "bcc")]) if addr]
        if not recipients:
            raise MailError("Add at least one recipient.")
        try:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=60) as s:
                s.starttls(context=ssl_context())
                s.login(self.user, self.password)
                s.send_message(msg, to_addrs=recipients)
        except smtplib.SMTPException as e:
            raise MailError(f"iCloud refused the message: {e}")

        if data.get("replyUid") and data.get("replyFolder"):
            try:
                self.run(lambda c: (self._select(c, data["replyFolder"]),
                                    c.uid("STORE", str(int(data["replyUid"])), "+FLAGS.SILENT", "(\\Answered)")))
            except Exception:
                pass
        threading.Thread(target=self._ensure_in_sent, args=(msg,), daemon=True).start()

    def _ensure_in_sent(self, msg):
        """iCloud usually files SMTP mail in Sent itself; append a copy only if it didn't."""
        time.sleep(4)
        try:
            sent = self.role_folder("sent")

            def op(c):
                self._select(c, sent)
                typ, d = c.uid("SEARCH", "HEADER", "Message-ID", q(msg["Message-ID"]))
                if typ == "OK" and d[0].split():
                    return
                c.append(mbox(sent), "(\\Seen)", imaplib.Time2Internaldate(time.time()), msg.as_bytes())
            self.run(op)
        except Exception as e:
            print(f"warning: couldn't save a copy to Sent: {e}", file=sys.stderr)


# ---------------------------------------------------------------- HTTP server

PAGE_CSP = (
    "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
    "img-src 'self' data: https: http:; connect-src 'self'; frame-src 'self'; "
    "base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
)


def make_handler(app, port):
    cfg = app["cfg"]
    secret = cfg["secret"]
    allowed_hosts = {f"127.0.0.1:{port}", f"localhost:{port}"}

    class Handler(BaseHTTPRequestHandler):
        server_version = "iCloudMail"
        sys_version = ""

        def log_message(self, fmt, *args):
            pass  # don't log URLs (they can contain search terms)

        # helpers -------------------------------------------------------------
        def _send(self, status, body=b"", ctype="application/json", extra=None):
            self.send_response(status)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Content-Security-Policy", PAGE_CSP)
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Referrer-Policy", "no-referrer")
            self.send_header("Cache-Control", "no-store")
            for k, v in (extra or {}).items():
                self.send_header(k, v)
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(body)

        def _json(self, obj, status=200):
            self._send(status, json.dumps(obj).encode())

        def _authed(self):
            jar = cookies.SimpleCookie()
            try:
                jar.load(self.headers.get("Cookie", ""))
            except cookies.CookieError:
                return False
            c = jar.get(COOKIE_NAME)
            return bool(c) and secrets.compare_digest(c.value, secret)

        def _guard(self, api):
            # Host check blocks DNS-rebinding; the custom header blocks cross-site form posts.
            if self.headers.get("Host") not in allowed_hosts:
                self._send(403, b"Forbidden", "text/plain")
                return False
            if api and (not self._authed() or self.headers.get("X-Requested-With") != "icloud-mail"):
                self._json({"error": "Not authorized. Open the app from the start script."}, 401)
                return False
            return True

        def _api(self, fn):
            try:
                self._json(fn())
            except MailError as e:
                self._json({"error": str(e)}, 400)
            except imaplib.IMAP4.error as e:
                self._json({"error": f"iCloud error: {e}"}, 502)
            except Exception as e:
                print(f"error: {e!r}", file=sys.stderr)
                self._json({"error": "Something went wrong. See the terminal for details."}, 500)

        # routes ----------------------------------------------------------------
        def do_GET(self):
            url = urlparse(self.path)
            qs = {k: v[0] for k, v in parse_qs(url.query).items()}
            path = url.path

            if path == "/":
                if not self._guard(api=False):
                    return
                if (key := qs.get("key")) and secrets.compare_digest(key, secret):
                    return self._send(302, b"", "text/plain", {
                        "Location": "/",
                        "Set-Cookie": f"{COOKIE_NAME}={secret}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000",
                    })
                if not self._authed():
                    return self._send(401, b"Open the app with: python3 server.py", "text/plain")
                return self._send(200, render_index(app), "text/html; charset=utf-8")

            if path == "/photo":
                if not self._guard(api=False) or not self._authed():
                    return self._send(403, b"Forbidden", "text/plain")
                file = photo_file()
                if not file:
                    return self._send(404, b"Not found", "text/plain")
                with open(file, "rb") as f:
                    data = f.read()
                return self._send(200, data, image_type(data) or "application/octet-stream")

            if path == "/background":
                # Loaded by CSS (which can't send custom headers), so cookie auth only.
                if not self._guard(api=False) or not self._authed():
                    return self._send(403, b"Forbidden", "text/plain")
                try:
                    with open(BACKGROUND_FILE, "rb") as f:
                        data = f.read()
                except FileNotFoundError:
                    return self._send(404, b"Not found", "text/plain")
                return self._send(200, data, image_type(data) or "application/octet-stream")

            if path.startswith("/static/"):
                if not self._guard(api=False):
                    return
                name = path[len("/static/"):]
                if name not in STATIC_FILES:
                    return self._send(404, b"Not found", "text/plain")
                with open(os.path.join(STATIC_DIR, name), "rb") as f:
                    return self._send(200, f.read(), STATIC_FILES[name] + "; charset=utf-8")

            if not path.startswith("/api/"):
                return self._send(404, b"Not found", "text/plain")
            if not self._guard(api=True):
                return

            mail = app["mail"]
            if path == "/api/me":
                return self._json(me_info(app))
            if path == "/api/settings":
                return self._json(load_settings())
            if not mail:
                return self._json({"error": "Not signed in", "setupRequired": True}, 409)
            if path == "/api/cache":
                return self._json(load_cache(cfg))
            if path == "/api/folders":
                return self._api(mail.folders)
            if path == "/api/messages":
                return self._api(lambda: mail.list_messages(
                    qs.get("folder", "INBOX"), max(0, int(qs.get("page", 0))), qs.get("q", "").strip(),
                    qs.get("category", "")))
            if path == "/api/categories":
                return self._api(mail.categories_status)
            if path == "/api/previews":
                return self._api(lambda: mail.load_previews(
                    qs["folder"], [int(u) for u in qs.get("uids", "").split(",") if u.isdigit()]))
            if path == "/api/message":
                return self._api(lambda: mail.get_message(qs["folder"], int(qs["uid"])))
            if path == "/api/attachment":
                try:
                    name, data, _ = mail.get_attachment(qs["folder"], int(qs["uid"]), int(qs["index"]))
                except MailError as e:
                    return self._json({"error": str(e)}, 404)
                safe = re.sub(r'[^\w.\- ()]', "_", name)[:150] or "attachment"
                # Always a download, never rendered: attachments are untrusted content.
                return self._send(200, data, "application/octet-stream", {
                    "Content-Disposition": f'attachment; filename="{safe}"'})
            self._json({"error": "Unknown endpoint"}, 404)

        def do_POST(self):
            path = urlparse(self.path).path
            if not self._guard(api=True):
                return
            length = int(self.headers.get("Content-Length") or 0)
            if length > MAX_BODY:
                return self._json({"error": "Message too large (limit ~25 MB of attachments)."}, 413)
            try:
                data = json.loads(self.rfile.read(length) or b"{}")
            except json.JSONDecodeError:
                return self._json({"error": "Bad request"}, 400)

            def ok(fn):
                return lambda: (fn(), {"ok": True})[1]

            if path == "/api/setup":
                return self._api(ok(lambda: sign_in(app, data)))
            if path == "/api/signout":
                return self._api(ok(lambda: sign_out(app)))
            if path == "/api/settings":
                return self._api(lambda: save_settings(data))
            if path == "/api/photo":
                return self._api(lambda: (save_photo(data.get("data", "")), me_info(app))[1])
            if path == "/api/background":
                return self._api(lambda: save_background(data.get("data", "")))
            mail = app["mail"]
            if not mail:
                return self._json({"error": "Not signed in", "setupRequired": True}, 409)

            routes = {
                "/api/flag": ok(lambda: mail.set_flag(data["folder"], data["uids"], data["flag"], bool(data["on"]))),
                "/api/move": ok(lambda: mail.move(data["folder"], data["uids"], data["dest"])),
                "/api/archive": ok(lambda: mail.move(data["folder"], data["uids"], mail.role_folder("archive"))),
                "/api/spam": ok(lambda: mail.move(data["folder"], data["uids"], mail.role_folder("junk"))),
                "/api/delete": ok(lambda: mail.delete(data["folder"], data["uids"])),
                "/api/send": ok(lambda: mail.send(data)),
                "/api/mark-all-read": lambda: mail.mark_all_read(data["folder"], data.get("category", "")),
                "/api/empty": lambda: mail.empty_folder(data["folder"]),
            }
            if path not in routes:
                return self._json({"error": "Unknown endpoint"}, 404)
            self._api(routes[path])

    return Handler


def me_info(app):
    if not app["mail"]:
        return {"setupRequired": True, "version": APP_VERSION}
    cfg = app["cfg"]
    settings = load_settings()
    file = photo_file(settings)
    return {"email": cfg["email"], "name": cfg.get("name", ""), "version": APP_VERSION,
            "photo": f"/photo?v={int(os.path.getmtime(file))}-{settings['photo']}" if file else None,
            "photoChoice": settings["photo"],
            "hasICloudPhoto": os.path.exists(PHOTO_ICLOUD), "hasCustomPhoto": os.path.exists(PHOTO_CUSTOM)}


def render_index(app):
    """index.html with settings and account info inlined, so the first paint already
    has the right theme and the page needs no extra request to start."""
    with open(os.path.join(STATIC_DIR, "index.html"), encoding="utf-8") as f:
        page = f.read()
    settings = load_settings()
    boot = json.dumps({"me": me_info(app), "settings": settings}).replace("</", "<\\/")
    theme = "" if settings["theme"] == "system" else f' data-theme="{settings["theme"]}"'
    page = page.replace('<html lang="en">', f'<html lang="en"{theme} style="--boot-accent:{settings["accent"]}">', 1)
    return page.replace("<!--BOOT-->", f'<script id="boot" type="application/json">{boot}</script>', 1).encode()


def watch_parent(pid):
    """In app mode, exit as soon as Inbox.app goes away (even if it crashed)."""
    while True:
        time.sleep(2)
        if os.getppid() != pid:
            os._exit(0)


def main():
    ap = argparse.ArgumentParser(description="Local Gmail-style client for iCloud Mail")
    ap.add_argument("--app", action="store_true", help="run inside Inbox.app (print URL, no browser)")
    ap.add_argument("--port", type=int, help="port to listen on (default 8025)")
    ap.add_argument("--parent-pid", type=int, help="exit when this process exits")
    ap.add_argument("--app-version", help="Inbox.app version, for the user log")
    args = ap.parse_args()
    global APP_VERSION
    APP_VERSION = args.app_version or APP_VERSION

    cfg = load_config()
    if not cfg.get("secret") or not cfg.get("install_id"):
        cfg.setdefault("secret", secrets.token_urlsafe(32))
        cfg.setdefault("install_id", str(uuid.uuid4()))
        save_config(cfg)
    app = {"cfg": cfg, "mail": None}
    if cfg.get("email"):
        password = keychain_get(cfg["email"])
        if password:
            app["mail"] = Mail(cfg, password)
            app["mail"].warm_up()  # sign in to iCloud while the window opens
            threading.Thread(target=sync_icloud_photo, args=(cfg["email"],), daemon=True).start()

    try:
        httpd = ThreadingHTTPServer(("127.0.0.1", args.port or cfg.get("port", 8025)), BaseHTTPRequestHandler)
    except OSError:  # port taken: any free port will do
        httpd = ThreadingHTTPServer(("127.0.0.1", 0), BaseHTTPRequestHandler)
    port = httpd.server_address[1]
    httpd.RequestHandlerClass = make_handler(app, port)
    url = f"http://127.0.0.1:{port}/?key={cfg['secret']}"

    threading.Thread(target=checkin_daily, args=(cfg,), daemon=True).start()
    if args.parent_pid:
        threading.Thread(target=watch_parent, args=(args.parent_pid,), daemon=True).start()
    if args.app:
        print(f"ICLOUD_MAIL_URL {url}", flush=True)
    else:
        print(f"Inbox is running at http://127.0.0.1:{port}  (Ctrl+C to stop)")
        webbrowser.open(url)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nBye.")


if __name__ == "__main__":
    main()
