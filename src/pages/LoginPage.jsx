import { useState } from "react";
import { Lock, ArrowLeft, AlertTriangle, Loader2, PlayCircle } from "lucide-react";
import { Button } from "../ui/Button.jsx";
import { Card } from "../ui/Card.jsx";
import { Input } from "../ui/Input.jsx";
import { Logo } from "../ui/Logo.jsx";

function LoginPage({ onLogin, onDemo, loading, loadError }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // השדה פעיל מיד, גם בזמן שהנתונים עדיין נטענים ברקע. אם ההקלדה הסתיימה
  // לפני הטעינה, ההמתנה מתרחשת כאן ולא מול כפתור מושבת.
  const submit = async () => {
    if (busy) return;
    if (!password.trim()) {
      setError("יש להזין סיסמה.");
      return;
    }
    setBusy(true);
    setError("");
    // onLogin מחזיר true בהצלחה, או מחרוזת שגיאה כשהכשל אינו בסיסמה עצמה
    // (למשל כשאין קשר עם הגיליון ואי אפשר לאמת כלל).
    const res = await onLogin(password.trim());
    setBusy(false);
    if (res === true) return;
    setError(typeof res === "string" && res ? res : "הסיסמה אינה נכונה.");
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -right-24 w-96 h-96 bg-blue-50 rounded-full blur-3xl" />

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Logo size="lg" className="mb-6" />
          <div className="w-16 h-px bg-slate-200 mb-5" />
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">שעות הוראה עוז לתמורה</h1>
          <p className="text-sm text-slate-500 mt-1">התחברות לחשבון</p>
        </div>

        <Card className="p-6">
          <div className="space-y-4">
            <Input
              label=" הקש תעודת זהות" icon={Lock} type="password" placeholder="הזינו סיסמה" autoFocus
              value={password} error={error}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
            <Button className="w-full" size="lg" onClick={submit} disabled={busy}>
              {busy ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> מאמת…</>
              ) : (
                <>כניסה <ArrowLeft className="w-4 h-4" /></>
              )}
            </Button>
            {loading && !busy && (
              <p className="text-xs text-slate-400 text-center">הנתונים נטענים ברקע — אפשר להקליד כבר עכשיו.</p>
            )}
          </div>

          {loadError && (
            <p className="mt-3 text-xs text-red-600 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> {loadError}
            </p>
          )}

          {/* דלת צדדית לממשק הניהול על נתוני דמו — להדגמה ולבדיקות, בלי
              לגעת בגיליון האמיתי ובלי צורך בסיסמת המנהלת. */}
          {onDemo && (
            <div className="mt-5 pt-4 border-t border-slate-100">
              <button
                onClick={onDemo} disabled={busy}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                <PlayCircle className="w-4 h-4" />
                כניסה למצב הדגמה (נתוני דמו)
              </button>
              <p className="mt-1 text-[11px] text-slate-400 text-center">
                ממשק ניהול מלא על נתונים לדוגמה — שום שינוי אינו נשמר לגיליון.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export { LoginPage };
