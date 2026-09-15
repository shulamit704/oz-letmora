import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { MobileNavButton } from "../../layout/MobileNavButton.jsx";
import { Sidebar } from "../../layout/Sidebar.jsx";
import { Topbar } from "../../layout/Topbar.jsx";
import { cn } from "../../lib/utils.js";
import { AdminOverview } from "./AdminOverview.jsx";
import { DatabaseView } from "./DatabaseView.jsx";
import { TeacherHistoryModal } from "./TeacherHistoryModal.jsx";
import { TeachersTable } from "./TeachersTable.jsx";
import { AddTeacherModal } from "./modals/AddTeacherModal.jsx";
import { BulkImportModal } from "./modals/BulkImportModal.jsx";
import { BulkUpdateHoursModal } from "./modals/BulkUpdateHoursModal.jsx";
import { DeleteTeacherModal } from "./modals/DeleteTeacherModal.jsx";
import { UpdateHoursModal } from "./modals/UpdateHoursModal.jsx";
import { DemoBanner, ErrorBanner } from "../../ui/Banners.jsx";

function AdminDashboard({ teachers, loading, demoMode, demoManual, loadError, onRetry, onLogout, onAddTeacher, onAddTeachers, onUpdateTeachers, onUpdateHours, onEditHours, onDeleteHours, onDeleteTeacher, writeLog }) {
  const [view, setView] = useState("overview");
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkUpdateOpen, setBulkUpdateOpen] = useState(false);
  const [updateTarget, setUpdateTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);

  // המורה שההיסטוריה שלה פתוחה נשלפת מחדש מהרשימה, כדי שהחלון יתעדכן מיד
  // אחרי עריכה או מחיקה.
  const historyTeacher = historyTarget ? teachers.find((t) => t.id === historyTarget.id) || null : null;

  const titles = {
    overview: { title: "לוח בקרה", subtitle: "סקירת כל המורים וההתקדמות שלהם" },
    teachers: { title: "מורים", subtitle: "ניהול חשבונות ותיעוד שעות עבודה" },
    database: { title: "מסד נתונים", subtitle: "תצוגת הגיליון ויומן השמירות בזמן אמת" },
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 flex">
      <Sidebar active={view} onNavigate={setView} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar
          title={titles[view].title} subtitle={titles[view].subtitle}
          userName="מנהל מערכת" role="הרשאת ניהול" onLogout={onLogout}
          logoClass="lg:hidden"
          mobileNav={<MobileNavButton active={view} onNavigate={setView} />}
          rightSlot={
            !demoMode && (
              <button onClick={onRetry} title="רענון מהגיליון" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              </button>
            )
          }
        />
        <main className="flex-1 p-5 lg:p-8 max-w-6xl w-full mx-auto space-y-4">
          {demoMode && <DemoBanner manual={demoManual} />}
          {loadError && <ErrorBanner message={loadError} onRetry={onRetry} retrying={loading} />}

          {loading && teachers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mb-3" />
              <p className="text-sm">טוען מהגיליון…</p>
            </div>
          ) : view === "overview" ? (
            <AdminOverview teachers={teachers} onOpenTeachers={() => setView("teachers")} />
          ) : view === "teachers" ? (
            <TeachersTable teachers={teachers} onAdd={() => setAddOpen(true)} onBulkImport={() => setBulkOpen(true)} onBulkUpdate={() => setBulkUpdateOpen(true)} onUpdateHours={(t) => setUpdateTarget(t)} onDelete={(t) => setDeleteTarget(t)} onOpenHistory={(t) => setHistoryTarget(t)} />
          ) : (
            <DatabaseView teachers={teachers} writeLog={writeLog} demoMode={demoMode} />
          )}
        </main>
      </div>

      <AddTeacherModal open={addOpen} onClose={() => setAddOpen(false)} onCreate={onAddTeacher} />
      <BulkImportModal open={bulkOpen} onClose={() => setBulkOpen(false)} onCreate={onAddTeacher} onCreateMany={onAddTeachers} />
      <BulkUpdateHoursModal open={bulkUpdateOpen} onClose={() => setBulkUpdateOpen(false)} teachers={teachers} onUpdateMany={onUpdateTeachers} />
      <UpdateHoursModal open={!!updateTarget} onClose={() => setUpdateTarget(null)} teacher={updateTarget} onSave={onUpdateHours} />
      <DeleteTeacherModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} teacher={deleteTarget} onConfirm={onDeleteTeacher} />
      <TeacherHistoryModal
        open={!!historyTeacher} onClose={() => setHistoryTarget(null)} teacher={historyTeacher}
        onEditHours={onEditHours} onDeleteHours={onDeleteHours}
      />
    </div>
  );
}

export { AdminDashboard };
