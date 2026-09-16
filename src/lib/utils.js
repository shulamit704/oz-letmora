/* ------------------------------ lib / utils ----------------------------- */

const cn = (...classes) => classes.filter(Boolean).join(" ");

const formatDate = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

/* --------------------------- תאריך עברי --------------------------------- */
/* הדפדפן יודע להמיר ללוח העברי בעצמו (Intl עם ca-hebrew), אבל מחזיר את
   המספרים בספרות — "5 בתשרי 5787". את הגימטריה מרכיבים כאן.
   שם החודש מגיע מ־Intl, כדי שאדר א׳/ב׳ בשנה מעוברת ייצאו נכון. */

const HEB_NUMERALS = [
  [400, "ת"], [300, "ש"], [200, "ר"], [100, "ק"],
  [90, "צ"], [80, "פ"], [70, "ע"], [60, "ס"], [50, "נ"],
  [40, "מ"], [30, "ל"], [20, "כ"], [10, "י"],
  [9, "ט"], [8, "ח"], [7, "ז"], [6, "ו"], [5, "ה"], [4, "ד"], [3, "ג"], [2, "ב"], [1, "א"],
];

function hebrewNumeral(n) {
  let rest = Math.floor(n);
  let out = "";
  while (rest > 0) {
    // ט״ו וט״ז ולא י״ה / י״ו — אלה צירופים של שם ה', ואין כותבים אותם.
    if (rest === 15) { out += "טו"; break; }
    if (rest === 16) { out += "טז"; break; }
    const pair = HEB_NUMERALS.find(([v]) => v <= rest);
    if (!pair) break;
    out += pair[1];
    rest -= pair[0];
  }
  if (!out) return "";
  // גרש לאות בודדת, גרשיים לפני האחרונה: ה׳ · ט״ו · תשפ״ז
  return out.length === 1 ? `${out}׳` : `${out.slice(0, -1)}״${out.slice(-1)}`;
}

/* התאריך העברי המלא: "כ״ד באלול תשפ״ו".
   מוחזרת מחרוזת ריקה אם ההמרה אינה אפשרית — הקוראים נופלים אז ללועזי. */
const formatHebrewDate = (iso) => {
  try {
    const d = new Date(iso + "T00:00:00");
    if (isNaN(d.getTime())) return "";
    const parts = new Intl.DateTimeFormat("he-u-ca-hebrew", {
      day: "numeric", month: "long", year: "numeric",
    }).formatToParts(d);

    const get = (type) => parts.find((p) => p.type === type)?.value || "";
    const day = hebrewNumeral(Number(get("day")));
    const month = get("month");
    // שנת 5787 נכתבת תשפ״ז — האלפים אינם נכתבים.
    const year = hebrewNumeral(Number(get("year")) % 1000);
    if (!day || !month || !year) return "";
    return `${day} ב${month} ${year}`;
  } catch {
    return ""; // דפדפן ללא תמיכה בלוח העברי.
  }
};

const clampPct = (done, total) => {
  if (!total) return 0;
  return Math.min(100, Math.round((done / total) * 100));
};

const todayISO = () => new Date().toISOString().slice(0, 10);

/* מועד הסנכרון האחרון מול הגיליון, לחיווי "עודכן לאחרונה".
   באותו יום מוצגת השעה בלבד — זה המידע שמעניין. ביום אחר מוקדם לו התאריך,
   כדי שלא ייראה כאילו העדכון היה לפני דקות. */
const formatSyncTime = (ts) => {
  if (!ts) return "";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "";
  const time = d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  const sameDay = d.toDateString() === new Date().toDateString();
  if (sameDay) return time;
  return `${d.toLocaleDateString("he-IL", { day: "numeric", month: "short" })}, ${time}`;
};

const round2 = (n) => Math.round(n * 100) / 100;

/* ------------------------- הורדת דוח כקובץ CSV -------------------------- */
/* CSV נפתח ישירות ב־Excel וב־Google Sheets. חובה להקדים BOM, אחרת Excel
   מציג את העברית כג'יבריש. */

const csvCell = (v) => {
  const s = String(v ?? "");
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const toCSV = (rows) => rows.map((r) => r.map(csvCell).join(",")).join("\r\n");

// מנקה תווים שאסורים בשמות קבצים (עברית מותרת).
const safeFileName = (s) => String(s).replace(/[\\/:*?"<>|]/g, "-").trim();

function downloadCSV(fileName, rows) {
  const blob = new Blob(["\uFEFF" + toCSV(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = safeFileName(fileName);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export { cn, formatDate, formatHebrewDate, formatSyncTime, clampPct, todayISO, round2, downloadCSV };
