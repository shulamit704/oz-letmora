import { cn } from "../lib/utils.js";

function Badge({ children, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 ring-blue-600/10",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
    amber: "bg-amber-50 text-amber-700 ring-amber-600/10",
    slate: "bg-slate-100 text-slate-600 ring-slate-500/10",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset",
        tones[tone]
      )}
    >
      {children}
    </span>
  );
}

export { Badge };
