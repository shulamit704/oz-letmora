/* =========================================================================
   שעות הוראה — שרת Apps Script (גרסה מהירה)
   -------------------------------------------------------------------------
   ⭐ זה העותק השמור של Code.gs. כל שינוי בשרת נעשה כאן קודם, ומשם מודבק
      לעורך של Apps Script.

   מה השתנה לעומת הגרסה הקודמת:
   • שעות תומכות: מסלול צבירה נפרד מהשעות הפרטניות (פטרול).
       History.kind          — "support" לרישום פטרול, ריק לרישום פרטני.
       Teachers.supportHours — סך השעות התומכות; accumulatedHours מעתה
                               סופר רק את הרישומים הפרטניים.
     שתי העמודות נוספות לגיליון מאליהן בפעם הראשונה שהן נדרשות.
   • מטמון (CacheService) לטעינת הנתונים — הטעינה כמעט מיידית.
     כל כתיבה מהאפליקציה, וכל עריכה ידנית בגיליון, מנקה את המטמון.
   • מחיקת מורה: ההיסטוריה שלה נמחקת בפעולה אחת במקום שורה־שורה.
   • הוספה/עריכה/מחיקה של שעות: גיליון ההיסטוריה נקרא פעם אחת בלבד.
   • עריכת רישום: כתיבה אחת במקום שלוש.
   • הוספת מורה: הסיסמה נשמרת כטקסט (כדי ש־"0123" לא יהפוך ל־123).

   התקנה:
   1. מחקו את כל תוכן Code.gs והדביקו את הקובץ הזה.
   2. שמרו.
   3. Deploy → Manage deployments → עיפרון → Version: New version → Deploy.
      ⚠️ בלי "New version" גוגל ממשיכה להריץ את הקוד הישן.
   4. הריצו פעם אחת את migrateSupport מהעורך — מעביר את דיווחי הפטרול
      הקיימים לשעות התומכות ומחשב מחדש את הסכומים של כל המורות.
   5. הריצו את checkSetup לווידוא.

   מבנה הגיליון (כותרות בשורה 1):
     Teachers : id | name | password | frontalHours | requiredHours | accumulatedHours | supportHours
     History  : id | teacherId | date | hours | reason | kind
   ========================================================================= */

var TEACHERS_SHEET = "Teachers";
var HISTORY_SHEET = "History";

var TEACHER_COLS = ["id", "name", "password", "frontalHours", "requiredHours", "accumulatedHours"];
var HISTORY_COLS = ["id", "teacherId", "date", "hours", "reason"];

// עמודות שנוספו בגרסה מאוחרת — אם חסרות, נוספות לגיליון מאליהן.
var TEACHER_EXTRA = ["supportHours"];
var HISTORY_EXTRA = ["kind"];

// הערך של kind לרישום שצובר שעות תומכות. כל ערך אחר = רישום פרטני.
var SUPPORT_KIND = "support";

// התחילית שזיהתה פטרול לפני שהייתה עמודת kind — בשימוש רק ב־migrateSupport.
var PATROL_LABEL = "פטרול";

/* ----------------------------- מטמון ----------------------------------- */
/* CacheService מגביל כל ערך ל־100KB, ולכן הנתונים נשמרים בחלקים.
   כל שמירה מקבלת מספר גרסה, כך שחלקים ישנים לעולם לא מתערבבים בחדשים. */

var CACHE_KEY = "appData";
var CACHE_CHUNK = 40000;   // תווים לחלק (עברית תופסת יותר בייטים — יש מרווח ביטחון)
var CACHE_TTL = 21600;     // 6 שעות, המקסימום ש־Google מאפשרת

function cache_() {
  return CacheService.getScriptCache();
}

function getCachedData_() {
  var c = cache_();
  var meta = c.get(CACHE_KEY + "_meta");
  if (!meta) return null;

  var parts = meta.split("|");
  var ver = parts[0], n = Number(parts[1]);
  var keys = [];
  for (var i = 0; i < n; i++) keys.push(CACHE_KEY + "_" + ver + "_" + i);

  var got = c.getAll(keys);
  var s = "";
  for (var j = 0; j < keys.length; j++) {
    if (got[keys[j]] == null) return null;   // חלק פג תוקף — בונים מחדש
    s += got[keys[j]];
  }
  return s;
}

function putCachedData_(s) {
  try {
    var c = cache_();
    var ver = String(Date.now());
    var n = Math.max(1, Math.ceil(s.length / CACHE_CHUNK));
    var map = {};
    for (var i = 0; i < n; i++) {
      map[CACHE_KEY + "_" + ver + "_" + i] = s.substr(i * CACHE_CHUNK, CACHE_CHUNK);
    }
    c.putAll(map, CACHE_TTL);
    c.put(CACHE_KEY + "_meta", ver + "|" + n, CACHE_TTL);
  } catch (err) {
    // אם השמירה נכשלה (למשל נתונים גדולים מדי) — פשוט עובדים בלי מטמון.
  }
}

function clearCache_() {
  try { cache_().remove(CACHE_KEY + "_meta"); } catch (err) {}
}

/* טריגר פשוט: עריכה ידנית בגיליון מנקה את המטמון, כדי שהאפליקציה תראה אותה.
   הערה: מחיקה/הוספה של שורות שלמות דרך התפריט לא מפעילה את onEdit.
   אחרי שינוי כזה הריצו את clearCacheNow מהעורך (או חכו עד 6 שעות). */
function onEdit(e) {
  clearCache_();
}

function clearCacheNow() {
  clearCache_();
  Logger.log("✔ המטמון נוקה. הטעינה הבאה תקרא את הגיליון מחדש.");
}

/* ----------------------------- כלי עזר --------------------------------- */

var ss__ = null;
function ss_() {
  return ss__ || (ss__ = SpreadsheetApp.getActiveSpreadsheet());
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function sheet_(name, cols) {
  var sh = ss_().getSheetByName(name);
  if (!sh) {
    sh = ss_().insertSheet(name);
    sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight("bold");
    sh.setFrozenRows(1);
  }
  return sh;
}

/* cols  — עמודות חובה: אם חסרה אחת, זו תקלה בגיליון ונזרקת שגיאה.
   extra — עמודות שנוספו בגרסה מאוחרת: אם חסרות, נוספות בסוף שורת הכותרות.
           בזיכרון כל השורות מורחבות בתא ריק, כך שהקוד שאחרי אינו צריך
           להבחין בין גיליון ישן לחדש. */
function read_(name, cols, extra) {
  var sh = sheet_(name, cols.concat(extra || []));
  var values = sh.getDataRange().getValues();
  var headers = (values[0] || []).map(function (h) { return String(h).trim(); });
  var idx = {};
  headers.forEach(function (h, i) { idx[h] = i; });

  cols.forEach(function (c) {
    if (idx[c] === undefined) {
      throw new Error("בגיליון " + name + " חסרה עמודה בשם " + c);
    }
  });

  (extra || []).forEach(function (c) {
    if (idx[c] !== undefined) return;
    sh.getRange(1, headers.length + 1).setValue(c).setFontWeight("bold");
    idx[c] = headers.length;
    headers.push(c);
    values[0] = headers.slice();
    for (var r = 1; r < values.length; r++) values[r].push("");
  });

  return { sheet: sh, headers: headers, idx: idx, values: values };
}

function readTeachersSheet_() {
  return read_(TEACHERS_SHEET, TEACHER_COLS, TEACHER_EXTRA);
}

function readHistorySheet_() {
  return read_(HISTORY_SHEET, HISTORY_COLS, HISTORY_EXTRA);
}

/* ⚠️ הבדיקה אינה v instanceof Date בכוונה. ערכים שחוזרים משירות הגיליון
   מגיעים מהקשר הרצה אחר, ושם instanceof נכשל גם על תאריך אמיתי. התוצאה
   הייתה נפילה לשורה האחרונה: String(dateObject) = "Tue Sep 15 2025 ..."
   ו־slice(0,10) חתך אותה ל־"Tue Sep 15" — בלי שנה. בדיקת getTime עמידה
   לכך, מפני שהיא בודקת התנהגות ולא שייכות למחלקה. */
function fmtDate_(v) {
  if (v && typeof v.getTime === "function" && !isNaN(v.getTime())) {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(v || "").slice(0, 10);
}

function num_(v) {
  var n = Number(v);
  return isNaN(n) ? 0 : n;
}

function round2_(n) {
  return Math.round(n * 100) / 100;
}

function hasValue_(v) {
  return v !== undefined && v !== null && v !== "";
}

// מנרמל את סוג הרישום: "support" או ריק. כל ערך לא מוכר נחשב פרטני.
function kind_(v) {
  return String(v || "").trim() === SUPPORT_KIND ? SUPPORT_KIND : "";
}

function nextId_(data) {
  var max = 0;
  for (var r = 1; r < data.values.length; r++) {
    var id = num_(data.values[r][data.idx.id]);
    if (id > max) max = id;
  }
  return max + 1;
}

// מספר השורה בגיליון (1-based). 0 = לא נמצא.
function rowOfId_(data, id) {
  for (var r = 1; r < data.values.length; r++) {
    if (String(data.values[r][data.idx.id]) === String(id)) return r + 1;
  }
  return 0;
}

/* ----------------------------- קריאה ----------------------------------- */

function readTeachers_() {
  var d = readTeachersSheet_();
  var out = [];
  for (var r = 1; r < d.values.length; r++) {
    var row = d.values[r];
    if (!String(row[d.idx.id]).trim()) continue;
    out.push({
      id: num_(row[d.idx.id]),
      name: String(row[d.idx.name]),
      password: String(row[d.idx.password]),
      frontalHours: num_(row[d.idx.frontalHours]),
      requiredHours: num_(row[d.idx.requiredHours]),
      accumulatedHours: round2_(num_(row[d.idx.accumulatedHours])),
      supportHours: round2_(num_(row[d.idx.supportHours]))
    });
  }
  return out;
}

function readHistory_() {
  var d = readHistorySheet_();
  var out = [];
  for (var r = 1; r < d.values.length; r++) {
    var row = d.values[r];
    if (!String(row[d.idx.id]).trim()) continue;
    out.push({
      id: num_(row[d.idx.id]),
      teacherId: num_(row[d.idx.teacherId]),
      date: fmtDate_(row[d.idx.date]),
      hours: round2_(num_(row[d.idx.hours])),
      reason: String(row[d.idx.reason]),
      kind: kind_(row[d.idx.kind])
    });
  }
  return out;
}

/* --------------------- חישוב סך השעות ---------------------------------- */
/* הסכומים מחושבים מנתוני ההיסטוריה שכבר נקראו (ועודכנו בזיכרון),
   כך שאין צורך לקרוא את הגיליון פעם נוספת. שני מונים נפרדים:
   פרטניות (accumulatedHours) ותומכות (supportHours). */

function sumHours_(h, teacherId) {
  var personal = 0, support = 0;
  for (var r = 1; r < h.values.length; r++) {
    if (String(h.values[r][h.idx.teacherId]) !== String(teacherId)) continue;
    var hours = num_(h.values[r][h.idx.hours]);
    if (kind_(h.values[r][h.idx.kind]) === SUPPORT_KIND) support += hours;
    else personal += hours;
  }
  return { accumulatedHours: round2_(personal), supportHours: round2_(support) };
}

function setTotals_(teacherId, totals) {
  var t = readTeachersSheet_();
  var row = rowOfId_(t, teacherId);
  if (!row) return;
  t.sheet.getRange(row, t.idx.accumulatedHours + 1).setValue(totals.accumulatedHours);
  t.sheet.getRange(row, t.idx.supportHours + 1).setValue(totals.supportHours);
}

/* ----------------------------- פעולות ---------------------------------- */

// משותף ל־addTeacher ול־addTeachers: כתיבה אחת לכל הקבוצה.
function appendTeachers_(list) {
  var d = readTeachersSheet_();
  var id = nextId_(d);
  var rows = [], created = [];

  list.forEach(function (t) {
    var row = [];
    for (var i = 0; i < d.headers.length; i++) row.push("");
    row[d.idx.id] = id;
    row[d.idx.name] = t.name;
    row[d.idx.password] = String(t.password);
    row[d.idx.frontalHours] = num_(t.frontalHours);
    row[d.idx.requiredHours] = num_(t.requiredHours);
    row[d.idx.accumulatedHours] = 0;
    row[d.idx.supportHours] = 0;
    rows.push(row);
    created.push({
      id: id, name: t.name, password: String(t.password),
      frontalHours: num_(t.frontalHours), requiredHours: num_(t.requiredHours),
      accumulatedHours: 0, supportHours: 0
    });
    id++;
  });

  var start = d.sheet.getLastRow() + 1;
  // פורמט טקסט לעמודת הסיסמה לפני הכתיבה — כדי שאפסים מובילים יישמרו.
  d.sheet.getRange(start, d.idx.password + 1, rows.length, 1).setNumberFormat("@");
  d.sheet.getRange(start, 1, rows.length, d.headers.length).setValues(rows);
  return created;
}

function addTeacher_(p) {
  return { teacher: appendTeachers_([p])[0] };
}

function addTeachers_(p) {
  var list = (p && p.teachers) || [];
  if (!list.length) return { teachers: [] };
  return { teachers: appendTeachers_(list) };
}

/* עדכון פרטי מורות קיימות — ללא שינוי מהגרסה הקודמת (כבר עבד בכתיבה מרוכזת). */
function updateTeachers_(p) {
  var list = (p && p.teachers) || [];
  if (!list.length) throw new Error("לא נשלחו מורות לעדכון.");

  var d = readTeachersSheet_();
  var rows = d.values.length - 1;
  if (rows < 1) throw new Error("אין מורות בגיליון.");

  var rowOf = {};
  for (var r = 1; r < d.values.length; r++) {
    var key = String(d.values[r][d.idx.id]).trim();
    if (key) rowOf[key] = r;
  }

  var frontal = [], required = [];
  for (var i = 1; i < d.values.length; i++) {
    frontal.push([d.values[i][d.idx.frontalHours]]);
    required.push([d.values[i][d.idx.requiredHours]]);
  }

  var updated = [], missing = [], passwords = [];
  var hoursTouched = false;

  for (var j = 0; j < list.length; j++) {
    var t = list[j] || {};
    var at = rowOf[String(t.id).trim()];
    if (at === undefined) { missing.push(t.id); continue; }

    var k = at - 1;
    if (hasValue_(t.frontalHours)) {
      frontal[k] = [num_(t.frontalHours)];
      hoursTouched = true;
    }
    if (hasValue_(t.requiredHours)) {
      required[k] = [num_(t.requiredHours)];
      hoursTouched = true;
    }

    var pw = null;
    if (hasValue_(t.password) && String(t.password).trim() !== "") {
      pw = String(t.password).trim();
      if (pw !== String(d.values[at][d.idx.password])) {
        passwords.push({ row: at + 1, value: pw });   // כותבים רק אם באמת השתנתה
      }
    }

    updated.push({
      id: num_(t.id),
      name: String(d.values[at][d.idx.name]),
      frontalHours: num_(frontal[k][0]),
      requiredHours: num_(required[k][0]),
      password: pw === null ? String(d.values[at][d.idx.password]) : pw
    });
  }

  if (!updated.length) throw new Error("לא נמצאה אף מורה מהרשימה בגיליון.");

  if (hoursTouched) {
    d.sheet.getRange(2, d.idx.frontalHours + 1, rows, 1).setValues(frontal);
    d.sheet.getRange(2, d.idx.requiredHours + 1, rows, 1).setValues(required);
  }

  for (var q = 0; q < passwords.length; q++) {
    d.sheet.getRange(passwords[q].row, d.idx.password + 1)
      .setNumberFormat("@")
      .setValue(passwords[q].value);
  }

  return { updated: updated, missing: missing };
}

/* מחיקת מורה. ההיסטוריה שלה נמחקת בכתיבה אחת: הרישומים שנשארים נכתבים
   מחדש מהשורה השנייה, והשורות העודפות בסוף מתרוקנות. */
function deleteTeacher_(p) {
  var t = readTeachersSheet_();
  var row = rowOfId_(t, p.teacherId);
  if (!row) throw new Error("teacher not found");
  t.sheet.deleteRow(row);

  var h = readHistorySheet_();
  var kept = [];
  var removed = 0;
  for (var r = 1; r < h.values.length; r++) {
    if (String(h.values[r][h.idx.teacherId]) === String(p.teacherId)) {
      removed++;
    } else {
      kept.push(h.values[r]);
    }
  }

  if (removed > 0) {
    var width = h.values[0].length;
    if (kept.length) {
      h.sheet.getRange(2, 1, kept.length, width).setValues(kept);
    }
    h.sheet.getRange(2 + kept.length, 1, removed, width).clearContent();
  }

  return { historyRemoved: removed };
}

function updateHours_(p) {
  var d = readHistorySheet_();
  var id = nextId_(d);
  var kind = kind_(p.kind);

  var row = [];
  for (var i = 0; i < d.headers.length; i++) row.push("");
  row[d.idx.id] = id;
  row[d.idx.teacherId] = num_(p.teacherId);
  row[d.idx.date] = String(p.date);
  row[d.idx.hours] = num_(p.hours);
  row[d.idx.reason] = String(p.reason);
  row[d.idx.kind] = kind;

  d.sheet.appendRow(row);
  d.values.push(row);                              // מעדכנים גם בזיכרון

  var totals = sumHours_(d, p.teacherId);
  setTotals_(p.teacherId, totals);

  return {
    record: {
      id: id, teacherId: num_(p.teacherId), date: String(p.date),
      hours: num_(p.hours), reason: String(p.reason), kind: kind
    },
    accumulatedHours: totals.accumulatedHours,
    supportHours: totals.supportHours
  };
}

/* עריכת רישום. סוג הרישום (kind) אינו משתנה בעריכה — פטרול נשאר פטרול. */
function editHours_(p) {
  if (!p || !hasValue_(p.id)) throw new Error("editHours: חסר id של הרישום");

  var d = readHistorySheet_();
  var row = rowOfId_(d, p.id);
  if (!row) throw new Error("history record not found");

  var current = d.values[row - 1];
  var teacherId = p.teacherId !== undefined ? p.teacherId : current[d.idx.teacherId];

  var updatedRow = current.slice();
  updatedRow[d.idx.date] = String(p.date);
  updatedRow[d.idx.hours] = num_(p.hours);
  updatedRow[d.idx.reason] = String(p.reason);

  d.sheet.getRange(row, 1, 1, updatedRow.length).setValues([updatedRow]);   // כתיבה אחת
  d.values[row - 1] = updatedRow;

  var totals = sumHours_(d, teacherId);
  setTotals_(teacherId, totals);

  return {
    record: {
      id: num_(p.id), teacherId: num_(teacherId), date: String(p.date),
      hours: num_(p.hours), reason: String(p.reason), kind: kind_(updatedRow[d.idx.kind])
    },
    accumulatedHours: totals.accumulatedHours,
    supportHours: totals.supportHours
  };
}

function deleteHours_(p) {
  if (!p || !hasValue_(p.id)) throw new Error("deleteHours: חסר id של הרישום");

  var d = readHistorySheet_();
  var row = rowOfId_(d, p.id);
  if (!row) throw new Error("history record not found");

  var teacherId = p.teacherId !== undefined ? p.teacherId : d.values[row - 1][d.idx.teacherId];
  d.sheet.deleteRow(row);
  d.values.splice(row - 1, 1);

  var totals = sumHours_(d, teacherId);
  setTotals_(teacherId, totals);

  return { deleted: num_(p.id), accumulatedHours: totals.accumulatedHours, supportHours: totals.supportHours };
}

/* --------------------------- נקודות הכניסה ----------------------------- */

function doGet(e) {
  try {
    var skipCache = e && e.parameter && e.parameter.nocache;
    var s = skipCache ? null : getCachedData_();
    if (!s) {
      s = JSON.stringify({ ok: true, teachers: readTeachers_(), history: readHistory_() });
      putCachedData_(s);
    }
    return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (err) {
    return json_({ ok: false, error: "השרת עסוק כרגע. נסו שוב בעוד רגע." });
  }

  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("הפונקציה doPost הופעלה בלי נתונים. יש לקרוא לה מהאפליקציה, לא ידנית מהעורך.");
    }

    var body = JSON.parse(e.postData.contents);
    var action = body.action;
    var payload = body.payload || {};
    var result;

    switch (action) {
      case "addTeacher":     result = addTeacher_(payload);     break;
      case "addTeachers":    result = addTeachers_(payload);    break;
      case "updateTeachers": result = updateTeachers_(payload); break;
      case "deleteTeacher":  result = deleteTeacher_(payload);  break;
      case "updateHours":    result = updateHours_(payload);    break;
      case "editHours":      result = editHours_(payload);      break;
      case "deleteHours":    result = deleteHours_(payload);    break;
      default:
        throw new Error("Unknown action: " + action);
    }

    result.ok = true;
    return json_(result);
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  } finally {
    // מנקים את המטמון אחרי כל ניסיון כתיבה — גם אם נכשל באמצע.
    clearCache_();
    lock.releaseLock();
  }
}

/* ------------------------- הסבה חד־פעמית ------------------------------- */
/* מריצים פעם אחת מהעורך, אחרי פריסת הגרסה הזו:
     1. רישומי פטרול ישנים (הסיבה מתחילה ב"פטרול", בלי kind) מסומנים
        כשעות תומכות.
     2. accumulatedHours ו־supportHours מחושבים מחדש לכל המורות.
   הרצה חוזרת בטוחה: רישום שכבר סומן אינו נספר שוב, והסכומים תמיד
   מחושבים מחדש מכל ההיסטוריה. */
function migrateSupport() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var h = readHistorySheet_();
    var kinds = [];
    var marked = 0;
    for (var r = 1; r < h.values.length; r++) {
      var k = kind_(h.values[r][h.idx.kind]);
      if (!k && String(h.values[r][h.idx.reason]).trim().indexOf(PATROL_LABEL) === 0) {
        k = SUPPORT_KIND;
        h.values[r][h.idx.kind] = k;
        marked++;
      }
      kinds.push([k]);
    }
    if (kinds.length) h.sheet.getRange(2, h.idx.kind + 1, kinds.length, 1).setValues(kinds);

    var recalculated = recalcAllTotals_(h);
    clearCache_();

    var msg = "✔ סומנו " + marked + " רישומי פטרול כשעות תומכות · " +
              "חושבו מחדש הסכומים של " + recalculated + " מורות.";
    Logger.log(msg);
    return msg;
  } finally {
    lock.releaseLock();
  }
}

/* חישוב מחדש של שני הסכומים לכל המורות, בכתיבה אחת לכל עמודה.
   שימושי גם אחרי עריכה ידנית של שעות בגיליון History. */
function recalcAllTotals_(h) {
  h = h || readHistorySheet_();
  var t = readTeachersSheet_();
  var acc = [], sup = [];
  var count = 0;
  for (var r = 1; r < t.values.length; r++) {
    var id = String(t.values[r][t.idx.id]).trim();
    if (!id) {
      acc.push([t.values[r][t.idx.accumulatedHours]]);
      sup.push([t.values[r][t.idx.supportHours]]);
      continue;
    }
    var totals = sumHours_(h, id);
    acc.push([totals.accumulatedHours]);
    sup.push([totals.supportHours]);
    count++;
  }
  if (acc.length) {
    t.sheet.getRange(2, t.idx.accumulatedHours + 1, acc.length, 1).setValues(acc);
    t.sheet.getRange(2, t.idx.supportHours + 1, sup.length, 1).setValues(sup);
  }
  return count;
}

function recalcTotalsNow() {
  var n = recalcAllTotals_();
  clearCache_();
  Logger.log("✔ חושבו מחדש הסכומים של " + n + " מורות.");
}

/* ------------------------- בדיקה עצמית מהעורך -------------------------- */

function checkSetup() {
  var out = [];
  try {
    var t = readTeachersSheet_();
    out.push("✔ גיליון " + TEACHERS_SHEET + " תקין · " + (t.values.length - 1) + " שורות");
  } catch (err) {
    out.push("✘ " + TEACHERS_SHEET + ": " + err.message);
  }
  try {
    var h = readHistorySheet_();
    var support = 0, unmarked = 0;
    for (var r = 1; r < h.values.length; r++) {
      var isSupport = kind_(h.values[r][h.idx.kind]) === SUPPORT_KIND;
      if (isSupport) support++;
      else if (String(h.values[r][h.idx.reason]).trim().indexOf(PATROL_LABEL) === 0) unmarked++;
    }
    out.push("✔ גיליון " + HISTORY_SHEET + " תקין · " + (h.values.length - 1) + " שורות · " + support + " רישומי פטרול");
    if (unmarked) out.push("⚠ " + unmarked + " רישומים שמתחילים ב\"פטרול\" אינם מסומנים כתומכות — הריצו migrateSupport.");
  } catch (err) {
    out.push("✘ " + HISTORY_SHEET + ": " + err.message);
  }

  clearCache_();
  out.push("✔ המטמון נוקה.");

  var actions = ["addTeacher", "addTeachers", "updateTeachers", "deleteTeacher", "updateHours", "editHours", "deleteHours"];
  out.push("פעולות נתמכות: " + actions.join(", "));
  out.push("⚠ אם האפליקציה מקבלת Unknown action — הפריסה לא עודכנה. " +
           "Deploy → Manage deployments → עריכה → Version: New version → Deploy.");

  Logger.log(out.join("\n"));
  return out.join("\n");
}

function testUpdateTeachers() {
  var all = readTeachers_();
  if (!all.length) { Logger.log("אין מורות בגיליון — אין מה לבדוק."); return "אין מורות"; }

  var t = all[0];
  Logger.log("בודק על: " + t.name + " (id " + t.id + ")");
  Logger.log("לפני: " + JSON.stringify(t));

  var res = updateTeachers_({
    teachers: [{
      id: t.id,
      frontalHours: t.frontalHours,
      requiredHours: t.requiredHours,
      password: String(t.password)
    }]
  });

  Logger.log("אחרי: " + JSON.stringify(res));
  Logger.log("✔ הפעולה רצה בהצלחה. אם האפליקציה עדיין נכשלת — הבעיה בפריסה, לא בקוד.");
  return res;
}
