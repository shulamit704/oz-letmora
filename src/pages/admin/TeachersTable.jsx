import { useState } from "react";
import { Plus, CheckCircle2, Search, History, PencilLine, FileSpreadsheet, Copy, Check, Trash2, Download, FileDown, SlidersHorizontal } from "lucide-react";
import { printReport } from "../../lib/report.js";
import { clampPct, downloadCSV, round2, todayISO } from "../../lib/utils.js";
import { Avatar } from "../../ui/Avatar.jsx";
import { Badge } from "../../ui/Badge.jsx";
import { Button } from "../../ui/Button.jsx";
import { Card } from "../../ui/Card.jsx";
import { ProgressBar } from "../../ui/Progress.jsx";

/* תא סיסמה: מציג את הסיסמה בטקסט גלוי עם כפתור העתקה מהיר למנהל. */
function PasswordCell({ password }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="inline-flex items-center gap-1.5">
      <code dir="ltr" className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 font-mono text-xs">{password}</code>
      <button
        onClick={copy} title="העתקת סיסמה"
        className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}


function TeachersTable({ teachers, onUpdateHours, onAdd, onBulkImport, onBulkUpdate, onDelete, onOpenHistory }) {
  const [query, setQuery] = useState("");
  const filtered = teachers.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()));

  // דוח מרוכז: כל רישומי השעות של כל המורות, ממוין לפי שם ואז לפי תאריך.
  const exportAll = () => {
    const header = ["מורה", "תאריך", "סיבה / תיאור", "שעות", "נצבר סה״כ", "יעד שנתי"];
    const rows = [];
    [...teachers]
      .sort((a, b) => a.name.localeCompare(b.name, "he"))
      .forEach((t) => {
        const hist = [...(t.history || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
        if (!hist.length) {
          rows.push([t.name, "", "לא דווחו שעות", 0, round2(t.accumulatedHours), t.requiredHours]);
          return;
        }
        hist.forEach((h, i) => {
          rows.push([
            t.name, h.date, h.reason, round2(h.hours),
            i === 0 ? round2(t.accumulatedHours) : "",
            i === 0 ? t.requiredHours : "",
          ]);
        });
      });
    downloadCSV(`דוח היסטוריית שעות - כל המורות - ${todayISO()}.csv`, [header, ...rows]);
  };

  /* דוח PDF לכל המורות: הדפסה אחת, עמוד נפרד לכל מורה. הדפדפן מייצר קובץ
     אחד בכל פעם, ולכן זהו מסמך אחד ולא קובץ נפרד לכל מורה. הרשימה מכבדת
     את החיפוש — כך אפשר להפיק דוח לקבוצה מסוימת. */
  const printAll = () => {
    const list = [...filtered].sort((a, b) => a.name.localeCompare(b.name, "he"));
    printReport(list, `דוח שעות - כל המורות - ${todayISO()}`);
  };

  return (
    <Card>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 pb-4 border-b border-slate-100">
        <div>
          <h3 className="font-semibold text-slate-900">כל המורים</h3>
          <p className="text-sm text-slate-500 mt-0.5">{teachers.length} מורים במערכת</p>
        </div>
        {/* חמישה כפתורים ותיבת חיפוש לא נכנסים לשורה אחת בכל רוחב מסך. הגלישה
            (flex-wrap) היא מה שמונע מהכפתור האחרון לחרוג מגבול הכרטיס; תיבת
            החיפוש מתכווצת לפני שמשהו נדחף החוצה. */}
        <div className="flex flex-wrap items-center justify-end gap-2 min-w-0">
          <div className="relative flex-1 min-w-[9rem] sm:flex-none sm:w-52">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
            <input
              value={query} onChange={(e) => setQuery(e.target.value)} placeholder="חיפוש מורים"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 ps-9 pe-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
            />
          </div>
          <Button
            variant="secondary" onClick={printAll} icon={FileDown} className="shrink-0"
            disabled={filtered.length === 0}
            title="דוח PDF — עמוד לכל מורה"
          >
            <span className="hidden xl:inline">PDF לכולן</span>
          </Button>
          <Button variant="secondary" onClick={exportAll} icon={Download} className="shrink-0" title="הורדת דוח היסטוריית השעות של כל המורים כקובץ Excel">
            <span className="hidden xl:inline">Excel</span>
          </Button>
          <Button variant="secondary" onClick={onBulkImport} icon={FileSpreadsheet} className="shrink-0" title="ייבוא מורות חדשות מהדבקת טבלה">
            <span className="hidden xl:inline">ייבוא מ־Excel</span>
          </Button>
          <Button
            variant="secondary" onClick={onBulkUpdate} icon={SlidersHorizontal} className="shrink-0"
            disabled={teachers.length === 0}
            title="עדכון שעות וסיסמאות למורות קיימות — בלי לפגוע בשעות שנצברו"
          >
            <span className="hidden xl:inline">עדכון שעות</span>
          </Button>
          <Button onClick={onAdd} icon={Plus} className="shrink-0" title="הוספת מורה חדשה">
            <span className="hidden sm:inline">הוספת מורה</span>
          </Button>
        </div>
      </div>

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-start text-xs font-semibold text-slate-400 tracking-wide border-b border-slate-100">
              <th className="px-5 py-3 text-start">מורה</th>
              <th className="px-5 py-3 text-start">סיסמה</th>
              <th className="px-5 py-3 text-start">נדרש</th>
              <th className="px-5 py-3 text-start">נצבר</th>
              <th className="px-5 py-3 text-start">נותרו</th>
              <th className="px-5 py-3 w-48 text-start">התקדמות</th>
              <th className="px-5 py-3 text-end">פעולה</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((t) => {
              const pct = clampPct(t.accumulatedHours, t.requiredHours);
              const remaining = round2(Math.max(0, t.requiredHours - t.accumulatedHours));
              const done = remaining === 0;
              return (
                <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={t.name} size="sm" />
                      <span className="font-medium text-slate-800">{t.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5"><PasswordCell password={t.password} /></td>
                  <td className="px-5 py-3.5 text-slate-600">{t.requiredHours} שעות</td>
                  <td className="px-5 py-3.5 font-medium text-slate-800">{round2(t.accumulatedHours)} שעות</td>
                  <td className="px-5 py-3.5">
                    {done ? (
                      <Badge tone="green"><CheckCircle2 className="w-3.5 h-3.5" /> הושלם</Badge>
                    ) : (
                      <span className="text-slate-600">{remaining} שעות</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <ProgressBar value={pct} className="flex-1" />
                      <span className="text-xs font-semibold text-slate-500 w-9 text-end">{pct}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-end">
                    <div className="inline-flex items-center gap-2">
                      <Button variant="secondary" size="sm" onClick={() => onUpdateHours(t)} icon={PencilLine}>עדכון</Button>
                      <button
                        onClick={() => onOpenHistory(t)} title="היסטוריית השעות"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <History className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => printReport(t, `דוח שעות - ${t.name}`)} title="דוח PDF למורה זו"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <FileDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(t)} title="מחיקת מורה"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="py-12 text-center text-sm text-slate-400">לא נמצאו מורים התואמים לחיפוש.</div>}
      </div>

      <div className="md:hidden divide-y divide-slate-100">
        {filtered.map((t) => {
          const pct = clampPct(t.accumulatedHours, t.requiredHours);
          const remaining = round2(Math.max(0, t.requiredHours - t.accumulatedHours));
          return (
            <div key={t.id} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar name={t.name} size="sm" />
                  <div>
                    <p className="font-medium text-slate-800">{t.name}</p>
                    <p className="text-xs text-slate-400">{round2(t.accumulatedHours)} / {t.requiredHours} שעות · נותרו {remaining}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-slate-700">{pct}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">סיסמה</span>
                <PasswordCell password={t.password} />
              </div>
              <ProgressBar value={pct} />
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => onUpdateHours(t)} icon={PencilLine} className="flex-1">עדכון שעות</Button>
                <Button variant="secondary" size="sm" onClick={() => onOpenHistory(t)} icon={History} className="shrink-0" />
                <Button variant="secondary" size="sm" onClick={() => printReport(t, `דוח שעות - ${t.name}`)} icon={FileDown} className="shrink-0" />
                <Button variant="danger" size="sm" onClick={() => onDelete(t)} icon={Trash2} className="shrink-0" />
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div className="py-12 text-center text-sm text-slate-400">לא נמצאו מורים התואמים לחיפוש.</div>}
      </div>
    </Card>
  );
}

export { TeachersTable };
