// frontend/config.js
// ==================
// קובץ הגדרות מרכזי – נוגעים רק פה כשצריך לשנות API / לוגו

export const CONFIG = {
  // כתובת ה-Web App של Google Apps Script
  // תיראה בערך כך:
  // https://script.google.com/macros/s/XXXXXXXXXXXX/exec
  API_URL: "https://script.google.com/macros/s/AKfycbyUWxnG8lWXWup1tAaAuV_BfsU6-myCKJSLnTrD5v4tayKsXZna359LFR1f6G5WxPc7oQ/exec",

  // נתיב ללוגו (יחסי ל־frontend/)
  // לדוגמה: "./assets/logo.png"
  LOGO_URL: "./assets/logo.png",

  // טקסט שיופיע אם אין לוגו או אם התמונה לא נטענת
  LOGO_TEXT: "מוקד מצוקה יד שרה",

  // שם המערכת (יופיע בכותרות)
  APP_NAME: "מערכת מוקד מצוקה יד שרה",
};

