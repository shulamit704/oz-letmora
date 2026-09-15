import { useState, useEffect } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { Button } from "../../../ui/Button.jsx";
import { Modal } from "../../../ui/Modal.jsx";

function DeleteTeacherModal({ open, onClose, teacher, onConfirm }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) { setSaving(false); setError(""); }
  }, [open, teacher]);

  if (!teacher) return null;

  const historyCount = (teacher.history || []).length;

  const submit = async () => {
    setError("");
    setSaving(true);
    const res = await onConfirm(teacher.id);
    setSaving(false);
    if (res?.ok) onClose();
    else setError(res?.error || "המחיקה נכשלה.");
  };

  return (
    <Modal open={open} onClose={onClose} title="מחיקת מורה" subtitle={teacher.name} icon={Trash2}>
      <div className="space-y-4">
        <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-800 leading-relaxed">
          פעולה זו בלתי הפיכה. יימחקו מהגיליון:
          <ul className="mt-2 space-y-1 text-xs">
            <li>· חשבון המורה ({teacher.name})</li>
            <li>· {historyCount} רישומי שעות בהיסטוריה שלה</li>
          </ul>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p>{error}</p>
              <p className="text-xs text-red-500 mt-1">
                אם מופיע כאן "Unknown action" — צריך לעדכן את Code.gs ולפרוס גרסה חדשה.
              </p>
            </div>
          </div>
        )}

        <div className="sticky bottom-0 -mx-6 -mb-6 px-6 pt-3 pb-6 bg-white border-t border-slate-100 flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={saving}>ביטול</Button>
          <Button variant="danger" className="flex-1" onClick={submit} disabled={saving}>
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> מוחק…</> : <><Trash2 className="w-4 h-4" /> מחיקה לצמיתות</>}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export { DeleteTeacherModal };
