import { useState, useEffect } from "react";
import { Plus, Clock, History, PencilLine, AlertTriangle, Loader2, FileText, Target } from "lucide-react";
import { OTHER_TYPE, REPORT_GROUPS, REPORT_TYPES, findReportType, formulaLabel, rateLabel, unitHours } from "../../../lib/reportTypes.js";
import { clampPct, cn, round2, todayISO } from "../../../lib/utils.js";
import { Button } from "../../../ui/Button.jsx";
import { DateDisplay } from "../../../ui/DateDisplay.jsx";
import { Input } from "../../../ui/Input.jsx";
import { Modal } from "../../../ui/Modal.jsx";
import { ProgressBar } from "../../../ui/Progress.jsx";
import { Select } from "../../../ui/Select.jsx";

/* הגדלת היעד הפרטני של מורה אחת — למנהלת בלבד. מוסיפים שעות ליעד השנתי
   (מספר שלילי מפחית), והיעד החדש נשמר בגיליון Teachers. השעות שנצברו
   וההיסטוריה אינן משתנות. */
function TargetForm({ teacher, onSave, onClose }) {
  const [add, setAdd] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const delta = round2(Number(add) || 0);
  const current = round2(teacher.requiredHours);
  const next = round2(current + delta);

  const submit = async () => {
    if (!delta) return setError("יש להזין מספר שעות להוספה.");
    if (next <= 0) return setError("היעד החדש חייב להיות גדול מאפס.");
    setError("");
    setSubmitError("");
    setSaving(true);
    const res = await onSave(teacher.id, next);
    setSaving(false);
    if (res?.ok) onClose();
    else if (res?.unsupported) setSubmitError("השרת אינו מכיר את פעולת העדכון. יש לפרוס גרסה חדשה של Code.gs.");
    else setSubmitError(res?.error || "שמירה לגיליון נכשלה.");
  };

  return (
    <>
      <div className="rounded-xl bg-slate-50 p-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-slate-500">יעד שנתי נוכחי</span>
          <span className="font-medium text-slate-700">{round2(teacher.accumulatedHours)} / {current} שעות</span>
        </div>
        <ProgressBar value={clampPct(teacher.accumulatedHours, delta ? next : current)} />
        {delta !== 0 && next > 0 && (
          <p className={cn("text-xs mt-2 font-medium", delta > 0 ? "text-blue-600" : "text-amber-600")}>
            היעד החדש: {next} שעות ({delta > 0 ? `+${delta}` : delta})
          </p>
        )}
      </div>

      <Input
        label="שעות להוספה ליעד הפרטני" icon={Target} type="number" step="0.5"
        placeholder="לדוגמה: 10" value={add} error={error}
        onChange={(e) => { setAdd(e.target.value); setError(""); }}
      />
      <p className="text-xs text-slate-500 -mt-2 ps-1">
        מספר שלילי מפחית מהיעד. ⚠️ "חישוב מחדש לכולן" במסך המורים מחזיר את היעד לחישוב לפי המשרה.
      </p>

      {submitError && (
        <p className="text-sm text-red-600 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> {submitError}</p>
      )}
      <div className="sticky bottom-0 -mx-6 -mb-6 px-6 pt-3 pb-6 bg-white border-t border-slate-100 flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onClose} disabled={saving}>ביטול</Button>
        <Button className="flex-1" onClick={submit} disabled={saving}>
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> שומר…</> : <><Target className="w-4 h-4" /> עדכון היעד</>}
        </Button>
      </div>
    </>
  );
}

/* onUpdateTarget — רשות. כשמועבר (מסך המנהלת), החלון מציג שתי לשוניות:
   דיווח שעות, והגדלת היעד הפרטני. במסך המורה — דיווח שעות בלבד. */
function UpdateHoursModal({ open, onClose, teacher, onSave, onUpdateTarget }) {
  const [mode, setMode] = useState("hours");
  const [typeKey, setTypeKey] = useState("");
  const [qty, setQty] = useState("1");
  const [hours, setHours] = useState("");   // בשימוש רק בדיווח "אחר"
  const [reason, setReason] = useState("");
  const [reasonTouched, setReasonTouched] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (open) {
      setMode("hours");
      setTypeKey(""); setQty("1"); setHours(""); setReason(""); setReasonTouched(false);
      setErrors({}); setSubmitError(""); setSaving(false);
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
    setErrors(e);
    if (Object.keys(e).length) return;

    setSubmitError("");
    setSaving(true);
    // התאריך תמיד היום, ונקבע ברגע השמירה — חלון שנשאר פתוח אחרי חצות
    // לא יירשם לאתמול.
    const res = await onSave(teacher.id, { hours: totalHours, reason: reason.trim(), date: todayISO() });
    setSaving(false);
    if (res?.ok) onClose();
    else setSubmitError(res?.error || "שמירה לגיליון נכשלה.");
  };

  const projected = round2(teacher.accumulatedHours + totalHours);
  const projectedPct = clampPct(projected, teacher.requiredHours);

  return (
    <Modal open={open} onClose={onClose} title="עדכון שעות" subtitle={teacher.name} icon={PencilLine}>
      <div className="space-y-4">
        {onUpdateTarget && (
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100">
            {[["hours", "דיווח שעות", Plus], ["target", "הגדלת היעד הפרטני", Target]].map(([key, label, Icon]) => (
              <button
                key={key} type="button" onClick={() => setMode(key)}
                className={cn(
                  "inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors",
                  mode === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>
        )}

        {mode === "target" && onUpdateTarget ? (
          <TargetForm teacher={teacher} onSave={onUpdateTarget} onClose={onClose} />
        ) : (
        <>
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

        {/* תאריך הדיווח — היום, לקריאה בלבד */}
        <DateDisplay iso={todayISO()} note="היום" />
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
        </>
        )}
      </div>
    </Modal>
  );
}

export { UpdateHoursModal };
