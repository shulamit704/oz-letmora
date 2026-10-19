/* =========================================================================
   שעות תומכות  (lib/supportHours.js)
   -------------------------------------------------------------------------
   מסלול צבירה נפרד מהשעות הפרטניות. יעד קבוע וזהה לכל המורות, והדרך
   היחידה לצבור בו היא דיווח פטרול (כפתור נפרד במסך המורה).

   ההפרדה שמורה בגיליון (ראו server/Code.gs):
     History.kind          — "support" לרישום פטרול, ריק לרישום פרטני.
     Teachers.supportHours — סך השעות התומכות. accumulatedHours סופר
                             רק את הרישומים הפרטניים.
   ========================================================================= */

// ⭐ היעד השנתי — זהה לכל המורות.
const SUPPORT_TARGET = 30;

// סוג הרישום שצובר שעות תומכות — חייב להתאים ל־SUPPORT_KIND ב־Code.gs.
const SUPPORT_KIND = "support";

// תיאור ברירת המחדל של דיווח פטרול.
const PATROL_LABEL = "פטרול";

const isSupportRecord = (h) => h?.kind === SUPPORT_KIND;

// השדה במורה שרישום מהסוג הזה מעדכן.
const totalField = (kind) => (kind === SUPPORT_KIND ? "supportHours" : "accumulatedHours");

export { SUPPORT_TARGET, SUPPORT_KIND, PATROL_LABEL, isSupportRecord, totalField };
