import { LogOut } from "lucide-react";
import { cn } from "../lib/utils.js";
import { Avatar } from "../ui/Avatar.jsx";
import { Button } from "../ui/Button.jsx";
import { Logo } from "../ui/Logo.jsx";

/* logoClass — שליטה בתצוגת הלוגו בסרגל. במסכי המנהל הוא מוסתר ב־lg מפני
   שסרגל הצד כבר נושא אותו, וכפילות מוזילה אותו. */
function Topbar({ title, subtitle, userName, role, onLogout, mobileNav, rightSlot, logoClass = "" }) {
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="flex items-center justify-between px-5 lg:px-8 h-16">
        <div className="flex items-center gap-3 min-w-0">
          {mobileNav}
          <div className={cn("hidden sm:flex items-center gap-3 shrink-0", logoClass)}>
            <Logo size="sm" />
            <span className="w-px h-8 bg-slate-200" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base lg:text-lg font-semibold text-slate-900 truncate">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500 truncate hidden sm:block">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {rightSlot}
          <div className="hidden sm:flex flex-col items-start">
            <span className="text-sm font-medium text-slate-800 leading-tight">{userName}</span>
            <span className="text-xs text-slate-400 leading-tight">{role}</span>
          </div>
          <Avatar name={userName} />
          <Button variant="ghost" size="sm" onClick={onLogout} className="px-2.5">
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">התנתקות</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

export { Topbar };
