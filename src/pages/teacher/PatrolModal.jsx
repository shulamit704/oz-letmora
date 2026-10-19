import { useState, useEffect } from "react";
import { Plus, Clock, History, ShieldCheck, AlertTriangle, Loader2 } from "lucide-react";
import { PATROL_LABEL, SUPPORT_KIND, SUPPORT_TARGET } from "../../lib/supportHours.js";
import { clampPct, round2, todayISO } from "../../lib/utils.js";
import { Button } from "../../ui/Button.jsx";
import { DateDisplay } from "../../ui/DateDisplay.jsx";
import { Input } from "../../ui/Input.jsx";
import { Modal } from "../../ui/Modal.jsx";
import { ProgressBar } from "../../ui/Progress.jsx";

/* דיווח פטרול — צובר שעות תומכות בלבד. הרישום נשמר עם kind="support",
   ולפיו השרת סופר אותו בשעות התומכות ולא בפרטניות.
   התאריך הוא תמיד היום — מוצג לעיון בלבד ואינו ניתן לבחירה. */
function PatrolModal({ open, onClose, teacher, onSave }) {
  const [hours, setHours] = useState("1");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (open) {
      setHours("1"); setNote("");
      setErrors({}); setSubmitError(""); setSaving(false);
    }
  }, [open, teacher]);

  if (!teacher) return null;

  const today = todayISO();

  const total = round2(Number(hours) || 0);
  const current = round2(teacher.supportHours || 0);
  const projected = round2(current + total);
  const projectedPct = clampPct(projected, SUPPORT_TARGET);

  const submit = async () => {
    const e = {};
    if (!hours || Number(hours) <= 0) e.hours = "יש להזין מספר שעות חיובי.";
    setErrors(e);
    if (Object.keys(e).length) return;

    setSubmitError("");
    setSaving(true);
    const reason = note.trim() ? `${PATROL_LABEL} — ${note.trim()}` : PATROL_LABEL;
    // התאריך נקבע ברגע השמירה, כדי שחלון שנשאר פתוח אחרי חצות לא יירשם לאתמול.
    const res = await onSave(teacher.id, { hours: total, reason, date: todayISO(), kind: SUPPORT_KIND });
    setSaving(false);
    if (res?.ok) onClose();
    else setSubmitError(res?.error || "שמירה לגיליון נכשלה.");
  };

  return (
    <Modal open={open} onClose={onClose} title="דיווח פטרול" subtitle={`${teacher.name} · שעות תומכות`} icon={ShieldCheck}>
      <div className="space-y-4">
        <div className="rounded-xl bg-slate-50 p-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-slate-500">שעות תומכות</span>
            <span className="font-medium text-slate-700">{current} / {SUPPORT_TARGET} שעות</span>
          </div>
          <ProgressBar value={projectedPct} />
          {total > 0 && (
            <p className="text-xs text-blue-600 mt-2 font-medium">לאחר הדיווח: {projected} שעות ({projectedPct}%)</p>
          )}
        </div>

        <Input
          label="שעות פטרול" icon={Clock} type="number" min="0.5" step="0.5"
          placeholder="לדוגמה: 1" value={hours} error={errors.hours}
          onChange={(e) => setHours(e.target.value)}
        />

        {/* תאריך הדיווח — היום, לקריאה בלבד */}
        <DateDisplay iso={today} note="היום" />

        <Input
          label="הערה (רשות)" icon={History} placeholder="לדוגמה: הפסקה גדולה"
          value={note} onChange={(e) => setNote(e.target.value)}
        />

        {submitError && (
          <p className="text-sm text-red-600 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> {submitError}</p>
        )}
        <div className="sticky bottom-0 -mx-6 -mb-6 px-6 pt-3 pb-6 bg-white border-t border-slate-100 flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={saving}>ביטול</Button>
          <Button className="flex-1" onClick={submit} disabled={saving}>
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> שומר…</> : <><Plus className="w-4 h-4" /> דיווח פטרול</>}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export { PatrolModal };
