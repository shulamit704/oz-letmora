import { ChevronLeft, AlertCircle } from "lucide-react";
import { cn } from "../lib/utils.js";

function Select({ label, icon: Icon, error, className = "", children, ...props }) {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>}
      <div className="relative">
        {Icon && (
          <Icon className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        )}
        <select
          className={cn(
            "w-full appearance-none rounded-xl border bg-white text-slate-900 transition-all duration-200 py-2.5 text-sm cursor-pointer",
            "focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500",
            Icon ? "ps-10 pe-9" : "ps-3.5 pe-9",
            error ? "border-red-300 focus:ring-red-500/30 focus:border-red-500" : "border-slate-200",
            className
          )}
          {...props}
        >
          {children}
        </select>
        {/* חץ הפתיחה — מסובב כלפי מטה */}
        <ChevronLeft className="w-4 h-4 text-slate-400 absolute end-3.5 top-1/2 -translate-y-1/2 -rotate-90 pointer-events-none" />
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      )}
    </div>
  );
}

export { Select };
