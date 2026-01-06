# מערכת מוקד – חבילה מלאה (Frontend + Apps Script)

## מה יש בפנים
### Frontend (מודרני, רספונסיבי)
- login.html — כניסה/רישום
- schedule.html — סידור שבועי (מוצ״ש ראשון), בקשות, משובצים מוצגים
- shabbat.html — תצוגת שבתות (רשת/רשימה), משובצים בחוץ + פרטים בלחיצה
- admin.html — אדמין אחמ״ש (בקשות/משתמשים/משמרות/יצירה)

### Backend (Google Apps Script)
- apps_script/Code.gs — כל ה-API + Bootstrap לגליונות

---

## מה חייבים לשנות (2 דברים בלבד)
1) ב-Apps Script:
- פתח `apps_script/Code.gs`
- החלף:
  `PUT_YOUR_SPREADSHEET_ID_HERE`
  ב-ID של הגיליון שלך

2) בפרונט:
- פתח `frontend/config.js`
- החלף:
  `PUT_YOUR_APPS_SCRIPT_WEBAPP_URL_HERE`
  ב-URL של ה-Web App (Deployments -> Web App -> URL)

---

## איך להריץ את הפרונט
הקבצים משתמשים ב-ES Modules (`type="module"`), לכן צריך להגיש אותם דרך שרת סטטי:
- מומלץ: GitHub Pages על תיקיית `frontend`
- חלופה: `npx serve frontend` (במחשב)

---

## איך להפוך משתמש לאחמ״ש
בגיליון `Users`:
- role = `achmash`
- approved = TRUE
- active = TRUE

---

## הערות
- תאריך עברי מחושב בפרונט (מהיר, ללא רשת) באמצעות `Intl.DateTimeFormat`.
- פרשת שבוע/חגים: כרגע מגיעים מ-CalendarCache אם תמלא אותו.
  אם תרצה — נוסיף בשלב הבא מילוי אוטומטי ומהיר (Hebcal + Cache).


## רענון פרשה+חגים
במסך אדמין > יצירה יש כפתור **רענן פרשה+חגים** שממלא את CalendarCache למספר השבועות שבחרת.


## רענון מתקדם (עם התקדמות)
כפתור **רענן פרשה+חגים** מרענן שבוע-שבוע ומציג פס התקדמות.
בשרת זה משתמש ב-action: adminFillCalendarRange.
