/**
 * מפרקת פלט של git diff --unified=0 לרשימת hunks עצמאיים.
 * הפלט מכיל טווחים בצד הישן והחדש ושורות שנמחקו/נוספו, ולכן ניתן
 * להציג פעולות לכל שינוי בנפרד ולהחזיר רק אותו בלי לשכתב את הקובץ כולו.
 */
function parseUnifiedDiff(diffText) {
  const lines = diffText.split(/\r?\n/u)
  const hunks = []
  let currentHunk = null

  for (const line of lines) {
    const header = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/u)
    if (header) {
      if (currentHunk) hunks.push(currentHunk)
      currentHunk = {
        oldStart: Number(header[1]),
        oldCount: header[2] === undefined ? 1 : Number(header[2]),
        newStart: Number(header[3]),
        newCount: header[4] === undefined ? 1 : Number(header[4]),
        removedLines: [],
        addedLines: [],
      }
      continue
    }

    if (!currentHunk || line.startsWith("diff --git ")) continue
    if (line.startsWith("-")) {
      currentHunk.removedLines.push(line.slice(1))
    } else if (line.startsWith("+")) {
      currentHunk.addedLines.push(line.slice(1))
    }
  }

  if (currentHunk) hunks.push(currentHunk)
  return hunks
}

/**
 * יוצרת מזהה יציב ל-hunk מתוך הטווחים והתוכן שלו.
 * המזהה נשמר ב-workspace state כדי ש-Keep יישאר מאושר גם לאחר רענון הרחבה,
 * אך שינוי בתוכן ייצור מזהה חדש ויחזיר את פעולות הסקירה.
 */
function getHunkId(hunk) {
  return JSON.stringify([
    hunk.oldStart,
    hunk.oldCount,
    hunk.newStart,
    hunk.newCount,
    hunk.removedLines,
    hunk.addedLines,
  ])
}

/**
 * מחליפה במערך השורות את תוכן הצד החדש של hunk בתוכן הצד הישן.
 * מחזירה null אם שורות המסמך אינן תואמות ל-diff, כדי שהקורא יוכל לעצור
 * ולא לדרוס עריכות לא שמורות או שינוי שנעשה במקביל.
 */
function restoreHunkLines(currentLines, hunk) {
  const start = hunk.newCount === 0 ? hunk.newStart : hunk.newStart - 1
  const actualLines = currentLines.slice(start, start + hunk.newCount)
  if (
    actualLines.length !== hunk.addedLines.length ||
    actualLines.some((line, index) => line !== hunk.addedLines[index])
  ) {
    return null
  }

  const restoredLines = [...currentLines]
  restoredLines.splice(start, hunk.newCount, ...hunk.removedLines)
  return restoredLines
}

module.exports = { parseUnifiedDiff, getHunkId, restoreHunkLines }
