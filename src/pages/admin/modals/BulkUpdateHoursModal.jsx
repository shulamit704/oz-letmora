import { useState, useEffect, useMemo } from "react";
import { CheckCircle2, AlertTriangle, Loader2, RefreshCw, SlidersHorizontal, Mic, UsersRound, ArrowLeft, KeyRound, Calculator, ClipboardPaste } from "lucide-react";
import { PERSONAL_FACTOR, lookupHours, personalTarget } from "../../../lib/hoursTable.js";
import { cn, round2 } from "../../../lib/utils.js";
import { Badge } from "../../../ui/Badge.jsx";
import { Button } from "../../../ui/Button.jsx";
import { Modal } from "../../../ui/Modal.jsx";

/* עדכון מרוכז של מורות קיימות, בשתי דרכים:

     הדבקה     — שם + סיסמה + שעות פרונטליות מ־Excel, התאמה לפי שם.
     חישוב מחדש — בלי להדביק דבר: היעד של כל מורה מחושב מחדש משעות המשרה
                  ששמורות לה, לפי המקדם שב־hoursTable.js. זו הדרך להחיל
                  שינוי מדיניות ("מורידים חצי משעות הפרטניות") על כולן.

   בשתי הדרכים לא נוצרת ולא נמחקת אף מורה, והשעות שנצברו וההיסטוריה
   אינן נוגעות. החישוב נגזר תמיד משעות המשרה ולא מהיעד הקיים, ולכן הרצה
   חוזרת של "חישוב מחדש" אינה מורידה שוב ושוב. */

function BulkUpdateHoursModal({ open, onClose, teachers, onUpdateMany }) {
  const [mode, setMode] = useState("paste"); // paste | all
  const [raw, setRaw] = useState("");
  const [phase, setPhase] = useState("input"); // input | running | done
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) { setMode("paste"); setRaw(""); setPhase("input"); setResults([]); setError(""); }
  }, [open]);

  /* אינדקס לפי שם. שם שחוזר על עצמו ביותר ממורה אחת מסומן כדו־משמעי —
     אי אפשר לדעת לאיזו שורה בגיליון הכוונה, ועדיף לדלג מאשר לנחש. */
  const byName = useMemo(() => {
    const m = {};
    (teachers || []).forEach((t) => {
      const k = String(t.name || "").trim();
      m[k] = m[k] ? "dup" : t;
    });
    return m;
  }, [teachers]);

  /* פרסור סלחני: העמודה הראשונה היא השם, שעות המשרה הן המספר האחרון בשורה,
     והסיסמה היא השדה הראשון שאינו השם ואינו שדה השעות. כך אותה הדבקה עובדת
     גם עם "שם · סיסמה · שעות", גם עם "שם · שעות" וגם עם "שם · סיסמה" בלבד. */
  const pasteRows = useMemo(() => {
    const looksLikeHeader = (name) =>
      ["שם", "name", "שם מלא", "שם המורה"].includes(name.trim().toLowerCase());

    return raw
      .split("\n")
      .map((line) => line.replace(/\r/g, ""))
      .filter((line) => line.trim() !== "")
      .map((line) => {
        const parts = line.includes("\t") ? line.split("\t") : line.split(/\s{2,}|,/);
        const name = (parts[0] || "").trim();
        const rest = parts.slice(1).map((s) => String(s).trim());

        let frontalAt = -1;
        for (let i = rest.length - 1; i >= 0; i--) {
          if (rest[i] !== "" && Number(rest[i]) > 0) { frontalAt = i; break; }
        }
        const frontal = frontalAt >= 0 ? Number(rest[frontalAt]) : 0;

        let password = "";
        for (let i = 0; i < rest.length; i++) {
          if (i !== frontalAt && rest[i] !== "") { password = rest[i]; break; }
        }

        const row = frontal ? lookupHours(frontal) : null;
        const match = byName[name];

        const problem = !match
          ? "לא נמצאה מורה בשם הזה"
          : match === "dup"
          ? "יש יותר ממורה אחת בשם הזה"
          : !row && !password
          ? "לא הוזנו שעות ולא סיסמה"
          : null;

        const teacher = problem ? null : match;
        const after = row ? personalTarget(row.personal) : 0;
        const hoursChanged =
          !!teacher && !!row &&
          (round2(teacher.requiredHours) !== after || Number(teacher.frontalHours) !== row.frontal);
        const passwordChanged = !!teacher && !!password && String(teacher.password).trim() !== password;

        return { name, frontal, row, teacher, problem, after, password, hoursChanged, passwordChanged,
                 changed: hoursChanged || passwordChanged };
      })
      .filter((r, i) => r.name && !(i === 0 && looksLikeHeader(r.name))); // דילוג על שורת כותרת
  }, [raw, byName]);

  /* חישוב מחדש לכולן: אותה צורת שורה, אלא שהמקור הוא שעות המשרה השמורות
     ולא הדבקה. מורה בלי שעות פרונטליות אינה ניתנת לחישוב ומדולגת. */
  const allRows = useMemo(() => {
    return [...(teachers || [])]
      .sort((a, b) => String(a.name).localeCompare(String(b.name), "he"))
      .map((t) => {
        const row = lookupHours(t.frontalHours);
        const problem = row ? null : "לא רשומות לה שעות פרונטליות";
        const after = row ? personalTarget(row.personal) : 0;
        const hoursChanged =
          !!row && (round2(t.requiredHours) !== after || Number(t.frontalHours) !== row.frontal);
        return {
          name: t.name, frontal: Number(t.frontalHours) || 0, row,
          teacher: problem ? null : t, problem, after,
          password: "", hoursChanged, passwordChanged: false, changed: hoursChanged,
        };
      });
  }, [teachers]);

  const parsed = mode === "paste" ? pasteRows : allRows;
  const valid = parsed.filter((r) => !r.problem);
  const toUpdate = valid.filter((r) => r.changed);
  const unchanged = valid.length - toUpdate.length;
  const skipped = parsed.length - valid.length;

  /* שתי מורות עם אותה סיסמה אינן רק אי־נוחות: הכניסה למערכת מזוהה לפי
     הסיסמה בלבד, ולכן השנייה פשוט לא תוכל להיכנס לחשבון שלה. הבדיקה
     נעשית מול כלל המורות, לא רק מול אלה שבהדבקה. */
  const dupPasswords = useMemo(() => {
    if (!toUpdate.some((r) => r.passwordChanged)) return [];
    const finalPw = {};
    (teachers || []).forEach((t) => { finalPw[t.id] = String(t.password || "").trim(); });
    toUpdate.forEach((r) => { if (r.password) finalPw[r.teacher.id] = r.password; });

    const owners = {};
    (teachers || []).forEach((t) => {
      const pw = finalPw[t.id];
      if (!pw) return;
      (owners[pw] = owners[pw] || []).push(t.name);
    });
    return Object.keys(owners).filter((pw) => owners[pw].length > 1).map((pw) => owners[pw].join(", "));
  }, [toUpdate, teachers]);

  const switchMode = (next) => { setMode(next); setError(""); };

  const run = async () => {
    setPhase("running");
    setError("");

    const res = await onUpdateMany(
      toUpdate.map((r) => {
        const payload = { id: r.teacher.id };
        if (r.hoursChanged) { payload.frontalHours = r.row.frontal; payload.requiredHours = r.after; }
        if (r.passwordChanged) payload.password = r.password;
        return payload;
      })
    );

    if (!res?.ok) {
      setError(
        res?.unsupported
          ? "השרת עדיין לא מכיר את פעולת העדכון. יש להדביק את התוספת לקובץ Code.gs ולפרוס גרסה חדשה."
          : res?.error || "העדכון נכשל."
      );
      setPhase("input");
      return;
    }

    setResults(
      toUpdate.map((r) => ({
        name: r.teacher.name,
        before: round2(r.teacher.requiredHours),
        after: r.hoursChanged ? r.after : null,
        password: r.passwordChanged ? r.password : "",
      }))
    );
    setPhase("done");
  };

  const tab = (id, label, Icon) => (
    <button
      onClick={() => switchMode(id)}
      className={cn(
        "flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        mode === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
      )}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  );

  return (
    <Modal open={open} onClose={onClose} title="עדכון שעות מרוכז" subtitle="שעות משרה וסיסמאות למורות קיימות" icon={SlidersHorizontal}>
      {phase === "input" && (
        <div className="space-y-4">
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
            {tab("paste", "הדבקה מ־Excel", ClipboardPaste)}
            {tab("all", "חישוב מחדש לכולן", Calculator)}
          </div>

          {mode === "paste" ? (
            <>
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-3.5 text-sm text-blue-800 leading-relaxed">
                הדביקי מ־Excel <b>שם מלא</b>, <b>סיסמה</b> ו<b>שעות פרונטליות</b> — בדיוק אותן עמודות של הייבוא.
                אפשר גם להדביק רק חלק מהן: מה שלא הודבק פשוט לא ישתנה.
                ההתאמה נעשית לפי השם, והיעד השנתי מחושב מחדש מטבלת חלוקת השעות.
                <b> השעות שנצברו וההיסטוריה נשארות כפי שהן</b> — לא נוצרות ולא נמחקות מורות.
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">הדבקה מ־Excel</label>
                <textarea
                  dir="rtl" rows={7} value={raw} onChange={(e) => setRaw(e.target.value)}
                  placeholder={"חנה שטרן\tHanna2026\t18\nרבקה גולד\tRivka2026\t12\nמרים דהן\t\t20"}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-mono placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>
            </>
          ) : (
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-3.5 text-sm text-blue-800 leading-relaxed">
              בלי להדביק דבר: היעד של כל מורה מחושב מחדש משעות המשרה השמורות לה.
              זו הדרך להחיל שינוי מדיניות על כל המורות בבת אחת.
              {PERSONAL_FACTOR !== 1 && (
                <> המקדם הפעיל כרגע הוא <b>{Math.round(PERSONAL_FACTOR * 100)}% מהשעות הפרטניות</b>.</>
              )}
              <br />
              את המקדם משנים בקובץ <code dir="ltr" className="px-1 py-0.5 bg-white/70 rounded font-mono text-xs">lib/hoursTable.js</code> (המשתנה PERSONAL_FACTOR),
              ואז חוזרים לכאן. החישוב נגזר משעות המשרה ולא מהיעד הקיים, ולכן הרצה חוזרת לא תוריד שוב.
            </div>
          )}

          {dupPasswords.length > 0 && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                אחרי העדכון תהיה אותה סיסמה ליותר ממורה אחת ({dupPasswords.join(" · ")}).
                הכניסה למערכת מזוהה לפי הסיסמה בלבד, ולכן מומלץ לתת סיסמה ייחודית לכל מורה.
              </span>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 flex items-start gap-1.5">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
            </p>
          )}

          {parsed.length > 0 && (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-sm font-medium text-slate-700 flex items-center justify-between">
                <span>תצוגה מקדימה</span>
                <div className="flex items-center gap-1.5">
                  {skipped > 0 && <Badge tone="amber">{skipped} מדולגות</Badge>}
                  {unchanged > 0 && <Badge tone="slate">{unchanged} ללא שינוי</Badge>}
                  <Badge tone="blue">{toUpdate.length} לעדכון</Badge>
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                {parsed.map((r, i) => (
                  <div key={i} className="px-4 py-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-800">{r.name}</span>
                      {r.problem ? (
                        <span className="text-xs text-red-600 shrink-0">{r.problem} — תדולג</span>
                      ) : !r.changed ? (
                        <span className="text-xs text-slate-400 shrink-0">כבר מעודכנת</span>
                      ) : r.hoursChanged ? (
                        <span className="text-xs shrink-0 inline-flex items-center gap-1.5 tabular-nums">
                          <span className="text-slate-400 line-through">{round2(r.teacher.requiredHours)}</span>
                          <ArrowLeft className="w-3 h-3 text-slate-400" />
                          <span className="font-semibold text-blue-700">{r.after} שעות</span>
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 shrink-0">השעות ללא שינוי</span>
                      )}
                    </div>

                    {!r.problem && r.changed && (
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                        {r.hoursChanged && (
                          <>
                            <span className="inline-flex items-center gap-1"><Mic className="w-3 h-3" />{r.row.frontal}</span>
                            <span className="inline-flex items-center gap-1"><UsersRound className="w-3 h-3" />{r.row.personal}</span>
                            <span>{r.row.pct}% משרה</span>
                            {!r.row.exact && <span className="text-amber-600">הוצמד ל־{r.row.frontal} (הוזן {r.frontal})</span>}
                            {r.after < r.teacher.accumulatedHours && (
                              <span className="text-amber-600">היעד החדש נמוך מ־{round2(r.teacher.accumulatedHours)} שכבר נצברו</span>
                            )}
                          </>
                        )}
                        {r.passwordChanged && (
                          <span className="inline-flex items-center gap-1.5">
                            <KeyRound className="w-3 h-3" />
                            <code dir="ltr" className="px-1 py-0.5 bg-slate-100 rounded font-mono text-slate-400 line-through">{String(r.teacher.password)}</code>
                            <ArrowLeft className="w-3 h-3" />
                            <code dir="ltr" className="px-1 py-0.5 bg-slate-100 rounded font-mono text-slate-700">{r.password}</code>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* צמוד לתחתית החלון — נגיש תמיד, בלי צורך לגלול עד הסוף */}
          <div className="sticky bottom-0 -mx-6 -mb-6 px-6 pt-3 pb-6 bg-white border-t border-slate-100 flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={onClose}>ביטול</Button>
            <Button className="flex-1" onClick={run} disabled={toUpdate.length === 0} icon={RefreshCw}>
              עדכון {toUpdate.length > 0 ? `(${toUpdate.length})` : ""}
            </Button>
          </div>
        </div>
      )}

      {phase === "running" && (
        <div className="py-8 flex flex-col items-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
          <p className="text-sm text-slate-600">מעדכן {toUpdate.length} מורות בפנייה אחת…</p>
          <p className="text-xs text-slate-400 mt-1.5">אמור לקחת שניות ספורות</p>
        </div>
      )}

      {phase === "done" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 className="w-4 h-4" />
            עודכנו {results.length} מורות. השעות שנצברו וההיסטוריה נשמרו.
          </div>

          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-sm font-medium text-slate-700">
              מה השתנה
            </div>
            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
              {results.map((r, i) => (
                <div key={i} className="flex items-center justify-between gap-2 px-4 py-2 text-sm">
                  <span className="text-slate-800">{r.name}</span>
                  <span className="flex items-center gap-2.5 shrink-0 text-xs">
                    {r.after !== null && (
                      <span className="inline-flex items-center gap-1.5 tabular-nums">
                        <span className="text-slate-400 line-through">{r.before}</span>
                        <ArrowLeft className="w-3 h-3 text-slate-400" />
                        <span className="font-semibold text-slate-700">{r.after} שעות</span>
                      </span>
                    )}
                    {r.password && (
                      <code dir="ltr" className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 font-mono">{r.password}</code>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Button className="w-full" onClick={onClose}>סגירה</Button>
        </div>
      )}
    </Modal>
  );
}

export { BulkUpdateHoursModal };
