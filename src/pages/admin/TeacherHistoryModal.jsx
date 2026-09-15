import { History } from "lucide-react";
import { HistoryTable } from "../../history/HistoryTable.jsx";
import { round2 } from "../../lib/utils.js";
import { Modal } from "../../ui/Modal.jsx";

/* חלון היסטוריית השעות של מורה — לצד המנהלת. אותה טבלה שהמורה רואה,
   כולל עריכה, מחיקה והורדת הדוח. */
function TeacherHistoryModal({ open, onClose, teacher, onEditHours, onDeleteHours }) {
  if (!teacher) return null;
  return (
    <Modal
      open={open} onClose={onClose} size="lg" icon={History}
      title="היסטוריית שעות"
      subtitle={`${teacher.name} · ${round2(teacher.accumulatedHours)} / ${teacher.requiredHours} שעות`}
    >
      <HistoryTable
        teacher={teacher}
        onEdit={(recordId, values) => onEditHours(teacher.id, recordId, values)}
        onDelete={(recordId) => onDeleteHours(teacher.id, recordId)}
      />
    </Modal>
  );
}

export { TeacherHistoryModal };
