// frontend/app.js
// =================
// ליבת הפרונט – API, Session, Utilities

import { CONFIG } from "./config.js";

/* ================== SESSION ================== */

export function setSession(token, user) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}

export function getToken() {
  return localStorage.getItem("token");
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.clear();
  window.location.href = "login.html";
}

/* ================== API ================== */

async function apiRequest(method, action, data = {}) {
  const payload =
    method === "GET"
      ? null
      : JSON.stringify({
          action,
          token: getToken(),
          ...data,
        });

  const url =
    method === "GET"
      ? `${CONFIG.API_URL}?action=${action}&token=${getToken() || ""}`
      : CONFIG.API_URL;

  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: payload,
  });

  return res.json();
}

export const api = {
  health: () => apiRequest("GET", "health"),
};

/* ================== LOGO ================== */

export function loadLogo(container) {
  container.innerHTML = "";

  if (CONFIG.LOGO_URL) {
    const img = document.createElement("img");
    img.src = CONFIG.LOGO_URL;
    img.alt = CONFIG.APP_NAME;
    img.className = "h-10 object-contain";

    img.onerror = () => {
      container.textContent = CONFIG.LOGO_TEXT;
      container.className =
        "font-black text-xl tracking-wide text-slate-800";
    };

    container.appendChild(img);
  } else {
    container.textContent = CONFIG.LOGO_TEXT;
    container.className =
      "font-black text-xl tracking-wide text-slate-800";
  }
}

/* ================== HELPERS ================== */

export function esc(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c];
  });
}
