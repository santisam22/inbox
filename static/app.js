"use strict";

// ------------------------------------------------------------------ icons
const ICONS = {
  menu: "M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z",
  mail: "M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z",
  read: "M21.99 8c0-.72-.37-1.35-.94-1.7L12 1 2.95 6.3C2.38 6.65 2 7.28 2 8v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2l-.01-10zM12 13L3.74 7.84 12 3l8.26 4.84L12 13z",
  search: "M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
  close: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
  help: "M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z",
  edit: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z",
  inbox: "M19 3H4.99c-1.11 0-1.98.89-1.98 2L3 19c0 1.1.88 2 1.99 2H19c1.1 0 2-.9 2-2V5c0-1.11-.9-2-2-2zm0 12h-4c0 1.66-1.35 3-3 3s-3-1.34-3-3H4.99V5H19v10z",
  sent: "M2.01 21L23 12 2.01 3 2 10l15 2-15 2z",
  drafts: "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
  trash: "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
  archive: "M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z",
  junk: "M15.73 3H8.27L3 8.27v7.46L8.27 21h7.46L21 15.73V8.27L15.73 3zM12 17.3c-.72 0-1.3-.58-1.3-1.3 0-.72.58-1.3 1.3-1.3.72 0 1.3.58 1.3 1.3 0 .72-.58 1.3-1.3 1.3zm1-4.3h-2V7h2v6z",
  folder: "M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z",
  move: "M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6 12v-3h-4v-4h4V8l5 5-5 5z",
  star: "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z",
  starOutline: "M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z",
  refresh: "M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z",
  back: "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z",
  left: "M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z",
  right: "M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z",
  reply: "M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z",
  replyAll: "M7 8V5l-7 7 7 7v-3l-4-4 4-4zm6 1V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z",
  forward: "M12 8V4l8 8-8 8v-4H4V8z",
  attach: "M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z",
  download: "M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z",
  minimize: "M6 19h12v2H6z",
  maximize: "M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z",
  settings: "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z",
  palette: "M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z",
  layout: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
  tune: "M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z",
  bell: "M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z",
  shield: "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z",
  info: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z",
  label: "M17.63 5.84C17.27 5.33 16.67 5 16 5L5 5.01C3.9 5.01 3 5.9 3 7v10c0 1.1.9 1.99 2 1.99L16 19c.67 0 1.27-.33 1.63-.84L22 12l-4.37-6.16z",
  caret: "M7 10l5 5 5-5z",
  more: "M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z",
  doneAll: "M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z",
  sweep: "M15 16h4v2h-4zm0-8h7v2h-7zm0 4h6v2h-6zM3 18c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V8H3v10zM14 5h-3l-1-1H6L5 5H2v2h12z",
  lock: "M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z",
  up: "M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z",
  down: "M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z",
  add: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
  receipt: "M18 17H6v-2h12v2zm0-4H6v-2h12v2zm0-4H6V7h12v2zM3 22l1.5-1.5L6 22l1.5-1.5L9 22l1.5-1.5L12 22l1.5-1.5L15 22l1.5-1.5L18 22l1.5-1.5L21 22V2l-1.5 1.5L18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7.5 3.5 6 2 4.5 3.5 3 2v20z",
  school: "M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z",
  work: "M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z",
  person: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
  tag: "M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z",
  image: "M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z",
  file: "M6 2c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6H6zm7 7V3.5L18.5 9H13z",
};
const icon = (name, cls = "") => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[name]}"/></svg>`;

// ------------------------------------------------------------------ utils
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const enc = encodeURIComponent;

const store = {
  get(key, fallback) { try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ } },
};

async function api(path, body) {
  const opts = { headers: { "X-Requested-With": "icloud-mail" } };
  if (body !== undefined) {
    opts.method = "POST";
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  let res;
  try { res = await fetch(path, opts); } catch { throw new Error("Can't reach the mail server. Is it still running?"); }
  let data = {};
  try { data = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function fmtListDate(ms) {
  if (!ms) return "";
  const d = new Date(ms), now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (d.getFullYear() === now.getFullYear()) return d.toLocaleDateString([], { month: "short", day: "numeric" });
  return d.toLocaleDateString([], { year: "2-digit", month: "numeric", day: "numeric" });
}
function fmtFullDate(ms) {
  if (!ms) return "";
  return new Date(ms).toLocaleString([], { weekday: "short", year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
function fmtAgo(ms) {
  const mins = Math.round((Date.now() - ms) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.round(hrs / 24);
  return days < 30 ? `${days} day${days === 1 ? "" : "s"} ago` : "";
}
function fmtSize(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
function hue(str) { let h = 0; for (const c of str || "") h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 360; }
function avatar(addr, cls = "") {
  const label = (addr?.name || addr?.email || "?").trim();
  const letter = (label.match(/[\p{L}\p{N}]/u) || ["?"])[0].toUpperCase();
  return `<span class="avatar ${cls}" style="background:hsl(${hue(addr?.email || label)} 45% 45%)">${esc(letter)}</span>`;
}
const addrName = (a) => a ? (a.name || a.email || "(unknown)") : "(unknown)";
const addrFull = (a) => a.name ? `${a.name} <${a.email}>` : a.email;
const isMe = (a) => state.me && a.email && a.email.toLowerCase() === state.me.email.toLowerCase();
function listNames(list) {
  return list.map((a) => (isMe(a) ? "me" : a.name ? a.name.split(" ")[0] : a.email)).join(", ");
}

// ------------------------------------------------------------------ state & routing
const state = {
  me: null,
  folders: [],
  roles: {},
  folder: "INBOX",
  page: 0,
  query: "",
  list: null,
  loading: false,
  selected: new Set(),
  cursor: 0,
  message: null,
  messageError: null,
  view: "list",
  settings: {},
  listFromCache: false,
  category: "",
  catStatus: { unread: {}, indexing: null },
  listStale: false,   // set when sorting rules change, so a tab is re-fetched instead of re-shown
  renamingFolder: null,
  creatingFolder: false,
  native: { notifications: null, login: null },  // reported by Inbox.app
};
// Settings is one page with a section menu: #settings/<section>.
const SETTINGS_SECTIONS = [
  ["appearance", "Appearance", "palette", "Theme, accent color and background."],
  ["layout", "Layout", "layout", "How dense the message list is, and text size."],
  ["toolbar", "Toolbar", "tune", "The tools above your messages, and their order."],
  ["tabs", "Inbox tabs", "label", "Sort your Inbox into tabs by keywords and senders."],
  ["notifications", "Notifications", "bell", "Alerts for new email."],
  ["privacy", "Privacy", "shield", "Images and tracking."],
  ["account", "Account", "person", "Your account and profile photo."],
  ["about", "About", "info", "Version and updates."],
];
const isSettingsHash = (h) => h.startsWith("#settings") || h === "#categories";
let listToken = 0;
let settingsReturnHash = "#f=INBOX";

const ROLE_LABEL = { inbox: "Inbox", drafts: "Drafts", sent: "Sent", archive: "Archive", junk: "Spam", trash: "Trash" };
const folderLabel = (name) => {
  const f = state.folders.find((x) => x.name === name);
  return f?.role ? ROLE_LABEL[f.role] : name;
};
const folderIcon = (f) => ({ inbox: "inbox", drafts: "drafts", sent: "sent", archive: "archive", junk: "junk", trash: "trash" })[f.role] || "folder";
const inRole = (role) => state.roles[role] === state.folder;

function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  return { folder: p.get("f") || "INBOX", page: Math.max(0, +p.get("p") || 0), query: p.get("q") || "",
    uid: p.get("m") ? +p.get("m") : null, category: p.get("c") || "" };
}
function go(change) {
  const n = { ...readHash(), ...change };
  const p = new URLSearchParams();
  p.set("f", n.folder);
  if (n.page) p.set("p", n.page);
  if (n.query) p.set("q", n.query);
  if (n.category && !n.query) p.set("c", n.category);
  if (n.uid) p.set("m", n.uid);
  const hash = "#" + p.toString();
  if (location.hash === hash) route(); else location.hash = hash;
}

async function route() {
  if (location.hash === "#categories") { location.replace("#settings/tabs"); return; }  // older links
  if (location.hash.startsWith("#settings")) {
    const section = location.hash.split("/")[1];
    state.settingsSection = SETTINGS_SECTIONS.some(([id]) => id === section) ? section : (state.settingsSection || "appearance");
    state.view = "settings";
    document.body.classList.remove("nav-open");
    render();
    return;
  }
  const h = readHash();
  if (h.category && !enabledCategories().some((c) => c.id === h.category)) h.category = "";
  const listChanged = h.folder !== state.folder || h.page !== state.page || h.query !== state.query
    || h.category !== state.category || !state.list || state.listStale;
  if (h.folder !== state.folder || h.query !== state.query || h.category !== state.category) { state.selected.clear(); state.cursor = 0; }
  Object.assign(state, { folder: h.folder, page: h.page, query: h.query, category: h.category });
  $("#searchInput").value = h.query;
  $("#clearSearch").classList.toggle("hidden", !h.query);
  document.body.classList.remove("nav-open");
  renderFolders();
  if (h.uid) {
    if (listChanged) loadList();
    await openMessage(h.uid);
  } else {
    state.view = "list";
    state.message = null;
    render();
    if (listChanged) await loadList();
  }
}

// ------------------------------------------------------------------ data loading
async function loadFolders() {
  try {
    state.folders = await api("/api/folders");
    state.roles = Object.fromEntries(state.folders.filter((f) => f.role).map((f) => [f.role, f.name]));
    renderFolders();
  } catch (e) {
    toast(e.message);
  }
}

async function loadList({ quiet = false } = {}) {
  const token = ++listToken;
  state.listStale = false;
  if (!quiet) { state.loading = true; if (state.view === "list") render(); }
  try {
    const category = inCategoryTabs() ? state.category : "";
    const data = await api(`/api/messages?folder=${enc(state.folder)}&page=${state.page}&q=${enc(state.query)}&category=${enc(category)}`);
    if (token !== listToken) return;
    state.list = data;
    if (data.previewsPending?.length) fillPreviews(token, data);
    if (data.indexing && !data.indexing.complete) {
      // First-time sorting is still running: refresh this tab as more mail is sorted.
      clearTimeout(loadList.indexTimer);
      loadList.indexTimer = setTimeout(() => {
        if (state.view === "list" && state.list === data) { loadList({ quiet: true }); loadCategoryStatus(); }
      }, 3000);
    }
    const uids = new Set(data.messages.map((m) => m.uid));
    state.selected = new Set([...state.selected].filter((u) => uids.has(u)));
    state.cursor = Math.min(state.cursor, Math.max(0, data.messages.length - 1));
  } catch (e) {
    if (token !== listToken) return;
    state.list = { messages: [], total: 0, page: state.page, pageSize: 50, error: e.message };
  } finally {
    if (token === listToken) {
      state.loading = false;
      if (state.view === "list") render(); else renderToolbar();
    }
  }
}

async function openMessage(uid) {
  state.view = "message";
  state.messageError = null;
  if (!state.message || state.message.uid !== uid || state.message.folder !== state.folder) state.message = { uid, folder: state.folder, loading: true };
  render();
  try {
    const msg = await api(`/api/message?folder=${enc(state.folder)}&uid=${uid}`);
    if (readHash().uid !== uid) return;
    state.message = msg;
    const row = state.list?.messages.find((m) => m.uid === uid);
    if (row && !row.seen) {
      row.seen = true;
      const f = state.folders.find((x) => x.name === state.folder);
      if (f && f.unread > 0) { f.unread--; renderFolders(); }
    }
    const idx = state.list?.messages.findIndex((m) => m.uid === uid);
    if (idx >= 0) state.cursor = idx;
  } catch (e) {
    state.messageError = e.message;
  }
  render();
}

/** Preview text arrives separately (it's slow for older mail), 25 rows at a time. */
async function fillPreviews(token, data) {
  const pending = [...data.previewsPending];
  while (pending.length) {
    const batch = pending.splice(0, 25);
    let got;
    try { got = await api(`/api/previews?folder=${enc(data.folder)}&uids=${batch.join(",")}`); } catch { return; }
    if (token !== listToken || state.list !== data) return;
    for (const m of data.messages) if (got[m.uid] !== undefined) m.snippet = got[m.uid];
    if (state.view === "list") renderList();
  }
}

// ------------------------------------------------------------------ categories (Inbox tabs)
const CATEGORY_ICONS = { transactions: "receipt", school: "school", work: "work", person: "person", ads: "tag" };
const enabledCategories = () => (state.settings.categories || []).filter((c) => c.enabled);
const inCategoryTabs = () => state.folder === (state.roles.inbox || "INBOX") && !state.query && enabledCategories().length > 0;
const categoryName = (id) => (state.settings.categories || []).find((c) => c.id === id)?.name || "All mail";

async function loadCategoryStatus() {
  if (!enabledCategories().length) return;
  try {
    state.catStatus = await api("/api/categories");
    renderTabs();
    if (state.catStatus.indexing && !state.catStatus.indexing.complete) {
      clearTimeout(loadCategoryStatus.timer);
      loadCategoryStatus.timer = setTimeout(loadCategoryStatus, 3000);
    }
  } catch { /* counts are a nicety */ }
}

function renderTabs() {
  const bar = $("#tabs");
  const show = state.view === "list" && inCategoryTabs();
  bar.classList.toggle("hidden", !show);
  if (!show) return;
  const unread = state.catStatus.unread || {};
  const tab = (id, name, ic, count) => `<button class="tab ${state.category === id ? "on" : ""}" role="tab" aria-selected="${state.category === id}" data-tab="${esc(id)}">
    ${icon(ic)}<span>${esc(name)}</span>${count ? `<span class="badge">${count > 999 ? "999+" : count}</span>` : ""}</button>`;
  bar.innerHTML = tab("", "All mail", "inbox", 0)
    + enabledCategories().map((c) => tab(c.id, c.name, CATEGORY_ICONS[c.id] || "label", unread[c.id] || 0)).join("");
}

// ------------------------------------------------------------------ toolbar tools
// Each tool shows when it applies: "none" = nothing selected, "selection" = messages selected.
// Which tools appear, and their order, comes from Settings → Toolbar; the rest live in "More".
const selectedMsgs = () => (state.list?.messages || []).filter((m) => state.selected.has(m.uid));
const TOOLS = {
  refresh: { label: "Refresh", icon: "refresh", when: "none", run: () => { loadFolders(); loadList(); loadCategoryStatus(); } },
  markAllRead: { label: "Mark all as read", icon: "doneAll", when: "none", run: () => markAllRead() },
  emptyFolder: { label: () => (inRole("junk") ? "Empty Spam" : "Empty Trash"), icon: "sweep", when: "none",
    show: () => inRole("trash") || inRole("junk"), run: () => emptyFolder() },
  archive: { label: "Archive (e)", icon: "archive", when: "selection", show: () => state.roles.archive && !inRole("archive"), run: () => moveAction("archive") },
  spam: { label: "Report spam (!)", icon: "junk", when: "selection", show: () => state.roles.junk && !inRole("junk"), run: () => moveAction("spam") },
  delete: { label: () => (inRole("trash") ? "Delete forever (#)" : "Delete (#)"), icon: "trash", when: "selection", run: () => moveAction("delete") },
  markRead: { label: "Mark as read (Shift+I)", icon: "read", when: "selection", show: () => selectedMsgs().some((m) => !m.seen),
    run: () => { setFlag("\\Seen", true); state.selected.clear(); } },
  markUnread: { label: "Mark as unread (Shift+U)", icon: "mail", when: "selection", show: () => selectedMsgs().some((m) => m.seen),
    run: () => { setFlag("\\Seen", false); state.selected.clear(); } },
  star: { label: "Star", icon: "star", when: "selection", show: () => selectedMsgs().some((m) => !m.flagged), run: () => setFlag("\\Flagged", true) },
  unstar: { label: "Remove star", icon: "starOutline", when: "selection", show: () => selectedMsgs().some((m) => m.flagged), run: () => setFlag("\\Flagged", false) },
  move: { label: "Move to", icon: "move", when: "selection", run: (anchor) => showMoveMenu(anchor) },
  senderTab: { label: "Assign sender to a tab", icon: "label", when: "selection", show: () => enabledCategories().length > 0,
    run: (anchor) => showSenderMenu(anchor, selectedMsgs().map((m) => m.from?.[0]?.email)) },
};
const toolLabel = (id) => { const l = TOOLS[id].label; return typeof l === "function" ? l() : l; };
const toolApplies = (id, context) => TOOLS[id] && TOOLS[id].when === context && (!TOOLS[id].show || TOOLS[id].show());

function toolbarTools(context) {
  const order = state.settings.toolbar || Object.keys(TOOLS).map((id) => ({ id, on: true }));
  const applicable = order.filter((t) => toolApplies(t.id, context));
  return { shown: applicable.filter((t) => t.on).map((t) => t.id), hidden: applicable.filter((t) => !t.on).map((t) => t.id) };
}

function runTool(id, anchor) {
  TOOLS[id]?.run(anchor);
}

function showSelectMenu(anchor) {
  const msgs = state.list?.messages || [];
  const pick = (fn) => () => { state.selected = new Set(msgs.filter(fn).map((m) => m.uid)); render(); };
  showMenu(anchor, null, [
    { label: "All", icon: "doneAll", run: pick(() => true) },
    { label: "None", icon: "close", run: pick(() => false) },
    { label: "Read", icon: "read", run: pick((m) => m.seen) },
    { label: "Unread", icon: "mail", run: pick((m) => !m.seen) },
    { label: "Starred", icon: "star", run: pick((m) => m.flagged) },
    { label: "Unstarred", icon: "starOutline", run: pick((m) => !m.flagged) },
  ]);
}

function showMoreMenu(anchor) {
  const { hidden } = toolbarTools(state.selected.size ? "selection" : "none");
  showMenu(anchor, null, [
    ...hidden.map((id) => ({ label: toolLabel(id).replace(/ \(.*\)$/, ""), icon: TOOLS[id].icon, run: () => runTool(id, anchor) })),
    { label: "Customize toolbar…", icon: "settings", run: () => openSettings("toolbar") },
  ]);
}

async function markAllRead() {
  const where = state.category ? categoryName(state.category) : folderLabel(state.folder);
  try {
    const r = await api("/api/mark-all-read", { folder: state.folder, category: inCategoryTabs() ? state.category : "" });
    for (const m of state.list?.messages || []) m.seen = true;
    render();
    toast(r.marked ? `Marked ${r.marked.toLocaleString()} message${r.marked === 1 ? "" : "s"} as read in ${where}.` : `Everything in ${where} is already read.`);
  } catch (e) {
    toast(e.message);
  }
  loadFolders();
  loadCategoryStatus();
}

async function emptyFolder() {
  const name = inRole("junk") ? "Spam" : "Trash";
  const count = state.list?.total || 0;
  if (!count) return toast(`${name} is already empty.`);
  if (!confirm(`Permanently delete all ${count.toLocaleString()} message${count === 1 ? "" : "s"} in ${name}? This can't be undone.`)) return;
  try {
    const r = await api("/api/empty", { folder: state.folder });
    toast(`Deleted ${r.deleted.toLocaleString()} message${r.deleted === 1 ? "" : "s"} from ${name}.`);
  } catch (e) {
    toast(e.message);
  }
  loadList();
  loadFolders();
}

// ------------------------------------------------------------------ rendering
function render() {
  renderToolbar();
  renderTabs();
  if (state.view === "settings") renderSettings();
  else if (state.view === "message") renderMessage();
  else renderList();
}

function renderFolders() {
  const ul = $("#folderList");
  const roleFolders = state.folders.filter((f) => f.role);
  const custom = state.folders.filter((f) => !f.role);
  const editRow = (attr, value, placeholder) => `<li class="editing"><span class="folder-edit">${icon("folder")}
    <input class="folder-input" ${attr} value="${esc(value)}" placeholder="${placeholder}" maxlength="100" aria-label="Folder name"></span></li>`;
  const item = (f) => {
    if (state.renamingFolder === f.name) return editRow(`data-folder-rename="${esc(f.name)}"`, f.name, "Folder name");
    const showCount = f.unread > 0 && !["sent", "trash", "drafts"].includes(f.role);
    return `<li><a href="#f=${enc(f.name)}" class="${f.name === state.folder && !state.query ? "active" : ""}" data-folder="${esc(f.name)}" title="${esc(f.role ? ROLE_LABEL[f.role] : f.name)}">
      ${coloredIcon(folderIcon(f), folderColor(f.name))}<span class="name">${esc(f.role ? ROLE_LABEL[f.role] : f.name)}</span>
      ${showCount ? `<span class="count">${f.unread.toLocaleString()}</span>` : ""}</a>
      <button class="folder-more" data-folder-menu="${esc(f.name)}" title="Folder options" aria-label="Options for ${esc(f.role ? ROLE_LABEL[f.role] : f.name)}">${icon("more")}</button></li>`;
  };
  // Keep a half-typed folder name if the list refreshes while you're editing.
  const editing = $(".folder-input", ul);
  const typed = editing?.value;
  if (editing) editing.dataset.done = "1";
  ul.innerHTML = roleFolders.map(item).join("")
    + `<li class="folders-head"><span>Folders</span><button class="icon-btn" data-folder-new title="New folder" aria-label="New folder">${icon("add")}</button></li>`
    + custom.map(item).join("")
    + (state.creatingFolder ? editRow("data-folder-create", "", "New folder name") : "");
  const input = $(".folder-input", ul);
  if (input) {
    if (typed !== undefined) input.value = typed;
    input.focus();
    if (typed === undefined) input.select();
  }
  const inbox = state.folders.find((f) => f.role === "inbox");
  // The window (or browser tab) is named after the signed-in account; unread mail shows on the Dock badge.
  document.title = state.me?.email || "Inbox";
  window.webkit?.messageHandlers?.badge?.postMessage(String(inbox?.unread || 0));
}

function renderToolbar() {
  const tb = $("#toolbar");
  const list = state.list;
  const btn = (action, ic, title, extra = "") => `<button class="icon-btn" data-action="${action}" title="${title}" ${extra}>${icon(ic)}</button>`;
  const destructive = () => {
    const out = [];
    if (!inRole("archive") && state.roles.archive) out.push(btn("archive", "archive", "Archive (e)"));
    if (!inRole("junk") && state.roles.junk) out.push(btn("spam", "junk", "Report spam (!)"));
    out.push(btn("delete", "trash", inRole("trash") ? "Delete forever (#)" : "Delete (#)"));
    return out.join("");
  };

  if (state.view === "settings") {
    tb.innerHTML = `${btn("closeSettings", "back", "Back to mail (Esc)")}<span class="settings-title">Settings</span>`;
    return;
  }

  if (state.view === "message") {
    const msgs = list?.messages || [];
    const idx = msgs.findIndex((m) => m.uid === state.message?.uid);
    const pos = idx >= 0 ? `${(list.page * list.pageSize + idx + 1).toLocaleString()} of ${list.total.toLocaleString()}` : "";
    tb.innerHTML = `${btn("back", "back", `Back to ${esc(folderLabel(state.folder))} (u)`)}
      <span class="divider"></span>${destructive()}
      <span class="divider"></span>${btn("unread", "mail", "Mark as unread (Shift+U)")}${btn("moveMenu", "move", "Move to")}
      ${(state.settings.categories || []).some((c) => c.enabled) ? btn("senderMenu", "label", "Move sender to tab") : ""}
      <span class="spacer"></span><span class="range">${pos}</span>
      ${btn("newer", "left", "Newer (k)", idx > 0 ? "" : "disabled")}${btn("older", "right", "Older (j)", idx >= 0 && idx < msgs.length - 1 ? "" : "disabled")}`;
    return;
  }

  const msgs = list?.messages || [];
  const n = state.selected.size;
  const all = n > 0 && n === msgs.length;
  const start = list && list.total ? list.page * list.pageSize + 1 : 0;
  const end = list ? Math.min(list.total, (list.page + 1) * list.pageSize) : 0;
  const { shown } = toolbarTools(n ? "selection" : "none");
  tb.innerHTML = `<span class="select-group"><label class="checkbox" title="Select all"><input type="checkbox" data-action="selectAll" ${all ? "checked" : ""}></label><button class="caret-btn" data-action="selectMenu" title="Select">${icon("caret")}</button></span>
    ${shown.map((id) => `<button class="icon-btn" data-tool="${id}" title="${esc(toolLabel(id))}">${icon(TOOLS[id].icon)}</button>`).join("")}
    ${btn("moreMenu", "more", "More")}
    ${n ? `<span class="sel-count">${n} selected</span>` : ""}
    <span class="spacer"></span>
    ${list && list.total ? `<span class="range">${start.toLocaleString()}–${end.toLocaleString()} of ${list.total.toLocaleString()}</span>` : ""}
    ${btn("prevPage", "left", "Newer", state.page > 0 ? "" : "disabled")}${btn("nextPage", "right", "Older", list && end < list.total ? "" : "disabled")}`;
  const cb = $('[data-action="selectAll"]', tb);
  if (cb) cb.indeterminate = n > 0 && !all;
}

function renderList() {
  const view = $("#view");
  const list = state.list;
  let html = state.loading ? `<div class="loading-bar"></div>` : "";
  const ix = list?.indexing;
  const sorting = ix && !ix.complete;
  if (sorting) {
    const pct = ix.total ? Math.min(99, Math.floor((100 * ix.indexed) / ix.total)) : 0;
    html += `<div class="index-note"><span class="spinner"></span>Sorting your mail into tabs for the first time… ${pct}%. Newest mail is sorted first.</div>`;
  }
  if (list?.error) {
    html += `<div class="error-box">${esc(list.error)}</div>`;
  } else if (list && !list.messages.length && !state.loading && !sorting) {
    const where = state.category && inCategoryTabs() ? `${esc(categoryName(state.category))}. Edit its keywords in Categories to sort more mail here` : esc(folderLabel(state.folder));
    html += `<div class="empty">${icon(state.query ? "search" : "inbox")}${state.query ? "No messages matched your search." : `No messages in ${where}.`}</div>`;
  } else if (list) {
    const showTo = inRole("sent") || inRole("drafts");
    const ownFolder = state.folders.find((f) => f.name === state.folder && !f.role);
    const badge = ownFolder ? folderBadge(ownFolder.name) : "";
    html += list.messages.map((m, i) => {
      const who = showTo ? `To: ${listNames(m.to) || "(no recipients)"}` : addrName(m.from[0]);
      return `<div class="row ${m.seen ? "" : "unread"} ${state.selected.has(m.uid) ? "selected" : ""} ${i === state.cursor ? "cursor" : ""}" data-uid="${m.uid}" data-index="${i}">
        <label class="checkbox"><input type="checkbox" data-action="select" ${state.selected.has(m.uid) ? "checked" : ""}></label>
        <button class="star ${m.flagged ? "on" : ""}" data-action="star" title="${m.flagged ? "Starred" : "Not starred"}">${icon(m.flagged ? "star" : "starOutline")}</button>
        <div class="sender" title="${esc(m.from.map(addrFull).join(", "))}">${esc(who)}</div>
        <div class="content">${badge}<span class="subject">${esc(m.subject || "(no subject)")}</span>${m.snippet ? `<span class="snippet"> — ${esc(m.snippet)}</span>` : ""}</div>
        ${m.hasAttachments ? `<span class="att" title="Has attachments">${icon("attach")}</span>` : ""}
        <div class="date" title="${esc(fmtFullDate(m.date))}">${esc(fmtListDate(m.date))}</div>
        <div class="hover-actions">
          ${state.roles.archive && !inRole("archive") ? `<button class="icon-btn" data-action="rowArchive" title="Archive">${icon("archive")}</button>` : ""}
          <button class="icon-btn" data-action="rowDelete" title="Delete">${icon("trash")}</button>
          <button class="icon-btn" data-action="rowToggleRead" title="${m.seen ? "Mark as unread" : "Mark as read"}">${icon(m.seen ? "mail" : "read")}</button>
        </div>
      </div>`;
    }).join("");
  }
  view.innerHTML = html;
}

function remoteContent(html) {
  return /<img[^>]+src\s*=\s*["']?\s*(https?:)?\/\//i.test(html) || /url\(\s*["']?\s*(https?:)?\/\//i.test(html) || /background\s*=\s*["']?https?:/i.test(html);
}

function emailDocument(html, allowImages) {
  // The iframe is sandboxed without scripts; this CSP additionally blocks remote
  // images (tracking pixels), fonts, stylesheets and everything else by default.
  const csp = `default-src 'none'; style-src 'unsafe-inline'; font-src data:; img-src data:${allowImages ? " https: http:" : ""}`;
  return `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="referrer" content="no-referrer"><base target="_blank">
<style>html,body{margin:0;padding:0;background:#fff;color:#222}body{font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;overflow-wrap:anywhere;padding:4px}img{max-width:100%;height:auto}pre{white-space:pre-wrap}table{max-width:100%}</style>
</head><body>${html}</body></html>`;
}

function linkify(text) {
  return esc(text).replace(/\bhttps?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]]/g, (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
}

function renderMessage() {
  const view = $("#view");
  const m = state.message;
  if (state.messageError) { view.innerHTML = `<div class="error-box">${esc(state.messageError)}</div>`; return; }
  if (!m || m.loading) { view.innerHTML = `<div class="loading-bar"></div>`; return; }

  const from = m.from[0] || { name: "", email: "" };
  const trusted = store.get("trustedSenders", []);
  const allowImages = m.showImages || state.settings.remoteImages || trusted.includes(from.email?.toLowerCase());
  const hasRemote = m.html && remoteContent(m.html);
  const recips = [...m.to.map((a) => ["to", a]), ...m.cc.map((a) => ["cc", a])];
  const recipText = [m.to.length ? `to ${listNames(m.to)}` : "", m.cc.length ? `cc ${listNames(m.cc)}` : ""].filter(Boolean).join(", ");
  const showChip = state.query || !inRole("inbox");

  view.innerHTML = `<article class="msg">
    <h1><span>${esc(m.subject || "(no subject)")}</span>${showChip ? (state.folders.some((f) => f.name === state.folder && !f.role) ? folderBadge(state.folder) : `<span class="folder-chip">${esc(folderLabel(state.folder))}</span>`) : ""}</h1>
    <div class="msg-head">
      ${avatar(from, "lg")}
      <div class="who">
        <div><b>${esc(from.name || from.email)}</b> ${from.name ? `<span class="addr">&lt;${esc(from.email)}&gt;</span>` : ""}</div>
        <div class="recips" title="${esc(recips.map(([k, a]) => `${k}: ${addrFull(a)}`).join("\n"))}">${esc(recipText)}</div>
      </div>
      <div class="when" title="${esc(fmtFullDate(m.date))}">${esc(fmtFullDate(m.date))}${m.date && fmtAgo(m.date) ? ` (${esc(fmtAgo(m.date))})` : ""}</div>
      <div class="actions">
        <button class="icon-btn star ${m.flagged ? "on" : ""}" data-action="star" title="Star (s)">${icon(m.flagged ? "star" : "starOutline")}</button>
        <button class="icon-btn" data-action="reply" title="Reply (r)">${icon("reply")}</button>
      </div>
    </div>
    ${hasRemote && !allowImages ? `<div class="images-banner">Images are not displayed to protect your privacy.
        <button data-action="showImages">Display images below</button>
        ${from.email ? `<button data-action="trustSender">Always display images from ${esc(from.email)}</button>` : ""}</div>` : ""}
    <div class="msg-body">${m.html ? `<iframe sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox" title="Message body"></iframe>` : `<div class="plain">${linkify(m.text || "")}</div>`}</div>
    ${m.attachments.length ? `<div class="attachments"><div class="title">${m.attachments.length} attachment${m.attachments.length === 1 ? "" : "s"}</div>
      ${m.attachments.map((a) => `<button class="chip" data-action="download" data-index="${a.index}" title="Download ${esc(a.filename)}">
        ${icon("file")}<span class="meta"><span class="fname">${esc(a.filename)}</span><span class="fsize">${fmtSize(a.size)}</span></span>${icon("download")}</button>`).join("")}</div>` : ""}
    <div class="reply-bar">
      <button class="pill" data-action="reply">${icon("reply")}Reply</button>
      ${m.to.length + m.cc.length > 1 ? `<button class="pill" data-action="replyAll">${icon("replyAll")}Reply all</button>` : ""}
      <button class="pill" data-action="forward">${icon("forward")}Forward</button>
    </div>
  </article>`;

  const frame = $("iframe", view);
  if (frame) {
    frame.addEventListener("load", () => {
      const doc = frame.contentDocument;
      if (!doc) return;
      for (const a of doc.querySelectorAll("a[href]")) { a.target = "_blank"; a.rel = "noopener noreferrer"; }
      const fit = () => { frame.style.height = doc.documentElement.scrollHeight + "px"; };
      fit();
      new ResizeObserver(fit).observe(doc.documentElement);
      doc.addEventListener("keydown", onKey);
      doc.addEventListener("contextmenu", (e) => e.preventDefault());  // no right-click menu in email bodies
    });
    frame.srcdoc = emailDocument(m.html, allowImages);
  }
  view.scrollTop = 0;
}

// ------------------------------------------------------------------ actions
function targets() {
  if (state.view === "message" && state.message?.uid) return [state.message.uid];
  if (state.selected.size) return [...state.selected];
  const m = state.list?.messages[state.cursor];
  return m ? [m.uid] : [];
}

function removeFromList(uids) {
  if (!state.list) return;
  const set = new Set(uids);
  const before = state.list.messages.length;
  state.list.messages = state.list.messages.filter((m) => !set.has(m.uid));
  state.list.total -= before - state.list.messages.length;
  uids.forEach((u) => state.selected.delete(u));
  state.cursor = Math.min(state.cursor, Math.max(0, state.list.messages.length - 1));
}

async function moveAction(kind, uids = targets(), dest) {
  if (!uids.length) return;
  if (kind === "delete" && inRole("trash") && !confirm(`Permanently delete ${uids.length} message${uids.length === 1 ? "" : "s"}? This can't be undone.`)) return;
  const folder = state.folder;
  const label = { archive: "archived", spam: "marked as spam", delete: inRole("trash") ? "deleted forever" : "moved to Trash", move: `moved to ${folderLabel(dest)}` }[kind];
  removeFromList(uids);
  if (state.view === "message") go({ uid: null }); else render();
  try {
    await api(`/api/${kind}`, { folder, uids, dest });
    toast(`${uids.length === 1 ? "Conversation" : `${uids.length} conversations`} ${label}.`);
  } catch (e) {
    toast(e.message);
  }
  loadFolders();
  loadCategoryStatus();
  if (state.view === "list" && state.folder === folder) loadList({ quiet: true });
}

async function setFlag(flag, on, uids = targets()) {
  if (!uids.length) return;
  const key = flag === "\\Seen" ? "seen" : "flagged";
  for (const m of state.list?.messages || []) if (uids.includes(m.uid)) m[key] = on;
  if (state.message && uids.includes(state.message.uid) && key === "flagged") state.message.flagged = on;
  render();
  try {
    await api("/api/flag", { folder: state.folder, uids, flag, on });
    if (key === "seen") { loadFolders(); loadCategoryStatus(); }
  } catch (e) {
    toast(e.message);
    loadList({ quiet: true });
  }
}

async function downloadAttachment(index) {
  const m = state.message;
  try {
    const res = await fetch(`/api/attachment?folder=${enc(m.folder)}&uid=${m.uid}&index=${index}`, { headers: { "X-Requested-With": "icloud-mail" } });
    if (!res.ok) throw new Error("Couldn't download the attachment.");
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = m.attachments.find((x) => x.index === index)?.filename || "attachment";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 30000);
  } catch (e) {
    toast(e.message);
  }
}

function showMoveMenu(anchor) {
  const uids = targets();
  if (!uids.length) return;
  const dests = state.folders.filter((f) => f.name !== state.folder && f.role !== "drafts");
  showMenu(anchor, "Move to:", dests.map((f) => ({
    label: f.role ? ROLE_LABEL[f.role] : f.name, icon: folderIcon(f), color: folderColor(f.name), run: () => moveAction("move", uids, f.name),
  })));
}

// ------------------------------------------------------------------ folders (sidebar)
const folderColor = (name) => state.settings.folderColors?.[name] || null;
const coloredIcon = (name, color) => (color ? icon(name).replace("<svg ", `<svg style="color:${color}" `) : icon(name));
const FOLDER_BADGE_DEFAULT = "#6b7280";

/** A colored badge with the folder's name, for emails in folders you made. */
function folderBadge(name) {
  const color = folderColor(name) || FOLDER_BADGE_DEFAULT;
  return `<span class="folder-badge" style="background:${color};color:${textOn(color)}">${esc(name)}</span>`;
}

function showFolderMenu(anchor, name) {
  const f = state.folders.find((x) => x.name === name);
  if (!f) return;
  const own = !f.role;
  const items = [];
  if (own) items.push({ label: "Rename", icon: "edit", run: () => { state.creatingFolder = false; state.renamingFolder = name; renderFolders(); } });
  items.push({ swatches: true, label: "Color", current: folderColor(name), run: (hex) => setFolderColor(name, hex) });
  items.push({ label: "Mark all as read", icon: "doneAll", run: () => markFolderRead(f) });
  if (f.role === "trash" || f.role === "junk") items.push({ label: f.role === "junk" ? "Empty Spam" : "Empty Trash", icon: "sweep", run: () => emptyNamedFolder(f) });
  if (own) items.push({ label: "Delete folder", icon: "trash", danger: true, run: () => deleteFolder(f) });
  showMenu(anchor, f.role ? ROLE_LABEL[f.role] : f.name, items);
}

function setFolderColor(name, hex) {
  const colors = { ...(state.settings.folderColors || {}) };
  if (hex) colors[name] = hex; else delete colors[name];
  updateSettings({ folderColors: colors });
}

async function markFolderRead(f) {
  try {
    const r = await api("/api/mark-all-read", { folder: f.name });
    if (state.folder === f.name) { for (const m of state.list?.messages || []) m.seen = true; render(); }
    toast(r.marked ? `Marked ${r.marked.toLocaleString()} as read in ${f.role ? ROLE_LABEL[f.role] : f.name}.` : "Everything there is already read.");
  } catch (e) { toast(e.message); }
  loadFolders();
  loadCategoryStatus();
}

async function emptyNamedFolder(f) {
  const label = f.role === "junk" ? "Spam" : "Trash";
  if (!f.total) return toast(`${label} is already empty.`);
  if (!confirm(`Permanently delete all ${f.total.toLocaleString()} message${f.total === 1 ? "" : "s"} in ${label}? This can't be undone.`)) return;
  try {
    const r = await api("/api/empty", { folder: f.name });
    toast(`Deleted ${r.deleted.toLocaleString()} message${r.deleted === 1 ? "" : "s"} from ${label}.`);
  } catch (e) { toast(e.message); }
  if (state.folder === f.name) loadList();
  loadFolders();
}

async function deleteFolder(f) {
  const n = f.total || 0;
  if (!confirm(`Delete the folder “${f.name}”?${n ? ` Its ${n.toLocaleString()} message${n === 1 ? "" : "s"} will be moved to Trash.` : ""}`)) return;
  try {
    const r = await api("/api/folders/delete", { name: f.name });
    toast(`Deleted “${f.name}”${r.moved ? `. ${r.moved.toLocaleString()} message${r.moved === 1 ? " was" : "s were"} moved to Trash` : ""}.`);
    state.settings = await api("/api/settings");
    if (state.folder === f.name) go({ folder: "INBOX", page: 0, query: "", uid: null, category: "" });
  } catch (e) { toast(e.message); }
  loadFolders();
}

async function commitFolderEdit(input) {
  if (input.dataset.done) return;
  input.dataset.done = "1";
  const value = input.value.trim();
  const old = input.dataset.folderRename;
  state.renamingFolder = null;
  state.creatingFolder = false;
  if (!value || value === old) { renderFolders(); return; }
  try {
    if (old) {
      const r = await api("/api/folders/rename", { name: old, newName: value });
      state.settings = await api("/api/settings");  // its color moved with it
      toast(`Renamed “${old}” to “${r.name}”.`);
      if (state.folder === old) go({ folder: r.name, page: 0, uid: null, category: "" });
    } else {
      const r = await api("/api/folders/create", { name: value });
      toast(`Created the folder “${r.name}”.`);
    }
  } catch (e) {
    toast(e.message);
  }
  await loadFolders();
}

document.addEventListener("keydown", (e) => {
  if (!e.target.matches?.(".folder-input")) return;
  if (e.key === "Enter") { e.preventDefault(); commitFolderEdit(e.target); }
  if (e.key === "Escape") {
    e.preventDefault();
    e.target.dataset.done = "1";
    state.renamingFolder = null;
    state.creatingFolder = false;
    renderFolders();
  }
});
document.addEventListener("focusout", (e) => { if (e.target.matches?.(".folder-input")) commitFolderEdit(e.target); });

function showMenu(anchor, title, items) {
  closeMenu();
  const host = $("#menuHost");
  const r = anchor.getBoundingClientRect();
  const swatchRow = (it, i) => `<div class="menu-swatches"><span>${esc(it.label)}</span>
    ${[["No color", ""], ...ACCENTS].map(([name, hex]) => `<button class="swatch ${(it.current || "") === hex ? "on" : ""}" data-i="${i}" data-hex="${hex}" title="${name}" aria-label="${name}"
      ${hex ? `style="background:${hex}"` : ""}>${hex ? "" : icon("close")}</button>`).join("")}</div>`;
  host.innerHTML = `<div class="menu" role="menu" style="top:${r.bottom + 4}px;left:${Math.min(r.left, innerWidth - 260)}px">
    ${title ? `<div class="menu-title">${esc(title)}</div>` : ""}
    ${items.map((it, i) => (it.swatches ? swatchRow(it, i)
      : `<button role="menuitem" class="${it.danger ? "danger" : ""}" data-i="${i}">${coloredIcon(it.icon, it.color)}${esc(it.label)}</button>`)).join("")}</div>`;
  const menu = $(".menu", host);
  // Open upward when there isn't room below (e.g. folders near the bottom of the sidebar).
  const box = menu.getBoundingClientRect();
  if (box.bottom > innerHeight - 8) menu.style.top = `${Math.max(8, r.top - box.height - 4)}px`;
  menu.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-i]");
    if (!b) return;
    closeMenu();
    if (b.dataset.hex !== undefined) items[+b.dataset.i].run(b.dataset.hex);
    else items[+b.dataset.i].run();
  });
  $("button", menu)?.focus();
  setTimeout(() => document.addEventListener("click", closeMenu, { once: true }));
}
function closeMenu() { $("#menuHost").innerHTML = ""; }

let toastTimer;
function toast(text, action, ms = 6000) {
  const el = $("#toast");
  el.innerHTML = `<span>${esc(text)}</span>${action ? `<button>${esc(action.label)}</button>` : ""}`;
  el.classList.remove("hidden");
  if (action) $("button", el).onclick = () => { hideToast(); action.run(); };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, ms);
}
function hideToast() { $("#toast").classList.add("hidden"); }

// ------------------------------------------------------------------ compose
let compose = null; // { el, data }

function quoteText(m) {
  const who = m.from[0] ? addrFull(m.from[0]) : "someone";
  const body = (m.text || "").replace(/\r/g, "").trimEnd().split("\n").map((l) => `> ${l}`).join("\n");
  return `\n\nOn ${fmtFullDate(m.date)}, ${who} wrote:\n${body}`;
}

function replyPrefill(kind) {
  const m = state.message;
  if (!m || m.loading) return null;
  const subj = m.subject || "";
  const base = { inReplyTo: m.messageId, references: m.references, replyUid: m.uid, replyFolder: m.folder };
  if (kind === "forward") {
    const header = ["---------- Forwarded message ---------",
      `From: ${m.from.map(addrFull).join(", ")}`, `Date: ${fmtFullDate(m.date)}`,
      `Subject: ${subj}`, `To: ${m.to.map(addrFull).join(", ")}`, m.cc.length ? `Cc: ${m.cc.map(addrFull).join(", ")}` : ""]
      .filter(Boolean).join("\n");
    return {
      subject: /^fwd?:/i.test(subj) ? subj : `Fwd: ${subj}`,
      body: `\n\n${header}\n\n${m.text || ""}`,
      forward: m.attachments.length ? { folder: m.folder, uid: m.uid, attachments: m.attachments.map((a) => ({ ...a })) } : null,
    };
  }
  const sentByMe = m.from[0] && isMe(m.from[0]);
  const to = sentByMe ? m.to : (m.replyTo.length ? m.replyTo : m.from);
  let cc = [];
  if (kind === "replyAll") {
    const seen = new Set(to.map((a) => a.email.toLowerCase()));
    cc = [...(sentByMe ? [] : m.to), ...m.cc].filter((a) => {
      const k = a.email.toLowerCase();
      if (!k || seen.has(k) || isMe(a)) return false;
      seen.add(k);
      return true;
    });
  }
  return {
    ...base,
    to: to.map(addrFull).join(", "),
    cc: cc.map(addrFull).join(", "),
    subject: /^re:/i.test(subj) ? subj : `Re: ${subj}`,
    body: quoteText(m),
  };
}

function composeDirty() {
  if (!compose) return false;
  const d = readCompose();
  return Boolean(d.to || d.cc || d.bcc || d.subject || d.body.trim() || d.attachments.length);
}

function openCompose(prefill = {}) {
  if (compose && composeDirty() && !confirm("Discard the message you're writing?")) return;
  closeCompose();
  const data = { to: "", cc: "", bcc: "", subject: "", body: "", attachments: [], forward: null, ...prefill };
  const el = document.createElement("section");
  el.className = "compose";
  el.setAttribute("aria-label", "New message");
  el.innerHTML = `
    <div class="compose-head" data-c="toggleMin"><span class="title">${esc(data.subject || "New Message")}</span>
      <button class="icon-btn" data-c="toggleMin" title="Minimize">${icon("minimize")}</button>
      <button class="icon-btn" data-c="toggleMax" title="Full screen">${icon("maximize")}</button>
      <button class="icon-btn" data-c="close" title="Save & close">${icon("close")}</button></div>
    <div class="field"><label for="c-to">To</label><input id="c-to" name="to" autocomplete="email" value="${esc(data.to)}">
      <span class="toggles"><button data-c="showCc" ${data.cc ? "hidden" : ""}>Cc</button><button data-c="showBcc">Bcc</button></span></div>
    <div class="field ${data.cc ? "" : "hidden"}" data-row="cc"><label for="c-cc">Cc</label><input id="c-cc" name="cc" value="${esc(data.cc)}"></div>
    <div class="field ${data.bcc ? "" : "hidden"}" data-row="bcc"><label for="c-bcc">Bcc</label><input id="c-bcc" name="bcc" value="${esc(data.bcc)}"></div>
    <div class="field"><input name="subject" placeholder="Subject" value="${esc(data.subject)}"></div>
    <textarea name="body" spellcheck="true"></textarea>
    <div class="att-list"></div>
    <div class="err hidden"></div>
    <div class="compose-foot">
      <button class="send-btn" data-c="send" title="Send (⌘Enter)">Send</button>
      <label class="icon-btn" title="Attach files">${icon("attach")}<input type="file" multiple hidden></label>
      <span class="spacer"></span>
      <button class="icon-btn" data-c="discard" title="Discard">${icon("trash")}</button>
    </div>`;
  $("textarea", el).value = data.body;
  $("#composeHost").appendChild(el);
  compose = { el, data };
  renderComposeAttachments();

  el.addEventListener("click", (e) => {
    const c = e.target.closest("[data-c]")?.dataset.c;
    if (!c) return;
    e.stopPropagation();
    if (c === "toggleMin") { if (e.target.closest(".icon-btn") || !el.classList.contains("max")) el.classList.toggle("min"); }
    if (c === "toggleMax") { el.classList.remove("min"); el.classList.toggle("max"); }
    if (c === "close") closeCompose();
    if (c === "discard") { if (!composeDirty() || confirm("Discard this message?")) closeCompose(); }
    if (c === "showCc" || c === "showBcc") {
      const row = $(`[data-row="${c === "showCc" ? "cc" : "bcc"}"]`, el);
      row.classList.remove("hidden"); e.target.hidden = true; $("input", row).focus();
    }
    if (c === "send") sendCompose();
  });
  $('input[name="subject"]', el).addEventListener("input", (e) => { $(".title", el).textContent = e.target.value || "New Message"; });
  $('input[type="file"]', el).addEventListener("change", async (e) => {
    for (const file of e.target.files) {
      const total = compose.data.attachments.reduce((s, a) => s + a.size, 0) + file.size;
      if (total > 20 * 1024 * 1024) { composeError("iCloud limits messages to 20 MB of attachments."); break; }
      const dataUrl = await new Promise((ok, fail) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = fail; r.readAsDataURL(file); });
      compose.data.attachments.push({ name: file.name, type: file.type || "application/octet-stream", size: file.size, data: dataUrl.split(",")[1] });
    }
    e.target.value = "";
    renderComposeAttachments();
  });
  el.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); sendCompose(); }
    if (e.key === "Escape") { e.preventDefault(); el.classList.add("min"); document.activeElement.blur(); }
  });
  const focus = data.to ? $("textarea", el) : $("#c-to", el);
  focus.focus();
  if (focus.tagName === "TEXTAREA") focus.setSelectionRange(0, 0);
}

function renderComposeAttachments() {
  const d = compose.data;
  const items = [
    ...(d.forward?.attachments || []).map((a, i) => ({ name: a.filename, size: a.size, kind: "fwd", i })),
    ...d.attachments.map((a, i) => ({ name: a.name, size: a.size, kind: "new", i })),
  ];
  const host = $(".att-list", compose.el);
  host.innerHTML = items.map((a) => `<span class="chip"><span class="meta"><span class="fname">${esc(a.name)}</span><span class="fsize">${fmtSize(a.size)}</span></span>
    <button class="icon-btn" data-kind="${a.kind}" data-i="${a.i}" title="Remove">${icon("close")}</button></span>`).join("");
  host.onclick = (e) => {
    const b = e.target.closest("button[data-kind]");
    if (!b) return;
    if (b.dataset.kind === "fwd") d.forward.attachments.splice(+b.dataset.i, 1); else d.attachments.splice(+b.dataset.i, 1);
    renderComposeAttachments();
  };
}

function readCompose() {
  const el = compose.el;
  const v = (n) => $(`[name="${n}"]`, el).value;
  return { ...compose.data, to: v("to").trim(), cc: v("cc").trim(), bcc: v("bcc").trim(), subject: v("subject"), body: v("body") };
}
function composeError(msg) {
  const err = $(".err", compose.el);
  err.textContent = msg;
  err.classList.toggle("hidden", !msg);
}
function closeCompose() { compose?.el.remove(); compose = null; }

function sendCompose() {
  const d = readCompose();
  if (!d.to && !d.cc && !d.bcc) { composeError("Please specify at least one recipient."); return; }
  if (!d.subject.trim() && !d.body.trim() && !confirm("Send this message without a subject or text?")) return;
  const payload = {
    to: d.to, cc: d.cc, bcc: d.bcc, subject: d.subject, body: d.body,
    attachments: d.attachments, inReplyTo: d.inReplyTo, references: d.references,
    replyUid: d.replyUid, replyFolder: d.replyFolder,
    forward: d.forward && d.forward.attachments.length ? { folder: d.forward.folder, uid: d.forward.uid, indexes: d.forward.attachments.map((a) => a.index) } : null,
  };
  closeCompose();
  let cancelled = false;
  const timer = setTimeout(async () => {
    if (cancelled) return;
    toast("Sending…", null, 60000);
    try {
      await api("/api/send", payload);
      toast("Message sent.");
      loadFolders();
      if (state.view === "list" && inRole("sent")) setTimeout(() => loadList({ quiet: true }), 5000);
    } catch (e) {
      toast("Couldn't send.");
      openCompose(d);
      composeError(e.message);
    }
  }, 5000);
  toast("Sending in 5 seconds…", { label: "Undo", run: () => { cancelled = true; clearTimeout(timer); openCompose(d); } }, 5000);
}

// ------------------------------------------------------------------ events
document.addEventListener("click", (e) => {
  const t = e.target;
  const actionEl = t.closest("[data-action]");
  const action = actionEl?.dataset.action;
  const row = t.closest(".row");

  const folderMenu = t.closest("[data-folder-menu]");
  if (folderMenu) { e.preventDefault(); e.stopPropagation(); showFolderMenu(folderMenu, folderMenu.dataset.folderMenu); return; }
  if (t.closest("[data-folder-new]")) { state.renamingFolder = null; state.creatingFolder = true; renderFolders(); return; }
  if (t.closest(".folder-input")) return;

  if (t.closest("[data-folder]")) {
    e.preventDefault();
    go({ folder: t.closest("[data-folder]").dataset.folder, page: 0, query: "", uid: null, category: "" });
    return;
  }

  const tool = t.closest("[data-tool]");
  if (tool) { e.stopPropagation(); runTool(tool.dataset.tool, tool); return; }
  const tabEl = t.closest("[data-tab]");
  if (tabEl) { go({ category: tabEl.dataset.tab, page: 0, uid: null }); return; }

  if (row && (!action || action === "select")) {
    const uid = +row.dataset.uid;
    if (action === "select") {
      if (t.checked) state.selected.add(uid); else state.selected.delete(uid);
      state.cursor = +row.dataset.index;
      render();
    } else if (!t.closest(".checkbox")) {
      go({ uid });
    }
    return;
  }
  if (!action) return;

  const rowUid = row ? [+row.dataset.uid] : undefined;
  switch (action) {
    case "selectAll": {
      const msgs = state.list?.messages || [];
      state.selected = state.selected.size ? new Set() : new Set(msgs.map((m) => m.uid));
      render();
      break;
    }
    case "refresh": loadFolders(); loadList(); loadCategoryStatus(); break;
    case "selectMenu": e.stopPropagation(); showSelectMenu(actionEl); break;
    case "moreMenu": e.stopPropagation(); showMoreMenu(actionEl); break;
    case "senderMenu": e.stopPropagation(); showSenderMenu(actionEl); break;
    case "prevPage": go({ page: state.page - 1, uid: null }); break;
    case "nextPage": go({ page: state.page + 1, uid: null }); break;
    case "back": go({ uid: null }); break;
    case "closeSettings": closeSettings(); break;
    case "newer": case "older": stepMessage(action === "older" ? 1 : -1); break;
    case "archive": moveAction("archive"); break;
    case "spam": moveAction("spam"); break;
    case "delete": moveAction("delete"); break;
    case "read": setFlag("\\Seen", true); state.selected.clear(); break;
    case "unread":
      setFlag("\\Seen", false);
      state.selected.clear();
      if (state.view === "message") go({ uid: null });
      break;
    case "moveMenu": e.stopPropagation(); showMoveMenu(actionEl); break;
    case "star": {
      const uids = rowUid || targets();
      const cur = row ? state.list.messages.find((m) => m.uid === uids[0])?.flagged : state.message?.flagged;
      setFlag("\\Flagged", !cur, uids);
      break;
    }
    case "rowArchive": moveAction("archive", rowUid); break;
    case "rowDelete": moveAction("delete", rowUid); break;
    case "rowToggleRead": {
      const m = state.list.messages.find((x) => x.uid === rowUid[0]);
      setFlag("\\Seen", !m.seen, rowUid);
      break;
    }
    case "showImages": state.message.showImages = true; renderMessage(); break;
    case "trustSender": {
      const addr = state.message.from[0]?.email?.toLowerCase();
      if (addr) store.set("trustedSenders", [...new Set([...store.get("trustedSenders", []), addr])]);
      renderMessage();
      break;
    }
    case "download": downloadAttachment(+actionEl.dataset.index); break;
    case "reply": case "replyAll": case "forward": {
      const p = replyPrefill(action);
      if (p) openCompose(p);
      break;
    }
  }
});

function stepMessage(dir) {
  const msgs = state.list?.messages || [];
  if (state.view === "message") {
    const idx = msgs.findIndex((m) => m.uid === state.message?.uid);
    const next = msgs[idx + dir];
    if (next) go({ uid: next.uid });
    return;
  }
  if (!msgs.length) return;
  state.cursor = Math.max(0, Math.min(msgs.length - 1, state.cursor + dir));
  renderList();
  $(".row.cursor")?.scrollIntoView({ block: "nearest" });
}

function onKey(e) {
  if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
  const tag = (e.target.tagName || "").toLowerCase();
  if (["input", "textarea", "select"].includes(tag) || e.target.isContentEditable) {
    if (e.key === "Escape" && e.target.id === "searchInput") e.target.blur();
    return;
  }
  if (!$("#help").classList.contains("hidden")) { if (e.key === "Escape" || e.key === "?") $("#help").classList.add("hidden"); return; }
  if (state.view === "settings") {
    if (e.key === "Escape") { e.preventDefault(); closeSettings(); }
    return;
  }
  const msgView = state.view === "message";
  const k = e.key;
  const handlers = {
    c: () => openCompose(),
    "/": () => { $("#searchInput").focus(); $("#searchInput").select(); },
    "?": () => $("#help").classList.remove("hidden"),
    j: () => stepMessage(1),
    k: () => stepMessage(-1),
    ArrowDown: () => !msgView && stepMessage(1),
    ArrowUp: () => !msgView && stepMessage(-1),
    o: () => !msgView && state.list?.messages[state.cursor] && go({ uid: state.list.messages[state.cursor].uid }),
    Enter: () => handlers.o(),
    u: () => msgView && go({ uid: null }),
    Escape: () => { if (msgView) go({ uid: null }); else if (state.selected.size) { state.selected.clear(); render(); } },
    x: () => {
      const m = !msgView && state.list?.messages[state.cursor];
      if (!m) return;
      if (state.selected.has(m.uid)) state.selected.delete(m.uid); else state.selected.add(m.uid);
      render();
    },
    s: () => {
      const uids = targets();
      const m = msgView ? state.message : state.list?.messages.find((x) => x.uid === uids[0]);
      if (m) setFlag("\\Flagged", !m.flagged, uids);
    },
    e: () => state.roles.archive && !inRole("archive") && moveAction("archive"),
    "#": () => moveAction("delete"),
    "!": () => state.roles.junk && !inRole("junk") && moveAction("spam"),
    I: () => { setFlag("\\Seen", true); state.selected.clear(); },
    U: () => { setFlag("\\Seen", false); state.selected.clear(); if (msgView) go({ uid: null }); },
    r: () => msgView && openCompose(replyPrefill("reply")),
    a: () => msgView && openCompose(replyPrefill("replyAll")),
    f: () => msgView && openCompose(replyPrefill("forward")),
  };
  if (handlers[k]) { e.preventDefault(); handlers[k](); }
}
document.addEventListener("keydown", onKey);

// Right-click menus are off: every action has a button, and the browser's own menu
// (Reload, Open Link, Back…) only led away from the app. Text boxes keep theirs for
// spelling suggestions and paste.
document.addEventListener("contextmenu", (e) => {
  if (e.target.closest?.("input, textarea, [contenteditable]")) return;
  e.preventDefault();
});

window.addEventListener("beforeunload", (e) => { if (composeDirty()) e.preventDefault(); });
window.addEventListener("hashchange", route);

// ------------------------------------------------------------------ setup
const APP_PASSWORD_RE = /^[a-z]{4}-[a-z]{4}-[a-z]{4}-[a-z]{4}$/;

function renderSetup() {
  const el = document.createElement("div");
  el.className = "setup";
  el.innerHTML = `<form class="setup-card" novalidate>
    <div class="setup-logo">${icon("mail")}</div>
    <h1>Connect your iCloud email</h1>
    <p class="lead">Inbox talks directly to iCloud. Your password stays in this Mac's Keychain.</p>
    <label class="setup-field"><span>iCloud email</span>
      <input id="s-email" type="email" autocomplete="off" spellcheck="false" placeholder="you@icloud.com"></label>
    <label class="setup-field"><span>Your name <em>(optional, shown on emails you send)</em></span>
      <input id="s-name" autocomplete="off" spellcheck="false" placeholder="Jane Appleseed"></label>
    <ol class="steps">
      <li><div><b>Create an app-specific password</b>
        <p>Sign in, open <i>App-Specific Passwords</i>, click <b>+</b> and name it “Inbox”. Then copy the password.</p>
        <a class="pill" href="https://account.apple.com/account/manage/section/security" target="_blank" rel="noopener noreferrer">Open Apple Account</a></div></li>
      <li><div><b>Paste it here</b>
        <input id="s-pass" class="setup-input" autocomplete="off" spellcheck="false" placeholder="xxxx-xxxx-xxxx-xxxx"></div></li>
    </ol>
    <p class="share-note">When you connect, Inbox shares your <b>email address</b>, Inbox version and macOS version with Inbox's developer, who keeps a list of users. Your password and your emails are never shared. Signing out removes you from the list.</p>
    <div class="err hidden" role="alert"></div>
    <button type="submit" class="send-btn">Connect</button>
  </form>`;
  document.body.appendChild(el);
  const form = $("form", el), pass = $("#s-pass", el), mail = $("#s-email", el), name = $("#s-name", el), err = $(".err", el), btn = $("button", el);

  const submit = async () => {
    err.classList.add("hidden");
    if (!APP_PASSWORD_RE.test(pass.value.replace(/\s+/g, "").toLowerCase())) {
      err.textContent = "That isn't an app-specific password. Apple's look like abcd-efgh-ijkl-mnop. Don't use your Apple Account password here.";
      err.classList.remove("hidden");
      pass.focus();
      return;
    }
    btn.disabled = true;
    btn.textContent = "Connecting…";
    try {
      await api("/api/setup", { email: mail.value.trim(), password: pass.value, name: name.value.trim() });
      location.replace("/#f=INBOX");
      location.reload();
    } catch (e) {
      err.textContent = e.message;
      err.classList.remove("hidden");
      btn.disabled = false;
      btn.textContent = "Connect";
    }
  };
  form.addEventListener("submit", (e) => { e.preventDefault(); submit(); });
  // Connect as soon as a complete app-specific password is pasted.
  pass.addEventListener("input", () => { if (APP_PASSWORD_RE.test(pass.value.replace(/\s+/g, "").toLowerCase()) && mail.value.trim()) submit(); });
  window.addEventListener("focus", () => { if (mail.value && !pass.value) pass.focus(); });
  mail.focus();
}

/** Your avatar: the iCloud (or custom) profile photo, or your initial. */
function accountAvatar(cls = "") {
  const me = state.me || {};
  if (me.photo) return `<span class="avatar ${cls} has-photo"><img src="${esc(me.photo)}" alt=""></span>`;
  return avatar({ name: me.name, email: me.email }, cls);
}

function renderAccountButton() {
  const me = state.me;
  const html = accountAvatar("account").replace("<span", '<button type="button" id="account"').replace(/<\/span>$/, "</button>");
  ($("#account") || $(".account")).outerHTML = html;
  const btn = $("#account");
  btn.title = `${me.name ? me.name + "\n" : ""}${me.email}`;
  btn.addEventListener("click", (e) => { e.stopPropagation(); showAccountMenu(btn); });
}

async function refreshMe() {
  try {
    const me = await api("/api/me");
    if (me.setupRequired) return;
    state.me = me;
    renderAccountButton();
    if (state.view === "settings") renderSettings();
  } catch { /* keep what we have */ }
}

function showAccountMenu(anchor) {
  const me = state.me;
  showMenu(anchor, me.email, [
    { label: me.photo ? "Change profile photo…" : "Add profile photo…", icon: "image", run: pickPhoto },
    ...(me.photoChoice === "custom" && me.hasICloudPhoto ? [{ label: "Use iCloud photo", icon: "person", run: () => setPhotoChoice("icloud") }] : []),
    ...(me.photo ? [{ label: "Remove photo (show initial)", icon: "close", run: () => setPhotoChoice("none") }] : []),
    { label: "Settings…", icon: "settings", run: () => openSettings() },
    { label: "Sign out", icon: "back", run: signOut },
  ]);
}

/** Open the file picker for a custom profile photo (works from a menu click: it's a user gesture). */
function pickPhoto() {
  const input = Object.assign(document.createElement("input"), { type: "file", accept: "image/jpeg,image/png,image/webp,image/gif" });
  input.addEventListener("change", () => { if (input.files[0]) uploadPhoto(input.files[0]); });
  input.click();
}

async function uploadPhoto(file) {
  if (file.size > 10 * 1024 * 1024) return toast("Choose a photo smaller than 10 MB.");
  try {
    const dataUrl = await new Promise((ok, fail) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = fail; r.readAsDataURL(file); });
    state.me = await api("/api/photo", { data: dataUrl.split(",")[1] });
    state.settings.photo = "custom";
    renderAccountButton();
    if (state.view === "settings") renderSettings();
    toast("Profile photo updated.");
  } catch (err) {
    toast(err.message);
  }
}

async function setPhotoChoice(choice) {
  await updateSettings({ photo: choice });
  refreshMe();
}

// ------------------------------------------------------------------ update banner
// Inbox.app calls these when a signed update is available and while installing it.
let updateDismissed = false;

function renderUpdateBanner(html, { force = false } = {}) {
  if (updateDismissed && !force) return;
  let el = $("#updateBanner");
  if (!el) {
    el = document.createElement("div");
    el.id = "updateBanner";
    el.className = "update-banner";
    el.setAttribute("role", "status");
    $(".main").prepend(el);
    el.addEventListener("click", (e) => {
      const a = e.target.closest("[data-update]")?.dataset.update;
      if (a === "install") window.webkit?.messageHandlers?.update?.postMessage("install");
      if (a === "later") { updateDismissed = true; el.remove(); }
    });
  }
  el.innerHTML = html;
}

function updateAvailable(info) {
  renderUpdateBanner(`${icon("refresh")}<div class="text"><b>Inbox ${esc(info.version)} is available.</b> ${esc(info.notes || "")}</div>
    <button class="update-btn" data-update="install">Update now</button>
    <button class="icon-btn" data-update="later" title="Later">${icon("close")}</button>`);
}

function updateStatus(stateName, message) {
  if (stateName === "error") {
    renderUpdateBanner(`${icon("junk")}<div class="text error">${esc(message)}</div>
      <button class="update-btn" data-update="install">Try again</button>
      <button class="icon-btn" data-update="later" title="Close">${icon("close")}</button>`, { force: true });
  } else {
    renderUpdateBanner(`<span class="spinner"></span><div class="text">${esc(message)}</div>`, { force: true });
  }
}

// ------------------------------------------------------------------ appearance
const ACCENTS = [
  ["Blue", "#0b57d0"], ["Purple", "#7c3aed"], ["Pink", "#db2777"], ["Red", "#dc2626"],
  ["Orange", "#ea580c"], ["Green", "#16a34a"], ["Teal", "#0d9488"], ["Graphite", "#4b5563"],
];
const BACKGROUNDS = [
  ["none", "None"], ["aurora", "Aurora"], ["sunset", "Sunset"], ["ocean", "Ocean"],
  ["forest", "Forest"], ["sand", "Sand"], ["graphite", "Graphite"],
];
let backgroundVersion = Date.now();

const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mix = (a, b, t) => "#" + rgb(a).map((v, i) => Math.round(v + (rgb(b)[i] - v) * t).toString(16).padStart(2, "0")).join("");
function luminance(hex) {
  const [r, g, b] = rgb(hex).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const textOn = (hex) => (luminance(hex) > 0.4 ? "#1f1f1f" : "#ffffff");

function applyAppearance(s) {
  const root = document.documentElement;
  if (s.theme === "light" || s.theme === "dark") root.dataset.theme = s.theme; else delete root.dataset.theme;
  window.webkit?.messageHandlers?.appearance?.postMessage(s.theme || "system");

  // Derive every accent-tinted color for both light and dark mode, keeping text readable.
  const a = /^#[0-9a-f]{6}$/i.test(s.accent || "") ? s.accent : "#0b57d0";
  const light = luminance(a) > 0.45 ? mix(a, "#000000", 0.35) : a;
  const dark = luminance(a) < 0.3 ? mix(a, "#ffffff", 0.55) : a;
  const vars = {
    "--l-accent": light, "--l-accent-text": textOn(light),
    "--l-nav-active": mix(a, "#ffffff", 0.8), "--l-compose": mix(a, "#ffffff", 0.72),
    "--l-compose-hover": mix(a, "#ffffff", 0.64), "--l-row-selected": mix(a, "#ffffff", 0.72),
    "--d-accent": dark, "--d-accent-text": textOn(dark),
    "--d-nav-active": mix(a, "#1d1f23", 0.62), "--d-compose": mix(a, "#1d1f23", 0.55),
    "--d-compose-hover": mix(a, "#1d1f23", 0.45), "--d-row-selected": mix(a, "#1d1f23", 0.6),
  };
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);

  root.classList.toggle("text-small", s.textSize === "small");
  root.classList.toggle("text-large", s.textSize === "large");
  document.body.classList.toggle("compact", s.density === "compact");
  document.body.classList.toggle("no-snippets", s.snippets === false);

  const layer = $("#bgLayer");
  const bg = s.background || "none";
  layer.className = "bg-layer" + (bg !== "none" && bg !== "image" ? ` bg-${bg}` : "");
  layer.style.backgroundImage = bg === "image" ? `url("/background?v=${backgroundVersion}")` : "";
  layer.style.setProperty("--bg-dim", String((s.backgroundDim ?? 35) / 100));
  document.body.classList.toggle("has-bg", bg !== "none");
}

// ------------------------------------------------------------------ settings page
function openPage(hash) {
  if (!isSettingsHash(location.hash)) settingsReturnHash = location.hash || "#f=INBOX";
  location.hash = hash;
}
function openSettings(section) {
  openPage(`#settings/${section || state.settingsSection || "appearance"}`);
}
function closeSettings() {
  location.hash = settingsReturnHash;
}

const nativeApp = () => Boolean(window.webkit?.messageHandlers?.notifications);
const tellApp = (command) => window.webkit?.messageHandlers?.notifications?.postMessage(command);

function notificationSettings(s, toggle) {
  if (!nativeApp()) return `<p class="section-note">Notifications work in the Inbox app for Mac.</p>`;
  const perm = state.native.notifications;
  const login = state.native.login;
  const status = !s.notifications ? "Off. You won't be notified about new email."
    : perm === "denied" ? "Blocked by macOS. Allow notifications for Inbox in System Settings."
    : perm === "notDetermined" ? "macOS will ask you to allow notifications."
    : "On while Inbox is open, even with its window closed. Held back while you're using Inbox.";
  const tabs = [...enabledCategories(), { id: "_none", name: "Other mail" }];
  const skip = s.notifySkip || [];
  return `
    <div class="setting"><div class="label"><b>New email notifications</b><span>${status}</span></div>
      ${s.notifications && perm === "denied" ? `<button class="pill" data-settings-action="openNotificationSettings">Open System Settings</button>` : ""}
      ${toggle("notifications")}</div>
    ${s.notifications ? `
    <div class="setting"><div class="label"><b>Show sender, subject and preview</b><span>Turn off to show just “New email”, for privacy.</span></div>${toggle("notifyPreview")}</div>
    <div class="setting"><div class="label"><b>Sound</b></div>${toggle("notifySound")}</div>
    ${enabledCategories().length ? `<div class="setting stack"><div class="label"><b>Notify me about</b><span>Only new, unread mail in the checked tabs notifies you.</span></div>
      <div class="notify-tabs">${tabs.map((c) => `<label class="check"><input type="checkbox" data-notify-tab="${esc(c.id)}" ${skip.includes(c.id) ? "" : "checked"}>
        ${c.id === "_none" ? icon("inbox") : icon(CATEGORY_ICONS[c.id] || "label")}<span>${esc(c.name)}</span></label>`).join("")}</div></div>` : ""}
    <div class="setting"><div class="label"><b>Try it</b><span>Sends a sample notification.</span></div>
      <button class="pill" data-settings-action="testNotification">Send test notification</button></div>` : ""}
    <div class="setting"><div class="label"><b>Open Inbox when you log in</b><span>${
      login === "unsupported" ? "Needs macOS 13 or later. You can add Inbox in System Settings → General → Login Items."
      : login === "approval" ? "Waiting for your approval in System Settings → General → Login Items."
      : "Notifications only arrive while Inbox is running."}</span></div>
      ${login === "unsupported" ? "" : `<label class="switch"><input type="checkbox" data-login ${login === "on" || login === "approval" ? "checked" : ""} aria-label="Open Inbox when you log in"><span></span></label>`}</div>`;
}

function notificationStatus(perm, login) {
  const first = state.native.notifications === null;
  state.native = { notifications: perm, login };
  // Ask macOS for permission once, right after launch, if notifications are on.
  if (first && perm === "notDetermined" && state.settings.notifications && !notificationStatus.asked) {
    notificationStatus.asked = true;
    tellApp("request");
  }
  if (state.view === "settings") renderSettings();
}

async function updateSettings(changes, { rerender = true } = {}) {
  Object.assign(state.settings, changes);
  applyAppearance(state.settings);
  if (rerender && state.view === "settings") renderSettings();
  if (changes.toolbar || changes.categories) { renderToolbar(); renderTabs(); }
  if (changes.folderColors) { renderFolders(); if (state.view === "list") renderList(); }
  const resorted = changes.categories || changes.unsortedSenders;
  if (resorted) state.listStale = true;
  try {
    await api("/api/settings", changes);
    if (resorted && state.view === "list" && state.category) loadList({ quiet: true });
  } catch (e) {
    // Rejected: go back to what's actually saved.
    toast(e.message);
    state.settings = await api("/api/settings").catch(() => state.settings);
    applyAppearance(state.settings);
    if (state.view === "settings") renderSettings();
  }
}

function renderSettings() {
  const s = state.settings;
  const seg = (key, options) => `<div class="segmented" role="radiogroup">${options.map(([v, label]) =>
    `<button role="radio" aria-checked="${s[key] === v}" class="${s[key] === v ? "on" : ""}" data-set="${key}" data-value="${v}">${label}</button>`).join("")}</div>`;
  const toggle = (key) => `<label class="switch"><input type="checkbox" data-toggle="${key}" ${s[key] ? "checked" : ""}><span></span></label>`;
  const isPreset = ACCENTS.some(([, hex]) => hex === s.accent);
  const native = Boolean(window.webkit?.messageHandlers?.update);
  const current = state.settingsSection || "appearance";
  const [, title, , subtitle] = SETTINGS_SECTIONS.find(([id]) => id === current);

  const sections = {
    appearance: () => `
      <div class="setting"><div class="label"><b>Theme</b><span>System follows your Mac's light or dark mode.</span></div>
        ${seg("theme", [["system", "System"], ["light", "Light"], ["dark", "Dark"]])}</div>
      <div class="setting stack"><div class="label"><b>Accent color</b><span>Used for buttons, highlights and the selected folder.</span></div>
        <div class="swatches">
          ${ACCENTS.map(([name, hex]) => `<button class="swatch ${s.accent === hex ? "on" : ""}" style="background:${hex}" title="${name}" aria-label="${name}" data-set="accent" data-value="${hex}"></button>`).join("")}
          <label class="swatch swatch-custom ${isPreset ? "" : "on"}" title="Custom color" ${isPreset ? "" : `style="background:${esc(s.accent)}"`}><input type="color" data-color value="${esc(s.accent)}" aria-label="Custom color"></label>
        </div></div>
      <div class="setting stack"><div class="label"><b>Background</b><span>Shown behind the sidebar and top bar.</span></div>
        <div class="backgrounds">
          ${BACKGROUNDS.map(([v, label]) => `<button class="bg-tile ${v === "none" ? "none" : `bg-${v}`} ${s.background === v ? "on" : ""}" data-set="background" data-value="${v}">${label}</button>`).join("")}
          <label class="bg-tile upload ${s.background === "image" ? "on" : ""}" ${s.background === "image" ? `style="background-image:url('/background?v=${backgroundVersion}')"` : ""}>
            ${s.background === "image" ? "" : icon("image")}<span>${s.background === "image" ? "Your image" : "Choose image…"}</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" data-bg-upload></label>
        </div>
        ${s.background !== "none" ? `<div class="dim-row"><span>Fade</span><input type="range" min="0" max="85" value="${s.backgroundDim}" data-dim aria-label="Background fade"><span data-dim-label>${s.backgroundDim}%</span></div>` : ""}
      </div>`,

    layout: () => `
      <div class="setting"><div class="label"><b>Density</b><span>Compact fits more messages on screen.</span></div>
        ${seg("density", [["comfortable", "Comfortable"], ["compact", "Compact"]])}</div>
      <div class="setting"><div class="label"><b>Text size</b></div>
        ${seg("textSize", [["small", "Small"], ["medium", "Medium"], ["large", "Large"]])}</div>
      <div class="setting"><div class="label"><b>Message previews</b><span>Show the first line of each message in the list.</span></div>${toggle("snippets")}</div>`,

    toolbar: () => `
      <p class="section-note">Tools you turn off are still in the <b>⋮ More</b> menu.</p>
      ${[["none", "When nothing is selected"], ["selection", "When messages are selected"]].map(([when, groupTitle]) => `
        <div class="tool-group"><div class="tool-group-title">${groupTitle}</div>
        ${(s.toolbar || []).filter((t) => TOOLS[t.id]?.when === when).map((t, i, arr) => `
          <div class="tool-row ${t.on ? "" : "off"}">${icon(TOOLS[t.id].icon)}<span class="tool-name">${esc(toolLabel(t.id).replace(/ \(.*\)$/, ""))}</span>
            <button class="icon-btn" data-tool-move="${t.id}" data-dir="-1" title="Move up" ${i === 0 ? "disabled" : ""}>${icon("up")}</button>
            <button class="icon-btn" data-tool-move="${t.id}" data-dir="1" title="Move down" ${i === arr.length - 1 ? "disabled" : ""}>${icon("down")}</button>
            <label class="switch"><input type="checkbox" data-tool-toggle="${t.id}" ${t.on ? "checked" : ""} aria-label="Show ${esc(toolLabel(t.id))}"><span></span></label>
          </div>`).join("")}</div>`).join("")}`,

    tabs: () => tabsSection(),

    notifications: () => notificationSettings(s, toggle),

    privacy: () => `
      <div class="setting"><div class="label"><b>Load remote images automatically</b><span>Off blocks tracking pixels. You can still show images in any message.</span></div>${toggle("remoteImages")}</div>
      <div class="setting"><div class="label"><b>Trusted senders</b><span>${(store.get("trustedSenders", []) || []).length
        ? `Images always load from ${store.get("trustedSenders", []).length} sender${store.get("trustedSenders", []).length === 1 ? "" : "s"} you trusted.`
        : "Senders you choose “Always display images from” appear here."}</span></div>
        ${(store.get("trustedSenders", []) || []).length ? `<button class="pill" data-settings-action="clearTrusted">Forget all</button>` : ""}</div>`,

    account: () => `
      <div class="setting">${accountAvatar("lg")}<div class="label"><b>${esc(state.me?.email || "")}</b><span>Signed in with an app-specific password.</span></div>
        <button class="pill danger" data-settings-action="signout">Sign out</button></div>
      <div class="setting"><div class="label"><b>Profile photo</b><span>${
        s.photo === "icloud" ? (state.me?.hasICloudPhoto ? "Your iCloud profile photo, updated each time Inbox opens."
          : "No iCloud photo found. This Mac needs to be signed in to the same Apple Account, with a photo set.")
        : s.photo === "custom" ? "A photo you chose." : "Your initial."}</span></div>
        ${seg("photo", [["icloud", "iCloud"], ["custom", "Custom"], ["none", "Initial"]])}</div>
      ${s.photo === "custom" || !state.me?.photo ? `<div class="setting"><div class="label"><b>${state.me?.hasCustomPhoto ? "Change photo" : "Add your own photo"}</b><span>${
        state.me?.photo ? "" : "Replace the letter in the corner with a photo. "}JPEG, PNG, WebP or GIF, up to 10 MB.</span></div>
        <label class="pill">Choose photo…<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" data-photo-upload hidden></label></div>` : ""}`,

    about: () => `
      <div class="setting"><div class="label"><b>Inbox ${esc(state.me?.version || "")}</b><span>${native ? "Updates install automatically when you click Update now." : "Running in your browser."}</span></div>
        ${native ? `<button class="pill" data-settings-action="checkUpdates">Check for updates</button>` : ""}</div>
      <div class="setting"><div class="label"><b>Website</b><span>Download Inbox and share it.</span></div>
        <a class="pill" href="https://santisam22.github.io/inbox" target="_blank" rel="noopener noreferrer">Open</a></div>
      <div class="setting"><div class="label"><b>Release notes and source code</b><span>Every version and what changed.</span></div>
        <a class="pill" href="https://github.com/santisam22/inbox/releases" target="_blank" rel="noopener noreferrer">Open</a></div>
      <p class="section-note">Inbox is free and open source (MIT License), and isn't affiliated with Apple.</p>`,
  };

  $("#view").innerHTML = `<div class="settings-shell">
    <nav class="settings-nav" aria-label="Settings sections">
      ${SETTINGS_SECTIONS.map(([id, label, ic]) => `<button class="${id === current ? "on" : ""}" data-section="${id}" aria-current="${id === current ? "page" : "false"}">${icon(ic)}<span>${label}</span></button>`).join("")}
    </nav>
    <div class="settings settings-pane">
      <div class="settings-head"><h1>${title}</h1><p>${subtitle}</p></div>
      ${sections[current]()}
    </div>
  </div>`;  // On narrow windows the menu is a scrolling row: keep the open section in view.
  $(".settings-nav .on")?.scrollIntoView({ block: "nearest", inline: "center" });
}

document.addEventListener("click", (e) => {
  if (state.view !== "settings") return;
  const set = e.target.closest("[data-set]");
  if (set) {
    if (set.dataset.set === "background" && set.dataset.value === "image") return;
    updateSettings({ [set.dataset.set]: set.dataset.value }).then(() => { if (set.dataset.set === "photo") refreshMe(); });
    return;
  }
  const move = e.target.closest("[data-tool-move]");
  if (move) {
    // Swap with the neighbor in the same group (tools only reorder within their group).
    const list = state.settings.toolbar.map((t) => ({ ...t }));
    const i = list.findIndex((t) => t.id === move.dataset.toolMove);
    const group = list.map((t, idx) => [t, idx]).filter(([t]) => TOOLS[t.id]?.when === TOOLS[list[i].id].when).map(([, idx]) => idx);
    const j = group[group.indexOf(i) + +move.dataset.dir];
    if (j !== undefined) { [list[i], list[j]] = [list[j], list[i]]; updateSettings({ toolbar: list }); }
    return;
  }
  const sectionBtn = e.target.closest("[data-section]");
  if (sectionBtn) {
    location.replace(`#settings/${sectionBtn.dataset.section}`);  // switching sections doesn't pile up history
    $("#view").scrollTop = 0;
    return;
  }
  const action = e.target.closest("[data-settings-action]")?.dataset.settingsAction;
  if (action === "clearTrusted") { store.set("trustedSenders", []); renderSettings(); toast("Forgot all trusted senders."); }
  if (action === "categories") openSettings("tabs");
  if (action === "testNotification") { tellApp("test"); toast("Sent a test notification."); }
  if (action === "openNotificationSettings") tellApp("openSystemSettings");
  if (action === "signout") signOut();
  if (action === "checkUpdates") window.webkit?.messageHandlers?.update?.postMessage("check");
});

document.addEventListener("input", (e) => {
  if (state.view !== "settings") return;
  if (e.target.matches("[data-dim]")) {
    state.settings.backgroundDim = +e.target.value;
    $("[data-dim-label]").textContent = `${e.target.value}%`;
    applyAppearance(state.settings);
  }
  if (e.target.matches("[data-color]")) applyAppearance({ ...state.settings, accent: e.target.value });
});

document.addEventListener("change", async (e) => {
  if (state.view !== "settings") return;
  const t = e.target;
  if (t.matches("[data-toggle]")) {
    const key = t.dataset.toggle;
    updateSettings({ [key]: t.checked }, { rerender: key === "notifications" });
    if (key === "notifications" && t.checked && state.native.notifications === "notDetermined") tellApp("request");
  }
  if (t.matches("[data-notify-tab]")) {
    const skip = new Set(state.settings.notifySkip || []);
    if (t.checked) skip.delete(t.dataset.notifyTab); else skip.add(t.dataset.notifyTab);
    updateSettings({ notifySkip: [...skip] }, { rerender: false });
  }
  if (t.matches("[data-login]")) tellApp(t.checked ? "loginOn" : "loginOff");
  if (t.matches("[data-tool-toggle]")) {
    updateSettings({ toolbar: state.settings.toolbar.map((x) => (x.id === t.dataset.toolToggle ? { ...x, on: t.checked } : x)) });
  }
  if (t.matches("[data-dim]")) updateSettings({ backgroundDim: +t.value }, { rerender: false });
  if (t.matches("[data-color]")) updateSettings({ accent: t.value });
  if (t.matches("[data-photo-upload]") && t.files[0]) uploadPhoto(t.files[0]);
  if (t.matches("[data-bg-upload]") && t.files[0]) {
    const file = t.files[0];
    if (file.size > 20 * 1024 * 1024) return toast("Choose an image smaller than 20 MB.");
    try {
      const dataUrl = await new Promise((ok, fail) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = fail; r.readAsDataURL(file); });
      state.settings = await api("/api/background", { data: dataUrl.split(",")[1] });
      backgroundVersion = Date.now();
      applyAppearance(state.settings);
      renderSettings();
    } catch (err) {
      toast(err.message);
    }
  }
});

// ------------------------------------------------------------------ categories page
const inTabsSection = () => state.view === "settings" && state.settingsSection === "tabs";
function renderCategories() { renderSettings(); }

function tabsSection() {
  const cats = state.settings.categories || [];
  const senderChip = (x, j, attr) => `<span class="kw sender" title="${x.startsWith("@") ? `Anyone at ${esc(x.slice(1))}` : esc(x)}">${esc(x.startsWith("@") ? x.slice(1) : x)}<button ${attr}="${j}" aria-label="Remove ${esc(x)}">${icon("close")}</button></span>`;
  const chip = (w, i) => `<span class="kw">${esc(w)}<button data-kw-remove="${i}" title="Remove ${esc(w)}" aria-label="Remove ${esc(w)}">${icon("close")}</button></span>`;
  return `<div class="categories-page">
    <p class="section-note">Inbox sorts your mail into tabs using <b>keywords in the sender or subject</b>. A message goes in the first tab it matches, top to bottom, and is always in All mail. Keywords match whole words, so “sale” won't match “wholesale”.</p>
    <div class="cat locked">
      <div class="cat-head"><span class="cat-icon">${icon("inbox")}</span><b class="cat-title">All mail</b>
        <span class="cat-note">Every message. Always shown.</span><span class="spacer"></span><span class="lock" title="Can't be turned off">${icon("lock")}</span></div>
    </div>
    ${cats.map((c, i) => `
    <div class="cat ${c.enabled ? "" : "off"}" data-cat="${i}">
      <div class="cat-head">
        <span class="cat-icon">${icon(CATEGORY_ICONS[c.id] || "label")}</span>
        <input class="cat-name" value="${esc(c.name)}" maxlength="30" data-cat-name aria-label="Tab name">
        <span class="spacer"></span>
        <button class="icon-btn" data-cat-move="-1" title="Move up (checked earlier)" ${i === 0 ? "disabled" : ""}>${icon("up")}</button>
        <button class="icon-btn" data-cat-move="1" title="Move down" ${i === cats.length - 1 ? "disabled" : ""}>${icon("down")}</button>
        ${CATEGORY_ICONS[c.id] ? "" : `<button class="icon-btn" data-cat-delete title="Delete tab">${icon("trash")}</button>`}
        <label class="switch" title="${c.enabled ? "Shown" : "Hidden"}"><input type="checkbox" data-cat-toggle ${c.enabled ? "checked" : ""} aria-label="Show ${esc(c.name)} tab"><span></span></label>
      </div>
      ${c.people ? `<p class="cat-hint">Also includes anyone who isn't an automated sender (no-reply addresses, newsletters and the like).</p>` : ""}
      <div class="rule-label">Keywords</div>
      <div class="kws">${c.keywords.map(chip).join("")}<input class="kw-input" data-kw-add placeholder="${c.keywords.length ? "Add keyword…" : "Add keywords, separated by commas…"}" aria-label="Add keyword to ${esc(c.name)}"></div>
      <div class="rule-label">Senders <span>always go here, whatever the keywords</span></div>
      <div class="kws senders">${(c.senders || []).map((x, j) => senderChip(x, j, "data-sender-remove")).join("")}<input class="kw-input" data-sender-add placeholder="name@example.com or example.com" aria-label="Add sender to ${esc(c.name)}"></div>
    </div>`).join("")}
    <div class="cat unsorted">
      <div class="cat-head"><span class="cat-icon">${icon("inbox")}</span><b class="cat-title">All mail only</b>
        <span class="cat-note">Senders here are never sorted into a tab.</span></div>
      <div class="kws senders">${(state.settings.unsortedSenders || []).map((x, j) => senderChip(x, j, "data-unsorted-remove")).join("")}<input class="kw-input" data-unsorted-add placeholder="name@example.com or example.com" aria-label="Add sender to All mail only"></div>
    </div>
    <div class="cat-actions">
      <button class="pill" data-cat-new>${icon("add")}Add tab</button>
      <button class="pill" data-cat-reset>Restore defaults</button>
    </div>
  </div>`;
}

async function saveCategories(cats) {
  if (cats === "default") {
    try {
      await api("/api/settings", { categories: "default" });
      state.settings = await api("/api/settings");
    } catch (e) { toast(e.message); }
    if (state.category && !enabledCategories().some((c) => c.id === state.category)) state.category = "";
    renderCategories();
    loadCategoryStatus();
    return;
  }
  updateSettings({ categories: cats }).then(() => {
    if (state.category && !enabledCategories().some((c) => c.id === state.category)) state.category = "";
    loadCategoryStatus();
  });
}
const catCopy = () => (state.settings.categories || []).map((c) => ({ ...c, keywords: [...c.keywords], senders: [...(c.senders || [])] }));

/** Same rules as the server: "Name <a@b.com>" -> a@b.com, "b.com" -> @b.com. */
function normalizeSender(value) {
  let v = String(value).trim().toLowerCase();
  const m = v.match(/<([^<>]+)>/);
  if (m) v = m[1];
  v = v.replace(/\s+/g, "");
  if (v.includes("@") && !v.startsWith("@")) return v;
  return v ? "@" + v.replace(/^@+/, "") : "";
}

/** Pin a sender to a tab ("unsorted" = All mail only, null = back to keywords). Applies to all past mail too. */
/** Pin senders to a tab ("unsorted" = All mail only, null = back to keywords). Applies to all past mail too. */
function assignSenders(addresses, target) {
  const set = new Set(addresses);
  const cats = catCopy().map((c) => ({ ...c, senders: c.senders.filter((x) => !set.has(x)) }));
  const unsorted = (state.settings.unsortedSenders || []).filter((x) => !set.has(x));
  if (target === "unsorted") unsorted.push(...addresses);
  else if (target) cats.find((c) => c.id === target)?.senders.push(...addresses);
  updateSettings({ categories: cats, unsortedSenders: unsorted }).then(() => loadCategoryStatus());
  const who = addresses.length === 1 ? addresses[0].replace(/^@/, "anyone at ") : `${addresses.length} senders`;
  const where = target === "unsorted" ? "All mail only" : target ? `in ${categoryName(target)}` : "sorted by keywords";
  toast(`Mail from ${who}, old and new, is now ${where}.`);
}
const assignSender = (address, target) => assignSenders([address], target);

function senderRuleFor(address) {
  const cats = state.settings.categories || [];
  const exact = cats.find((c) => (c.senders || []).includes(address));
  if (exact) return exact.id;
  if ((state.settings.unsortedSenders || []).includes(address)) return "unsorted";
  return null;
}

/** "Always put mail from … in:" for the open email's sender, or every sender of the selected emails. */
function showSenderMenu(anchor, addresses) {
  addresses = [...new Set((addresses || [state.message?.from?.[0]?.email]).filter(Boolean).map((a) => a.toLowerCase()))];
  if (!addresses.length) return;
  const rules = [...new Set(addresses.map(senderRuleFor))];
  const current = rules.length === 1 ? rules[0] : undefined;  // a ✓ only when they all share one rule
  const mark = (on) => (on ? " ✓" : "");
  const done = (target) => () => {
    assignSenders(addresses, target);
    if (state.view === "list") { state.selected.clear(); render(); }
  };
  const who = addresses.length === 1 ? addresses[0] : `these ${addresses.length} senders`;
  showMenu(anchor, `Always put mail from ${who} in:`, [
    ...enabledCategories().map((c) => ({ label: c.name + mark(current === c.id), icon: CATEGORY_ICONS[c.id] || "label", run: done(c.id) })),
    { label: "All mail only (don't sort)" + mark(current === "unsorted"), icon: "inbox", run: done("unsorted") },
    ...(rules.some(Boolean) ? [{ label: "Remove rule (sort by keywords)", icon: "close", run: done(null) }] : []),
    { label: "Edit tabs…", icon: "settings", run: () => openSettings("tabs") },
  ]);
}
const catIndex = (el) => +el.closest("[data-cat]").dataset.cat;

document.addEventListener("click", (e) => {
  if (!inTabsSection()) return;
  const t = e.target;
  const cats = catCopy();
  if (t.closest("[data-cat-new]")) {
    cats.push({ id: `c-${Date.now().toString(36)}`, name: "New tab", enabled: true, keywords: [] });
    saveCategories(cats);
    setTimeout(() => { const inputs = $$(".cat-name"); inputs[inputs.length - 1]?.select(); }, 50);
  } else if (t.closest("[data-cat-reset]")) {
    if (confirm("Restore the default tabs and keywords? Tabs you added will be removed.")) saveCategories("default");
  } else if (t.closest("[data-cat-move]")) {
    const i = catIndex(t), j = i + +t.closest("[data-cat-move]").dataset.catMove;
    if (cats[j]) { [cats[i], cats[j]] = [cats[j], cats[i]]; saveCategories(cats); }
  } else if (t.closest("[data-cat-delete]")) {
    const i = catIndex(t);
    if (confirm(`Delete the “${cats[i].name}” tab? Its messages stay in All mail.`)) { cats.splice(i, 1); saveCategories(cats); }
  } else if (t.closest("[data-sender-remove]")) {
    const i = catIndex(t);
    cats[i].senders.splice(+t.closest("[data-sender-remove]").dataset.senderRemove, 1);
    saveCategories(cats);
  } else if (t.closest("[data-unsorted-remove]")) {
    const unsorted = [...(state.settings.unsortedSenders || [])];
    unsorted.splice(+t.closest("[data-unsorted-remove]").dataset.unsortedRemove, 1);
    updateSettings({ unsortedSenders: unsorted });
  } else if (t.closest("[data-kw-remove]")) {
    const i = catIndex(t);
    cats[i].keywords.splice(+t.closest("[data-kw-remove]").dataset.kwRemove, 1);
    saveCategories(cats);
  } else if (t.closest(".kws") && !t.closest("button")) {
    t.closest(".kws").querySelector(".kw-input")?.focus();
  }
});

document.addEventListener("change", (e) => {
  if (!inTabsSection()) return;
  const t = e.target, cats = catCopy();
  if (t.matches("[data-cat-toggle]")) { cats[catIndex(t)].enabled = t.checked; saveCategories(cats); }
  if (t.matches("[data-cat-name]")) { cats[catIndex(t)].name = t.value.trim() || "Untitled"; saveCategories(cats); }
});

document.addEventListener("keydown", (e) => {
  if (!inTabsSection() || !e.target.matches("[data-sender-add], [data-unsorted-add]")) return;
  if (e.key !== "Enter" && e.key !== ",") return;
  e.preventDefault();
  const raw = e.target.value.split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean);
  const bad = raw.find((x) => !/^(?:[^@\s<>"']+@[a-z0-9.-]+\.[a-z]{2,}|@(?:[a-z0-9-]+\.)+[a-z]{2,})$/.test(normalizeSender(x)));
  if (bad) return toast(`“${bad}” isn't an email address (name@example.com) or a domain (example.com).`);
  const senders = raw.map(normalizeSender);
  if (!senders.length) return;
  // A sender belongs to one place: adding it here removes it from any other tab.
  const toUnsorted = e.target.matches("[data-unsorted-add]");
  const i = toUnsorted ? -1 : catIndex(e.target);
  const cats = catCopy().map((c) => ({ ...c, senders: c.senders.filter((x) => !senders.includes(x)) }));
  let unsorted = (state.settings.unsortedSenders || []).filter((x) => !senders.includes(x));
  if (toUnsorted) unsorted = [...unsorted, ...senders]; else cats[i].senders.push(...senders);
  updateSettings({ categories: cats, unsortedSenders: unsorted }).then(() => loadCategoryStatus());
  setTimeout(() => (toUnsorted ? $("[data-unsorted-add]") : $$("[data-sender-add]")[i])?.focus(), 30);
});

document.addEventListener("keydown", (e) => {
  if (!inTabsSection() || !e.target.matches("[data-kw-add]")) return;
  if (e.key === "Backspace" && !e.target.value) {
    const cats = catCopy(), i = catIndex(e.target);
    if (cats[i].keywords.length) { cats[i].keywords.pop(); saveCategories(cats); setTimeout(() => $$(".kw-input")[i]?.focus(), 30); }
    return;
  }
  if (e.key !== "Enter" && e.key !== ",") return;
  e.preventDefault();
  const words = e.target.value.split(",").map((w) => w.trim().toLowerCase()).filter(Boolean);
  if (!words.length) return;
  const cats = catCopy(), i = catIndex(e.target);
  cats[i].keywords = [...new Set([...cats[i].keywords, ...words])];
  saveCategories(cats);
  setTimeout(() => $$(".kw-input")[i]?.focus(), 30);
});

async function signOut() {
  if (!confirm("Sign out of your iCloud email? Your password will be removed from this Mac's Keychain.")) return;
  try { await api("/api/signout", {}); location.replace("/"); } catch (e) { toast(e.message); }
}

function finishBoot() {
  document.body.classList.remove("booting");
}

function updateInstalled(info) {
  renderUpdateBanner(`${icon("doneAll")}<div class="text"><b>Inbox ${esc(info.version)} was installed successfully!</b> ${esc(info.notes || "")}</div>
    <button class="icon-btn" data-update="later" title="Close">${icon("close")}</button>`, { force: true });
  $("#updateBanner").classList.add("success");
}

// Hooks for the native Inbox.app wrapper (⌘N, ⌘, mailto: links, updates).
window.inboxApp = {
  compose: (prefill) => state.me && openCompose(prefill || {}),
  openSettings: () => state.me && openSettings(),
  updateAvailable, updateStatus, updateInstalled,
  notificationStatus,
  loginItemError: (message) => toast(`Couldn't change Open at login: ${message}`),
  // Clicking a notification opens that email.
  openMessage: (folder, uid) => { if (state.me) go({ folder, uid, page: 0, query: "", category: "" }); },
};

// ------------------------------------------------------------------ boot
async function boot() {
  for (const el of $$("[data-icon]")) el.insertAdjacentHTML("afterbegin", icon(el.dataset.icon));
  $("#composeBtn").lastChild.replaceWith(Object.assign(document.createElement("span"), { className: "compose-label", textContent: "Compose" }));

  $("#menuBtn").onclick = () => {
    if (innerWidth <= 860) document.body.classList.toggle("nav-open");
    else { document.body.classList.toggle("nav-collapsed"); store.set("navCollapsed", document.body.classList.contains("nav-collapsed")); }
  };
  if (store.get("navCollapsed", false)) document.body.classList.add("nav-collapsed");
  $("#composeBtn").onclick = () => openCompose();
  $("#helpBtn").onclick = () => $("#help").classList.remove("hidden");
  $("#help").addEventListener("click", (e) => { if (e.target.id === "help" || e.target.closest("[data-close]")) $("#help").classList.add("hidden"); });
  $("#searchForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const q = $("#searchInput").value.trim();
    $("#searchInput").blur();
    go({ query: q, page: 0, uid: null, category: "" });
  });
  $("#clearSearch").onclick = () => go({ query: "", page: 0, uid: null });
  $("#settingsBtn").onclick = () => openSettings();
  $("#categoriesBtn").onclick = () => openSettings("tabs");

  // Settings and account info are inlined into the page by the server (no round trip).
  let bootData = {};
  try { bootData = JSON.parse($("#boot")?.textContent || "{}"); } catch { /* fall back to the API */ }
  state.settings = bootData.settings || await api("/api/settings").catch(() => ({}));
  applyAppearance(state.settings);

  try {
    const me = bootData.me || await api("/api/me");
    if (me.setupRequired) { document.body.classList.add("needs-setup"); renderSetup(); finishBoot(); return; }
    state.me = me;
    document.title = me.email;
    renderAccountButton();
    // The iCloud photo is copied in the background at launch; pick it up if it wasn't ready yet.
    if (me.photoChoice === "icloud" && !me.photo) setTimeout(refreshMe, 3000);
  } catch (e) {
    $("#view").innerHTML = `<div class="error-box">${esc(e.message)}</div>`;
    finishBoot();
    return;
  }

  // Show the last-seen folders and Inbox right away, then refresh both in the background.
  const cached = await api("/api/cache").catch(() => ({}));
  if (cached.folders) {
    state.folders = cached.folders;
    state.roles = Object.fromEntries(state.folders.filter((f) => f.role).map((f) => [f.role, f.name]));
  }
  const h = readHash();
  if (cached.inbox && h.folder === "INBOX" && !h.page && !h.query && !h.uid && !h.category) {
    state.list = cached.inbox;
    state.listFromCache = true;
  }
  loadFolders();  // runs on its own connection, in parallel with the message list
  await route();
  loadCategoryStatus();
  tellApp("status");
  finishBoot();
  if (state.listFromCache) { state.listFromCache = false; loadList({ quiet: true }); }

  // Poll for new mail while the tab is visible.
  setInterval(() => {
    if (document.visibilityState !== "visible") return;
    loadFolders();
    loadCategoryStatus();
    if (state.view === "list" && !state.selected.size) loadList({ quiet: true });
  }, 60000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") { loadFolders(); if (state.view === "list") loadList({ quiet: true }); }
  });
}
boot();
