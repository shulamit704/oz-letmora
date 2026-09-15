import React, { useState, useEffect, useRef } from "react";
import { WEB_APP_URL, apiGetAll, apiPost, isConfigured, mergeServerData } from "./lib/api.js";
import { ADMIN_PASSWORD, SHOW_DEMO_ENTRY, demoTeachers } from "./lib/demoData.js";
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

  const [teachers, setTeachers] = useState(isConfigured() ? [] : demoTeachers);
  const [loading, setLoading] = useState(isConfigured());
  const [loadError, setLoadError] = useState("");
  const [session, setSession] = useState(null); // { role:'admin' } | { role:'teacher', teacherId }
  const [writeLog, setWriteLog] = useState([]); // יומן פעולות הכתיבה לגיליון
  const [syncError, setSyncError] = useState(""); // כשל בשמירה שקרתה ברקע
  const loadRef = useRef(null);                   // הטעינה שרצה כרגע מהגיליון

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

  // הזיהוי נעשה לפי הסיסמה בלבד — אין שדה שם משתמש. הסיסמה היא שקובעת מי
  // נכנס, ולכן היא חייבת להיות ייחודית לכל מורה.
  //
  // אין חסימה של הטופס בזמן הטעינה: המורה מקלידה מיד, וברוב המקרים הנתונים
  // כבר הגיעו עד שהיא מסיימת. אם לא — ממתינים כאן לטעינה שכבר רצה ברקע,
  // במקום להשאיר אותה מול כפתור מושבת.
  const handleLogin = async (password) => {
    const p = String(password).trim();

    if (p === ADMIN_PASSWORD) {
      setSession({ role: "admin" });
      return true;
    }

    let list = teachers;
    if (configured) {
      const loaded = await (loadRef.current || refetch());
      if (loaded) list = loaded;
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
    setSession({ role: "admin" });
  };

  const handleLogout = () => {
    setSession(null);
    // יציאה מההדגמה מחזירה את הנתונים האמיתיים מהגיליון.
    if (demoOverride) {
      setDemoOverride(false);
      setWriteLog([]);
      if (isConfigured()) {
        setTeachers([]);
        refetch(true);
      }
    }
  };

  const handleAddTeacher = async ({ name, password, frontalHours, requiredHours }) => {
    if (!configured) {
      const id = teachers.reduce((m, t) => Math.max(m, t.id), 0) + 1;
      setTeachers((prev) => [...prev, { id, name, password, frontalHours, requiredHours, accumulatedHours: 0, history: [] }]);
      pushLog({ action: "addTeacher", payload: { name, password, frontalHours, requiredHours }, description: `נוספה שורה לגיליון Teachers (id ${id})` });
      return { ok: true };
    }
    try {
      const data = await apiPost("addTeacher", { name, password, frontalHours, requiredHours });
      setTeachers((prev) => [...prev, { ...data.teacher, history: [] }]);
      pushLog({ action: "addTeacher", payload: { name, password, frontalHours, requiredHours }, description: `נוספה שורה לגיליון Teachers (id ${data.teacher.id})` });
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
        description: `נוספו ${created.length} שורות לגיליון Teachers בפנייה אחת (id ${created[0]?.id}–${created[created.length - 1]?.id})`,
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
    const log = () =>
      pushLog({
        action: "updateTeachers",
        payload: { count: list.length },
        description: `עודכנו פרטיהן של ${list.length} מורות בגיליון Teachers (שעות ${list.filter((t) => t.requiredHours !== undefined).length} · סיסמאות ${list.filter((t) => t.password !== undefined).length})`,
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
    const removeLocal = () => setTeachers((prev) => prev.filter((t) => t.id !== teacherId));

    if (!configured) {
      removeLocal();
      pushLog({ action: "deleteTeacher", payload: { teacherId }, description: `נמחקה שורת מורה ${teacherId} מהגיליון Teachers` });
      return { ok: true };
    }
    try {
      const data = await apiPost("deleteTeacher", { teacherId });
      removeLocal();
      pushLog({
        action: "deleteTeacher",
        payload: { teacherId },
        description: `נמחקה ${gone ? gone.name : "מורה " + teacherId} מ־Teachers, ועוד ${data.historyRemoved || 0} רישומים מ־History`,
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
          description: `${gone ? gone.name : "מורה " + teacherId} כבר לא הייתה בגיליון — הוסרה מהתצוגה וסונכרן מחדש`,
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
  const handleUpdateHours = async (teacherId, { hours, reason, date }) => {
    const prior = teachers.find((t) => t.id === teacherId);
    const newAcc = round2((prior ? prior.accumulatedHours : 0) + hours);
    const tempId = `pending-${Date.now()}`;

    const addLocal = (record) =>
      setTeachers((prev) =>
        prev.map((t) =>
          t.id === teacherId
            ? { ...t, accumulatedHours: round2(t.accumulatedHours + hours), history: [record, ...t.history] }
            : t
        )
      );

    if (!configured) {
      addLocal({ id: Date.now(), teacherId, date, hours, reason });
      pushLog({ action: "updateHours", payload: { teacherId, hours, date, reason }, description: `נוספה שורה לגיליון History; accumulatedHours של מורה ${teacherId} עודכן ל־${newAcc}` });
      return { ok: true };
    }

    addLocal({ id: tempId, teacherId, date, hours, reason, pending: true });

    // השמירה ממשיכה אחרי שהחלון כבר נסגר.
    (async () => {
      try {
        const data = await apiPost("updateHours", { teacherId, hours, date, reason });
        // מחליפים את הרישום הזמני ברשומה האמיתית שחזרה מהגיליון.
        setTeachers((prev) =>
          prev.map((t) =>
            t.id === teacherId
              ? { ...t, history: t.history.map((h) => (h.id === tempId ? data.record : h)) }
              : t
          )
        );
        pushLog({ action: "updateHours", payload: { teacherId, hours, date, reason }, description: `נוספה שורה לגיליון History (id ${data.record.id}); accumulatedHours של מורה ${teacherId} עודכן ל־${newAcc}` });
      } catch (e) {
        // נסיגה מלאה: גם הרישום וגם השעות שנוספו לסכום.
        setTeachers((prev) =>
          prev.map((t) =>
            t.id === teacherId
              ? {
                  ...t,
                  accumulatedHours: round2(t.accumulatedHours - hours),
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

    const patchRecord = (patch, hoursDelta) =>
      setTeachers((prev) =>
        prev.map((t) =>
          t.id === teacherId
            ? {
                ...t,
                accumulatedHours: round2(t.accumulatedHours + hoursDelta),
                history: t.history.map((h) => (h.id === recordId ? { ...h, ...patch } : h)),
              }
            : t
        )
      );

    if (!configured) {
      patchRecord({ hours, reason, date }, delta);
      pushLog({ action: "editHours", payload: { teacherId, id: recordId, hours, date, reason }, description: `עודכנה שורה ${recordId} בגיליון History; accumulatedHours של מורה ${teacherId} שונה ב־${delta}` });
      return { ok: true };
    }

    patchRecord({ hours, reason, date, saving: true }, delta);

    (async () => {
      try {
        await apiPost("editHours", { teacherId, id: recordId, hours, date, reason });
        patchRecord({ saving: false }, 0);
        pushLog({ action: "editHours", payload: { teacherId, id: recordId, hours, date, reason }, description: `עודכנה שורה ${recordId} בגיליון History; accumulatedHours של מורה ${teacherId} שונה ב־${delta}` });
      } catch (e) {
        patchRecord({ hours: before.hours, reason: before.reason, date: before.date, saving: false }, -delta);
        setSyncError(`עריכת הרישום לא נשמרה בגיליון: ${e.message}. הרישום הוחזר לערכו הקודם.`);
      }
    })();

    return { ok: true };
  };

  /* מחיקת רישום. השעות נגרעות מהסכום הנצבר, ואם המחיקה נכשלה בגיליון —
     הרישום חוזר למסך במלואו. */
  const handleDeleteHours = async (teacherId, recordId) => {
    const owner = teachers.find((t) => t.id === teacherId);
    const gone = owner && owner.history.find((h) => h.id === recordId);
    if (!gone) return { ok: false, error: "הרישום לא נמצא." };
    if (gone.pending) return { ok: false, error: "הרישום עדיין נשמר בגיליון. יש להמתין רגע ולנסות שוב." };

    const removeLocal = () =>
      setTeachers((prev) =>
        prev.map((t) =>
          t.id === teacherId
            ? {
                ...t,
                accumulatedHours: round2(t.accumulatedHours - gone.hours),
                history: t.history.filter((h) => h.id !== recordId),
              }
            : t
        )
      );

    if (!configured) {
      removeLocal();
      pushLog({ action: "deleteHours", payload: { teacherId, id: recordId }, description: `נמחקה שורה ${recordId} מגיליון History; ${gone.hours} שעות נגרעו מהסכום של מורה ${teacherId}` });
      return { ok: true };
    }

    try {
      await apiPost("deleteHours", { teacherId, id: recordId });
      removeLocal();
      pushLog({ action: "deleteHours", payload: { teacherId, id: recordId }, description: `נמחקה שורה ${recordId} מגיליון History; ${gone.hours} שעות נגרעו מהסכום של מורה ${teacherId}` });
      return { ok: true };
    } catch (e) {
      // "לא נמצא" פירושו שהשורה כבר איננה בגיליון — מסירים מהתצוגה ומסנכרנים.
      if (/not found/i.test(e.message || "")) {
        removeLocal();
        refetch();
        return { ok: true };
      }
      // המחיקה נכשלה — דבר לא הוסר מהמסך, וההודעה מוצגת בתוך חלון האישור.
      return { ok: false, error: e.message };
    }
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
    handleLogout();
    return null;
  }
  return (
    <>
      <TeacherDashboard
        teacher={teacher} demoMode={!configured} onLogout={handleLogout}
        onAddHours={handleUpdateHours}
        onEditHours={handleEditHours}
        onDeleteHours={handleDeleteHours}
      />
      {toast}
    </>
  );
}
