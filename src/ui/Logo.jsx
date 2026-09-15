import { useState } from "react";
import { cn } from "../lib/utils.js";

/* --------------------------------- לוגו ---------------------------------- */
/* קובץ הלוגו נטען מתיקיית public. אם הוא חסר — מוצגת גרסה טיפוגרפית חלופית
   כדי שהמסכים לעולם לא ייראו שבורים. */
const LOGO_SRC = "/logo.png";

function LogoWordmark({ size = "md", className = "" }) {
  const s = {
    sm: { top: "text-[8px]", main: "text-base", sub: "text-[7px]", gap: "mt-0.5" },
    md: { top: "text-[10px]", main: "text-2xl", sub: "text-[8px]", gap: "mt-1" },
    lg: { top: "text-xs", main: "text-4xl", sub: "text-[10px]", gap: "mt-1.5" },
  }[size];
  return (
    <div className={cn("flex flex-col items-center leading-none select-none", className)}>
      <span className={cn(s.top, "font-semibold tracking-[0.25em] text-slate-500")}>אורחות בית יעקב</span>
      <span className={cn(s.main, s.gap, "font-black tracking-tight text-slate-900")}>ירושלים</span>
      <span className={cn(s.sub, s.gap, "tracking-[0.15em] text-slate-400")}>ע״ש לאה פרידמן לוס אנג׳לס</span>
    </div>
  );
}

function Logo({ size = "md", className = "" }) {
  const [failed, setFailed] = useState(false);
  const heights = { sm: "h-10", md: "h-16", lg: "h-28" };
  if (failed) return <LogoWordmark size={size} className={className} />;
  return (
    <img
      src={LOGO_SRC}
      alt="אורחות בית יעקב ירושלים — ע״ש לאה פרידמן לוס אנג׳לס"
      onError={() => setFailed(true)}
      className={cn(heights[size], "w-auto object-contain select-none", className)}
    />
  );
}

export { Logo };
