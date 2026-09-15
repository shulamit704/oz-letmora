/* ------------------------------ lib / utils ----------------------------- */

const cn = (...classes) => classes.filter(Boolean).join(" ");

const formatDate = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const clampPct = (done, total) => {
  if (!total) return 0;
  return Math.min(100, Math.round((done / total) * 100));
};

const todayISO = () => new Date().toISOString().slice(0, 10);

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

export { cn, formatDate, clampPct, todayISO, round2, downloadCSV };
