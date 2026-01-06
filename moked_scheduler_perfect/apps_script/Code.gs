/**************************************************
 * YSB Moked Scheduler – FULL Backend (Apps Script)
 * TZ: Asia/Jerusalem
 **************************************************/
const SPREADSHEET_ID = "PUT_YOUR_SPREADSHEET_ID_HERE"; // 🔧 CHANGE THIS
const TZ = "Asia/Jerusalem";

const SHEETS = {
  USERS: "Users",
  SHIFTS: "Shifts",
  ASSIGN: "Assignments",
  REQUESTS: "Requests",
  CAL: "CalendarCache",
};



/* ================== NETWORK HELPERS ================== */
function fetchJsonWithRetry_(url, attempts) {
  const maxAttempts = attempts || 3;
  let lastErr = null;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const js = fetchJsonWithRetry_(url, 3);
  const items = Array.isArray(js.items) ? js.items : [];

  const out = {}; // date => {hebrewDate, parasha, holidays:Set}
  function ensure(date) {
    if (!out[date]) out[date] = { hebrewDate: "", parasha: "", holidays: new Set() };
    return out[date];
  }

  items.forEach(it => {
    const cat = String(it.category || "");
    const date = String(it.date || "").slice(0, 10);
    if (!date) return;
    const row = ensure(date);

    if (cat === "hebdate") {
      row.hebrewDate = String(it.hebrew || it.hdate || "");
      return;
    }

    if (cat === "parashat") {
      row.parasha = normalizeParasha_(String(it.title || it.hebrew || ""));
      return;
    }

    if (cat === "candles" || cat === "havdalah") return;

    const label = String(it.hebrew || it.title || "").trim();
    if (!label) return;

    if (cat === "holiday" || cat === "roshchodesh" || cat === "fast" || cat === "minor" || cat === "modern" || cat === "special") {
      row.holidays.add(label);
    }
  });

  const rowsToAppend = [];
  missing.forEach(date => {
    const row = out[date] || { hebrewDate: "", parasha: "", holidays: new Set() };
    rowsToAppend.push([
      date,
      row.hebrewDate || "",
      row.parasha || "",
      Array.from(row.holidays || []).join(" • "),
    ]);
  });

  if (rowsToAppend.length) {
    sh.getRange(sh.getLastRow() + 1, 1, rowsToAppend.length, 4).setValues(rowsToAppend);
  }
}

function normalizeParasha_(s) {
  let t = String(s || "").trim();
  t = t.replace(/^Parashat\s+/i, "");
  t = t.replace(/^פרשת\s+/, "");
  t = t.replace(/^פר׳\s*/, "");
  return t.trim();
}


function doGet(e) {
  try {
    bootstrap_();
    const action = e.parameter.action || "";

    if (action === "health") return json_({ ok: true, status: "alive" });

    if (action === "getWeek") {
      const date = e.parameter.date;
      if (!date) throw new Error("Missing date");
      return json_(getWeek_(date));
    }

    // Admin (protected)
    if (action === "adminUsers") return json_(adminUsers_(e.parameter.token || ""));
    if (action === "adminShifts") return json_(adminShifts_(e.parameter));
    if (action === "adminRequests") return json_(adminRequests_(e.parameter.token || ""));

    return json_({ ok: false, error: "unknown action" });
  } catch (err) {
    return json_({ ok: false, error: err.message });
  }
}

function doPost(e) {
  try {
    bootstrap_();
    const body = JSON.parse((e.postData && e.postData.contents) ? e.postData.contents : "{}");
    const action = body.action || "";

    if (action === "register") return json_(registerUser_(body));
    if (action === "login") return json_(loginUser_(body));
    if (action === "requestShift") return json_(requestShift_(body));

    // Admin
    if (action === "adminUpdateUser") return json_(adminUpdateUser_(body));
    if (action === "adminGenerateWeeks") return json_(adminGenerateWeeks_(body));
    if (action === "adminBulkUpdateShifts") return json_(adminBulkUpdateShifts_(body));
    if (action === "adminApproveRequest") return json_(adminApproveRequest_(body));
    if (action === "adminRejectRequest") return json_(adminRejectRequest_(body));
    if (action === "adminFillCalendar") return json_(adminFillCalendar_(body));
    if (action === "adminFillCalendarRange") return json_(adminFillCalendarRange_(body));

    return json_({ ok: false, error: "unknown action" });
  } catch (err) {
    return json_({ ok: false, error: err.message });
  }
}

/* ================== BOOTSTRAP ================== */
function bootstrap_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  ensureSheet_(ss, SHEETS.USERS, [
    "id","name","phone","email","password","role","approved","active","createdAt"
  ]);

  ensureSheet_(ss, SHEETS.SHIFTS, [
    "id","date","slot","capacity","locked","note"
  ]);

  ensureSheet_(ss, SHEETS.ASSIGN, [
    "id","shiftId","userId","userName"
  ]);

  ensureSheet_(ss, SHEETS.REQUESTS, [
    "id","userId","shiftId","status","createdAt"
  ]);

  ensureSheet_(ss, SHEETS.CAL, [
    "date","hebrewDate","parasha","holidays"
  ]);
}

function ensureSheet_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);

  const row = sh.getRange(1, 1, 1, headers.length).getValues()[0];
  const empty = row.every(v => v === "");
  if (empty) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
}

/* ================== USERS ================== */
function registerUser_(b) {
  const name = String(b.name || "").trim();
  const phone = String(b.phone || "").trim();
  const email = String(b.email || "").trim();
  const password = String(b.password || "");

  if (!name || !phone || !password) throw new Error("חסר שם/טלפון/סיסמה");
  if (password.length < 4) throw new Error("סיסמה קצרה מדי (מינימום 4)");

  const users = rows_(SHEETS.USERS);
  if (users.some(u => String(u.phone || "").trim() === phone)) throw new Error("טלפון כבר קיים");
  if (email && users.some(u => String(u.email || "").trim().toLowerCase() === email.toLowerCase()))
    throw new Error("מייל כבר קיים");

  append_(SHEETS.USERS, {
    id: uid_(),
    name, phone, email,
    password,           // בסיסי כרגע
    role: "user",
    approved: false,
    active: true,
    createdAt: ts_(),
  });

  return { ok: true };
}

function loginUser_(b) {
  const login = String(b.login || "").trim();
  const password = String(b.password || "");

  const users = rows_(SHEETS.USERS);
  const u = users.find(x =>
    String(x.phone || "").trim() === login ||
    String(x.email || "").trim().toLowerCase() === login.toLowerCase()
  );

  if (!u) return { ok: false, error: "משתמש לא נמצא" };
  if (String(u.password || "") !== password) return { ok: false, error: "סיסמה שגויה" };
  if (!toBool_(u.active)) return { ok: false, error: "משתמש לא פעיל" };
  if (!toBool_(u.approved)) return { ok: false, error: "ממתין לאישור אחמ״ש" };

  return { ok: true, token: String(u.id), user: sanitizeUser_(u) };
}

function sanitizeUser_(u) {
  return {
    id: u.id,
    name: u.name,
    phone: u.phone,
    email: u.email,
    role: u.role || "user",
    approved: toBool_(u.approved),
    active: toBool_(u.active),
  };
}

/* ================== WEEK VIEW ================== */
function getWeek_(dateStr) {
  const anchor = new Date(dateStr + "T00:00:00");
  const sunday = new Date(anchor);
  sunday.setDate(anchor.getDate() - anchor.getDay()); // Sunday

  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);

  const shifts = rows_(SHEETS.SHIFTS);
  const assigns = rows_(SHEETS.ASSIGN);
    // Ensure Hebrew dates/parasha/holidays exist for this week (cached)
  ensureCalendarCacheForRange_(fmt_(sunday), fmt_(saturday));
  const calIdx = indexBy_(rows_(SHEETS.CAL), "date");

  const days = [];

  // Motza"ש first (Saturday date)
  days.push(buildDay_(saturday, 'מוצ"ש', true, shifts, assigns, calIdx));

  // Sunday..Friday
  for (let i = 0; i < 6; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    days.push(buildDay_(d, null, false, shifts, assigns, calIdx));
  }

  // שבת
  days.push(buildDay_(saturday, "שבת", false, shifts, assigns, calIdx));

  const now = new Date();
  const satKey = fmt_(saturday);
  const satCal = calIdx[satKey] || {};

  return {
    ok: true,
    start: fmt_(sunday),
    end: fmt_(saturday),
    weekParasha: satCal.parasha || "",
    header: {
      date: fmt_(now),
      time: Utilities.formatDate(now, TZ, "HH:mm"),
      hebrewDate: "",     // frontend מחשב מהר
      parasha: satCal.parasha || "",
      holidayNames: "",
    },
    days,
  };
}

function buildDay_(dateObj, titleOverride, motzash, shifts, assigns, calIdx) {
  const date = fmt_(dateObj);
  const cal = calIdx[date] || {};

  const dayShifts = shifts.filter(s =>
    String(s.date) === String(date) &&
    (motzash ? String(s.slot) === "motsash_night" : String(s.slot) !== "motsash_night")
  );

  const resultShifts = dayShifts.map(s => {
    const assignees = assigns
      .filter(a => String(a.shiftId) === String(s.id))
      .map(a => ({ userId: String(a.userId), userName: String(a.userName) }));

    const cap = Number(s.capacity || 0);
    const locked = toBool_(s.locked);

    return {
      id: String(s.id),
      label: slotLabel_(String(s.slot)),
      capacity: cap,
      assigned: assignees.length,
      missing: Math.max(0, cap - assignees.length),
      locked,
      note: String(s.note || ""),
      assignees,
    };
  });

  return {
    title: titleOverride || dayName_(dateObj),
    date,
    hebrewDate: cal.hebrewDate || "",
    parasha: cal.parasha || "",
    holidays: cal.holidays || "",
    shifts: resultShifts,
  };
}

/* ================== REQUEST SHIFT ================== */
function requestShift_(b) {
  const token = String(b.token || "").trim();
  const shiftId = String(b.shiftId || "").trim();

  if (!token) throw new Error("לא מחובר");
  if (!shiftId) throw new Error("Missing shiftId");

  const users = rows_(SHEETS.USERS);
  const u = users.find(x => String(x.id) === token);
  if (!u) throw new Error("משתמש לא נמצא");
  if (!toBool_(u.approved)) throw new Error("ממתין לאישור אחמ״ש");
  if (!toBool_(u.active)) throw new Error("משתמש לא פעיל");

  const shifts = rows_(SHEETS.SHIFTS);
  const shift = shifts.find(s => String(s.id) === shiftId);
  if (!shift) throw new Error("Shift not found");
  if (toBool_(shift.locked)) throw new Error("המשמרת נעולה");

  const assigns = rows_(SHEETS.ASSIGN).filter(a => String(a.shiftId) === String(shift.id));
  const cap = Number(shift.capacity || 0);
  if (assigns.length >= cap) throw new Error("המשמרת מלאה");

  // prevent duplicate pending request
  const reqs = rows_(SHEETS.REQUESTS).filter(r =>
    String(r.userId) === token && String(r.shiftId) === String(shift.id)
  );
  if (reqs.some(r => String(r.status) === "pending")) throw new Error("כבר קיימת בקשה ממתינה");

  append_(SHEETS.REQUESTS, {
    id: uid_(),
    userId: token,
    shiftId: String(shift.id),
    status: "pending",
    createdAt: ts_(),
  });

  return { ok: true };
}

/* ================== ADMIN AUTH ================== */
function isAchmash_(token) {
  const u = rows_(SHEETS.USERS).find(x => String(x.id) === String(token));
  if (!u) return false;
  const role = String(u.role || "").toLowerCase().trim();
  return role === "achmash" && toBool_(u.approved) && toBool_(u.active);
}
function requireAchmash_(token) {
  if (!isAchmash_(token)) throw new Error("אין הרשאת אחמ״ש");
}

/* ================== ADMIN USERS ================== */
function adminUsers_(token) {
  requireAchmash_(token);
  const users = rows_(SHEETS.USERS).map(sanitizeUser_);
  return { ok: true, users };
}

function adminUpdateUser_(b) {
  requireAchmash_(String(b.token || ""));
  const userId = String(b.userId || "");
  if (!userId) throw new Error("Missing userId");

  const sh = getSheet_(SHEETS.USERS);
  const data = sh.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf("id") + 1;

  for (let r = 2; r <= data.length; r++) {
    const rid = String(sh.getRange(r, idCol).getValue());
    if (rid !== userId) continue;

    setIf_(sh, headers, r, "name", b.name);
    setIf_(sh, headers, r, "phone", b.phone);
    setIf_(sh, headers, r, "email", b.email);
    setIf_(sh, headers, r, "role", b.role);

    if (typeof b.approved !== "undefined") setIf_(sh, headers, r, "approved", !!b.approved);
    if (typeof b.active !== "undefined") setIf_(sh, headers, r, "active", !!b.active);

    return { ok: true };
  }
  throw new Error("User not found");
}

/* ================== ADMIN REQUESTS ================== */
function adminRequests_(token){
  requireAchmash_(token);

  const reqs = rows_(SHEETS.REQUESTS).filter(r => String(r.status) === "pending");
  const users = rows_(SHEETS.USERS);
  const shifts = rows_(SHEETS.SHIFTS);
  const assigns = rows_(SHEETS.ASSIGN);

  const assignCount = {};
  assigns.forEach(a => { assignCount[String(a.shiftId)] = (assignCount[String(a.shiftId)]||0)+1; });

  const out = reqs.map(r => {
    const u = users.find(x => String(x.id) === String(r.userId)) || {};
    const s = shifts.find(x => String(x.id) === String(r.shiftId)) || {};
    const assigned = assignCount[String(s.id)] || 0;
    return {
      id: String(r.id),
      createdAt: String(r.createdAt||""),
      userId: String(r.userId),
      userName: String(u.name||""),
      userPhone: String(u.phone||""),
      shiftId: String(r.shiftId),
      shiftDate: String(s.date||""),
      shiftSlot: String(s.slot||""),
      shiftLabel: slotLabel_(String(s.slot||"")),
      shiftNote: String(s.note||""),
      shiftLocked: toBool_(s.locked),
      capacity: Number(s.capacity||0),
      assigned
    };
  });

  // sort: newest first
  out.sort((a,b)=> String(b.createdAt).localeCompare(String(a.createdAt)));

  return { ok:true, requests: out };
}

function adminApproveRequest_(b){
  requireAchmash_(String(b.token||""));
  const requestId = String(b.requestId||"");
  if(!requestId) throw new Error("Missing requestId");

  const reqs = rows_(SHEETS.REQUESTS);
  const req = reqs.find(r=>String(r.id)===requestId);
  if(!req) throw new Error("Request not found");
  if(String(req.status)!=="pending") throw new Error("Request not pending");

  const shifts = rows_(SHEETS.SHIFTS);
  const shift = shifts.find(s=>String(s.id)===String(req.shiftId));
  if(!shift) throw new Error("Shift not found");
  if(toBool_(shift.locked)) throw new Error("Shift locked");

  const assigns = rows_(SHEETS.ASSIGN).filter(a=>String(a.shiftId)===String(shift.id));
  const cap = Number(shift.capacity||0);
  if(assigns.length>=cap) throw new Error("Shift full");

  const users = rows_(SHEETS.USERS);
  const u = users.find(x=>String(x.id)===String(req.userId));
  if(!u) throw new Error("User not found");

  // prevent double assignment
  if(assigns.some(a=>String(a.userId)===String(u.id))) throw new Error("User already assigned");

  append_(SHEETS.ASSIGN, {
    id: uid_(),
    shiftId: String(shift.id),
    userId: String(u.id),
    userName: String(u.name||"")
  });

  // set request approved
  updateRequestStatus_(requestId, "approved");

  return { ok:true };
}

function adminRejectRequest_(b){
  requireAchmash_(String(b.token||""));
  const requestId = String(b.requestId||"");
  if(!requestId) throw new Error("Missing requestId");
  updateRequestStatus_(requestId, "rejected");
  return { ok:true };
}

function updateRequestStatus_(requestId, status){
  const sh = getSheet_(SHEETS.REQUESTS);
  const data = sh.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf("id")+1;
  const stCol = headers.indexOf("status")+1;
  if(idCol<=0 || stCol<=0) throw new Error("Requests headers missing");

  for(let r=2;r<=data.length;r++){
    const rid = String(sh.getRange(r,idCol).getValue());
    if(rid===String(requestId)){
      sh.getRange(r, stCol).setValue(status);
      return;
    }
  }
  throw new Error("Request not found");
}

/* ================== ADMIN SHIFTS ================== */
function adminShifts_(p) {
  const token = String(p.token || "");
  requireAchmash_(token);

  const dateFrom = String(p.dateFrom || "");
  const dateTo = String(p.dateTo || "");
  const slot = String(p.slot || "");
  const locked = String(p.locked || ""); // "true"/"false"/""

  let shifts = rows_(SHEETS.SHIFTS);
  if (dateFrom) shifts = shifts.filter(s => String(s.date) >= dateFrom);
  if (dateTo) shifts = shifts.filter(s => String(s.date) <= dateTo);
  if (slot) shifts = shifts.filter(s => String(s.slot) === slot);
  if (locked === "true") shifts = shifts.filter(s => toBool_(s.locked) === true);
  if (locked === "false") shifts = shifts.filter(s => toBool_(s.locked) === false);

  const assigns = rows_(SHEETS.ASSIGN);
  const counts = {};
  assigns.forEach(a => { counts[String(a.shiftId)] = (counts[String(a.shiftId)] || 0) + 1; });

  const out = shifts.map(s => ({
    id: String(s.id),
    date: String(s.date),
    slot: String(s.slot),
    slotLabel: slotLabel_(String(s.slot)),
    capacity: Number(s.capacity || 0),
    locked: toBool_(s.locked),
    note: String(s.note || ""),
    assigned: counts[String(s.id)] || 0,
  }));
  out.sort((a, b) => (a.date + a.slot).localeCompare(b.date + b.slot));
  return { ok: true, shifts: out };
}

/* ================== ADMIN BULK UPDATE ================== */
function adminBulkUpdateShifts_(b) {
  requireAchmash_(String(b.token || ""));

  const ids = Array.isArray(b.shiftIds) ? b.shiftIds.map(String) : [];
  if (!ids.length) throw new Error("No shifts selected");

  const setLocked = (typeof b.locked !== "undefined") ? !!b.locked : null;
  const note = (typeof b.note !== "undefined") ? String(b.note || "") : null;

  const sh = getSheet_(SHEETS.SHIFTS);
  const data = sh.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf("id") + 1;

  const idSet = new Set(ids);
  let updated = 0;

  for (let r = 2; r <= data.length; r++) {
    const rid = String(sh.getRange(r, idCol).getValue());
    if (!idSet.has(rid)) continue;

    if (setLocked !== null) setIf_(sh, headers, r, "locked", setLocked);
    if (note !== null) setIf_(sh, headers, r, "note", note);
    updated++;
  }

  return { ok: true, updated };
}

/* ================== ADMIN GENERATE WEEKS ================== */
function adminGenerateWeeks_(b) {
  requireAchmash_(String(b.token || ""));
  const weeks = Number(b.weeks || 8);
  if (!(weeks > 0 && weeks <= 52)) throw new Error("Weeks out of range");

  const start = b.startDate ? new Date(String(b.startDate) + "T00:00:00") : new Date();
  start.setHours(0, 0, 0, 0);

  const sh = getSheet_(SHEETS.SHIFTS);
  const existing = rows_(SHEETS.SHIFTS);
  const keys = new Set(existing.map(s => `${s.date}|${s.slot}`));

  // Default capacities (can be changed later)
  const cap = {
    weekday_morning: 4,
    weekday_evening: 2,
    weekday_night: 1,
    fri_morning: 2,
    sat_morning: 2,
    sat_night: 2,
    motsash_night: 1, // מוצ"ש 21-8
  };

  let created = 0;

  for (let w = 0; w < weeks; w++) {
    const base = new Date(start);
    base.setDate(start.getDate() + w * 7);

    const sunday = new Date(base);
    sunday.setDate(base.getDate() - base.getDay()); // Sunday
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);

    // מוצ"ש לילה = תאריך שבת
        // Pre-fill CalendarCache for this week (Hebrew date, parasha, holidays)
    ensureCalendarCacheForRange_(fmt_(sunday), fmt_(saturday));

    created += ensureShift_(sh, keys, fmt_(saturday), "motsash_night", cap.motsash_night);

    // א–ה: בוקר/ערב/לילה
    for (let i = 0; i <= 4; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      created += ensureShift_(sh, keys, fmt_(d), "weekday_morning", cap.weekday_morning);
      created += ensureShift_(sh, keys, fmt_(d), "weekday_evening", cap.weekday_evening);
      created += ensureShift_(sh, keys, fmt_(d), "weekday_night", cap.weekday_night);
    }

    // שישי בוקר
    const fri = new Date(sunday);
    fri.setDate(sunday.getDate() + 5);
    created += ensureShift_(sh, keys, fmt_(fri), "fri_morning", cap.fri_morning);

    // שבת: בוקר/לילה
    created += ensureShift_(sh, keys, fmt_(saturday), "sat_morning", cap.sat_morning);
    created += ensureShift_(sh, keys, fmt_(saturday), "sat_night", cap.sat_night);
  }

  return { ok: true, created };
}


/* ================== ADMIN CALENDAR REFRESH ================== */

function adminFillCalendarRange_(b){
  requireAchmash_(String(b.token || ""));
  const startIso = String(b.start || "").slice(0,10);
  const endIso = String(b.end || "").slice(0,10);
  if(!startIso || !endIso) throw new Error("Missing start/end");
  const lock = LockService.getScriptLock();
  if(!lock.tryLock(25000)) throw new Error("השרת עסוק כרגע. נסה שוב.");
  try{
    ensureCalendarCacheForRange_(startIso, endIso);
    return { ok:true };
  } finally {
    lock.releaseLock();
  }
}

function adminFillCalendar_(b){
  requireAchmash_(String(b.token || ""));
  const weeks = Number(b.weeks || 8);
  if (!(weeks > 0 && weeks <= 104)) throw new Error("Weeks out of range");

  const start = b.startDate ? new Date(String(b.startDate) + "T00:00:00") : new Date();
  start.setHours(0,0,0,0);

  // compute Sunday..Saturday for each week and fill cache
  let filledWeeks = 0;
  for(let w=0; w<weeks; w++){
    const base = new Date(start);
    base.setDate(start.getDate() + w*7);

    const sunday = new Date(base);
    sunday.setDate(base.getDate() - base.getDay()); // Sunday
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);

    ensureCalendarCacheForRange_(fmt_(sunday), fmt_(saturday));
    filledWeeks++;
  }

  return { ok:true, filledWeeks };
}

/* ================== HELPERS ================== */
function getSheet_(name) {
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(name);
}

function rows_(sheetName) {
  const sh = getSheet_(sheetName);
  const data = sh.getDataRange().getValues();
  const headers = data.shift();
  return data.map(r => {
    const o = {};
    headers.forEach((h, i) => (o[h] = r[i]));
    return o;
  });
}

function append_(sheetName, obj) {
  const sh = getSheet_(sheetName);
  const headers = sh.getDataRange().getValues()[0];
  sh.appendRow(headers.map(h => (typeof obj[h] === "undefined" ? "" : obj[h])));
}

function setIf_(sh, headers, row, field, value) {
  if (typeof value === "undefined") return;
  const c = headers.indexOf(field) + 1;
  if (c <= 0) return;
  sh.getRange(row, c).setValue(value);
}

function ensureShift_(sh, keys, date, slot, capacity) {
  const key = `${date}|${slot}`;
  if (keys.has(key)) return 0;
  sh.appendRow([uid_(), date, slot, capacity, false, ""]);
  keys.add(key);
  return 1;
}

function indexBy_(rows, key) {
  const m = {};
  rows.forEach(r => (m[String(r[key])] = r));
  return m;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function uid_() { return Utilities.getUuid(); }
function ts_() { return Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd HH:mm:ss"); }

function toBool_(v) {
  if (v === true) return true;
  if (v === false) return false;
  const s = String(v || "").toLowerCase().trim();
  return s === "true" || s === "1" || s === "yes";
}

function fmt_(d) { return Utilities.formatDate(d, TZ, "yyyy-MM-dd"); }
function dayName_(d) { return ["ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"][d.getDay()]; }

function slotLabel_(slot) {
  return {
    motsash_night: "מוצ״ש לילה (21–08)",
    weekday_morning: "א–ה בוקר (08–15)",
    weekday_evening: "א–ה ערב (15–21)",
    weekday_night: "א–ה לילה (21–08)",
    fri_morning: "שישי בוקר (08–12)",
    sat_morning: "שבת בוקר",
    sat_night: "שבת לילה",
  }[slot] || slot;
}
