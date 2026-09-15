import { Mic, FileText, UsersRound } from "lucide-react";
import { WEEKS_PER_YEAR, lookupHours, toYearly, displayRow } from "../../lib/hoursTable.js";
import { Badge } from "../../ui/Badge.jsx";
import { Card } from "../../ui/Card.jsx";

/* חלוקת השעות של המורה — פרונטליות / פרטניות / שהייה, שבועי ושנתי. */
function HoursBreakdown({ teacher }) {
  // displayRow — השעות הפרטניות והסיכום כפי שהם מוצגים למורה, אחרי המקדם.
  const row = displayRow(lookupHours(teacher.frontalHours));
  if (!row) {
    return (
      <Card className="p-5">
        <p className="text-sm text-slate-500">
          חלוקת השעות תוצג לאחר שיוזנו השעות הפרונטליות השבועיות עבורך. פני למנהל המערכת.
        </p>
      </Card>
    );
  }

  // אייקון אחיד בגוון ניטרלי — שלוש הקטגוריות שוות מעמד, הצבע שמור למשמעות
  // (כחול = נצבר, אפור = יעד, כתום = פער).
  const cats = [
    { key: "frontal",  label: "שעות פרונטליות", icon: Mic,        weekly: row.frontal },
    { key: "personal", label: "שעות פרטניות",   icon: UsersRound, weekly: row.personal },
    { key: "support",  label: "שעות שהייה",     icon: FileText,   weekly: row.support },
  ];

  return (
    <Card>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-5 pb-4 border-b border-slate-100">
        <div>
          <h3 className="font-semibold text-slate-900">חלוקת השעות שלך</h3>
          <p className="text-sm text-slate-500 mt-0.5">
            {row.pct}% משרה · {row.total} שע׳/שבוע · {toYearly(row.total)} שע׳/שנה
          </p>
        </div>
        <Badge tone="slate">שנתי = שבועי × {WEEKS_PER_YEAR}</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-slate-100">
        {cats.map((c) => (
          <div key={c.key} className="p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                <c.icon className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium text-slate-700">{c.label}</span>
            </div>

            {/* מספר ראשי — שבועי */}
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-bold text-slate-900 tracking-tight leading-none">{c.weekly}</span>
              <span className="text-sm font-medium text-slate-500">שע׳/שבוע</span>
            </div>

            {/* מספר משני — שנתי */}
            <p className="mt-2 text-sm text-slate-400">
              <span className="font-semibold text-slate-500">{toYearly(c.weekly)}</span> שע׳/שנה
            </p>
          </div>
        ))}
      </div>

      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-500">
        מעקב ההתקדמות מתייחס לשעות הפרטניות בלבד.
      </div>
    </Card>
  );
}

export { HoursBreakdown };
