import { X, AlertTriangle, RefreshCw, CloudOff } from "lucide-react";
import { cn } from "../lib/utils.js";

/* --------------------------- באנרי סטטוס --------------------------------- */

/* manual — נכנסו למצב ההדגמה מרצון מהמסך הראשי, ולא בגלל שהגיליון אינו
   מחובר. ההסבר על WEB_APP_URL מיותר אז, ורק מבלבל. */
function DemoBanner({ manual = false }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <CloudOff className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
      {manual ? (
        <span>
          מצב הדגמה — הנתונים שמוצגים כאן אינם אמיתיים, ושום פעולה אינה נשמרת לגיליון.
          ליציאה וחזרה לנתונים האמיתיים: התנתקות.
        </span>
      ) : (
        <span>
          מצב דמו — שינויים אינם נשמרים. הדביקו את כתובת ה־Web App של Apps Script במשתנה{" "}
          <code dir="ltr" className="font-mono text-amber-900 bg-amber-100 px-1 py-0.5 rounded">WEB_APP_URL</code> כדי לחבר את הגיליון.
        </span>
      )}
    </div>
  );
}

/* הודעה צפה על כשל בשמירה שהתרחשה ברקע, אחרי שהחלון כבר נסגר. */
function SyncErrorToast({ message, onClose }) {
  if (!message) return null;
  return (
    <div
      dir="rtl"
      className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:end-6 sm:w-[26rem] z-[60] rounded-2xl border border-red-200 bg-white shadow-2xl p-4 flex items-start gap-3 animate-[popIn_0.25s_cubic-bezier(0.22,1,0.36,1)]"
    >
      <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
        <AlertTriangle className="w-4 h-4 text-red-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900">השמירה לגיליון נכשלה</p>
        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{message}</p>
      </div>
      <button
        onClick={onClose} title="סגירה"
        className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg p-1 transition-colors shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function ErrorBanner({ message, onRetry, retrying }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button onClick={onRetry} disabled={retrying} className="inline-flex items-center gap-1.5 font-medium text-red-700 hover:text-red-800 disabled:opacity-50">
          <RefreshCw className={cn("w-3.5 h-3.5", retrying && "animate-spin")} />
          ניסיון חוזר
        </button>
      )}
    </div>
  );
}

export { DemoBanner, SyncErrorToast, ErrorBanner };
