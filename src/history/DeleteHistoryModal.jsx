import { useState, useEffect } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { formatDate, formatHebrewDate, round2 } from "../lib/utils.js";
import { Button } from "../ui/Button.jsx";
import { Modal } from "../ui/Modal.jsx";

/* ------------------------ מחיקת רישום מההיסטוריה ------------------------ */

function DeleteHistoryModal({ open, onClose, record, teacher, onConfirm }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) { setBusy(false); setError(""); }
  }, [open]);

  if (!record) return null;

  const remainingAfter = round2((teacher?.accumulatedHours ?? 0) - record.hours);

  const confirm = async () => {
    setError("");
    setBusy(true);
    const res = await onConfirm(record.id);
    setBusy(false);
    if (res?.ok) onClose();
    else setError(res?.error || "המחיקה נכשלה.");
  };

  return (
    <Modal open={open} onClose={onClose} title="מחיקת רישום" subtitle={teacher?.name} icon={Trash2}>
      <div className="space-y-4">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-900 font-medium">{record.reason}</p>
          <p className="text-xs text-red-700 mt-1">
            {formatHebrewDate(record.date) || formatDate(record.date)} · {round2(record.hours)} שעות
          </p>
          {formatHebrewDate(record.date) && (
            <p className="text-[11px] text-red-500/80 mt-0.5">{formatDate(record.date)}</p>
          )}
        </div>

        <p className="text-sm text-slate-600 leading-relaxed">
          הרישום יימחק מהגיליון, וסך השעות שנצברו ירד ל־
          <span className="font-semibold text-slate-800"> {remainingAfter} שעות</span>. הפעולה אינה הפיכה.
        </p>

        {error && (
          <p className="text-sm text-red-600 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" /> {error}
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={busy}>ביטול</Button>
          <Button variant="danger" className="flex-1" onClick={confirm} disabled={busy}>
            {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> מוחק…</> : <><Trash2 className="w-4 h-4" /> מחיקה</>}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export { DeleteHistoryModal };
