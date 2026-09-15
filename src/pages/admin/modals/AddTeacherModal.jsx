import { useState, useEffect } from "react";
import { Users, Plus, Lock, AlertTriangle, Loader2, Mic, FileText, UsersRound } from "lucide-react";
import { lookupHours, personalTarget } from "../../../lib/hoursTable.js";
import { Button } from "../../../ui/Button.jsx";
import { Input } from "../../../ui/Input.jsx";
import { Modal } from "../../../ui/Modal.jsx";

function AddTeacherModal({ open, onClose, onCreate }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [frontal, setFrontal] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (open) { setName(""); setPassword(""); setFrontal(""); setErrors({}); setSubmitError(""); setSaving(false); }
  }, [open]);

  const row = lookupHours(frontal);

  const submit = async () => {
    const e = {};
    if (!name.trim()) e.name = "יש להזין שם מלא.";
    if (!password.trim()) e.password = "יש לבחור סיסמה למורה.";
    if (!row) e.frontal = "יש להזין מספר שעות פרונטליות חיובי.";
    setErrors(e);
    if (Object.keys(e).length) return;

    setSubmitError("");
    setSaving(true);
    const res = await onCreate({
      name: name.trim(),
      password: password.trim(),
      frontalHours: row.frontal,
      requiredHours: personalTarget(row.personal),
    });
    setSaving(false);
    if (res?.ok) onClose();
    else setSubmitError(res?.error || "שמירה לגיליון נכשלה.");
  };

  return (
    <Modal open={open} onClose={onClose} title="הוספת מורה" subtitle="יצירת חשבון חדש" icon={Plus}>
      <div className="space-y-4">
        <Input label="שם מלא" icon={Users} placeholder="לדוגמה: חנה שטרן" value={name} error={errors.name} onChange={(e) => setName(e.target.value)} />
        <Input label="סיסמה אישית" icon={Lock} placeholder="בחרו סיסמה לכניסה" value={password} error={errors.password} onChange={(e) => setPassword(e.target.value)} />
        <Input label="שעות פרונטליות (שבועיות)" icon={Mic} type="number" min="1" step="0.5" placeholder="לדוגמה: 16" value={frontal} error={errors.frontal} onChange={(e) => setFrontal(e.target.value)} />
        {row && (
          <div className="rounded-xl bg-slate-50 p-3.5 text-sm space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>לפי טבלת החלוקה</span>
              <span>{row.pct}% משרה · {row.total} ש"ש</span>
            </div>
            {!row.exact && (
              <p className="text-xs text-amber-600">אין ערך כזה בטבלה — הוצמד ל־{row.frontal} שעות פרונטליות.</p>
            )}
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1"><Mic className="w-3.5 h-3.5" />{row.frontal}</span>
              <span className="inline-flex items-center gap-1"><UsersRound className="w-3.5 h-3.5" />{row.personal}</span>
              <span className="inline-flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{row.support}</span>
            </div>
            <p className="text-xs text-blue-600 font-medium">
              יעד למעקב: {personalTarget(row.personal)} שעות פרטניות שנתיות
            </p>
          </div>
        )}
        {submitError && (
          <p className="text-sm text-red-600 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> {submitError}</p>
        )}
        <div className="sticky bottom-0 -mx-6 -mb-6 px-6 pt-3 pb-6 bg-white border-t border-slate-100 flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={saving}>ביטול</Button>
          <Button className="flex-1" onClick={submit} disabled={saving}>
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> שומר…</> : <><Plus className="w-4 h-4" /> יצירת מורה</>}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export { AddTeacherModal };
