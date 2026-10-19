import { LogOut } from "lucide-react";
import { cn } from "../lib/utils.js";
import { Avatar } from "../ui/Avatar.jsx";
import { Button } from "../ui/Button.jsx";
import { Logo } from "../ui/Logo.jsx";

/* logoClass — שליטה בתצוגת הלוגו בסרגל. במסכי המנהל הוא מוסתר ב־lg מפני
   שסרגל הצד כבר נושא אותו, וכפילות מוזילה אותו.
   innerClass — רוחב התוכן שבסרגל. במסך המורה הוא מיושר לרוחב העמוד שמתחתיו. */
function Topbar({ title, subtitle, userName, role, onLogout, mobileNav, rightSlot, logoClass = "", innerClass = "px-5 lg:px-8" }) {
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className={cn("flex items-center justify-between h-16 sm:h-20", innerClass)}>
        <div className="flex items-center gap-3 min-w-0">
          {mobileNav}
          <div className={cn("hidden sm:flex items-center gap-4 shrink-0", logoClass)}>
            <Logo size="sm" className="sm:h-12" />
            <span className="w-px h-10 bg-slate-200" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg lg:text-2xl font-bold text-slate-900 truncate">{title}</h2>
            {subtitle && <p className="text-sm text-slate-500 truncate hidden sm:block">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          {rightSlot}
          <div className="hidden sm:flex flex-col items-start">
            <span className="text-base font-semibold text-slate-800 leading-tight">{userName}</span>
            <span className="text-sm text-slate-500 leading-tight">{role}</span>
          </div>
          <Avatar name={userName} size="lg" />
          <Button variant="secondary" onClick={onLogout} className="px-3 sm:px-3.5 min-h-11 text-[15px]">
            <LogOut className="w-[18px] h-[18px]" />
            <span className="hidden md:inline">התנתקות</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

export { Topbar };
