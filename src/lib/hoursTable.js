// שבועות בשנת לימודים — להמרת שבועי ← שנתי בטבלת חלוקת השעות שלמטה.
// ⚠️ מוצהר כאן פעם אחת בלבד. אין להצהיר עליו שוב — הצהרה כפולה של const
// מפילה את כל הקובץ ומציגה מסך לבן.
const WEEKS_PER_YEAR = 30;

/* ------------------- טבלת חלוקת השעות לפי אחוז משרה --------------------- */
/* מפתח החיפוש הוא מספר השעות הפרונטליות. ממנו נגזרות הפרטניות והשהייה.   */

const HOURS_TABLE = [
  { pct: 16.25, frontal: 4,  personal: 1,   support: 1.5, total: 6.5 },
  { pct: 21.25, frontal: 5,  personal: 1.5, support: 2,   total: 8.5 },
  { pct: 28.75, frontal: 7,  personal: 1.5, support: 3,   total: 11.5 },
  { pct: 33.75, frontal: 8,  personal: 2,   support: 3.5, total: 13.5 },
  { pct: 37.5,  frontal: 9,  personal: 2.5, support: 3.5, total: 15 },
  { pct: 41.25, frontal: 10, personal: 2.5, support: 4,   total: 16.5 },
  { pct: 46.25, frontal: 11, personal: 3,   support: 4.5, total: 18.5 },
  { pct: 50,    frontal: 12, personal: 3,   support: 5,   total: 20 },
  { pct: 53.75, frontal: 13, personal: 3,   support: 5.5, total: 21.5 },
  { pct: 58.75, frontal: 14, personal: 3.5, support: 6,   total: 23.5 },
  { pct: 62.5,  frontal: 15, personal: 3.5, support: 6.5, total: 25 },
  { pct: 66.25, frontal: 16, personal: 4,   support: 6.5, total: 26.5 },
  { pct: 71.25, frontal: 17, personal: 4.5, support: 7,   total: 28.5 },
  { pct: 75,    frontal: 18, personal: 4.5, support: 7.5, total: 30 },
  { pct: 78.75, frontal: 19, personal: 4.5, support: 8,   total: 31.5 },
  { pct: 83.75, frontal: 20, personal: 5,   support: 8.5, total: 33.5 },
  { pct: 87.5,  frontal: 21, personal: 5,   support: 9,   total: 35 },
  { pct: 91.25, frontal: 22, personal: 5.5, support: 9,   total: 36.5 },
  { pct: 96.25, frontal: 23, personal: 6,   support: 9.5, total: 38.5 },
  { pct: 100,   frontal: 24, personal: 6,   support: 10,  total: 40 },
];

// מחזיר את שורת החלוקה לפי מספר השעות הפרונטליות.
// אם אין התאמה מדויקת (בטבלה אין 6, למשל) — נצמדים לשורה הקרובה ביותר
// ומסמנים exact:false כדי שהממשק יוכל להתריע.
const lookupHours = (frontal) => {
  const f = Number(frontal);
  if (!f || f <= 0) return null;
  const exact = HOURS_TABLE.find((r) => r.frontal === f);
  if (exact) return { ...exact, exact: true };
  const nearest = HOURS_TABLE.reduce((best, r) =>
    Math.abs(r.frontal - f) < Math.abs(best.frontal - f) ? r : best
  );
  return { ...nearest, exact: false };
};

// שעות שנתיות = שבועיות × מספר שבועות הלימוד.
const toYearly = (weekly) => Math.round(weekly * WEEKS_PER_YEAR * 100) / 100;

/* ------------------------- מקדם השעות הפרטניות ------------------------- */
/* ⭐ נקודת השינוי היחידה ליעד השנתי של כל המורות.

     1    — היעד הוא כל השעות הפרטניות שבטבלה.
     0.5  — מורידים חצי: כל מורה נדרשת למחצית מהשעות הפרטניות שלה.
     0.75 — מורידים רבע. וכן הלאה.

   הערך משפיע על כל חישוב יעד חדש: הוספת מורה, ייבוא מ־Excel ועדכון מרוכז.
   ⚠️ מורות שכבר קיימות אינן משתנות מאליהן — היעד שלהן שמור בגיליון. כדי
   להחיל עליהן את המקדם החדש: מסך מורים → "עדכון שעות" → "חישוב מחדש
   לכולן". החישוב נגזר תמיד משעות המשרה, ולכן הרצה חוזרת אינה מורידה שוב. */
const PERSONAL_FACTOR = 0.5;

// היעד השנתי למעקב: שעות פרטניות שבועיות × שבועות הלימוד × המקדם.
const personalTarget = (weeklyPersonal) =>
  Math.round(weeklyPersonal * WEEKS_PER_YEAR * PERSONAL_FACTOR * 100) / 100;

/* חלוקת השעות כפי שהיא מוצגת למורה: השעות הפרטניות כבר מוכפלות במקדם,
   והסיכום מעודכן בהתאם. כל מסך שהמורה רואה חייב לעבור דרך כאן — אחרת
   הסיכום מסגיר את המספר המקורי (סה״כ פחות פרונטליות פחות שהייה).
   הממשק הניהולי ממשיך להציג את הטבלה המלאה, כי שם צריך לראות את המקור. */
const displayRow = (row) => {
  if (!row) return null;
  const personal = Math.round(row.personal * PERSONAL_FACTOR * 100) / 100;
  const total = Math.round((row.frontal + personal + row.support) * 100) / 100;
  return { ...row, personal, total };
};

export { WEEKS_PER_YEAR, PERSONAL_FACTOR, HOURS_TABLE, lookupHours, toYearly, personalTarget, displayRow };
