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

class Mail:
    def __init__(self, cfg, password):
        self.cfg = cfg
        self.user = cfg["email"]
        self.password = password
        self.lock = threading.RLock()
        self.conn = None
        self.selected = None
        self.roles = {}
        self.raw_cache = OrderedDict()

    # connection management ---------------------------------------------------
    def _connect(self):
        c = imaplib.IMAP4_SSL(IMAP_HOST, IMAP_PORT, ssl_context=ssl_context(), timeout=60)
        c.login(self.user, self.password)
        self.conn, self.selected = c, None

    def _drop(self):
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
                        self._connect()
                    return fn(self.conn)
                except (imaplib.IMAP4.abort, OSError, EOFError):
                    self._drop()
                    if attempt:
                        raise MailError("Lost connection to iCloud. Check your network and try again.")

    def _select(self, c, folder):
        if self.selected == folder:
            c.noop()  # pick up new mail on the already-selected folder
            return
        typ, _ = c.select(mbox(folder))
        if typ != "OK":
            raise MailError(f"Couldn't open folder “{folder}”")
        self.selected = folder

    # operations ---------------------------------------------------------------
    def folders(self):
        def op(c):
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
        return self.run(op)

    def role_folder(self, role):
        if role not in self.roles:
            self.folders()
        if role not in self.roles:
            raise MailError(f"Your account has no {role} folder")
        return self.roles[role]

    def list_messages(self, folder, page=0, query=""):
        def op(c):
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
            msgs = []
            if chunk:
                typ, data = c.uid(
                    "FETCH", ",".join(map(str, chunk)),
                    "(UID FLAGS INTERNALDATE RFC822.SIZE "
                    "BODY.PEEK[HEADER.FIELDS (FROM TO SUBJECT DATE CONTENT-TYPE CONTENT-TRANSFER-ENCODING)] "
                    "BODY.PEEK[TEXT]<0.4096>)",
                )
                parsed = parse_fetch(data)
                msgs = [summarize(u, folder, parsed[u]) for u in chunk if u in parsed]
            return {"folder": folder, "page": page, "pageSize": PAGE_SIZE, "total": len(uids), "messages": msgs}
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
                with open(os.path.join(STATIC_DIR, "index.html"), "rb") as f:
                    return self._send(200, f.read(), "text/html; charset=utf-8")

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
                if not mail:
                    return self._json({"setupRequired": True})
                return self._json({"email": cfg["email"], "name": cfg.get("name", "")})
            if not mail:
                return self._json({"error": "Not signed in", "setupRequired": True}, 409)
            if path == "/api/folders":
                return self._api(mail.folders)
            if path == "/api/messages":
                return self._api(lambda: mail.list_messages(
                    qs.get("folder", "INBOX"), max(0, int(qs.get("page", 0))), qs.get("q", "").strip()))
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
            }
            if path not in routes:
                return self._json({"error": "Unknown endpoint"}, 404)
            self._api(routes[path])

    return Handler


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
