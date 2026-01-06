// frontend/config.js
// ==================
// קובץ הגדרות מרכזי – נוגעים רק פה כשצריך לשנות API / לוגו

export const CONFIG = {
  // כתובת ה-Web App של Google Apps Script
  // תיראה בערך כך:
  // https://script.google.com/macros/s/XXXXXXXXXXXX/exec
  API_URL: "PUT_YOUR_APPS_SCRIPT_WEBAPP_URL_HERE",

  // נתיב ללוגו (יחסי ל־frontend/)
  // לדוגמה: "./assets/logo.png"
  LOGO_URL: "./assets/logo.png",

  // טקסט שיופיע אם אין לוגו או אם התמונה לא נטענת
  LOGO_TEXT: "YSB",

  // שם המערכת (יופיע בכותרות)
  APP_NAME: "מערכת מוקד",
};
