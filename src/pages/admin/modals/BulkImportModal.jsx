import { useState, useEffect, useMemo } from "react";
import { Plus, CheckCircle2, AlertTriangle, Loader2, FileSpreadsheet, Mic, FileText, UsersRound } from "lucide-react";
import { lookupHours, personalTarget } from "../../../lib/hoursTable.js";
import { clampPct } from "../../../lib/utils.js";
import { Badge } from "../../../ui/Badge.jsx";
import { Button } from "../../../ui/Button.jsx";
import { Modal } from "../../../ui/Modal.jsx";
import { ProgressBar } from "../../../ui/Progress.jsx";

function BulkImportModal({ open, onClose, onCreate, onCreateMany }) {
  const [raw, setRaw] = useState("");
  const [phase, setPhase] = useState("input"); // input | running | done
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState([]); // {name, password, hours, ok, error}
  const [batching, setBatching] = useState(false); // שליחה מרוכזת בעיצומה

  useEffect(() => {
    if (open) { setRaw(""); setPhase("input"); setProgress({ done: 0, total: 0 }); setResults([]); }
  }, [open]);

  // פרסור: כל שורה = "שם [Tab] סיסמה [Tab] שעות פרונטליות".
  // הסיסמאות מגיעות מהקובץ — אינן נוצרות אוטומטית.
  const parsed = useMemo(() => {
    const looksLikeHeader = (name) =>
      ["שם", "name", "שם מלא", "שם המורה"].includes(name.trim().toLowerCase());
    return raw
      .split("\n")
      .map((line) => line.replace(/\r/g, ""))
      .filter((line) => line.trim() !== "")
      .map((line) => {
        const parts = line.includes("\t") ? line.split("\t") : line.split(/\s{2,}|,/);
        const name = (parts[0] || "").trim();
        const password = (parts[1] || "").trim();
        const frontalRaw = (parts[2] || "").trim();
        const frontal = Number(frontalRaw) > 0 ? Number(frontalRaw) : 0;
        const row = lookupHours(frontal);
        const problem = !password
          ? "חסרה סיסמה"
          : !row
          ? "חסרות שעות פרונטליות"
          : null;
        return { name, password, frontal, row, problem };
      })
      .filter((r, i) => r.name && !(i === 0 && looksLikeHeader(r.name))); // דילוג על שורת כותרת
  }, [raw]);

  // אזהרה על סיסמאות כפולות — שתי מורות עם אותה סיסמה יגרמו לבלבול בכניסה.
  const dupPasswords = useMemo(() => {
    const seen = {};
    parsed.forEach((r) => { if (r.password) seen[r.password] = (seen[r.password] || 0) + 1; });
    return Object.keys(seen).filter((p) => seen[p] > 1);
  }, [parsed]);

  const valid = parsed.filter((r) => !r.problem);

  const run = async () => {
    setPhase("running");
    setProgress({ done: 0, total: valid.length });
    setBatching(true);

    // היעד למעקב הוא השעות הפרטניות השנתיות.
    const rows = valid.map((r) => ({
      name: r.name,
      password: r.password,
      frontalHours: r.row.frontal,
      requiredHours: personalTarget(r.row.personal),
      _src: r,
    }));

    const describe = (r, ok, error) => ({
      name: r.name, password: r.password, frontal: r.row.frontal,
      personal: r.row.personal, requiredHours: personalTarget(r.row.personal), ok, error,
    });

    // ניסיון ראשון: כל המורות בפנייה אחת.
    const batch = await onCreateMany(rows.map(({ _src, ...t }) => t));

    if (batch?.ok) {
      setProgress({ done: valid.length, total: valid.length });
      setResults(valid.map((r) => describe(r, true)));
      setBatching(false);
      setPhase("done");
      return;
    }

    // שגיאה אמיתית מהשרת — לא מנסים שוב, כדי לא ליצור כפילויות.
    if (!batch?.unsupported) {
      setResults(valid.map((r) => describe(r, false, batch?.error)));
      setBatching(false);
      setPhase("done");
      return;
    }

    // השרת אינו תומך בשליחה מרוכזת — חוזרים לשמירה אחת־אחת.
    setBatching(false);
    const out = [];
    for (let i = 0; i < rows.length; i++) {
      const { _src, ...payload } = rows[i];
      const res = await onCreate(payload);
      out.push(describe(_src, !!res?.ok, res?.error));
      setProgress({ done: i + 1, total: valid.length });
    }
    setResults(out);
    setPhase("done");
  };

  const copyCredentials = () => {
    const text = results
      .filter((r) => r.ok)
      .map((r) => `${r.name}\t${r.password}\t${r.requiredHours}`)
      .join("\n");
    navigator.clipboard?.writeText(text);
  };

  const okCount = results.filter((r) => r.ok).length;
  const failCount = results.length - okCount;

  return (
    <Modal open={open} onClose={onClose} title="ייבוא מ־Excel" subtitle="הדבקת רשימת מורים בבת אחת" icon={FileSpreadsheet}>
      {phase === "input" && (
        <div className="space-y-4">
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-3.5 text-sm text-blue-800 leading-relaxed">
            סמני ב־Excel שלוש עמודות לפי הסדר — <b>שם מלא</b>, <b>סיסמה</b>, <b>שעות פרונטליות</b> —
            העתיקי (Ctrl+C) והדביקי כאן (Ctrl+V). השעות הפרטניות והשהייה ייגזרו אוטומטית.
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">הדבקה מ־Excel</label>
            <textarea
              dir="rtl" rows={7} value={raw} onChange={(e) => setRaw(e.target.value)}
              placeholder={"חנה שטרן\tHanna2025\t16\nרבקה גולד\tRivka2025\t12\nמרים דהן\tMiriam2025\t20"}
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-mono placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
          </div>

          {dupPasswords.length > 0 && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>שימי לב: יש סיסמאות שחוזרות על עצמן ביותר ממורה אחת. מומלץ לתת סיסמה ייחודית לכל מורה.</span>
            </div>
          )}

          {parsed.length > 0 && (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-sm font-medium text-slate-700 flex items-center justify-between">
                <span>תצוגה מקדימה</span>
                <Badge tone="blue">{valid.length} מורים</Badge>
              </div>
              <div className="max-h-52 overflow-y-auto divide-y divide-slate-100">
                {parsed.map((r, i) => (
                  <div key={i} className="px-4 py-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-800">{r.name}</span>
                      {r.problem ? (
                        <span className="text-xs text-red-600 shrink-0">{r.problem} — ידולג</span>
                      ) : (
                        <span className="text-xs text-slate-500 shrink-0">{r.row.pct}% משרה</span>
                      )}
                    </div>
                    {!r.problem && (
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                        <code dir="ltr" className="px-1.5 py-0.5 bg-slate-100 rounded font-mono">{r.password}</code>
                        <span className="inline-flex items-center gap-1"><Mic className="w-3 h-3" />{r.row.frontal}</span>
                        <span className="inline-flex items-center gap-1"><UsersRound className="w-3 h-3" />{r.row.personal}</span>
                        <span className="inline-flex items-center gap-1"><FileText className="w-3 h-3" />{r.row.support}</span>
                        {!r.row.exact && (
                          <span className="text-amber-600">הוצמד ל־{r.row.frontal} (הוזן {r.frontal})</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="sticky bottom-0 -mx-6 -mb-6 px-6 pt-3 pb-6 bg-white border-t border-slate-100 flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={onClose}>ביטול</Button>
            <Button className="flex-1" onClick={run} disabled={valid.length === 0} icon={Plus}>
              ייבוא {valid.length > 0 ? `(${valid.length})` : ""}
            </Button>
          </div>
        </div>
      )}

      {phase === "running" && (
        <div className="py-8 flex flex-col items-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
          {batching ? (
            <>
              <p className="text-sm text-slate-600">שולח את כל {progress.total} המורות בפנייה אחת…</p>
              <p className="text-xs text-slate-400 mt-1.5">אמור לקחת שניות ספורות</p>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-600 mb-3">שומר לגיליון… {progress.done} / {progress.total}</p>
              <div className="w-full max-w-xs"><ProgressBar value={clampPct(progress.done, progress.total)} /></div>
            </>
          )}
        </div>
      )}

      {phase === "done" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 className="w-4 h-4" />
            יובאו {okCount} מורים בהצלחה{failCount > 0 && <span className="text-red-600">· {failCount} נכשלו</span>}
          </div>

          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-sm font-medium text-slate-700 flex items-center justify-between">
              <span>פרטי כניסה שנקלטו</span>
              <button onClick={copyCredentials} className="text-xs font-medium text-blue-600 hover:text-blue-700">העתקת הכל</button>
            </div>
            <div className="max-h-52 overflow-y-auto divide-y divide-slate-100">
              {results.map((r, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span className="text-slate-800">{r.name}</span>
                  {r.ok ? (
                    <code dir="ltr" className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 font-mono text-xs">{r.password}</code>
                  ) : (
                    <span className="text-xs text-red-600">נכשל: {r.error}</span>
                  )}
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

export { BulkImportModal };
