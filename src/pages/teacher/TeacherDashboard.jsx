import { useState } from "react";
import { Plus, Clock, Award } from "lucide-react";
import { HistoryTable } from "../../history/HistoryTable.jsx";
import { Topbar } from "../../layout/Topbar.jsx";
import { clampPct, round2 } from "../../lib/utils.js";
import { UpdateHoursModal } from "../admin/modals/UpdateHoursModal.jsx";
import { HoursBreakdown } from "./HoursBreakdown.jsx";
import { Badge } from "../../ui/Badge.jsx";
import { DemoBanner } from "../../ui/Banners.jsx";
import { Button } from "../../ui/Button.jsx";
import { Card } from "../../ui/Card.jsx";
import { ProgressRing } from "../../ui/Progress.jsx";

function TeacherDashboard({ teacher, demoMode, onLogout, onAddHours, onEditHours, onDeleteHours }) {
  const [addOpen, setAddOpen] = useState(false);
  const pct = clampPct(teacher.accumulatedHours, teacher.requiredHours);
  const remaining = round2(Math.max(0, teacher.requiredHours - teacher.accumulatedHours));
  const complete = remaining === 0;

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      <Topbar
        title="שעות הוראה"
        subtitle="האזור האישי שלך"
        userName={teacher.name} role="מורה" onLogout={onLogout}
      />
      <main className="p-5 lg:p-8 max-w-5xl w-full mx-auto space-y-6">
        {/* ברכת פתיחה — הכותרת הראשית של העמוד. */}
        <div className="pt-1">
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
            שלום וברכה, {teacher.name} היקרה,
          </h1>
          <p className="text-base text-slate-500 mt-1.5">
            לפניך נתוני המשרה לשנת תשפ״ו.
          </p>
        </div>

        {demoMode && <DemoBanner />}

        <HoursBreakdown teacher={teacher} />

        <Card className="p-6 lg:p-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <ProgressRing value={pct} />

            <div className="flex-1 w-full">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-sm font-medium text-slate-500">התקדמות בשעות הפרטניות</h3>
                {complete && <Badge tone="green"><Award className="w-3.5 h-3.5" /> עמדת ביעד</Badge>}
              </div>

              {/* המסר הראשי: מה נותר לעשות */}
              {complete ? (
                <div>
                  <p className="text-3xl font-bold text-emerald-600 tracking-tight">השלמת את היעד</p>
                  <p className="text-sm text-slate-500 mt-1.5">כל השעות הפרטניות הנדרשות תועדו. עבודה מצוינת!</p>
                </div>
              ) : (
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold text-amber-600 tracking-tight leading-none">{remaining}</span>
                    <span className="text-lg font-medium text-amber-600">שעות</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-2">נותרו לך כדי להשלים את היעד השנתי</p>
                </div>
              )}

              {/* תמיכה משנית: נצבר מול נדרש */}
              <div className="flex items-center gap-6 mt-6 pt-5 border-t border-slate-100">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    <span className="text-xs text-slate-400">נצבר</span>
                  </div>
                  <p className="text-lg font-semibold text-blue-700 mt-0.5">{round2(teacher.accumulatedHours)}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-300" />
                    <span className="text-xs text-slate-400">יעד שנתי</span>
                  </div>
                  <p className="text-lg font-semibold text-slate-600 mt-0.5">{teacher.requiredHours}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* קריאה לפעולה ראשית — ממוקמת מיד מעל היסטוריית השעות, המקום שאליו
            המורה מגיעה כדי לראות מה כבר דיווחה. */}
        <Card className="p-6 lg:p-7 border-blue-200 bg-gradient-to-l from-blue-50 to-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-700 flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">דיווח שעות פרטניות</h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  {complete
                    ? "השלמת את היעד — אפשר להמשיך ולתעד שעות נוספות."
                    : `נותרו ${remaining} שעות להשלמת היעד השנתי.`}
                </p>
              </div>
            </div>

            <Button
              size="lg"
              icon={Plus}
              onClick={() => setAddOpen(true)}
              className="w-full sm:w-auto shrink-0 px-8 py-3.5 text-base font-semibold shadow-md shadow-blue-600/25"
            >
              דיווח שעות
            </Button>
          </div>
        </Card>

        <HistoryTable
          teacher={teacher}
          onEdit={onEditHours ? (recordId, values) => onEditHours(teacher.id, recordId, values) : undefined}
          onDelete={onDeleteHours ? (recordId) => onDeleteHours(teacher.id, recordId) : undefined}
        />
      </main>

      <UpdateHoursModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        teacher={teacher}
        onSave={onAddHours}
      />
    </div>
  );
}

export { TeacherDashboard };
