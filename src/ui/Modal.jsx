import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "../lib/utils.js";

function Modal({ open, onClose, title, subtitle, icon: Icon, size = "md", children }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]" onClick={onClose} />
      {/* max-h + גלילה פנימית: חלון ארוך לא נשפך מחוץ למסך, והכותרת נשארת
          קבועה בזמן שהתוכן נגלל. dvh מתחשב בסרגלי הדפדפן בנייד. */}
      <div className={cn(
        "relative w-full max-h-[calc(100dvh-2rem)] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 animate-[popIn_0.25s_cubic-bezier(0.22,1,0.36,1)]",
        size === "lg" ? "max-w-3xl" : "max-w-md"
      )}>
        <div className="flex items-start justify-between p-6 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Icon className="w-5 h-5 text-blue-600" />
              </div>
            )}
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
              {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg p-1.5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>
  );
}

export { Modal };
