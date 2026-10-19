import { WEEKS_PER_YEAR, lookupHours, toYearly, displayRow } from "../../lib/hoursTable.js";
import { SUPPORT_TARGET } from "../../lib/supportHours.js";
import { cn } from "../../lib/utils.js";
import { Card } from "../../ui/Card.jsx";

// תווית "בדיווח" — מסמנת את השעות שהמורה צריכה לדווח עליהן באופן שוטף.
function ReportTag({ tone }) {
  return (
    <span
      className={cn(
        "text-xs font-bold px-2 py-0.5 rounded-full",
        tone === "teal" ? "bg-teal-50 text-teal-700" : "bg-blue-50 text-blue-700"
      )}
    >
      בדיווח
    </span>
  );
}

function Line({ label, tag, value, sub, last = false }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 py-3.5", !last && "border-b border-slate-100")}>
      <span className="font-semibold flex items-center gap-2">
        {label}
        {tag && <ReportTag tone={tag} />}
      </span>
      <span className="text-left">
        <b className="text-lg">{value}</b> <span className="text-sm text-slate-500">{sub}</span>
      </span>
    </div>
  );
}

/* המשרה של המורה — פרונטליות / פרטניות / שהייה, שבועי ושנתי, ובנוסף
   השעות התומכות, שהן יעד שנתי קבוע מעבר למשרה השבועית. */
function HoursBreakdown({ teacher, className = "" }) {
  // displayRow — השעות הפרטניות והסיכום כפי שהם מוצגים למורה, אחרי המקדם.
  const row = displayRow(lookupHours(teacher.frontalHours));

  return (
    <Card className={cn("p-6 flex flex-col gap-[18px]", className)}>
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">המשרה שלך</h2>
        {row && (
          <span className="text-[15px] text-slate-500">
            {row.pct}% משרה · {row.total} שעות בשבוע · {toYearly(row.total)} בשנה
          </span>
        )}
      </div>

      {row ? (
        <div className="flex flex-col">
          <Line label="שעות פרונטליות" value={row.frontal} sub={`בשבוע · ${toYearly(row.frontal)} בשנה`} />
          <Line label="שעות פרטניות" tag="blue" value={row.personal} sub={`בשבוע · ${toYearly(row.personal)} בשנה`} />
          <Line label="שעות שהייה" value={row.support} sub={`בשבוע · ${toYearly(row.support)} בשנה`} />
          <Line label="שעות תומכות" tag="teal" value={SUPPORT_TARGET} sub="בשנה (מעבר למשרה השבועית)" last />
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          חלוקת השעות תוצג לאחר שיוזנו השעות הפרונטליות השבועיות עבורך. פני למנהל המערכת.
        </p>
      )}

      <p className="m-0 px-3.5 py-3 rounded-xl bg-slate-50 text-sm text-slate-600">
        החישוב השנתי מבוסס על {WEEKS_PER_YEAR} שבועות לימוד. רק השעות המסומנות ״בדיווח״ דורשות דיווח שוטף.
      </p>
    </Card>
  );
}

export { HoursBreakdown };
