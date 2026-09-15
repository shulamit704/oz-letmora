import { useState } from "react";
import { LayoutDashboard, Users, Database } from "lucide-react";
import { cn } from "../lib/utils.js";

function MobileNavButton({ active, onNavigate }) {
  const [open, setOpen] = useState(false);
  const items = [
    { key: "overview", label: "לוח בקרה", icon: LayoutDashboard },
    { key: "teachers", label: "מורים", icon: Users },
    { key: "database", label: "מסד נתונים", icon: Database },
  ];
  return (
    <div className="lg:hidden relative">
      <button onClick={() => setOpen((v) => !v)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">
        <LayoutDashboard className="w-5 h-5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute start-0 top-full mt-1 z-20 w-44 bg-white rounded-xl border border-slate-200 shadow-lg p-1.5">
            {items.map((item) => (
              <button
                key={item.key}
                onClick={() => { onNavigate(item.key); setOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  active === item.key ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export { MobileNavButton };
