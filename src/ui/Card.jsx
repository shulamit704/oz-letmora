import { cn } from "../lib/utils.js";

function Card({ children, className = "", hover = false, ...props }) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-slate-200/80 shadow-sm",
        hover && "transition-all duration-200 hover:shadow-md hover:border-slate-300",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { Card };
