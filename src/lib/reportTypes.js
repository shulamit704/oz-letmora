/* =========================================================================
   סוגי הדיווח וערכם בשעות
   -------------------------------------------------------------------------
   ⭐ זו הרשימה לעריכה. כל שורה = סוג דיווח אחד. יש שתי דרכים לתמחר שורה,
   ובוחרים אחת מהן בלבד:

     perHour — כמה יחידות נעשות בשעה אחת (תעריף בדיקה).
               { perHour: 10 } → 10 מבחנים = שעה, ולכן מבחן אחד = 1/10 שעה.

     hours   — כמה שעות מזכה יחידה אחת.
               { hours: 2 }  → שעת שמירה אחת = 2 שעות.
               { hours: 30 } → הכנה למבחן אחד = 30 שעות שנתיות.

   שדות נוספים:
     unit        — לשון רבים, מוצג בשדה הכמות ("מבחנים", "שעות שמירה").
     unitOne     — לשון יחיד, מוצג בתיאור התעריף ("שעת שמירה", "ראיון").
     group       — כותרת הקבוצה בתפריט הבחירה.
     oncePerYear — מציג אזהרה כתומה בחלון הדיווח. לשורות שמזכות בתגמול
                   שנתי מלא בלחיצה אחת, שדיווח כפול עליהן עולה ביוקר.

   ⚠️ אל תשנו את ה־key של שורה קיימת (הוא המזהה הפנימי). את הטקסט שב־label,
   את המספר, ואת ה־unit אפשר לשנות בחופשיות.
   ========================================================================= */

const G = {
  WEEKLY: "דיווח שבועי",
  PREP: "הכנה ותפקידים שנתיים",
  CHECK: "בדיקת מבחנים",
  GUARD: "שמירה ונוכחות",
  FIELD: "ליווי ושטח",
  INTERVIEW: "ראיונות",
};

const REPORT_TYPES = [
  /* ---- דיווח שוטף: מדווח מדי שבוע, ולכן ראשון בתפריט ---- */
  { key: "patrol", label: "פטרול", group: G.WEEKLY, hours: 1, unit: "שעות פטרול", unitOne: "שעת פטרול" },

  /* ---- הכנה ותפקידים שנתיים: תגמול שנתי קבוע ---- */
  { key: "prep_math_45",         label: "הכנה למבחן מתמטיקה 4/5 יח'", group: G.PREP, hours: 30, unit: "כיתות",   unitOne: "כיתה",  oncePerYear: true },
  // { key: "prep_english_45",   label: "הכנה למבחן באנגלית 4/5 יח'", group: G.PREP, hours: 30, unit: "כיתות",   unitOne: "כיתה",  oncePerYear: true },
  { key: "prep_ext_3",           label: "הכנה למבחני חוץ 3 יח'",      group: G.PREP, hours: 15, unit: "כיתות",   unitOne: "כיתה",  oncePerYear: true },
  { key: "subject_coordination", label: "ריכוז מקצוע",                group: G.PREP, hours: 15, unit: "מקצועות", unitOne: "מקצוע", oncePerYear: true },
  { key: "prep_late_work",       label: "הכנת עבודת איחורית",         group: G.PREP, hours: 4,  unit: "עבודות",  unitOne: "עבודה" },

  /* ---- בדיקת מבחנים: שעה אחת = X מבחנים ---- */
  // { key: "entry_math",        label: "בדיקת מבחני כניסה – מתמטיקה", group: G.CHECK, perHour: 7,  unit: "מבחנים", unitOne: "מבחן" },
  // { key: "entry_english",     label: "בדיקת מבחני כניסה – אנגלית",  group: G.CHECK, perHour: 10, unit: "מבחנים", unitOne: "מבחן" },
  { key: "entry_general",     label: "בדיקת מבחני כניסה – כללי",    group: G.CHECK, perHour: 10, unit: "מבחנים", unitOne: "מבחן" },
  { key: "torah_baki_12",     label: "בדיקת מבחנים בתורה בקיאות כיתה י\"ב", group: G.CHECK, perHour: 10, unit: "מבחנים", unitOne: "מבחן" },
  // { key: "screening_math",    label: "בדיקת מבחני מיון – מתמטיקה",  group: G.CHECK, perHour: 4,  unit: "מבחנים", unitOne: "מבחן" },
  // { key: "screening_english", label: "בדיקת מבחני מיון – אנגלית",   group: G.CHECK, perHour: 5,  unit: "מבחנים", unitOne: "מבחן" },

  /* ---- שמירה ונוכחות: שעת שמירה = 2 ש' ---- */
  { key: "proctor_entry",     label: "שמירה בזמן מבחני כניסה",                   group: G.GUARD, hours: 2, unit: "שעות שמירה", unitOne: "שעת שמירה" },
  { key: "proctor_screening", label: "שמירה בזמן מבחני מיון (מתמטיקה / אנגלית)", group: G.GUARD, hours: 2, unit: "שעות שמירה", unitOne: "שעת שמירה" },
  { key: "proctor_afternoon", label: "שהות בסמינר אחר הצהריים לצרכים נדרשים",    group: G.GUARD, hours: 2, unit: "שעות שמירה", unitOne: "שעת שמירה" },

  /* ---- ליווי ושטח: שעה בשטח = 2–3 ש' ---- */
  { key: "escort_uniform",      label: "ליווי מכירת תלבושת",                      group: G.FIELD, hours: 2, unit: "שעות בשטח", unitOne: "שעה בשטח" },
  { key: "escort_camp_filming", label: "ליווי הסרטות למחנה",                      group: G.FIELD, hours: 2, unit: "שעות בשטח", unitOne: "שעה בשטח" },
  { key: "escort_trip",         label: "ליווי טיול / מחנה",                       group: G.FIELD, hours: 2, unit: "שעות בשטח", unitOne: "שעה בשטח" },
  { key: "review_days",         label: "ימי חזרה מרוכזים לקראת מבחנים משמעותיים", group: G.FIELD, hours: 3, unit: "שעות בשטח", unitOne: "שעה בשטח" },

  /* ---- ראיונות: שני ראיונות = שעה ---- */
  { key: "interviews_grade9", label: "ראיונות של עולות לט'", group: G.INTERVIEW, perHour: 2, unit: "ראיונות", unitOne: "ראיון" },
];

// סדר הקבוצות בתפריט — נגזר מהרשימה עצמה, כך שהוספת שורה חדשה לא דורשת כלום.
const REPORT_GROUPS = [...new Set(REPORT_TYPES.map((t) => t.group))];

// כמה שעות שווה יחידה אחת מהסוג הזה.
const unitHours = (t) => {
  if (!t) return 0;
  if (t.hours != null) return t.hours;
  return t.perHour > 0 ? 1 / t.perHour : 0;
};

// הטקסט שמתאר את התמחור — לתפריט הבחירה.
const rateLabel = (t) => {
  const one = t.unitOne || (t.unit ? t.unit.replace(/ים$/, "") : "יחידה");
  if (t.hours != null) return `${t.hours === 1 ? "שעה" : `${t.hours} שעות`} ל${one}`;
  return `${t.perHour} ${t.unit || "יחידות"} = שעה`;
};

// תיאור החישוב בפועל — לתיבה הכחולה שמעל כפתור השמירה.
const formulaLabel = (t, qty) => {
  const n = Number(qty) || 0;
  const u = t.unit || "יחידות";
  if (t.hours != null) return `${n} ${u} × ${t.hours} שעות`;
  return `${n} ${u} ÷ ${t.perHour}`;
};

// ערך מיוחד: דיווח חופשי על משהו שאינו ברשימה.
const OTHER_TYPE = "other";

const findReportType = (key) => REPORT_TYPES.find((t) => t.key === key) || null;

export { REPORT_TYPES, REPORT_GROUPS, unitHours, rateLabel, formulaLabel, OTHER_TYPE, findReportType };
