import { useMemo, useState } from "react";
import { RefreshCw, Database, FileSpreadsheet, Download } from "lucide-react";
import { WEB_APP_URL } from "../../lib/api.js";
import { cn, downloadCSV, round2, todayISO } from "../../lib/utils.js";
import { Badge } from "../../ui/Badge.jsx";
import { Button } from "../../ui/Button.jsx";
import { Card } from "../../ui/Card.jsx";

/* ----------------- תצוגת מסד הנתונים (הגיליון) ------------------------- */

/* שם הפעולה ביומן השמירות, במילים — ובצבע: ירוק הוספה, כתום מחיקה, כחול עדכון. */
const LOG_LABELS = {
  addTeacher: ["הוספת מורה", "green"],
  addTeachers: ["ייבוא מורות", "green"],
  updateTeachers: ["עדכון פרטי מורה", "blue"],
  deleteTeacher: ["מחיקת מורה", "amber"],
  updateHours: ["דיווח שעות", "green"],
  editHours: ["תיקון דיווח", "blue"],
  deleteHours: ["מחיקת דיווח", "amber"],
};

function SheetGrid({ columns, rows }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table dir="ltr" className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-slate-100 text-slate-500">
            <th className="w-10 px-2 py-2 border border-slate-200 font-semibold text-center">#</th>
            {columns.map((c) => (
              <th key={c} className="px-3 py-2 border border-slate-200 font-semibold text-left whitespace-nowrap font-mono">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="hover:bg-blue-50">
              <td className="px-2 py-1.5 border border-slate-200 text-slate-400 text-center bg-slate-50 font-mono">{ri + 1}</td>
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-1.5 border border-slate-200 text-slate-700 whitespace-nowrap font-mono">{String(cell)}</td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={columns.length + 1} className="px-3 py-6 text-center text-slate-400 border border-slate-200">אין נתונים</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}


function DatabaseView({ teachers, writeLog, demoMode }) {
  const [tab, setTab] = useState("teachers");
  const teacherCols = ["id", "name", "password", "frontalHours", "requiredHours", "accumulatedHours", "supportHours"];
  // במקום teacherId מוצג שם המורה — קריא יותר. בגיליון עצמו נשמר המזהה.
  const historyCols = ["id", "teacher", "date", "hours", "reason", "kind"];
  // בניית הטבלאות עוברת על כל ההיסטוריה וממיינת אותה. ממוזכר, כדי שמעבר
  // בין הלשוניות או הקלדה במסך אחר לא יחשבו אותה מחדש.
  const teacherRows = useMemo(
    () =>
      teachers.map((t) => [
        t.id, t.name, t.password ?? "", t.frontalHours ?? "", t.requiredHours, round2(t.accumulatedHours),
        round2(t.supportHours || 0),
      ]),
    [teachers]
  );
  const historyRows = useMemo(
    () =>
      teachers
        .flatMap((t) => (t.history || []).map((h) => [h.id, t.name, h.date, h.hours, h.reason, h.kind || ""]))
        // ממוין לפי תאריך, מהחדש לישן — כמו בשאר המסכים. באותו יום: לפי סדר הרישום.
        .sort((a, b) => String(b[2]).localeCompare(String(a[2])) || b[0] - a[0]),
    [teachers]
  );

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <Database className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">מסד הנתונים (הגיליון)</h3>
            <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">
              כך נשמרים הנתונים בפועל — שני גיליונות: <span dir="ltr" className="font-mono text-slate-700">Teachers</span> ו־<span dir="ltr" className="font-mono text-slate-700">History</span>.
              כל הוספת מורה או עדכון שעות מוסיפה שורה לגיליון המתאים.{" "}
              {demoMode
                ? "במצב דמו השורות נשמרות במראָה מקומית בזיכרון; כשמגדירים WEB_APP_URL — אותן שורות בדיוק נכתבות לגיליון Google האמיתי."
                : "השורות נכתבות לגיליון Google המחובר."}
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2 p-4 border-b border-slate-100">
          <button
            onClick={() => setTab("teachers")}
            className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors", tab === "teachers" ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50")}
          >
            <FileSpreadsheet className="w-4 h-4" /> <span dir="ltr" className="font-mono">Teachers</span>
            <Badge tone="slate">{teacherRows.length}</Badge>
          </button>
          <button
            onClick={() => setTab("history")}
            className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors", tab === "history" ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50")}
          >
            <FileSpreadsheet className="w-4 h-4" /> <span dir="ltr" className="font-mono">History</span>
            <Badge tone="slate">{historyRows.length}</Badge>
          </button>
          <Button
            variant="secondary" size="sm" icon={Download} className="ms-auto shrink-0"
            onClick={() =>
              tab === "teachers"
                ? downloadCSV(`Teachers - ${todayISO()}.csv`, [teacherCols, ...teacherRows])
                : downloadCSV(`History - ${todayISO()}.csv`, [historyCols, ...historyRows])
            }
          >
            <span className="hidden sm:inline">הורדת הגיליון</span>
          </Button>
        </div>
        <div className="p-4">
          {tab === "teachers" ? <SheetGrid columns={teacherCols} rows={teacherRows} /> : <SheetGrid columns={historyCols} rows={historyRows} />}
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2 p-5 pb-4 border-b border-slate-100">
          <RefreshCw className="w-5 h-5 text-slate-400" />
          <div>
            <h3 className="font-semibold text-slate-900">יומן שמירות <span className="text-xs font-normal text-slate-400">({writeLog.length})</span></h3>
            <p className="text-xs text-slate-500 mt-0.5">כל מה שנשמר לגיליון מאז הכניסה למערכת, מהחדש לישן.</p>
          </div>
        </div>
        {writeLog.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">עדיין לא נשמר דבר מאז הכניסה. כל דיווח, עדכון או מחיקה יופיעו כאן.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {writeLog.map((e) => (
              <div key={e.id} className="px-5 py-3.5">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <Badge tone={(LOG_LABELS[e.action] || [])[1] || "slate"}>
                    {(LOG_LABELS[e.action] || [e.action])[0]}
                  </Badge>
                  <span className="text-xs text-slate-400">בשעה <span dir="ltr">{e.time}</span></span>
                </div>
                <p className="text-sm text-slate-700">{e.description}</p>
                {/* לפני ואחרי — רק השדות שהשתנו בפועל */}
                {e.changes?.length > 0 && (
                  <div className="mt-2 rounded-lg border border-slate-200 overflow-hidden text-sm">
                    <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] bg-slate-50 text-xs font-semibold text-slate-500">
                      <span className="px-3 py-1.5">מה השתנה</span>
                      <span className="px-3 py-1.5">לפני</span>
                      <span className="px-3 py-1.5">עכשיו</span>
                    </div>
                    {e.changes.map((c, i) => (
                      <div key={i} className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] border-t border-slate-100">
                        <span className="px-3 py-1.5 text-slate-600">{c.label}</span>
                        <span className="px-3 py-1.5 text-slate-400 line-through break-words">{String(c.before)}</span>
                        <span className="px-3 py-1.5 font-semibold text-slate-900 break-words">{String(c.after)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {/* הנתונים הגולמיים שנשלחו לשרת — מקופלים, לצורך בירור תקלות בלבד. */}
                <details className="mt-1.5 group">
                  <summary className="text-xs text-slate-400 cursor-pointer select-none hover:text-slate-600">פרטים טכניים</summary>
                  <pre dir="ltr" className="mt-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 overflow-x-auto text-slate-600 font-mono">
{"POST → " + JSON.stringify({ action: e.action, payload: e.payload })}
                  </pre>
                </details>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export { DatabaseView };
