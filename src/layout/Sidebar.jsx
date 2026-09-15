import { LayoutDashboard, Users, ChevronLeft, Database } from "lucide-react";
import { cn } from "../lib/utils.js";
import { Logo } from "../ui/Logo.jsx";

function Sidebar({ active, onNavigate }) {
  const items = [
    { key: "overview", label: "לוח בקרה", icon: LayoutDashboard },
    { key: "teachers", label: "מורים", icon: Users },
    { key: "database", label: "מסד נתונים", icon: Database },
  ];
  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-white border-e border-slate-200 h-screen sticky top-0">
      <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-100">
        <Logo size="sm" />
        <span className="font-bold text-slate-900 tracking-tight">שעות הוראה</span>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        <p className="px-3 text-xs font-semibold text-slate-400 tracking-wide mb-2">תפריט</p>
        {items.map((item) => {
          const isActive = active === item.key;
          return (
            <button
              key={item.key} onClick={() => onNavigate(item.key)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                isActive ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive ? "text-blue-600" : "text-slate-400")} />
              {item.label}
              {isActive && <ChevronLeft className="w-4 h-4 ms-auto text-blue-400" />}
            </button>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-100">
        <div className="px-3 py-2 rounded-xl bg-slate-50">
          <p className="text-xs text-slate-400">התחברת בתור</p>
          <p className="text-sm font-medium text-slate-700">מנהל מערכת</p>
        </div>
      </div>
    </aside>
  );
}

export { Sidebar };
