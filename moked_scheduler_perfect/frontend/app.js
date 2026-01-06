import { CONFIG } from "./config.js";

/* ================== SESSION ================== */
export function setSession(token, user) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}
export function getToken() {
  return localStorage.getItem("token") || "";
}
export function getUser() {
  try { return JSON.parse(localStorage.getItem("user") || "null"); }
  catch { return null; }
}
export function logout() {
  localStorage.clear();
  window.location.href = "login.html";
}

/* ================== ROLE ================== */
export function isApproved(user = getUser()) {
  if (!user) return false;
  return user.approved === true || String(user.approved).toLowerCase() === "true";
}
export function isAchmash(user = getUser()) {
  if (!user) return false;
  const role = String(user.role || "").toLowerCase().trim();
  return role === "achmash" && isApproved(user);
}
export function requireLogin() {
  if (!getToken()) window.location.href = "login.html";
}
export function requireAchmashPage() {
  requireLogin();
  if (!isAchmash()) window.location.href = "schedule.html";
}

/* ================== API ================== */
export async function apiGet(action, params = {}) {
  const q = new URLSearchParams({ action, token: getToken(), ...params });
  const res = await fetch(`${CONFIG.API_URL}?${q.toString()}`);
  return res.json();
}
export async function apiPost(action, data = {}) {
  const res = await fetch(CONFIG.API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, token: getToken(), ...data }),
  });
  return res.json();
}

/* ================== UI HELPERS ================== */
export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

export function loadLogo(el) {
  el.innerHTML = "";
  if (!CONFIG.LOGO_URL) {
    el.textContent = CONFIG.LOGO_TEXT;
    el.className = "font-black text-xl tracking-tight";
    return;
  }
  const img = document.createElement("img");
  img.src = CONFIG.LOGO_URL;
  img.alt = CONFIG.APP_NAME;
  img.className = "h-9 w-auto object-contain";
  img.onerror = () => {
    el.textContent = CONFIG.LOGO_TEXT;
    el.className = "font-black text-xl tracking-tight";
  };
  el.appendChild(img);
}

export function hebrewDateString(date) {
  // Uses the browser's built-in Hebrew calendar (fast, no network)
  const fmt = new Intl.DateTimeFormat("he-IL-u-ca-hebrew", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return fmt.format(date);
}

export function formatClock(date = new Date()) {
  return new Intl.DateTimeFormat("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function isoDate(date) {
  const d = new Date(date);
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
}

export function toast(msg, kind = "info") {
  const el = document.getElementById("toast");
  if (!el) return alert(msg);
  el.textContent = msg;
  el.className =
    "fixed bottom-4 right-4 max-w-[90vw] rounded-2xl px-4 py-3 shadow-lg text-sm font-bold " +
    (kind === "ok"
      ? "bg-emerald-600 text-white"
      : kind === "err"
      ? "bg-rose-600 text-white"
      : "bg-slate-900 text-white");
  el.style.display = "block";
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => (el.style.display = "none"), 2600);
}

export function setTopNow(el, extra = "") {
  const d = new Date();
  const parts = [
    hebrewDateString(d),
    isoDate(d),
    formatClock(d),
  ];
  if (extra) parts.push(extra);
  el.textContent = parts.join(" • ");
}
