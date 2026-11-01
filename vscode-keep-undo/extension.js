const vscode = require("vscode")
const path = require("path")
const { execFile } = require("child_process")
const { promisify } = require("util")
const { parseUnifiedDiff, getHunkId, restoreHunkLines } = require("./diffParser")

const execFileAsync = promisify(execFile)
const REVIEW_STATE_KEY = "reviewed-hunks"

/**
 * מאתרת את שורש מאגר Git עבור קובץ פתוח.
 * execFile מקבל ארגומנטים כמערך ולא דרך shell, כדי שנתיבים עם רווחים
 * או תווים מיוחדים לא יהפכו לפקודות shell.
 */
async function getRepositoryRoot(document) {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri)
  if (!workspaceFolder) return null

  try {
    const { stdout } = await execFileAsync(
      "git",
      ["rev-parse", "--show-toplevel"],
      { cwd: workspaceFolder.uri.fsPath, windowsHide: true },
    )
    return stdout.trim()
  } catch (error) {
    if (error.code === "ENOENT") {
      vscode.window.showErrorMessage("Git לא נמצא ב-PATH. התקן Git או עדכן את PATH והפעל מחדש את VS Code.")
      return null
    }
    return null
  }
}

/**
 * קוראת את השינויים בין תוכן הקובץ הנוכחי לבין HEAD.
 * נתיב הקובץ מועבר כארגומנט נפרד, ושורות diff מאוחדות ללא context
 * כדי שכל פעולה תכוון ליחידת שינוי קטנה וברורה.
 */
async function getFileReview(document) {
  const repositoryRoot = await getRepositoryRoot(document)
  if (!repositoryRoot) return null

  const relativePath = path.relative(repositoryRoot, document.uri.fsPath)
  if (!relativePath || relativePath.startsWith("..")) return null
  const gitPath = relativePath.split(path.sep).join("/")

  try {
    const { stdout: diff } = await execFileAsync(
      "git",
      ["diff", "--no-ext-diff", "--no-color", "--unified=0", "HEAD", "--", gitPath],
      { cwd: repositoryRoot, windowsHide: true, maxBuffer: 8 * 1024 * 1024 },
    )

    return {
      repositoryRoot,
      gitPath,
      hunks: parseUnifiedDiff(diff),
    }
  } catch (error) {
    if (error.code === 128) return null
    vscode.window.showErrorMessage(`לא ניתן לקרוא את השינויים מ-Git: ${error.message}`)
    return null
  }
}

/**
 * ממירה את מצב הסקירה הנשמר ב-workspaceState למפה נוחה לחיפוש.
 * מצב keep/undo קשור לנתיב ולמזהה התוכן, ולא משמש מקור הרשאה או אבטחה.
 */
function getReviewedMap(context) {
  return new Map(context.workspaceState.get(REVIEW_STATE_KEY, []))
}

/**
 * שומרת את מצב ההחלטה עבור hunk מסוים ומרעננת את תצוגת הקובץ.
 * Keep משאיר את הקוד כפי שהוא ומסיר את כפתורי הסקירה עבור אותו שינוי.
 */
async function keepHunk(context, document, hunkId) {
  const review = await getFileReview(document)
  if (!review) {
    vscode.window.showWarningMessage("לא נמצאו שינויי Git לסקירה בקובץ הזה.")
    return
  }

  const currentHunk = review.hunks.find((hunk) => getHunkId(hunk) === hunkId)
  if (!currentHunk) {
    vscode.window.showWarningMessage("השינוי השתנה מאז שהוצגה הסקירה. רענן את הפעולות ונסה שוב.")
    return
  }

  const reviewed = getReviewedMap(context)
  reviewed.set(`${review.gitPath}:${hunkId}`, "keep")
  await context.workspaceState.update(REVIEW_STATE_KEY, [...reviewed.entries()])
  await refreshEditor(context, vscode.window.activeTextEditor)
}

/**
 * מחליפה רק את השורות החדשות של hunk בשורות המקוריות מ-HEAD.
 * לפני העריכה נבדק שהתוכן בזיכרון עדיין תואם ל-diff; אם הקובץ נערך במקביל,
 * הפעולה נעצרת כדי לא לדרוס כתיבה חדשה. השינוי נשאר בעריכה לא שמורה של VS Code.
 */
async function undoHunk(context, document, hunkId) {
  const review = await getFileReview(document)
  if (!review) {
    vscode.window.showWarningMessage("לא ניתן לטעון את גרסת HEAD של הקובץ.")
    return
  }

  const hunk = review.hunks.find((candidate) => getHunkId(candidate) === hunkId)
  if (!hunk) {
    vscode.window.showWarningMessage("השינוי השתנה מאז שהוצגה הסקירה. רענן את הפעולות ונסה שוב.")
    return
  }

  const currentText = document.getText()
  const currentLines = currentText.split(/\r\n|\n|\r/u)
  const hasTrailingNewline = /(?:\r\n|\n|\r)$/u.test(currentText)
  if (hasTrailingNewline) currentLines.pop()

  const restoredLines = restoreHunkLines(currentLines, hunk)
  if (!restoredLines) {
    vscode.window.showWarningMessage("הקובץ מכיל עריכות שטרם נשמרו באזור הזה. שמור או בטל אותן ואז רענן.")
    return
  }

  let updatedText = restoredLines.join(document.eol === vscode.EndOfLine.CRLF ? "\r\n" : "\n")
  if (hasTrailingNewline) updatedText += document.eol === vscode.EndOfLine.CRLF ? "\r\n" : "\n"

  const edit = new vscode.WorkspaceEdit()
  edit.replace(document.uri, new vscode.Range(
    document.positionAt(0),
    document.positionAt(currentText.length),
  ), updatedText)
  const applied = await vscode.workspace.applyEdit(edit)
  if (!applied) {
    vscode.window.showErrorMessage("VS Code לא הצליח להחיל את ביטול ה-hunk.")
    return
  }

  const reviewed = getReviewedMap(context)
  reviewed.set(`${review.gitPath}:${hunkId}`, "undo")
  await context.workspaceState.update(REVIEW_STATE_KEY, [...reviewed.entries()])
  await refreshEditor(context, vscode.window.activeTextEditor)
}

/**
 * מעדכנת CodeLens והדגשה ירוקה עבור העורך הנוכחי.
 * CodeLens מספק את פעולות Keep/Undo ליד השינוי; Decoration מסמנת את שורות
 * התוספת. פעולות אלו הן סקירה מקומית ואינן משנות Git stage או commit.
 */
async function refreshEditor(context, editor, provider) {
  if (provider) provider.refresh()
  if (!editor || editor.document.uri.scheme !== "file") return

  const review = await getFileReview(editor.document)
  if (!review) {
    editor.setDecorations(context.decorationType, [])
    return
  }

  const reviewed = getReviewedMap(context)
  const ranges = []
  for (const hunk of review.hunks) {
    if (reviewed.get(`${review.gitPath}:${getHunkId(hunk)}`) === "undo") continue
    const start = hunk.newCount === 0 ? hunk.newStart : hunk.newStart - 1
    for (let offset = 0; offset < hunk.addedLines.length; offset += 1) {
      const line = start + offset
      if (line < editor.document.lineCount) {
        ranges.push(new vscode.Range(line, 0, line, editor.document.lineAt(line).text.length))
      }
    }
  }
  editor.setDecorations(context.decorationType, ranges)
}

/**
 * רושמת את ספק ה-CodeLens והפקודות של ההרחבה.
 * כל פונקציה/Disposable נרשמים ב-subscriptions כדי ש-VS Code ינקה אותם
 * בעת כיבוי ההרחבה ולא יישארו listeners או decorations יתומים.
 */
function activate(context) {
  const highlightColor = vscode.workspace.getConfiguration("gitHunkKeepUndo")
    .get("highlightColor", "rgba(46, 160, 67, 0.20)")
  context.decorationType = vscode.window.createTextEditorDecorationType({
    isWholeLine: true,
    backgroundColor: highlightColor,
    overviewRulerColor: "rgba(46, 160, 67, 0.85)",
    overviewRulerLane: vscode.OverviewRulerLane.Left,
    borderWidth: "0 0 0 3px",
    borderStyle: "solid",
    borderColor: "rgba(46, 160, 67, 0.95)",
  })

  const codeLensEmitter = new vscode.EventEmitter()
  const provider = {
    onDidChangeCodeLenses: codeLensEmitter.event,
    // CodeLensProvider דורש אירוע ייעודי כדי לבקש מ-VS Code חישוב CodeLens מחדש.
    refresh: () => codeLensEmitter.fire(),

    /**
     * יוצרת זוג פעולות לכל hunk שטרם סומן כ-Keep או Undo.
     * CodeLens מחושב מחדש באופן אסינכרוני כדי להציג מצב Git עדכני לקובץ.
     */
    async provideCodeLenses(document) {
      const review = await getFileReview(document)
      if (!review) return []

      const reviewed = getReviewedMap(context)
      const codeLenses = []
      for (const hunk of review.hunks) {
        const hunkId = getHunkId(hunk)
        const reviewKey = `${review.gitPath}:${hunkId}`
        if (reviewed.has(reviewKey)) continue

        const line = Math.max(0, Math.min(
          hunk.newCount === 0 ? hunk.newStart : hunk.newStart - 1,
          document.lineCount - 1,
        ))
        const range = new vscode.Range(line, 0, line, 0)
        const args = [document.uri.fsPath, hunkId]
        codeLenses.push(new vscode.CodeLens(range, {
          title: "$(check) Keep",
          command: "gitHunkKeepUndo.keepHunk",
          arguments: args,
          tooltip: "השאר את השינוי וסמן אותו כנסקר",
        }))
        codeLenses.push(new vscode.CodeLens(range, {
          title: "$(discard) Undo",
          command: "gitHunkKeepUndo.undoHunk",
          arguments: args,
          tooltip: "החזר רק את השינוי הזה לגרסת HEAD",
        }))
      }

      if (vscode.window.activeTextEditor?.document.uri.toString() === document.uri.toString()) {
        // מעדכנים רק הדגשות; אין להפעיל provider.refresh מתוך provideCodeLenses,
        // אחרת אירוע הרענון יגרום ל-VS Code לקרוא שוב לאותה פונקציה ללא סוף.
        await refreshEditor(context, vscode.window.activeTextEditor)
      }
      return codeLenses
    },
  }

  context.subscriptions.push(
    context.decorationType,
    codeLensEmitter,
    vscode.languages.registerCodeLensProvider({ scheme: "file" }, provider),
    // פקודת הרענון מחשבת מחדש גם את ההדגשות וגם את פעולות ה-CodeLens.
    vscode.commands.registerCommand("gitHunkKeepUndo.refresh", () =>
      refreshEditor(context, vscode.window.activeTextEditor, provider)),
    // פקודת Keep טוענת את הקובץ לפי הנתיב שקוד ה-CodeLens העביר, ואז שומרת את החלטת הסקירה.
    vscode.commands.registerCommand("gitHunkKeepUndo.keepHunk", async (filePath, hunkId) => {
      const document = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath))
      await keepHunk(context, document, hunkId)
      provider.refresh()
    }),
    // פקודת Undo מבטלת hunk יחיד; לאחר העדכון מרעננים CodeLens כדי להציג את ה-diff החדש.
    vscode.commands.registerCommand("gitHunkKeepUndo.undoHunk", async (filePath, hunkId) => {
      const document = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath))
      await undoHunk(context, document, hunkId)
      provider.refresh()
    }),
    // בעת החלפת קובץ פעיל, מציגים את הסקירה ששייכת למסמך החדש.
    vscode.window.onDidChangeActiveTextEditor((editor) => refreshEditor(context, editor, provider)),
    // שמירה עשויה לשנות את ה-diff מול HEAD, ולכן מחשבים מחדש את ההדגשות.
    vscode.workspace.onDidSaveTextDocument((document) => {
      if (vscode.window.activeTextEditor?.document.uri.toString() === document.uri.toString()) {
        void refreshEditor(context, vscode.window.activeTextEditor, provider)
      }
    }),
  )

  void refreshEditor(context, vscode.window.activeTextEditor, provider)
}

/**
 * נקודת כניסה של VS Code בעת כיבוי ההרחבה.
 * משאבי ההרחבה מנוהלים דרך context.subscriptions ולכן VS Code משחרר אותם.
 */
function deactivate() {}

module.exports = { activate, deactivate }
