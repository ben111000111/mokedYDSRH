import { CONFIG } from "./config.js";

/* ===== SESSION ===== */
export function setSession(token, user) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}
export function getToken() {
  return localStorage.getItem("token");
}
export function getUser() {
  try { return JSON.parse(localStorage.getItem("user")); }
  catch { return null; }
}
export function logout() {
  localStorage.clear();
  window.location.href = "login.html";
}

/* ===== API ===== */
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

/* ===== LOGO ===== */
export function loadLogo(el) {
  el.innerHTML = "";
  if (!CONFIG.LOGO_URL) {
    el.textContent = CONFIG.LOGO_TEXT;
    return;
  }
  const img = document.createElement("img");
  img.src = CONFIG.LOGO_URL;
  img.className = "h-10 object-contain";
  img.onerror = () => (el.textContent = CONFIG.LOGO_TEXT);
  el.appendChild(img);
}

export function esc(s) {
  return String(s || "").replace(/[&<>"']/g, c =>
    ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c])
  );
}
