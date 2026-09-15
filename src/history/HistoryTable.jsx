import { useState } from "react";
import { CalendarDays, History, PencilLine, Loader2, Trash2, Download, FileDown } from "lucide-react";
import { DeleteHistoryModal } from "./DeleteHistoryModal.jsx";
import { EditHistoryModal } from "./EditHistoryModal.jsx";
import { printReport } from "../lib/report.js";
import { cn, downloadCSV, formatDate, round2, todayISO } from "../lib/utils.js";
import { Badge } from "../ui/Badge.jsx";
import { Button } from "../ui/Button.jsx";
import { Card } from "../ui/Card.jsx";

/* ---------------------------- היסטוריית שעות ---------------------------- */
/* onEdit / onDelete הם רשות. כשאינם מועברים — הטבלה מוצגת לקריאה בלבד. */

function HistoryTable({ teacher, history, onEdit, onDelete }) {
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

  const HoursCell = ({ h }) =>
    h.pending ? (
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> נשמר…
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5">
        {h.saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
        <Badge tone="blue">+{round2(h.hours)} שעות</Badge>
      </span>
    );

  return (
    <Card>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-slate-400" />
          <h3 className="font-semibold text-slate-900">היסטוריית שעות</h3>
          {sorted.length > 0 && <Badge tone="slate">{sorted.length} רישומים · {total} שעות</Badge>}
        </div>
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <Button
            variant="secondary" size="sm" icon={FileDown}
            onClick={() => printReport(teacher, `דוח שעות - ${teacher?.name || ""}`)}
            disabled={!teacher}
            title="הפקת דוח PDF"
          >
            PDF
          </Button>
          <Button
            variant="secondary" size="sm" icon={Download}
            onClick={exportCSV} disabled={sorted.length === 0}
            title="הורדת הדוח כקובץ Excel"
          >
            Excel
          </Button>
        </div>
      </div>

      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-start text-xs font-semibold text-slate-400 tracking-wide border-b border-slate-100">
              <th className="px-5 py-3 text-start">תאריך</th>
              <th className="px-5 py-3 text-start">סיבה</th>
              <th className="px-5 py-3 text-end">שעות שנוספו</th>
              {editable && <th className="px-5 py-3 text-end w-24">פעולות</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((h) => (
              <tr key={h.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">
                  <span className="inline-flex items-center gap-2"><CalendarDays className="w-4 h-4 text-slate-400" />{formatDate(h.date)}</span>
                </td>
                <td className="px-5 py-3.5 text-slate-700">{h.reason}</td>
                <td className="px-5 py-3.5 text-end"><HoursCell h={h} /></td>
                {editable && (
                  <td className="px-5 py-3.5 text-end"><RowActions h={h} /></td>
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
              <p className="text-sm font-medium text-slate-800">{h.reason}</p>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" />{formatDate(h.date)}</p>
              {editable && <RowActions h={h} className="mt-2 -ms-1.5" />}
            </div>
            <div className="shrink-0"><HoursCell h={h} /></div>
          </div>
        ))}
      </div>

      {sorted.length === 0 && <div className="py-12 text-center text-sm text-slate-400">טרם נרשמו שעות.</div>}

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
