import { cn } from "../lib/utils.js";

function ProgressBar({ value, className = "" }) {
  const tone = value >= 100 ? "bg-emerald-500" : value >= 60 ? "bg-blue-600" : "bg-blue-400";
  return (
    <div className={cn("w-full h-2 bg-slate-100 rounded-full overflow-hidden", className)}>
      <div
        className={cn("h-full rounded-full transition-all duration-700 ease-out", tone)}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

/* אלמנט-חתימה: טבעת התקדמות SVG נקייה, ממושקפת לכיוון RTL. */
function ProgressRing({ value, size = 168, stroke = 14 }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;
  const complete = value >= 100;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg) scaleX(-1)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#EEF2F7" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={complete ? "#10B981" : "#2563EB"} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-slate-900 tracking-tight">{value}%</span>
        <span className="text-xs font-medium text-slate-400 mt-0.5">הושלם</span>
      </div>
    </div>
  );
}

export { ProgressBar, ProgressRing };
