const test = require("node:test")
const assert = require("node:assert/strict")
const { parseUnifiedDiff, getHunkId, restoreHunkLines } = require("../diffParser")

/**
 * מוודאת ש-hunk עם הוספה/מחיקה ומספר טווחים מפוענח בצורה מדויקת.
 * בדיקה זו מגנה על מיפוי שורות שעליו נשענות פעולות Undo ממוקדות.
 */
test("מפרק hunk של החלפת שורה", () => {
  const diff = [
    "diff --git a/file.js b/file.js",
    "--- a/file.js",
    "+++ b/file.js",
    "@@ -2,2 +2,3 @@",
    " old line",
    "-removed",
    "+added",
    "+another added",
  ].join("\n")

  assert.deepEqual(parseUnifiedDiff(diff), [{
    oldStart: 2,
    oldCount: 2,
    newStart: 2,
    newCount: 3,
    removedLines: ["removed"],
    addedLines: ["added", "another added"],
  }])
})

/**
 * מוודאת ששורה אמיתית שמתחילה בשני סימני פלוס/מינוס אינה מזוהה בטעות
 * ככותרת קובץ diff, אלא נשמרת בשלמותה כחלק מתוכן ה-hunk.
 */
test("שורות קוד שמתחילות בסימני diff נשמרות כתוכן", () => {
  const hunks = parseUnifiedDiff("@@ -1 +1 @@\n---old code\n+++new code")
  assert.deepEqual(hunks[0].removedLines, ["--old code"])
  assert.deepEqual(hunks[0].addedLines, ["++new code"])
})

/**
 * מוודאת שפורמט מקוצר של Git מתפרש כשורה אחת, ושטווח הוספה לקובץ ריק
 * משתמש במיקום 0 בצד הישן במקום לבלבל בין אינדקסי שורות.
 */
test("מפרק hunk של הוספה בראש הקובץ עם ספירת שורות ברירת מחדל", () => {
  assert.deepEqual(parseUnifiedDiff("@@ -0,0 +1 @@\n+new file line"), [{
    oldStart: 0,
    oldCount: 0,
    newStart: 1,
    newCount: 1,
    removedLines: [],
    addedLines: ["new file line"],
  }])
})

/**
 * מזהה ה-hunk משתנה כאשר תוכן השורות משתנה, כדי לא לשאת Keep ישן
 * לשינוי חדש באותו אזור בקובץ.
 */
test("מזהה hunk מבוסס גם על תוכנו", () => {
  const base = {
    oldStart: 1,
    oldCount: 1,
    newStart: 1,
    newCount: 1,
    removedLines: ["old"],
    addedLines: ["new"],
  }
  assert.equal(getHunkId(base), getHunkId({ ...base }))
  assert.notEqual(getHunkId(base), getHunkId({ ...base, addedLines: ["newer"] }))
})

/**
 * מוודאת ש-Undo מחזיר רק את השורות המקוריות של hunk מתאים ומשאיר את שאר
 * הקובץ ללא שינוי, כולל שורות שנערכו מחוץ לאזור שנבחר.
 */
test("מחזיר hunk תואם תוך שמירה על שאר השורות", () => {
  const hunk = {
    newStart: 2,
    newCount: 2,
    removedLines: ["original"],
    addedLines: ["changed", "extra"],
  }

  assert.deepEqual(
    restoreHunkLines(["before", "changed", "extra", "after"], hunk),
    ["before", "original", "after"],
  )
})

/**
 * מוודאת ש-Undo מסרב לפעול כאשר התוכן במסמך כבר אינו תואם ל-hunk,
 * כדי למנוע דריסה של שינוי מקביל או עריכה לא שמורה של המשתמש.
 */
test("מסרב להחזיר hunk כאשר השורות השתנו", () => {
  const hunk = {
    newStart: 1,
    newCount: 1,
    removedLines: ["original"],
    addedLines: ["expected"],
  }

  assert.equal(restoreHunkLines(["different"], hunk), null)
})

/**
 * מוודאת שמחיקת שורה מוחזרת למיקום הנכון גם כשה-hunk אינו מכיל שורות
 * בצד החדש, תרחיש שבו Git משתמש באינדקס insertion שונה מהוספת שורה.
 */
test("מחזיר שורה שנמחקה בסוף הקובץ", () => {
  const hunk = {
    newStart: 2,
    newCount: 0,
    removedLines: ["deleted"],
    addedLines: [],
  }

  assert.deepEqual(restoreHunkLines(["first", "second"], hunk), [
    "first",
    "second",
    "deleted",
  ])
})
