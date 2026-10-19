import { useState } from "react";
import { CalendarDays, Clock, PencilLine, Loader2, Trash2, Download } from "lucide-react";
import { DeleteHistoryModal } from "./DeleteHistoryModal.jsx";
import { EditHistoryModal } from "./EditHistoryModal.jsx";
import { printReport } from "../lib/report.js";
import { isSupportRecord } from "../lib/supportHours.js";
import { cn, downloadCSV, formatDate, formatHebrewDate, round2, todayISO } from "../lib/utils.js";
import { Button } from "../ui/Button.jsx";
import { Card } from "../ui/Card.jsx";

/* ---------------------------- היסטוריית שעות ---------------------------- */
/* onEdit / onDelete הם רשות. כשאינם מועברים — הטבלה מוצגת לקריאה בלבד.
   emptyText / emptyHint — הטקסט כשאין רישומים. מסך המורה פונה אליה ישירות. */

function HistoryTable({ teacher, history, onEdit, onDelete, emptyText = "טרם נרשמו שעות.", emptyHint }) {
  const rows = history || teacher?.history || [];
  const sorted = [...rows].sort((a, b) => new Date(b.date) - new Date(a.date));
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const editable = !!(onEdit || onDelete);
  const total = round2(sorted.reduce((s, h) => s + (Number(h.hours) || 0), 0));

  // הרישום שנבחר נשלף מחדש מהרשימה בכל רינדור, כדי שהחלון יציג תמיד את
  // הערכים העדכניים (למשל אחרי שהשמירה ברקע הסתיימה).
  const liveRecord = (r) => (r ? sorted.find((h) => h.id === r.id) || r : null);

  const exportCSV = () => {
    const header = ["תאריך", "סיבה / תיאור", "שעות"];
    const body = sorted.map((h) => [h.date, h.reason, round2(h.hours)]);
    const footer = [
      [],
      ["סה״כ שעות שדווחו", "", total],
      ["יעד שנתי", "", teacher?.requiredHours ?? ""],
      ["הופק בתאריך", "", todayISO()],
    ];
    downloadCSV(
      `היסטוריית שעות - ${teacher?.name || "מורה"} - ${todayISO()}.csv`,
      [header, ...body, ...footer]
    );
  };

  const RowActions = ({ h, className = "" }) => (
    <div className={cn("inline-flex items-center gap-1", className)}>
      {onEdit && (
        <button
          onClick={() => setEditTarget(h)} title="עריכת הרישום" disabled={h.pending || h.saving}
          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <PencilLine className="w-4 h-4" />
        </button>
      )}
      {onDelete && (
        <button
          onClick={() => setDeleteTarget(h)} title="מחיקת הרישום" disabled={h.pending || h.saving}
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );

  /* התאריך העברי הוא הראשי, והלועזי מתחתיו באפור קטן — הוא זה שנשמר
     בגיליון, ולכן נוח שיישאר לעין לצורך הצלבה. אם הדפדפן אינו יודע להמיר
     ללוח העברי, מוצג הלועזי לבדו. */
  const DateCell = ({ iso, small = false }) => {
    const hebrew = formatHebrewDate(iso);
    return (
      <span className={cn("inline-flex items-start gap-2", small && "gap-1.5")}>
        <CalendarDays className={cn("text-slate-400 shrink-0 mt-0.5", small ? "w-3.5 h-3.5" : "w-4 h-4")} />
        <span className="flex flex-col leading-tight">
          <span className={small ? "text-xs text-slate-500" : "text-slate-700"}>
            {hebrew || formatDate(iso)}
          </span>
          {hebrew && (
            <span className={cn("text-slate-400 mt-0.5", small ? "text-[11px]" : "text-xs")}>
              {formatDate(iso)}
            </span>
          )}
        </span>
      </span>
    );
  };

  const HoursCell = ({ h }) =>
    h.pending ? (
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> נשמר…
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800 tabular-nums">
        {h.saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
        +{round2(h.hours)}
      </span>
    );

  // סוג הרישום — פטרול נצבר לשעות התומכות, כל השאר לפרטניות.
  const TypeCell = ({ h }) =>
    isSupportRecord(h) ? (
      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 whitespace-nowrap">תומכות</span>
    ) : (
      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 whitespace-nowrap">פרטניות</span>
    );

  const exportBtn = "min-h-11 text-[15px]";

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-slate-900">היסטוריית דיווחים</h2>
          {sorted.length > 0 && (
            <span className="text-sm text-slate-500">· {sorted.length} רישומים · {total} שעות</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary" icon={Download} className={exportBtn}
            onClick={() => printReport(teacher, `דוח שעות - ${teacher?.name || ""}`)}
            disabled={!teacher || sorted.length === 0}
            title={sorted.length === 0 ? "יהיה זמין לאחר הדיווח הראשון" : "הפקת דוח PDF"}
          >
            ייצוא ל-PDF
          </Button>
          <Button
            variant="secondary" icon={Download} className={exportBtn}
            onClick={exportCSV} disabled={sorted.length === 0}
            title={sorted.length === 0 ? "יהיה זמין לאחר הדיווח הראשון" : "הורדת הדוח כקובץ Excel"}
          >
            ייצוא ל-Excel
          </Button>
        </div>
      </div>

      <div className={cn("overflow-x-auto", sorted.length > 0 && "hidden sm:block")}>
        <table className="w-full min-w-[560px] text-[15px]">
          <thead>
            <tr className="bg-slate-50 text-sm font-bold text-slate-600">
              <th className="px-6 py-3 text-start">תאריך</th>
              <th className="px-6 py-3 text-start">סוג</th>
              <th className="px-6 py-3 text-start">סיבה</th>
              <th className="px-6 py-3 text-start">שעות</th>
              {editable && <th className="px-6 py-3 text-start w-28">פעולות</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((h) => (
              <tr key={h.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-6 py-3.5 text-slate-600 whitespace-nowrap align-top">
                  <DateCell iso={h.date} />
                </td>
                <td className="px-6 py-3.5 align-top"><TypeCell h={h} /></td>
                <td className="px-6 py-3.5 text-slate-700 align-top">{h.reason}</td>
                <td className="px-6 py-3.5 align-top"><HoursCell h={h} /></td>
                {editable && (
                  <td className="px-6 py-3.5 align-top"><RowActions h={h} className="-ms-1.5" /></td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="sm:hidden divide-y divide-slate-100">
        {sorted.map((h) => (
          <div key={h.id} className="p-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <TypeCell h={h} />
                <p className="text-sm font-medium text-slate-800">{h.reason}</p>
              </div>
              <div className="mt-1"><DateCell iso={h.date} small /></div>
              {editable && <RowActions h={h} className="mt-2 -ms-1.5" />}
            </div>
            <div className="shrink-0"><HoursCell h={h} /></div>
          </div>
        ))}
      </div>

      {sorted.length === 0 && (
        <div className="px-6 py-12 flex flex-col items-center gap-3 text-center">
          <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center">
            <Clock className="w-[30px] h-[30px]" />
          </div>
          <span className="text-lg font-semibold text-slate-900">{emptyText}</span>
          {emptyHint && <span className="text-[15px] text-slate-500 max-w-[380px]">{emptyHint}</span>}
        </div>
      )}

      {onEdit && (
        <EditHistoryModal
          open={!!editTarget} onClose={() => setEditTarget(null)}
          record={liveRecord(editTarget)} teacher={teacher} onSave={onEdit}
        />
      )}
      {onDelete && (
        <DeleteHistoryModal
          open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
          record={liveRecord(deleteTarget)} teacher={teacher} onConfirm={onDelete}
        />
      )}
    </Card>
  );
}

export { HistoryTable };
