import { AlertCircle } from "lucide-react";
import { cn } from "../lib/utils.js";

function Input({ label, icon: Icon, error, className = "", ...props }) {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>}
      <div className="relative">
        {Icon && (
          <Icon className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        )}
        <input
          className={cn(
            "w-full rounded-xl border bg-white text-slate-900 placeholder:text-slate-400 transition-all duration-200 py-2.5 text-sm",
            "focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500",
            Icon ? "ps-10 pe-3.5" : "px-3.5",
            error ? "border-red-300 focus:ring-red-500/30 focus:border-red-500" : "border-slate-200",
            className
          )}
          {...props}
        />
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

export { Input };
