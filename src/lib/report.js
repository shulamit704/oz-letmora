import { lookupHours, toYearly, displayRow } from "./hoursTable.js";
import { clampPct, formatDate, round2, todayISO } from "./utils.js";

/* --------------------------- דוח PDF להדפסה ----------------------------- */
/* הדוח נבנה כמסמך HTML נפרד ונשלח לחלון ההדפסה של הדפדפן. משם בוחרים
   "שמירה כ־PDF" — כך העברית יוצאת מושלמת, ואין צורך בשום ספרייה חיצונית.
   הדפדפן מייצר קובץ אחד בכל הדפסה; דוח לכל המורות הוא לכן מסמך אחד שבו
   כל מורה מקבלת עמוד משלה. */

const esc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const REPORT_CSS = `
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Heebo', 'Arial Hebrew', Arial, sans-serif;
    color: #0f172a; margin: 0; font-size: 12px; line-height: 1.5;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .page { padding: 0 0 8px; }
  .page + .page { page-break-before: always; }

  .head { display: flex; align-items: flex-end; justify-content: space-between;
          border-bottom: 2px solid #1e293b; padding-bottom: 10px; margin-bottom: 18px; }
  .school { font-size: 11px; color: #64748b; letter-spacing: .12em; }
  .school b { display: block; font-size: 17px; color: #0f172a; letter-spacing: normal; margin-top: 2px; }
  .doc-title { font-size: 15px; font-weight: 700; }
  .doc-meta { font-size: 10px; color: #94a3b8; margin-top: 3px; }

  .who { font-size: 20px; font-weight: 700; margin: 0 0 14px; }

  .stats { display: flex; gap: 8px; margin-bottom: 16px; }
  .stat { flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 9px 11px; }
  .stat span { display: block; font-size: 10px; color: #64748b; margin-bottom: 3px; }
  .stat b { font-size: 17px; font-weight: 700; }
  .stat.acc b { color: #1d4ed8; }
  .stat.rem b { color: #b45309; }
  .stat.done b { color: #047857; }

  h2 { font-size: 12px; font-weight: 700; margin: 16px 0 7px; color: #334155; }

  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: right; padding: 6px 9px; border-bottom: 1px solid #e2e8f0; }
  th { font-size: 10px; color: #64748b; font-weight: 600; border-bottom: 1.5px solid #cbd5e1;
       background: #f8fafc; }
  td.num, th.num { text-align: left; white-space: nowrap; font-variant-numeric: tabular-nums; }
  tbody tr:nth-child(even) { background: #fafcff; }
  tfoot td { font-weight: 700; border-top: 1.5px solid #cbd5e1; border-bottom: none; padding-top: 8px; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }

  .empty { padding: 18px; text-align: center; color: #94a3b8; border: 1px dashed #e2e8f0;
           border-radius: 8px; }

  .sign { display: flex; gap: 40px; margin-top: 30px; page-break-inside: avoid; }
  .sign div { flex: 1; border-top: 1px solid #94a3b8; padding-top: 5px;
              font-size: 10px; color: #64748b; }
  .foot { margin-top: 14px; font-size: 9px; color: #cbd5e1; text-align: center; }
`;

// עמוד אחד — מורה אחת.
function teacherReportPage(teacher) {
  const hist = [...(teacher.history || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
  const total = round2(hist.reduce((s, h) => s + (Number(h.hours) || 0), 0));
  const remaining = round2(Math.max(0, teacher.requiredHours - teacher.accumulatedHours));
  const pct = clampPct(teacher.accumulatedHours, teacher.requiredHours);
  const row = displayRow(lookupHours(teacher.frontalHours)); // אחרי המקדם — כמו במסך המורה

  const breakdown = row
    ? `<h2>חלוקת השעות · ${row.pct}% משרה</h2>
       <table>
         <thead><tr><th>סוג</th><th class="num">שבועי</th><th class="num">שנתי</th></tr></thead>
         <tbody>
           <tr><td>שעות פרונטליות</td><td class="num">${row.frontal}</td><td class="num">${toYearly(row.frontal)}</td></tr>
           <tr><td>שעות פרטניות</td><td class="num">${row.personal}</td><td class="num">${toYearly(row.personal)}</td></tr>
           <tr><td>שעות שהייה</td><td class="num">${row.support}</td><td class="num">${toYearly(row.support)}</td></tr>
         </tbody>
         <tfoot><tr><td>סה״כ</td><td class="num">${row.total}</td><td class="num">${toYearly(row.total)}</td></tr></tfoot>
       </table>`
    : "";

  const table = hist.length
    ? `<table>
         <thead><tr><th class="num" style="width:90px">תאריך</th><th>סיבה / תיאור</th><th class="num" style="width:70px">שעות</th></tr></thead>
         <tbody>
           ${hist
             .map(
               (h) =>
                 `<tr><td class="num">${esc(formatDate(h.date))}</td><td>${esc(h.reason)}</td><td class="num">${round2(h.hours)}</td></tr>`
             )
             .join("")}
         </tbody>
         <tfoot><tr><td colspan="2">סה״כ שעות שדווחו</td><td class="num">${total}</td></tr></tfoot>
       </table>`
    : `<div class="empty">טרם דווחו שעות.</div>`;

  return `
    <section class="page">
      <div class="head">
        <div class="school">אורחות בית יעקב<b>ירושלים</b></div>
        <div style="text-align:left">
          <div class="doc-title">דוח היסטוריית שעות</div>
          <div class="doc-meta">הופק בתאריך ${esc(formatDate(todayISO()))}</div>
        </div>
      </div>

      <h1 class="who">${esc(teacher.name)}</h1>

      <div class="stats">
        <div class="stat"><span>יעד שנתי</span><b>${teacher.requiredHours}</b></div>
        <div class="stat acc"><span>נצבר</span><b>${round2(teacher.accumulatedHours)}</b></div>
        <div class="stat ${remaining === 0 ? "done" : "rem"}">
          <span>${remaining === 0 ? "סטטוס" : "נותרו"}</span>
          <b>${remaining === 0 ? "הושלם" : remaining}</b>
        </div>
        <div class="stat"><span>התקדמות</span><b>${pct}%</b></div>
      </div>

      ${breakdown}

      <h2>פירוט הדיווחים · ${hist.length} רישומים</h2>
      ${table}

      <div class="sign">
        <div>חתימת המורה</div>
        <div>חתימת ההנהלה</div>
      </div>
      <div class="foot">מסמך זה הופק אוטומטית ממערכת שעות ההוראה.</div>
    </section>`;
}

function buildReportHTML(teachers, title) {
  return `<!DOCTYPE html>
<html dir="rtl" lang="he"><head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700&display=swap">
<style>${REPORT_CSS}</style>
</head><body>${teachers.map(teacherReportPage).join("")}</body></html>`;
}

/* פותח את חלון ההדפסה על מסמך נסתר. שם המסמך הוא שם ברירת המחדל של קובץ
   ה־PDF, ולכן כותרת המסמך היא גם שם הקובץ המוצע. */
function printReport(teachers, title) {
  const list = (Array.isArray(teachers) ? teachers : [teachers]).filter(Boolean);
  if (!list.length) return;

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.title = title;
  frame.style.cssText = "position:fixed;left:-10000px;top:0;width:900px;height:1200px;border:0;";

  let removed = false;
  const remove = () => {
    if (removed) return;
    removed = true;
    setTimeout(() => frame.parentNode && frame.parentNode.removeChild(frame), 400);
  };

  frame.onload = () => {
    const win = frame.contentWindow;
    const go = () => {
      try {
        win.focus();
        win.print();
      } catch (e) {
        /* חלון ההדפסה נחסם — אין מה לעשות מלבד לנקות */
      }
      // חלק מהדפדפנים אינם מדווחים afterprint. ניקוי מושהה כגיבוי.
      setTimeout(remove, 60000);
    };
    win.addEventListener("afterprint", remove);
    // ממתינים לגופן: בלעדיו העברית עלולה להידפס בגופן ברירת מחדל.
    if (win.document.fonts && win.document.fonts.ready) win.document.fonts.ready.then(go, go);
    else setTimeout(go, 400);
  };

  frame.srcdoc = buildReportHTML(list, title);
  document.body.appendChild(frame);
}

export { printReport };
