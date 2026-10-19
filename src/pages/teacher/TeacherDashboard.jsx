import { useState } from "react";
import { Plus, ShieldCheck, UserRound } from "lucide-react";
import { HistoryTable } from "../../history/HistoryTable.jsx";
import { Topbar } from "../../layout/Topbar.jsx";
import { WEEKS_PER_YEAR } from "../../lib/hoursTable.js";
import { SUPPORT_TARGET } from "../../lib/supportHours.js";
import { clampPct, cn, round2 } from "../../lib/utils.js";
import { UpdateHoursModal } from "../admin/modals/UpdateHoursModal.jsx";
import { HoursBreakdown } from "./HoursBreakdown.jsx";
import { PatrolModal } from "./PatrolModal.jsx";
import { DemoBanner } from "../../ui/Banners.jsx";
import { Card } from "../../ui/Card.jsx";

/* פס התקדמות בצבע הקטגוריה. ProgressBar המשותף משנה צבע לפי האחוז, וכאן
   הצבע הוא שמזהה את הקטגוריה (כחול = פרטניות, טורקיז = תומכות). */
function Bar({ value, tone = "blue", className = "" }) {
  const fill = { blue: "bg-blue-700", teal: "bg-teal-700" }[tone];
  return (
    <div className={cn("w-full rounded-full bg-slate-200/70 overflow-hidden", className)}>
      <div
        className={cn("h-full rounded-full transition-all duration-700 ease-out", value >= 100 ? "bg-emerald-600" : fill)}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

// תווית המצב בפינת הכרטיס.
function StatusPill({ accumulated, complete }) {
  const [label, cls] = complete
    ? ["הושלם", "bg-emerald-50 text-emerald-700"]
    : accumulated > 0
    ? ["בתהליך", "bg-blue-50 text-blue-700"]
    : ["טרם התחלת", "bg-slate-100 text-slate-700"];
  return <span className={cn("text-sm font-semibold px-3 py-1 rounded-full whitespace-nowrap", cls)}>{label}</span>;
}

/* כרטיס קטגוריה: נצבר מתוך היעד, פס, מה נותר, הקצב הנדרש, וכפתור דיווח.
   הקצב הוא היעד השנתי מחולק בשבועות הלימוד — כמה צריך לדווח בשבוע ממוצע. */
const TONES = {
  blue: {
    icon: "bg-blue-50 text-blue-700",
    button: "bg-blue-700 text-white hover:bg-blue-800 shadow-sm shadow-blue-700/20",
  },
  teal: {
    icon: "bg-teal-50 text-teal-700",
    button: "bg-white text-teal-700 border-2 border-teal-700 hover:bg-teal-50",
  },
};

function CategoryCard({ icon: Icon, title, accumulated, target, tone, buttonLabel, onReport }) {
  const t = TONES[tone];
  const remaining = round2(Math.max(0, target - accumulated));
  const complete = remaining === 0;
  const pace = round2(target / WEEKS_PER_YEAR);

  return (
    <Card className="p-5 sm:p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", t.icon)}>
            <Icon className="w-[22px] h-[22px]" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        </div>
        <StatusPill accumulated={accumulated} complete={complete} />
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-[34px] font-bold leading-none text-slate-900">{round2(accumulated)}</span>
        <span className="text-base text-slate-500">מתוך {target} שעות</span>
      </div>

      <Bar value={clampPct(accumulated, target)} tone={tone} className="h-2.5" />

      <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-[15px] text-slate-700">
        {complete ? (
          <span className="font-semibold text-emerald-700">השלמת את היעד</span>
        ) : (
          <span>נותרו <b>{remaining}</b> שעות</span>
        )}
        <span>קצב נדרש: {pace === 1 ? "שעה אחת" : `${pace} שעות`} בשבוע</span>
      </div>

      <button
        type="button"
        onClick={onReport}
        className={cn(
          "mt-auto min-h-11 rounded-xl text-[15px] font-bold inline-flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500",
          t.button
        )}
      >
        <Plus className="w-[18px] h-[18px]" strokeWidth={2.4} />
        {buttonLabel}
      </button>
    </Card>
  );
}

function TeacherDashboard({ teacher, demoMode, loading, loadError, lastSyncedAt, onRetry, onLogout, onAddHours, onEditHours, onDeleteHours }) {
  const [addOpen, setAddOpen] = useState(false);
  const [patrolOpen, setPatrolOpen] = useState(false);

  /* היעד המשולב — פרטניות ותומכות יחד. מה שנותר מחושב לכל קטגוריה בנפרד
     ורק אז מחובר, כדי שעודף באחת לא יכסה על חוסר בשנייה. */
  const supportHours = teacher.supportHours || 0;
  const target = round2(teacher.requiredHours + SUPPORT_TARGET);
  const reported = round2(teacher.accumulatedHours + supportHours);
  const remaining = round2(
    Math.max(0, teacher.requiredHours - teacher.accumulatedHours) + Math.max(0, SUPPORT_TARGET - supportHours)
  );
  const pct = clampPct(target - remaining, target);

  return (
    <div dir="rtl" className="min-h-screen bg-[#F4F6F9] text-slate-900">
      <Topbar
        title="שעות הוראה"
        subtitle="האזור האישי שלך"
        userName={teacher.name} role="מורה" onLogout={onLogout}
        innerClass="max-w-[1100px] mx-auto px-4 sm:px-6"
      />
      <main className="max-w-[1100px] w-full mx-auto px-4 sm:px-6 pt-7 pb-12 flex flex-col gap-5">
        {demoMode && <DemoBanner />}

        {/* פתיחה: ברכה, והמסר הראשי — כמה נותר מהיעד השנתי המשולב */}
        <Card className="px-6 sm:px-7 py-6 flex flex-col gap-5">
          <div className="flex flex-col gap-1.5 min-w-0">
            <span className="text-[22px] font-bold leading-snug">שלום וברכה, {teacher.name}</span>
            <span className="text-[15px] text-slate-500 mb-1.5">שנת הלימודים תשפ״ז</span>
            {remaining === 0 ? (
              <h1 className="text-[28px] font-bold leading-tight">
                <span className="text-emerald-600">השלמת</span> את היעד השנתי
              </h1>
            ) : (
              <h1 className="text-[28px] font-bold leading-tight">
                נותרו לך <span className="text-blue-700">{remaining} שעות</span> להשלמת היעד השנתי
              </h1>
            )}
            <span className="text-[15px] text-slate-500">
              דיווחת {reported} מתוך {target} שעות (פרטניות ותומכות)
            </span>
          </div>
          <div className="min-w-0 flex flex-col gap-2.5">
            <div className="flex justify-between gap-3 text-[15px] font-semibold">
              <span>הושלמו מתוך היעד השנתי ({target} שעות)</span>
              <span>{pct}%</span>
            </div>
            <Bar value={pct} className="h-3" />
          </div>
        </Card>

        {/* שתי הקטגוריות, היסטוריית הדיווחים, ובסוף חלוקת המשרה */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5">
          <CategoryCard
            icon={UserRound} title="שעות פרטניות" tone="blue"
            accumulated={teacher.accumulatedHours} target={teacher.requiredHours}
            buttonLabel="דיווח שעות פרטניות" onReport={() => setAddOpen(true)}
          />
          <CategoryCard
            icon={ShieldCheck} title="שעות תומכות" tone="teal"
            accumulated={supportHours} target={SUPPORT_TARGET}
            buttonLabel="דיווח שעות תומכות" onReport={() => setPatrolOpen(true)}
          />
        </div>

        <HistoryTable
          teacher={teacher}
          emptyText="עדיין לא דיווחת שעות השנה"
          emptyHint="כל דיווח יופיע כאן עם התאריך והסיבה, ותוכלי לייצא את הרשימה בסוף החודש."
          onEdit={onEditHours ? (recordId, values) => onEditHours(teacher.id, recordId, values) : undefined}
          onDelete={onDeleteHours ? (recordId) => onDeleteHours(teacher.id, recordId) : undefined}
        />

        <HoursBreakdown teacher={teacher} />
      </main>

      <UpdateHoursModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        teacher={teacher}
        onSave={onAddHours}
      />
      <PatrolModal
        open={patrolOpen}
        onClose={() => setPatrolOpen(false)}
        teacher={teacher}
        onSave={onAddHours}
      />
    </div>
  );
}

export { TeacherDashboard };
