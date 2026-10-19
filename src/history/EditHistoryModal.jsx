import { useState, useEffect } from "react";
import { Clock, History, PencilLine, AlertTriangle, Loader2, Check } from "lucide-react";
import { isSupportRecord } from "../lib/supportHours.js";
import { cn, formatDate, formatHebrewDate, round2 } from "../lib/utils.js";
import { Button } from "../ui/Button.jsx";
import { DateDisplay } from "../ui/DateDisplay.jsx";
import { Input } from "../ui/Input.jsx";
import { Modal } from "../ui/Modal.jsx";

/* ------------------- עריכת רישום קיים בהיסטוריית השעות ------------------- */
/* עריכה משנה גם את סך השעות שנצבר: אם רישום של 8 שעות מתוקן ל־6, נגרעות
   שעתיים מהסכום. החישוב נעשה על ההפרש בלבד. */

function EditHistoryModal({ open, onClose, record, teacher, onSave }) {
  const [hours, setHours] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (open && record) {
      setHours(String(record.hours ?? ""));
      setReason(record.reason || "");
      setErrors({});
      setSubmitError("");
      setSaving(false);
    }
  }, [open, record]);

  if (!record) return null;

  // רישום פטרול נספר בשעות התומכות, ולכן התחזית מתייחסת לסכום שלהן.
  const support = isSupportRecord(record);
  const delta = round2((Number(hours) || 0) - record.hours);
  const projected = round2(((support ? teacher?.supportHours : teacher?.accumulatedHours) ?? 0) + delta);

  const submit = async () => {
    const e = {};
    if (!hours || Number(hours) <= 0) e.hours = "יש להזין מספר שעות חיובי.";
    if (!reason.trim()) e.reason = "יש להוסיף סיבה קצרה לרישום.";
    setErrors(e);
    if (Object.keys(e).length) return;

    setSubmitError("");
    setSaving(true);
    const res = await onSave(record.id, {
      hours: round2(Number(hours)),
      reason: reason.trim(),
      date: record.date, // התאריך אינו ניתן לשינוי — נשמר כפי שדווח
    });
    setSaving(false);
    if (res?.ok) onClose();
    else setSubmitError(res?.error || "שמירת העריכה נכשלה.");
  };

  return (
    <Modal open={open} onClose={onClose} title="עריכת רישום" subtitle={teacher?.name} icon={PencilLine}>
      <div className="space-y-4">
        <div className="rounded-xl bg-slate-50 p-4 text-sm">
          <div className="flex items-start justify-between gap-3">
            <span className="text-slate-500">הרישום המקורי</span>
            <span className="text-end">
              <span className="font-medium text-slate-700 block">
                {round2(record.hours)} שעות · {formatHebrewDate(record.date) || formatDate(record.date)}
              </span>
              {formatHebrewDate(record.date) && (
                <span className="text-xs text-slate-400">{formatDate(record.date)}</span>
              )}
            </span>
          </div>
          {delta !== 0 && (
            <p className={cn("text-xs mt-2 font-medium", delta > 0 ? "text-blue-600" : "text-amber-600")}>
              {delta > 0 ? `יתווספו ${delta} שעות` : `ייגרעו ${Math.abs(delta)} שעות`} · {support ? "השעות התומכות" : "הסכום הכולל"} יעמדו על {projected} שעות
            </p>
          )}
        </div>

        <Input
          label={support ? "שעות תומכות" : "שעות פרטניות"} icon={Clock} type="number" min="0.5" step="0.5"
          value={hours} error={errors.hours}
          onChange={(e) => setHours(e.target.value)}
        />
        <DateDisplay iso={record.date} note="לא ניתן לשינוי" />
        <Input
          label="סיבה / תיאור" icon={History}
          value={reason} error={errors.reason}
          onChange={(e) => setReason(e.target.value)}
        />

        {submitError && (
          <p className="text-sm text-red-600 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" /> {submitError}
          </p>
        )}

        <div className="sticky bottom-0 -mx-6 -mb-6 px-6 pt-3 pb-6 bg-white border-t border-slate-100 flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={saving}>ביטול</Button>
          <Button className="flex-1" onClick={submit} disabled={saving}>
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> שומר…</> : <><Check className="w-4 h-4" /> שמירת השינויים</>}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export { EditHistoryModal };
