/* ----------------- נתוני דמו (בשימוש רק כשלא מוגדר גיליון) ---------------- */

// הכניסה היא לפי סיסמה בלבד, ולכן אין עוד שם משתמש למנהלת.
const ADMIN_PASSWORD = "admin2024";

const demoTeachers = [
  {
    id: 1, name: "שרה לוין", password: "sarah123", frontalHours: 16, requiredHours: 120, accumulatedHours: 96,
    history: [
      { id: 11, teacherId: 1, date: "2025-02-03", hours: 24, reason: "סדנת תכנון תכנית לימודים" },
      { id: 12, teacherId: 1, date: "2025-01-15", hours: 32, reason: "מקבץ הוראה רבעון ראשון" },
      { id: 13, teacherId: 1, date: "2024-12-08", hours: 40, reason: "מבחני סוף סמסטר ובדיקתם" },
    ],
  },

];

/* ⭐ הצגת כפתור "כניסה למצב הדגמה" במסך הכניסה.
     false — הכפתור מוסתר (מצב רגיל, מה שהמורות רואות).
     true  — הכפתור חוזר, לצורך הדגמה או בדיקות.
   מצב ההדגמה עצמו נשאר בקוד ותקין; זו רק הדלת אליו. */
const SHOW_DEMO_ENTRY = false;

export { ADMIN_PASSWORD, SHOW_DEMO_ENTRY, demoTeachers };
