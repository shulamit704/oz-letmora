import { CalendarDays } from "lucide-react";
import { formatDate, formatHebrewDate } from "../lib/utils.js";

/* תאריך לקריאה בלבד — במקום שדה תאריך, בכל מקום שאסור לשנות בו את התאריך.
   העברי ראשי והלועזי לצידו, כמו בשאר המסכים. note — תווית קטנה בקצה. */
function DateDisplay({ label = "תאריך", iso, note }) {
  const hebrew = formatHebrewDate(iso);
  return (
    <div>
      <span className="block text-sm font-medium text-slate-700 mb-1.5">{label}</span>
      <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm">
        <CalendarDays className="w-4 h-4 text-slate-400 shrink-0" />
        <span className="text-slate-700">{hebrew || formatDate(iso)}</span>
        {hebrew && <span className="text-xs text-slate-400">· {formatDate(iso)}</span>}
        {note && <span className="ms-auto text-xs text-slate-400">{note}</span>}
      </div>
    </div>
  );
}

export { DateDisplay };
