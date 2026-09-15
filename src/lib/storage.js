/* =========================================================================
   אחסון מקומי בדפדפן  (lib/storage.js)
   -------------------------------------------------------------------------
   שני אחסונים נפרדים, בכוונה:

     מטמון נתונים → localStorage   — שורד סגירת דפדפן, כדי שהמסך יעלה מיד
                                     בכניסה הבאה במקום להמתין לגיליון.
     סשן התחברות  → sessionStorage — נמחק עם סגירת הלשונית. המערכת משמשת
                                     גם במחשבים משותפים, ואסור שהמורה
                                     הקודמת תישאר מחוברת.

   ⚠️ שני כללי ברזל:

   1. סיסמאות לעולם אינן נשמרות במטמון. הנתונים השמורים משמשים לתצוגה
      בלבד — ההתחברות נסמכת תמיד על נתונים טריים מהשרת.

   2. כל גישה לאחסון עטופה ב־try/catch. בגלישה פרטית, במכסת אחסון מלאה
      ובדפדפנים שחוסמים אחסון אתרים — עצם הקריאה ל־localStorage זורקת
      שגיאה. המטמון הוא שיפור, לא תנאי; כשהוא לא זמין הכול עובד כרגיל.

   ⭐ העלאת מספר גרסה זורקת את כל מה ששמור אצל המשתמשות. יש להעלות אותו
      בכל שינוי במבנה הנתונים השמור, אחרת גרסה ישנה תפורש לא נכון.
   ========================================================================= */

const CACHE_KEY = "oz.hours.cache";
const SESSION_KEY = "oz.hours.session";

const CACHE_VERSION = 1;
const SESSION_VERSION = 1;

/* גיל מרבי למטמון. מעבר לשבוע עדיף מסך טעינה על פני מספרים ישנים שעלולים
   להטעות — למשל יעד שנתי שהשתנה מאז. */
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/* ------------------------------ מטמון נתונים ----------------------------- */

/* ניקוי הרשימה לפני השמירה:
     · password — יורד לגמרי (ראו כלל 1 למעלה).
     · pending  — רישום שטרם אושר בגיליון אינו נשמר כלל; אילו נשמר, הוא היה
                  חוזר אחרי רענון כרישום קיים בלי שנכתב אי־פעם.
     · saving   — דגל זמני של עריכה שרצה; אחרי רענון אין עריכה שרצה. */
const sanitize = (teachers) =>
  (teachers || []).map(({ password, ...t }) => ({
    ...t,
    history: (t.history || [])
      .filter((h) => !h.pending)
      .map(({ saving, ...h }) => h),
  }));

/* מוחזר { teachers, savedAt } — מועד השמירה דרוש לחיווי "עודכן לאחרונה"
   שמוצג למורה, כדי שלא תניח שנתוני מטמון ישנים הם מה שבגיליון כרגע. */
function readCachedTeachers() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== CACHE_VERSION) return null;
    if (!Array.isArray(parsed.teachers)) return null;
    if (!parsed.savedAt || Date.now() - parsed.savedAt > CACHE_MAX_AGE_MS) return null;
    return { teachers: parsed.teachers, savedAt: parsed.savedAt };
  } catch {
    return null; // מטמון פגום או אחסון חסום — נטענים מהשרת כרגיל.
  }
}

function writeCachedTeachers(teachers) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ version: CACHE_VERSION, savedAt: Date.now(), teachers: sanitize(teachers) })
    );
  } catch {
    /* חריגה ממכסת האחסון או אחסון חסום — מוותרים על המטמון בשקט. */
  }
}

function clearCachedTeachers() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    /* אין מה לעשות, וגם אין מה לדווח למשתמשת. */
  }
}

/* -------------------------------- סשן ---------------------------------- */

/* הסשן מכיל תפקיד ומזהה בלבד — לא סיסמה ולא אסימון. הוא אינו מקנה הרשאה
   מול השרת (השרת אינו מאמת כלל בשלב זה), אלא רק חוסך הקלדה חוזרת בתוך
   אותה לשונית. */
function readSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== SESSION_VERSION) return null;

    const s = parsed.session;
    if (!s) return null;
    if (s.role === "admin") return { role: "admin" };
    if (s.role === "teacher" && Number.isFinite(Number(s.teacherId))) {
      return { role: "teacher", teacherId: Number(s.teacherId) };
    }
    return null;
  } catch {
    return null;
  }
}

function writeSession(session) {
  try {
    if (!session) sessionStorage.removeItem(SESSION_KEY);
    else sessionStorage.setItem(SESSION_KEY, JSON.stringify({ version: SESSION_VERSION, session }));
  } catch {
    /* בלי סשן שמור פשוט מתחברים מחדש אחרי רענון — התנהגות סבירה. */
  }
}

function clearSession() {
  writeSession(null);
}

export {
  readCachedTeachers,
  writeCachedTeachers,
  clearCachedTeachers,
  readSession,
  writeSession,
  clearSession,
};
