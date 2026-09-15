/* =========================================================================
   שכבת נתונים  (lib/api.js)
   ========================================================================= */

// 👇 הדביקו כאן את כתובת ה־Web App של Apps Script (מסתיימת ב־/exec).
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxveR0qTBopPOsWopYSg6UJJFCIekn2maU9yx4ta3AHUi6V192UPL0QJFoNpsc8kDsZTw/exec";

const isConfigured = () =>
  !!WEB_APP_URL && !WEB_APP_URL.startsWith("PASTE_") && WEB_APP_URL.includes("http");

/* כש־Apps Script זורק שגיאה שאינה מטופלת הוא מחזיר עמוד HTML במקום JSON.
   בלי הטיפול הזה המורה רואה "Unexpected token '<'" — הודעה חסרת פשר.
   כאן מזהים את המקרה ומסבירים מה באמת קרה. */
async function parseResponse(res, action) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    const isHtml = /^\s*<!DOCTYPE|^\s*<html/i.test(text);
    if (isHtml) {
      const where = action ? `בפעולה "${action}"` : "בטעינת הנתונים";
      throw new Error(
        `השרת (Apps Script) קרס ${where} והחזיר עמוד שגיאה במקום נתונים. ` +
          `יש לבדוק את יומן ההרצות של Code.gs (Executions) ולפרוס גרסה חדשה.`
      );
    }
    throw new Error(`תשובה לא תקינה מהשרת (קוד ${res.status}): ${text.slice(0, 120)}`);
  }
}

async function apiGetAll() {
  const res = await fetch(WEB_APP_URL, { method: "GET" });
  const data = await parseResponse(res);
  if (!data.ok) throw new Error(data.error || "טעינת הנתונים נכשלה");
  return data;
}

async function apiPost(action, payload) {
  const res = await fetch(WEB_APP_URL, {
    method: "POST",
    // text/plain שומר על "בקשה פשוטה" ומונע preflight של CORS ש־Apps Script
    // אינו עונה עליו. גוף הבקשה עדיין JSON.
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, payload }),
  });
  const data = await parseResponse(res, action);
  if (!data.ok) throw new Error(data.error || "הבקשה נכשלה");
  return data;
}

// הופך את המבנה השטוח {teachers, history} למורים עם היסטוריה מקוננת וממוינת.
function mergeServerData(data) {
  const byTeacher = {};
  (data.history || []).forEach((h) => {
    if (!byTeacher[h.teacherId]) byTeacher[h.teacherId] = [];
    byTeacher[h.teacherId].push(h);
  });
  return (data.teachers || []).map((t) => ({
    ...t,
    history: (byTeacher[t.id] || []).sort((a, b) => new Date(b.date) - new Date(a.date)),
  }));
}

export { WEB_APP_URL, isConfigured, apiGetAll, apiPost, mergeServerData };
