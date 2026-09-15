import { cn } from "../lib/utils.js";

/* =========================================================================
   רכיבי UI בסיסיים
   ========================================================================= */

function Button({ children, variant = "primary", size = "md", className = "", icon: Icon, ...props }) {
  const base =
    "inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";
  const sizes = { sm: "text-sm px-3 py-1.5", md: "text-sm px-4 py-2.5", lg: "text-base px-5 py-3" };
  const variants = {
    primary:
      "bg-blue-600 text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700 hover:shadow-md hover:shadow-blue-600/25",
    secondary:
      "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    danger: "bg-white text-red-600 border border-red-200 hover:bg-red-50 hover:border-red-300",
  };
  return (
    <button className={cn(base, sizes[size], variants[variant], className)} {...props}>
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
}

export { Button };
