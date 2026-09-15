import { useMemo } from "react";
import { Users, Clock, TrendingUp, CheckCircle2 } from "lucide-react";
import { clampPct, cn, round2 } from "../../lib/utils.js";
import { Avatar } from "../../ui/Avatar.jsx";
import { Button } from "../../ui/Button.jsx";
import { Card } from "../../ui/Card.jsx";
import { ProgressBar } from "../../ui/Progress.jsx";

function StatCard({ icon: Icon, label, value, sub, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-600", green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600", slate: "bg-slate-100 text-slate-600",
  };
  return (
    <Card hover className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", tones[tone])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </Card>
  );
}


function AdminOverview({ teachers, onOpenTeachers }) {
  const stats = useMemo(() => {
    const total = teachers.length;
    const totalLogged = teachers.reduce((s, t) => s + t.accumulatedHours, 0);
    const completed = teachers.filter((t) => t.accumulatedHours >= t.requiredHours).length;
    const avg = total
      ? Math.round(teachers.reduce((s, t) => s + clampPct(t.accumulatedHours, t.requiredHours), 0) / total)
      : 0;
    return { total, totalLogged: round2(totalLogged), completed, avg };
  }, [teachers]);

  const ranked = [...teachers].sort(
    (a, b) => clampPct(b.accumulatedHours, b.requiredHours) - clampPct(a.accumulatedHours, a.requiredHours)
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Users} label="סה&quot;כ מורים" value={stats.total} sub="חשבונות פעילים" tone="blue" />
        <StatCard icon={Clock} label="שעות שתועדו" value={stats.totalLogged} sub="בכל המורים" tone="slate" />
        <StatCard icon={TrendingUp} label="השלמה ממוצעת" value={`${stats.avg}%`} sub="מתוך היעד הנדרש" tone="amber" />
        <StatCard icon={CheckCircle2} label="עמדו ביעד" value={`${stats.completed}/${stats.total}`} sub="השלימו את השעות הנדרשות" tone="green" />
      </div>

      <Card>
        <div className="flex items-center justify-between p-5 pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-semibold text-slate-900">טבלת התקדמות</h3>
            <p className="text-sm text-slate-500 mt-0.5">מדורג לפי התקדמות אל מול היעד</p>
          </div>
          <Button variant="secondary" size="sm" onClick={onOpenTeachers} icon={Users}>ניהול</Button>
        </div>
        <div className="divide-y divide-slate-100">
          {ranked.map((t, i) => {
            const pct = clampPct(t.accumulatedHours, t.requiredHours);
            return (
              <div key={t.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                <span className="w-6 text-sm font-semibold text-slate-400 text-center">{i + 1}</span>
                <Avatar name={t.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{t.name}</p>
                  <p className="text-xs text-slate-400">{round2(t.accumulatedHours)} / {t.requiredHours} שעות</p>
                </div>
                <div className="w-32 hidden sm:block"><ProgressBar value={pct} /></div>
                <span className="w-10 text-end text-sm font-semibold text-slate-700">{pct}%</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

export { AdminOverview };
