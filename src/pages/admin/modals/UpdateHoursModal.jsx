import { useState, useEffect } from "react";
import { Plus, Clock, CalendarDays, History, PencilLine, AlertTriangle, Loader2, FileText } from "lucide-react";
import { OTHER_TYPE, REPORT_GROUPS, REPORT_TYPES, findReportType, formulaLabel, rateLabel, unitHours } from "../../../lib/reportTypes.js";
import { clampPct, round2, todayISO } from "../../../lib/utils.js";
import { Button } from "../../../ui/Button.jsx";
import { Input } from "../../../ui/Input.jsx";
import { Modal } from "../../../ui/Modal.jsx";
import { ProgressBar } from "../../../ui/Progress.jsx";
import { Select } from "../../../ui/Select.jsx";

function UpdateHoursModal({ open, onClose, teacher, onSave }) {
  const [typeKey, setTypeKey] = useState("");
  const [qty, setQty] = useState("1");
  const [hours, setHours] = useState("");   // בשימוש רק בדיווח "אחר"
  const [reason, setReason] = useState("");
  const [reasonTouched, setReasonTouched] = useState(false);
  const [date, setDate] = useState(todayISO());
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (open) {
      setTypeKey(""); setQty("1"); setHours(""); setReason(""); setReasonTouched(false);
      setDate(todayISO()); setErrors({}); setSubmitError(""); setSaving(false);
    }
  }, [open, teacher]);

  const type = findReportType(typeKey);
  const isOther = typeKey === OTHER_TYPE;

  // סך השעות שיתווספו: בדיווח מהרשימה — כמות × ערך היחידה; ב"אחר" — הקלדה ידנית.
  // ערך היחידה מגיע מ־unitHours, שיודע לטפל בשתי צורות התמחור:
  // perHour (חילוק) ו־hours (כפל).
  const totalHours = isOther
    ? Number(hours) || 0
    : type
    ? round2((Number(qty) || 0) * unitHours(type))
    : 0;

  // התיאור מתמלא מאליו לפי הבחירה, וממשיך להתעדכן כל עוד המורה לא ערכה אותו.
  useEffect(() => {
    if (reasonTouched || !type) return;
    const n = Number(qty) || 0;
    setReason(n && n !== 1 ? `${type.label} × ${n}` : type.label);
  }, [typeKey, qty, type, reasonTouched]);

  if (!teacher) return null;

  const submit = async () => {
    const e = {};
    if (!typeKey) e.type = "יש לבחור סוג דיווח.";
    else if (isOther) {
      if (!hours || Number(hours) <= 0) e.hours = "יש להזין מספר שעות חיובי.";
    } else if (!qty || Number(qty) <= 0) {
      e.qty = "יש להזין כמות חיובית.";
    }
    if (!reason.trim()) e.reason = "יש להוסיף סיבה קצרה לרישום.";
    if (!date) e.date = "יש לבחור תאריך.";
    setErrors(e);
    if (Object.keys(e).length) return;

    setSubmitError("");
    setSaving(true);
    const res = await onSave(teacher.id, { hours: totalHours, reason: reason.trim(), date });
    setSaving(false);
    if (res?.ok) onClose();
    else setSubmitError(res?.error || "שמירה לגיליון נכשלה.");
  };

  const projected = round2(teacher.accumulatedHours + totalHours);
  const projectedPct = clampPct(projected, teacher.requiredHours);

  return (
    <Modal open={open} onClose={onClose} title="עדכון שעות" subtitle={teacher.name} icon={PencilLine}>
      <div className="space-y-4">
        <div className="rounded-xl bg-slate-50 p-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-slate-500">נוכחי</span>
            <span className="font-medium text-slate-700">{round2(teacher.accumulatedHours)} / {teacher.requiredHours} שעות</span>
          </div>
          <ProgressBar value={projectedPct} />
          {totalHours > 0 && (
            <p className="text-xs text-blue-600 mt-2 font-medium">לאחר העדכון: {projected} שעות ({projectedPct}%)</p>
          )}
        </div>

        {/* הרשימה ארוכה, ולכן מקובצת לפי סוג — הקיבוץ נגזר משדה group. */}
        <Select
          label="סוג הדיווח" icon={FileText} value={typeKey} error={errors.type}
          onChange={(e) => { setTypeKey(e.target.value); setQty("1"); setHours(""); }}
        >
          <option value="">בחרי סוג דיווח…</option>
          {REPORT_GROUPS.map((g) => (
            <optgroup key={g} label={g}>
              {REPORT_TYPES.filter((t) => t.group === g).map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label} — {rateLabel(t)}
                </option>
              ))}
            </optgroup>
          ))}
          <option value={OTHER_TYPE}>אחר — הזנת שעות ידנית</option>
        </Select>

        {isOther ? (
          <Input
            label="שעות פרטניות להוספה" icon={Clock} type="number" min="0.5" step="0.5"
            placeholder="לדוגמה: 8" value={hours} error={errors.hours}
            onChange={(e) => setHours(e.target.value)}
          />
        ) : type ? (
          <>
            <Input
              label={`כמות (${type.unit || "יחידות"})`} icon={Plus} type="number" min="1" step="1"
              placeholder="לדוגמה: 14" value={qty} error={errors.qty}
              onChange={(e) => setQty(e.target.value)}
            />

            {/* תגמול שנתי מלא בלחיצה אחת. אזהרה מפורשת מונעת דיווח חוזר. */}
            {type.oncePerYear && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>
                  זהו תגמול שנתי — {type.hours} שעות נרשמות בבת אחת עבור כל {type.unitOne}.
                  יש לדווח עליו פעם אחת בשנה בלבד.
                </span>
              </div>
            )}

            {/* החישוב מוצג במפורש, כדי שהמורה תראה בדיוק מה נשמר */}
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 flex items-center justify-between gap-3">
              <span className="text-sm text-blue-900">{formulaLabel(type, qty)}</span>
              <span className="text-lg font-bold text-blue-700 tabular-nums shrink-0">
                {totalHours} שעות
              </span>
            </div>
          </>
        ) : null}

        <Input label="תאריך" icon={CalendarDays} type="date" value={date} error={errors.date} onChange={(e) => setDate(e.target.value)} />
        <Input
          label="סיבה / תיאור" icon={History} placeholder="לדוגמה: סדנת תכנון לימודים"
          value={reason} error={errors.reason}
          onChange={(e) => { setReason(e.target.value); setReasonTouched(true); }}
        />
        {submitError && (
          <p className="text-sm text-red-600 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> {submitError}</p>
        )}
        {/* צמוד לתחתית החלון — נגיש תמיד, בלי צורך לגלול עד הסוף */}
        <div className="sticky bottom-0 -mx-6 -mb-6 px-6 pt-3 pb-6 bg-white border-t border-slate-100 flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={saving}>ביטול</Button>
          <Button className="flex-1" onClick={submit} disabled={saving}>
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> שומר…</> : <><Plus className="w-4 h-4" /> הוספת רישום</>}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export { UpdateHoursModal };
