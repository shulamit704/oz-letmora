import React, { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { WEB_APP_URL, apiGetAll, apiPost, isConfigured, mergeServerData } from "./lib/api.js";
import { ADMIN_PASSWORD, SHOW_DEMO_ENTRY, demoTeachers } from "./lib/demoData.js";
import { totalField } from "./lib/supportHours.js";
import { clearSession, readCachedTeachers, readSession, writeCachedTeachers, writeSession } from "./lib/storage.js";
import { round2 } from "./lib/utils.js";
import { LoginPage } from "./pages/LoginPage.jsx";
import { AdminDashboard } from "./pages/admin/AdminDashboard.jsx";
import { TeacherDashboard } from "./pages/teacher/TeacherDashboard.jsx";
import { SyncErrorToast } from "./ui/Banners.jsx";

/* =========================================================================
   שעות הוראה — מערכת לניהול שעות העבודה של מורים. ממשק עברי, RTL מלא.

   שכבת הנתונים
   ------------
   השמירה מתבצעת דרך Google Apps Script Web App המקושר לגיליון (ראו Code.gs).
   הדביקו את כתובת ה־Web App במשתנה WEB_APP_URL למטה. עד אז האפליקציה רצה
   ב"מצב דמו" על נתונים לדוגמה — דבר אינו נשמר במצב זה.
   ========================================================================= */

/* =========================================================================
   רכיב שורש — אימות + ניהול נתונים
   ========================================================================= */

export default function App() {
  /* מצב הדגמה מרצון: כניסה לממשק הניהול על נתוני דמו, בלי לגעת בגיליון.
     הוא מכבה את configured, וכל פעולות הכתיבה נופלות מאליהן למסלול המקומי
     שכבר קיים לכל מקרה שבו אין גיליון מחובר — ולכן אין כאן מסלול שני. */
  const [demoOverride, setDemoOverride] = useState(false);
  const configured = isConfigured() && !demoOverride;

  /* פתיחה מהמטמון המקומי: המסך מצויר מיד מהנתונים האחרונים שנשמרו, והרענון
     מהגיליון רץ ברקע ומחליף אותם. אין כאן סיסמאות — המטמון נשמר בלעדיהן
     (ראו lib/storage.js), ולכן הוא משמש לתצוגה בלבד ולא להתחברות. */
  // המטמון נקרא פעם אחת בעליית הרכיב — ממנו באים גם הנתונים וגם מועד שמירתם.
  const [cached] = useState(() => (isConfigured() ? readCachedTeachers() : null));

  const [teachers, setTeachers] = useState(() =>
    isConfigured() ? cached?.teachers || [] : demoTeachers
  );
  const [loading, setLoading] = useState(isConfigured());
  const [loadError, setLoadError] = useState("");
  /* מועד הסנכרון האחרון מול הגיליון. בפתיחה הוא מגיע מהמטמון, ולכן החיווי
     במסך המורה אומר את האמת: מוצגים נתונים מלפני זמן מה, לא מהרגע הזה. */
  const [lastSyncedAt, setLastSyncedAt] = useState(() => cached?.savedAt || null);
  // { role:'admin' } | { role:'teacher', teacherId } — משוחזר מהלשונית הנוכחית בלבד.
  const [session, setSession] = useState(() => (isConfigured() ? readSession() : null));
  const [writeLog, setWriteLog] = useState([]); // יומן פעולות הכתיבה לגיליון
  const [syncError, setSyncError] = useState(""); // כשל בשמירה שקרתה ברקע
  const loadRef = useRef(null);                   // הטעינה שרצה כרגע מהגיליון

  /* עזרים לניסוח היומן בשפה פשוטה — שם המורה במקום מזהה, וסוג השעות במילים. */
  const nameOf = (id) => teachers.find((t) => t.id === id)?.name || `מורה מס' ${id}`;
  const hoursKind = (field) => (field === "supportHours" ? "שעות תומכות" : "שעות פרטניות");
  const totalOf = (field) => (field === "supportHours" ? "סך השעות התומכות" : "סך השעות הפרטניות");

  const pushLog = (entry) =>
    setWriteLog((prev) =>
      [{ id: Date.now() + Math.random(), time: new Date().toLocaleTimeString("he-IL"), ...entry }, ...prev].slice(0, 25)
    );

  // הזרקת הגופן Heebo (כיסוי עברי מלא) + אנימציות, והגדרת כיוון RTL למסמך.
  useEffect(() => {
    const prevDir = document.documentElement.getAttribute("dir");
    const prevLang = document.documentElement.getAttribute("lang");
    document.documentElement.setAttribute("dir", "rtl");
    document.documentElement.setAttribute("lang", "he");

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700;800&display=swap";
    document.head.appendChild(link);

    const style = document.createElement("style");
    style.textContent = `
      *, body { font-family: 'Heebo', system-ui, sans-serif; }
      @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
      @keyframes popIn { from { opacity: 0; transform: scale(0.96) translateY(8px) } to { opacity: 1; transform: scale(1) translateY(0) } }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(link);
      document.head.removeChild(style);
      if (prevDir) document.documentElement.setAttribute("dir", prevDir);
      else document.documentElement.removeAttribute("dir");
      if (prevLang) document.documentElement.setAttribute("lang", prevLang);
      else document.documentElement.removeAttribute("lang");
    };
  }, []);

  // טעינה מהגיליון. ההבטחה נשמרת ב־ref כדי שההתחברות תוכל להיתלות בה במקום
  // לחסום את המשתמשת עד שהטעינה תסתיים.
  // force === true בלבד — הפונקציה מועברת גם כ־onClick, ואירוע עכבר אינו true.
  const refetch = (force) => {
    if (!isConfigured() || (!configured && force !== true)) return Promise.resolve(null);
    setLoading(true);
    setLoadError("");
    const p = (async () => {
      try {
        const data = await apiGetAll();
        const merged = mergeServerData(data);
        setTeachers(merged);
        setLastSyncedAt(Date.now());
        return merged;
      } catch (e) {
        setLoadError("לא ניתן להגיע לגיליון. ודאו ש־WEB_APP_URL נכון וש־Web App פורסם להרשאת \"כל אחד\".");
        return null;
      } finally {
        setLoading(false);
      }
    })();
    loadRef.current = p;
    return p;
  };

  useEffect(() => { refetch(); /* eslint-disable-next-line */ }, []);

  /* שמירת המטמון. נכתב גם אחרי עדכון אופטימי, כך שרענון מיד אחרי דיווח
     מראה את המספר החדש ולא את הישן. בזמן טעינה אין כתיבה — אחרת הרשימה
     הריקה שלפני התשובה הייתה דורסת מטמון תקין. */
  useEffect(() => {
    if (!configured || loading) return;
    writeCachedTeachers(teachers);
  }, [teachers, configured, loading]);

  // שמירת הסשן. נתוני הדגמה אינם נשמרים — אסור שרענון יחזיר אותם כאילו
  // היו אמיתיים.
  useEffect(() => {
    if (demoOverride) return;
    writeSession(session);
  }, [session, demoOverride]);

  /* סשן משוחזר שאין לו מורה ברשימה — למשל אחרי שהמורה נמחקה מהגיליון.
     מוציאים אותה למסך הכניסה, אבל רק אחרי שהטעינה הסתיימה: בזמן הטעינה
     הרשימה עדיין עשויה להיות ריקה, ויציאה כאן הייתה שולחת להתחברות מיותרת.
     eslint-disable — handleLogout מוגדר בהמשך הקומפוננטה ואינו משתנה. */
  useEffect(() => {
    if (loading || !session || session.role !== "teacher") return;
    if (teachers.some((t) => t.id === session.teacherId)) return;
    handleLogout();
    /* eslint-disable-next-line */
  }, [loading, session, teachers]);

  /* הסכומים שהגיליון מחזיר הם מקור האמת: הם מחושבים מחדש מכל שורות
     ההיסטוריה, ולכן נכונים גם כששתי מורות דיווחו באותו רגע. שני מונים:
     accumulatedHours (פרטניות) ו־supportHours (תומכות). החישוב המקומי נשאר
     רק כגיבוי, למקרה שהשרת לא שלח שדה. */
  const syncTotals = (teacherId, data) => {
    const patch = {};
    ["accumulatedHours", "supportHours"].forEach((f) => {
      const n = Number(data?.[f]);
      if (data?.[f] != null && Number.isFinite(n)) patch[f] = round2(n);
    });
    if (!Object.keys(patch).length) return;
    setTeachers((prev) => prev.map((t) => (t.id === teacherId ? { ...t, ...patch } : t)));
  };

  /* הזיהוי נעשה לפי הסיסמה בלבד — אין שדה שם משתמש. הסיסמה היא שקובעת מי
     נכנס, ולכן היא חייבת להיות ייחודית לכל מורה.

     אין חסימה של הטופס בזמן הטעינה: המורה מקלידה מיד, וברוב המקרים הנתונים
     כבר הגיעו עד שהיא מסיימת. אם לא — ממתינים כאן לטעינה שכבר רצה ברקע,
     במקום להשאיר אותה מול כפתור מושבת.

     ⚠️ ההתחברות נסמכת אך ורק על נתונים טריים מהשרת. במטמון המקומי אין
     סיסמאות כלל, ולכן אם הגיליון לא נענה אי אפשר לאמת — ובמקרה כזה מוחזרת
     הודעת תקלה מפורשת, ולא "הסיסמה אינה נכונה" שרק תבלבל.

     הערך המוחזר: true בהצלחה, או מחרוזת השגיאה להצגה. */
  const handleLogin = async (password) => {
    const p = String(password).trim();

    if (p === ADMIN_PASSWORD) {
      setSession({ role: "admin" });
      return true;
    }

    let list = teachers;
    if (configured) {
      // אם הטעינה שרצה ברקע נכשלה, ננסה שוב פעם אחת — לחיצה על "כניסה" היא
      // בדיוק הרגע שבו כדאי לנסות, ולא להשאיר את המורה תקועה עד רענון ידני.
      let loaded = await (loadRef.current || refetch());
      if (!loaded) loaded = await refetch();
      if (!loaded) {
        return "לא ניתן להתחבר כרגע — אין קשר עם הגיליון. יש לנסות שוב בעוד רגע.";
      }
      list = loaded;
    }

    const match = list.find((t) => String(t.password).trim() === p);
    if (match) {
      setSession({ role: "teacher", teacherId: match.id });
      return true;
    }
    return false;
  };

  /* כניסה למצב הדגמה מהמסך הראשי. הנתונים משוכפלים בעומק, כדי ששינויים
     שנעשו בהדגמה קודמת לא ידלפו להדגמה הבאה. */
  const enterDemo = () => {
    setDemoOverride(true);
    setTeachers(JSON.parse(JSON.stringify(demoTeachers)));
    setWriteLog([]);
    setLoadError("");
    setLoading(false);
    setSyncError("");
    clearSession(); // סשן ההדגמה אינו נשמר — רענון חייב להחזיר למסך הכניסה.
    setSession({ role: "admin" });
  };

  // התנתקות מהכפתור שבסרגל העליון (layout/Topbar.jsx). מנקה את הסשן השמור,
  // כך שרענון או מורה אחרת באותו מחשב יגיעו למסך הכניסה.
  const handleLogout = () => {
    clearSession();
    setSession(null);
    // יציאה מההדגמה מחזירה את הנתונים האמיתיים מהגיליון.
    if (demoOverride) {
      setDemoOverride(false);
      setWriteLog([]);
      if (isConfigured()) {
        const back = readCachedTeachers();
        setTeachers(back?.teachers || []);
        setLastSyncedAt(back?.savedAt || null);
        refetch(true);
      }
    }
  };

  const handleAddTeacher = async ({ name, password, frontalHours, requiredHours }) => {
    // מורה חדשה — אין "לפני", כל השדות מופיעים כחדשים.
    const changes = [
      { label: "שם", before: "—", after: name },
      { label: "תעודת זהות", before: "—", after: password },
      { label: "שעות פרונטליות", before: "—", after: frontalHours ?? "—" },
      { label: "יעד שנתי", before: "—", after: requiredHours },
    ];
    if (!configured) {
      const id = teachers.reduce((m, t) => Math.max(m, t.id), 0) + 1;
      setTeachers((prev) => [...prev, { id, name, password, frontalHours, requiredHours, accumulatedHours: 0, supportHours: 0, history: [] }]);
      pushLog({ action: "addTeacher", payload: { name, password, frontalHours, requiredHours }, description: `נוספה מורה חדשה: ${name} (יעד שנתי: ${requiredHours} שעות)`, changes });
      return { ok: true };
    }
    try {
      const data = await apiPost("addTeacher", { name, password, frontalHours, requiredHours });
      setTeachers((prev) => [...prev, { ...data.teacher, history: [] }]);
      pushLog({ action: "addTeacher", payload: { name, password, frontalHours, requiredHours }, description: `נוספה מורה חדשה: ${name} (יעד שנתי: ${requiredHours} שעות)`, changes });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  };

  /* הוספת קבוצת מורות בפנייה אחת. אם השרת עדיין לא מכיר את הפעולה (לא פורסמה
     התוספת ל־Code.gs), מוחזר unsupported והמתקשר נופל חזרה לשמירה אחת־אחת.
     חשוב: נפילה אחורה מותרת אך ורק במקרה הזה — בו ודאי ששום דבר לא נכתב.
     על כל שגיאה אחרת אין לנסות שוב, כדי לא ליצור מורות כפולות. */
  const handleAddTeachers = async (list) => {
    if (!configured || !list.length) return { ok: false, unsupported: true };
    try {
      const data = await apiPost("addTeachers", { teachers: list });
      const created = (data.teachers || []).map((t) => ({ ...t, history: [] }));
      setTeachers((prev) => [...prev, ...created]);
      pushLog({
        action: "addTeachers",
        payload: { count: created.length },
        description: `נוספו ${created.length} מורות חדשות בבת אחת (ייבוא מ־Excel)`,
        changes: created.map((t) => ({ label: t.name, before: "—", after: `יעד שנתי ${t.requiredHours} שעות` })),
      });
      return { ok: true, teachers: created };
    } catch (e) {
      if (/unknown action/i.test(e.message || "")) return { ok: false, unsupported: true };
      return { ok: false, error: e.message };
    }
  };

  /* עדכון פרטי מורות קיימות, בפנייה אחת: שעות המשרה, היעד השנתי והסיסמה.
     נכתבים רק השדות שנשלחו בפועל — השעות שנצברו וההיסטוריה אינן נוגעות,
     ולכן אין כאן מחיקה והוספה מחדש. אם השרת אינו מכיר את הפעולה (התוספת
     ל־Code.gs טרם פורסמה) מוחזר unsupported, והחלון מסביר מה לעשות. */
  const handleUpdateTeachers = async (list) => {
    if (!list || !list.length) return { ok: false, error: "לא נבחרו מורות לעדכון." };

    // מיזוג רק של השדות שנשלחו, כדי ששורה שעודכנה בסיסמה בלבד לא תאבד שעות.
    const applyLocal = () =>
      setTeachers((prev) =>
        prev.map((t) => {
          const u = list.find((x) => x.id === t.id);
          if (!u) return t;
          const next = { ...t };
          if (u.frontalHours !== undefined) next.frontalHours = u.frontalHours;
          if (u.requiredHours !== undefined) next.requiredHours = u.requiredHours;
          if (u.password !== undefined) next.password = u.password;
          return next;
        })
      );
    // מה השתנה בפועל, לכל מורה — לפני ואחרי.
    const changes = list.flatMap((u) => {
      const t = teachers.find((x) => x.id === u.id);
      if (!t) return [];
      const rows = [];
      if (u.requiredHours !== undefined && round2(u.requiredHours) !== round2(t.requiredHours))
        rows.push({ label: `${t.name} · יעד שנתי`, before: round2(t.requiredHours), after: round2(u.requiredHours) });
      if (u.frontalHours !== undefined && Number(u.frontalHours) !== Number(t.frontalHours))
        rows.push({ label: `${t.name} · שעות פרונטליות`, before: t.frontalHours ?? "—", after: u.frontalHours });
      if (u.password !== undefined && String(u.password) !== String(t.password ?? ""))
        rows.push({ label: `${t.name} · תעודת זהות`, before: t.password || "—", after: u.password });
      return rows;
    });
    const log = () =>
      pushLog({
        action: "updateTeachers",
        payload: { count: list.length },
        changes,
        description:
          list.length === 1 && list[0].requiredHours !== undefined && list[0].password === undefined && list[0].frontalHours === undefined
            ? `היעד השנתי של ${nameOf(list[0].id)} עודכן ל־${list[0].requiredHours} שעות`
            : `עודכנו הפרטים של ${list.length} מורות (יעד שנתי: ${list.filter((t) => t.requiredHours !== undefined).length} · סיסמה: ${list.filter((t) => t.password !== undefined).length})`,
      });

    if (!configured) {
      applyLocal();
      log();
      return { ok: true };
    }
    try {
      await apiPost("updateTeachers", { teachers: list });
      applyLocal();
      log();
      return { ok: true };
    } catch (e) {
      if (/unknown action/i.test(e.message || "")) return { ok: false, unsupported: true };
      return { ok: false, error: e.message };
    }
  };

  const handleDeleteTeacher = async (teacherId) => {
    const gone = teachers.find((t) => t.id === teacherId);
    // מה היה למורה לפני המחיקה — ואחריה כלום.
    const changes = gone
      ? [
          { label: "שעות פרטניות שנצברו", before: round2(gone.accumulatedHours || 0), after: "נמחק" },
          { label: "שעות תומכות שנצברו", before: round2(gone.supportHours || 0), after: "נמחק" },
          { label: "דיווחים", before: (gone.history || []).length, after: "נמחקו" },
        ]
      : [];
    const removeLocal = () => setTeachers((prev) => prev.filter((t) => t.id !== teacherId));

    if (!configured) {
      removeLocal();
      pushLog({ action: "deleteTeacher", payload: { teacherId }, changes, description: `נמחקה המורה ${gone ? gone.name : nameOf(teacherId)}` });
      return { ok: true };
    }
    try {
      const data = await apiPost("deleteTeacher", { teacherId });
      removeLocal();
      pushLog({
        action: "deleteTeacher",
        payload: { teacherId },
        changes,
        description: `נמחקה המורה ${gone ? gone.name : nameOf(teacherId)}, יחד עם ${data.historyRemoved || 0} הדיווחים שלה`,
      });
      return { ok: true };
    } catch (e) {
      // "מורה לא נמצאה" אינו כישלון אלא סימן שהשורה כבר איננה בגיליון — למשל
      // כשמחיקה קודמת הצליחה בשרת אך תשובתה לא הגיעה חזרה. במקרה כזה מסירים
      // אותה מהרשימה בשקט ומסנכרנים מחדש, במקום להבהיל בשגיאה.
      if (/not found/i.test(e.message || "")) {
        removeLocal();
        pushLog({
          action: "deleteTeacher",
          payload: { teacherId },
          description: `${gone ? gone.name : nameOf(teacherId)} כבר לא הייתה בגיליון — הוסרה מהרשימה`,
        });
        refetch();
        return { ok: true };
      }
      return { ok: false, error: e.message };
    }
  };

  /* דיווח שעות — נרשם על המסך מיד, ונשמר לגיליון ברקע.
     הגיליון עונה בין 2 ל־30 שניות, וזה זמן שאין סיבה שהמורה תבהה בו. הרישום
     מסומן "נשמר…" עד שהשרת מאשר, ואם השמירה נכשלת הוא נסוג אחורה במלואו
     ומוצגת הודעה — כך שהמסך לעולם לא מציג שעות שלא באמת נשמרו. */
  /* kind — "support" לדיווח פטרול (שעות תומכות), ריק לדיווח פרטני. הוא
     קובע איזה משני הסכומים מתעדכן. */
  const handleUpdateHours = async (teacherId, { hours, reason, date, kind = "" }) => {
    const field = totalField(kind);
    const prior = teachers.find((t) => t.id === teacherId);
    const newAcc = round2((prior ? prior[field] || 0 : 0) + hours);
    const tempId = `pending-${Date.now()}`;

    const addLocal = (record) =>
      setTeachers((prev) =>
        prev.map((t) =>
          t.id === teacherId
            ? { ...t, [field]: round2((t[field] || 0) + hours), history: [record, ...t.history] }
            : t
        )
      );

    if (!configured) {
      addLocal({ id: Date.now(), teacherId, date, hours, reason, kind });
      pushLog({ action: "updateHours", payload: { teacherId, hours, date, reason, kind }, description: `דיווח חדש ל${nameOf(teacherId)}: ${hours} ${hoursKind(field)} (${reason}). ${totalOf(field)} שלה: ${newAcc}`, changes: [{ label: totalOf(field), before: round2(prior?.[field] || 0), after: newAcc }] });
      return { ok: true };
    }

    addLocal({ id: tempId, teacherId, date, hours, reason, kind, pending: true });

    // השמירה ממשיכה אחרי שהחלון כבר נסגר.
    (async () => {
      try {
        const data = await apiPost("updateHours", { teacherId, hours, date, reason, kind });
        // מחליפים את הרישום הזמני ברשומה האמיתית שחזרה מהגיליון.
        setTeachers((prev) =>
          prev.map((t) =>
            t.id === teacherId
              ? { ...t, history: t.history.map((h) => (h.id === tempId ? data.record : h)) }
              : t
          )
        );
        // ומיישרים את הסכומים לפי מה שהגיליון חישב בפועל.
        syncTotals(teacherId, data);
        pushLog({ action: "updateHours", payload: { teacherId, hours, date, reason, kind }, description: `דיווח חדש ל${nameOf(teacherId)}: ${hours} ${hoursKind(field)} (${reason}). ${totalOf(field)} שלה: ${newAcc}`, changes: [{ label: totalOf(field), before: round2(prior?.[field] || 0), after: newAcc }] });
      } catch (e) {
        // נסיגה מלאה: גם הרישום וגם השעות שנוספו לסכום.
        setTeachers((prev) =>
          prev.map((t) =>
            t.id === teacherId
              ? {
                  ...t,
                  [field]: round2((t[field] || 0) - hours),
                  history: t.history.filter((h) => h.id !== tempId),
                }
              : t
          )
        );
        setSyncError(`הדיווח על ${hours} שעות (${reason}) לא נשמר בגיליון: ${e.message}. יש לנסות שוב.`);
      }
    })();

    return { ok: true };
  };

  /* עריכת רישום קיים. סך השעות שנצבר מתעדכן בהפרש בלבד: תיקון של 8 שעות
     ל־6 גורע שעתיים. כמו בדיווח — המסך מתעדכן מיד, והשמירה רצה ברקע ונסוגה
     במלואה אם הגיליון סירב. */
  const handleEditHours = async (teacherId, recordId, { hours, reason, date }) => {
    const owner = teachers.find((t) => t.id === teacherId);
    const before = owner && owner.history.find((h) => h.id === recordId);
    if (!before) return { ok: false, error: "הרישום לא נמצא." };
    if (before.pending) return { ok: false, error: "הרישום עדיין נשמר בגיליון. יש להמתין רגע ולנסות שוב." };

    const delta = round2(hours - before.hours);
    const field = totalField(before.kind); // סוג הרישום אינו משתנה בעריכה

    // מה השתנה בדיווח, ומה קרה לסכום — לפני ואחרי.
    const priorTotal = round2(owner[field] || 0);
    const changes = [
      round2(before.hours) !== round2(hours) && { label: "שעות בדיווח", before: round2(before.hours), after: round2(hours) },
      before.reason !== reason && { label: "תיאור", before: before.reason, after: reason },
      delta !== 0 && { label: totalOf(field), before: priorTotal, after: round2(priorTotal + delta) },
    ].filter(Boolean);

    const patchRecord = (patch, hoursDelta) =>
      setTeachers((prev) =>
        prev.map((t) =>
          t.id === teacherId
            ? {
                ...t,
                [field]: round2((t[field] || 0) + hoursDelta),
                history: t.history.map((h) => (h.id === recordId ? { ...h, ...patch } : h)),
              }
            : t
        )
      );

    if (!configured) {
      patchRecord({ hours, reason, date }, delta);
      pushLog({ action: "editHours", payload: { teacherId, id: recordId, hours, date, reason }, description: `תוקן דיווח של ${nameOf(teacherId)}: מ־${before.hours} ל־${hours} ${hoursKind(field)} (${reason})`, changes });
      return { ok: true };
    }

    patchRecord({ hours, reason, date, saving: true }, delta);

    (async () => {
      try {
        const data = await apiPost("editHours", { teacherId, id: recordId, hours, date, reason });
        patchRecord({ saving: false }, 0);
        syncTotals(teacherId, data);
        pushLog({ action: "editHours", payload: { teacherId, id: recordId, hours, date, reason }, description: `תוקן דיווח של ${nameOf(teacherId)}: מ־${before.hours} ל־${hours} ${hoursKind(field)} (${reason})`, changes });
      } catch (e) {
        patchRecord({ hours: before.hours, reason: before.reason, date: before.date, saving: false }, -delta);
        setSyncError(`עריכת הרישום לא נשמרה בגיליון: ${e.message}. הרישום הוחזר לערכו הקודם.`);
      }
    })();

    return { ok: true };
  };

  /* מחיקת רישום. כמו בדיווח ובעריכה — הרישום יורד מהמסך מיד, והמחיקה רצה
     ברקע. אם הגיליון סירב, הרישום חוזר למקומו המדויק ברשימה והשעות מוחזרות
     לסכום, בליווי הודעה. */
  const handleDeleteHours = async (teacherId, recordId) => {
    const owner = teachers.find((t) => t.id === teacherId);
    const gone = owner && owner.history.find((h) => h.id === recordId);
    if (!gone) return { ok: false, error: "הרישום לא נמצא." };
    if (gone.pending) return { ok: false, error: "הרישום עדיין נשמר בגיליון. יש להמתין רגע ולנסות שוב." };

    // מיקומו ברשימה נשמר מראש, כדי שנסיגה תחזיר אותו בדיוק לשם ולא לראש.
    const goneIndex = owner.history.findIndex((h) => h.id === recordId);
    const field = totalField(gone.kind);

    const removeLocal = () =>
      setTeachers((prev) =>
        prev.map((t) =>
          t.id === teacherId
            ? {
                ...t,
                [field]: round2((t[field] || 0) - gone.hours),
                history: t.history.filter((h) => h.id !== recordId),
              }
            : t
        )
      );

    const restoreLocal = () =>
      setTeachers((prev) =>
        prev.map((t) => {
          if (t.id !== teacherId) return t;
          const history = [...t.history];
          history.splice(Math.min(goneIndex, history.length), 0, gone);
          return { ...t, [field]: round2((t[field] || 0) + gone.hours), history };
        })
      );

    const priorTotal = round2(owner[field] || 0);
    const changes = [
      { label: "הדיווח", before: `${round2(gone.hours)} שעות · ${gone.reason}`, after: "נמחק" },
      { label: totalOf(field), before: priorTotal, after: round2(priorTotal - gone.hours) },
    ];
    const log = () =>
      pushLog({ action: "deleteHours", payload: { teacherId, id: recordId }, changes, description: `נמחק דיווח של ${nameOf(teacherId)}: ${gone.hours} ${hoursKind(field)} (${gone.reason}). השעות ירדו מהסכום שלה` });

    if (!configured) {
      removeLocal();
      log();
      return { ok: true };
    }

    removeLocal();

    // המחיקה ממשיכה אחרי שחלון האישור כבר נסגר.
    (async () => {
      try {
        const data = await apiPost("deleteHours", { teacherId, id: recordId });
        syncTotals(teacherId, data);
        log();
      } catch (e) {
        // "לא נמצא" פירושו שהשורה כבר איננה בגיליון — ההסרה מהמסך נכונה,
        // ורק מסנכרנים כדי לוודא שהסכום תואם.
        if (/not found/i.test(e.message || "")) {
          refetch();
          return;
        }
        restoreLocal();
        setSyncError(`מחיקת הרישום (${gone.reason}) לא נשמרה בגיליון: ${e.message}. הרישום הוחזר לרשימה.`);
      }
    })();

    return { ok: true };
  };

  const toast = <SyncErrorToast message={syncError} onClose={() => setSyncError("")} />;

  if (!session) {
    return (
      <>
        <LoginPage onLogin={handleLogin} onDemo={SHOW_DEMO_ENTRY ? enterDemo : undefined} loading={loading} loadError={loadError} />
        {toast}
      </>
    );
  }

  if (session.role === "admin") {
    return (
      <>
        <AdminDashboard
          teachers={teachers} loading={loading} demoMode={!configured} demoManual={demoOverride} loadError={loadError}
          onRetry={refetch} onLogout={handleLogout}
          onAddTeacher={handleAddTeacher} onAddTeachers={handleAddTeachers}
          onUpdateTeachers={handleUpdateTeachers}
          onUpdateHours={handleUpdateHours}
          onEditHours={handleEditHours} onDeleteHours={handleDeleteHours}
          onDeleteTeacher={handleDeleteTeacher} writeLog={writeLog}
        />
        {toast}
      </>
    );
  }

  const teacher = teachers.find((t) => t.id === session.teacherId);
  if (!teacher) {
    /* סשן משוחזר שהנתונים שלו עדיין בדרך (למשל מטמון ריק אחרי ניקוי
       הדפדפן) — מציגים טעינה. רק כשהטעינה הסתיימה והמורה עדיין איננה
       ברשימה, ההוצאה מתבצעת — באפקט שלמטה, ולא באמצע הרינדור. */
    return (
      <>
        <div dir="rtl" className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-3" />
          <p className="text-sm">טוען מהגיליון…</p>
        </div>
        {toast}
      </>
    );
  }
  return (
    <>
      <TeacherDashboard
        teacher={teacher} demoMode={!configured} onLogout={handleLogout}
        loading={loading} loadError={loadError} lastSyncedAt={lastSyncedAt} onRetry={refetch}
        onAddHours={handleUpdateHours}
        onEditHours={handleEditHours}
        onDeleteHours={handleDeleteHours}
      />
      {toast}
    </>
  );
}
