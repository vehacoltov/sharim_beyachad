
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { api, getErrorMessage } from "./api"

/**
 * קומפוננטת הרשמה כללית להורה, מתנדב ועובד.
 *
 * הקומפוננטה מקבלת Props:
 *
 * title - כותרת הטופס.
 * endpoint - נתיב הבסיס של סוג המשתמש.
 * fields - מערך הגדרות השדות.
 *
 * submitEndpoint - נתיב שליחה מותאם אישית.
 * אם הוא לא הועבר, משתמשים ב:
 * `${endpoint}/register`
 *
 * verifyEmployeeAccess - האם לבצע בדיקת הרשאת עובד
 * לפני שליחת ההרשמה.
 *
 * הערך false הוא ערך ברירת מחדל.
 *
 * הקומפוננטה היא Configuration-Driven:
 * היא יוצרת את הממשק לפי הגדרות fields,
 * במקום להגדיר בנפרד את כל שדות הטופס.
 */
function RegistrationForm({
  title,
  endpoint,
  fields,
  submitEndpoint,
  hiddenValues = {},
  verifyEmployeeAccess = false,
}) {

  // Hook של React Router המאפשר ניווט באמצעות קוד
  const navigate = useNavigate()

  /**
   * State - מידע שהקומפוננטה שומרת בין רינדורים.
   *
   * כל שינוי באמצעות פונקציית set המתאימה
   * גורם ל-React לתזמן רינדור מעודכן.
   */

  // הודעת שגיאה כללית, למשל שגיאה שהוחזרה מהשרת
  const [errorMessage, setErrorMessage] = useState("")

  // מציין האם מתבצעת כעת בקשת הרשמה
  const [isSubmitting, setIsSubmitting] = useState(false)

  /**
   * אובייקט של הודעות שגיאה לפי שמות השדות.
   *
   * לדוגמה:
   * {
   *   password: "סיסמה לא תקינה",
   *   email: "כתובת לא תקינה"
   * }
   */
  const [fieldErrors, setFieldErrors] = useState({})

  /**
   * אובייקט המתעד שדות שהמשתמש כבר יצא מהם
   * או שסומנו לבדיקה בעקבות ניסיון שליחה.
   *
   * לדוגמה:
   * {
   *   password: true,
   *   email: false
   * }
   *
   * מאפשר לדחות בדיקות בזמן הקלדה
   * עד שהשדה כבר נבדק לפחות פעם אחת.
   */
  const [touchedFields, setTouchedFields] = useState({})

  // תצוגה מקדימה מקומית נבנית מ-Object URL ולא מביאה רענון שרת או העלאה מוקדמת.
  const [filePreviews, setFilePreviews] = useState({})


  /**
   * ========================================================
   *                   getFieldError
   * ========================================================
   *
   * פונקציה כללית לבדיקת שדה.
   *
   * מקבלת את הגדרות השדה ואת ערכו,
   * ומחזירה הודעת שגיאה או מחרוזת ריקה.
   *
   * field.validate היא פונקציית Callback
   * שמגיעה מתוך הגדרות השדה.
   *
   * כך לכל שדה יכולה להיות בדיקת תקינות משלו,
   * בלי לשנות את הקומפוננטה הכללית.
   */
  const getFieldError = (field, value) => {

    // בדיקת שדה חובה; trim מסיר רווחים מהקצוות
    if (field.required && !value.trim()) {
      return field.requiredMessage || ""
    }

    /**
     * אין שגיאה אם:
     * - השדה ריק.
     * - לא הוגדרה לו פונקציית validate.
     * - פונקציית validate החזירה true.
     *
     * Short-Circuit Evaluation:
     * בביטוי עם ||, ברגע שתנאי מחזיר true,
     * שאר התנאים אינם נבדקים.
     *
     * לכן לא ננסה להפעיל field.validate
     * כאשר הפונקציה אינה קיימת.
     */
    if (!value.trim() || !field.validate || field.validate(value)) {
      return ""
    }

    return field.validationMessage
  }


  /**
   * ========================================================
   *                    handleSubmit
   * ========================================================
   *
   * Event Handler אסינכרוני שמטפל בשליחת הטופס.
   *
   * שלבי הפעולה:
   * 1. איסוף הנתונים באמצעות FormData.
   * 2. בדיקת תקינות כל השדות.
   * 3. המרת ערכים לטיפוסים המתאימים.
   * 4. בדיקת הרשאת עובד במקרה הצורך.
   * 5. שליחת הנתונים לשרת.
   * 6. ניווט לאחר הצלחה או הצגת שגיאה.
   */
  const handleSubmit = async (event) => {

    // מונע את פעולת השליחה הרגילה של הדפדפן
    event.preventDefault()

    setErrorMessage("")

    /**
     * FormData אוספת את ערכי השדות מתוך ה-form.
     *
     * event.currentTarget הוא האלמנט שעליו
     * הוגדר ה-Event Handler, כלומר ה-form.
     *
     * הערכים מזוהים לפי מאפיין name של כל input.
     */
    const formData = new FormData(event.currentTarget)

    /**
     * בדיקת תקינות של כל השדות.
     *
     * map:
     * מייצרת זוג [שם השדה, הודעת שגיאה]
     * עבור כל שדה.
     *
     * filter:
     * משאירה רק זוגות עם הודעת שגיאה.
     *
     * Object.fromEntries:
     * ממירה מערך זוגות לאובייקט.
     *
     * לדוגמה:
     * [
     *   ["password", "סיסמה לא תקינה"]
     * ]
     *
     * הופך ל:
     * {
     *   password: "סיסמה לא תקינה"
     * }
     */
    const validationErrors = Object.fromEntries(
      fields
        .map((field) => [
          field.name,
          getFieldError(
            field,
            String(formData.get(field.name) || "")
          ),
        ])
        .filter(([, message]) => message)
    )

    // אם נמצאו שגיאות, לא שולחים את הטופס
    if (Object.keys(validationErrors).length > 0) {

      setFieldErrors(validationErrors)

      /**
       * מסמנים את כל השדות כ-touched.
       *
       * כך לאחר ניסיון שליחה לא תקין,
       * אפשר להמשיך לעדכן את השגיאות
       * בזמן שהמשתמש מתקן את הערכים.
       */
      setTouchedFields(
        Object.fromEntries(
          fields.map((field) => [field.name, true])
        )
      )

      return
    }

    // מנטרל את כפתור השליחה עד לסיום הבקשה
    setIsSubmitting(true)

    /**
     * המרת FormData לאובייקט JavaScript.
     *
     * formData.entries() מחזירה זוגות:
     * [name, value]
     *
     * Object.fromEntries הופכת אותם לאובייקט.
     *
     * לדוגמה:
     * {
     *   email: "test@example.com",
     *   password: "abc123"
     * }
     */
    const values = Object.fromEntries(formData.entries())

    
/**
 * טיפול בשדות מסוג file לפני שליחת הנתונים לשרת.
 *
 * FormData מחזירה עבור input מסוג file אובייקט File,
 * המכיל מידע על הקובץ שנבחר.
 *
 * עוברים על הגדרות השדות ומאתרים שדות מסוג file.
 *
 * formData.get(field.name):
 * מחזירה את אובייקט ה-File של השדה.
 *
 * שדה קובץ נשמר כאובייקט File ולא כמחרוזת של שמו בלבד.
 * כך Multipart/FormData יכול להעביר את תוכן הקובץ לשרת,
 * ואילו axios מייצר את boundary הנדרש ללא הגדרת Content-Type ידנית.
 */
for (const field of fields) {
  if (field.type === "file") {
    const file = formData.get(field.name)
    if (file instanceof File && file.size > 0) values[field.name] = file
    else delete values[field.name]
  }
}



    /**
     * ========================================================
     *                המרת טיפוסי השדות
     * ========================================================
     *
     * FormData מחזירה ערכי input רגילים
     * כמחרוזות.
     *
     * לכן לפני השליחה לשרת ממירים
     * שדות מסוימים למספרים, מערכים או Boolean.
     */
    for (const field of fields) {

      /**
       * שדה מספרי:
       *
       * אם השדה ריק, מסירים אותו מהאובייקט.
       * אחרת ממירים את הערך למספר.
       *
       * Number("25") מחזיר 25.
       */
      if (field.type === "number") {
        if (values[field.name] === "") {
          delete values[field.name]
        } else {
          values[field.name] = Number(values[field.name])
        }
      }

      /**
       * שדה ילדים:
       *
       * מקבל מחרוזת של מזהים המופרדים בפסיקים
       * וממיר אותה למערך.
       *
       * split(",") - פיצול לפי פסיקים.
       * map - הסרת רווחים מכל מזהה.
       * filter(Boolean) - הסרת איברים ריקים.
       *
       * לדוגמה:
       * "id1, id2, , id3"
       *
       * יהפוך ל:
       * ["id1", "id2", "id3"]
       */
      if (field.type === "children") {
        values.children = values.children
          ? values.children
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean)
          : []
      }

      /**
       * שדה מסוג array - נוסף בגרסה המעודכנת.
       *
       * דומה לטיפול בשדה children,
       * אך פועל לפי השם הדינמי field.name.
       *
       * לכן אפשר להשתמש בו עבור שדות מערך שונים,
       * ולא רק עבור רשימת ילדים.
       *
       * לדוגמה:
       * field.name = "skills"
       *
       * הקלט:
       * "JavaScript, React, Node"
       *
       * יהפוך ל:
       * ["JavaScript", "React", "Node"]
       */
      if (field.type === "array") {
        const value = values[field.name]

        values[field.name] = value
          ? value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
          : []
      }

      /**
       * שדה Boolean - נוסף בגרסה המעודכנת.
       *
       * formData.has(name) בודקת האם
       * קיים שדה בשם הזה ב-FormData.
       *
       * היא מחזירה true או false.
       *
       * שימוש נפוץ:
       * Checkbox מסומן נכלל ב-FormData,
       * ו-Checkbox שאינו מסומן אינו נכלל.
       *
       * לכן ניתן להמיר את המצב לערך בוליאני.
       */
      if (field.type === "boolean") {
        values[field.name] = formData.has(field.name)
      }
    }

    // ערכים מערכתיים כגון מזהה הורה מתווספים לאחר המרות הטופס.
    Object.assign(values, hiddenValues)


    /**
     * ========================================================
     *                     שליחה לשרת
     * ========================================================
     *
     * try/catch/finally מאפשר לטפל
     * בבקשות אסינכרוניות ובשגיאות.
     */
    try {

      /**
       * אם נדרש אימות הרשאת עובד,
       * מבצעים בקשת POST נוספת לפני ההרשמה.
       *
       * await ממתין לסיום הבקשה.
       *
       * אם הבקשה נכשלת, עוברים ל-catch
       * ולא ממשיכים לשליחת ההרשמה.
       *
       * האימות הסופי חייב להתבצע גם בשרת
       * בזמן יצירת החשבון.
       */
      if (verifyEmployeeAccess) {
        await api.post("/permission/verify-employee-access", {
          password: values.authorizationPassword,
        })
      }

      /**
       * שליחת בקשת ההרשמה.
       *
       * submitEndpoint || `${endpoint}/register`
       *
       * מאפשר לבחור בין שני נתיבים:
       *
       * 1. אם הועבר submitEndpoint שאינו ריק,
       *    משתמשים בו.
       *
       * 2. אחרת בונים נתיב ברירת מחדל
       *    באמצעות endpoint.
       *
       * לדוגמה:
       * endpoint = "/parent"
       *
       * הנתיב יהיה:
       * /parent/register
       *
       * זה מאפשר שימוש חוזר בטופס גם עבור
       * פעולות שהנתיב שלהן אינו מסתיים ב-register.
       */
      /*
       * קובץ מוחזק ב-File בתוך FormData, ולא נמיר את תוכנו ל-JSON או Text.
       * עבור טפסים ללא קובץ נשמר payload אובייקט JSON כמו בעבר.
       * Axios מוסיף multipart boundary, ולכן אין לקבוע Content-Type ידנית.
       */
      const hasFile = fields.some((field) => field.type === "file")
      let payload = values

      // FormData שומר שדות טקסט ומשתף את הקובץ עצמו כחלק multipart.
      // JSON רגיל נשאר ללא שינוי לטפסים שאין בהם קובץ.
      if (hasFile) {
        payload = new FormData()
        Object.entries(values).forEach(([name, value]) => {
          if (value instanceof File) payload.append(name, value)
          else if (Array.isArray(value)) payload.append(name, value.join(","))
          else if (value !== undefined && value !== null) payload.append(name, String(value))
        })
      }

      await api.post(
        submitEndpoint || `${endpoint}/register`,
        payload
      )

      /**
       * לאחר הצלחה עוברים למסך ההתחברות.
       *
       * state של React Router מאפשר להעביר
       * מידע למסך היעד בלי להוסיף אותו ל-URL.
       *
       * המסך הבא יכול לקרוא את ההודעה
       * באמצעות useLocation.
       */
      navigate("/", {
        state: {
          message: "ההרשמה הושלמה. אפשר להתחבר למערכת.",
        },
      })

    } catch (error) {

      /**
       * טיפול בשגיאות מהשרת.
       *
       * getErrorMessage מחלצת הודעה מתאימה
       * מתוך אובייקט השגיאה.
       *
       * שמירת ההודעה ב-State גורמת להצגתה בטופס.
       */
      setErrorMessage(getErrorMessage(error))

    } finally {

      /**
       * finally מתבצע גם בהצלחה וגם בכישלון.
       *
       * לכן הוא מתאים לאיפוס מצב השליחה,
       * כדי שהכפתור יחזור להיות פעיל.
       */
      setIsSubmitting(false)
    }
  }


  /**
   * ========================================================
   *                       JSX
   * ========================================================
   *
   * יצירת הטופס מתוך מערך הגדרות fields.
   *
   * כל שדה מוצג בהתאם למאפיינים שהוגדרו לו.
   * הודעות השגיאה מתעדכנות לפי ה-State.
   */
  return (
    <main className="page-shell">

      <form
        className="auth-card registration-card"
        onSubmit={handleSubmit}
        dir="rtl"
      >
        <h1>{title}</h1>

        {/*
          Dynamic Rendering:
          יצירת input עבור כל אובייקט במערך fields.

          key מאפשר ל-React לזהות אלמנטים
          באופן יציב בין רינדורים.
        */}
        {fields.map((field) => (
          <div className="form-field" key={field.name}>

            <label htmlFor={field.name}>
              {field.label}
            </label>

            {/* הצגת הנחיה אם הוגדרה */}
            {field.hint && <small>{field.hint}</small>}

            {/*
              השדה children אינו סוג HTML מובנה,
              ולכן מוצג כ-input מסוג text.

              שאר סוגי השדות מועברים כפי שהוגדרו.
            */}
            <input
              id={field.name}
              name={field.name}
              type={
                field.type === "children" || field.type === "array"
                  ? "text"
                  : field.type === "boolean"
                    ? "checkbox"
                    : field.type
              } autoComplete={field.autoComplete}
              accept={field.accept}
              required={field.required}
              min={field.min}
              max={field.max}
              step={field.step}
              placeholder={field.placeholder}

              aria-invalid={
                fieldErrors[field.name] ? "true" : undefined
              }
              aria-describedby={
                fieldErrors[field.name]
                  ? `${field.name}-error`
                  : undefined
              }

              /*
               * onBlur מופעל כשהמשתמש יוצא מהשדה.
               *
               * Functional State Update:
               * העדכון מתבסס על ה-State הקודם.
               *
               * ...current משמר את שאר השדות,
               * ו-[field.name] הוא מפתח דינמי
               * המתייחס לשדה הנוכחי.
               */
              onBlur={(event) => {
                const value = event.currentTarget.value

                setTouchedFields((current) => ({
                  ...current,
                  [field.name]: true,
                }))

                setFieldErrors((current) => ({
                  ...current,
                  [field.name]: getFieldError(field, value),
                }))
              }}

              /*
               * onChange מופעל בכל שינוי של הקלט.
               *
               * בודקים מחדש רק שדות שכבר סומנו
               * כ-touched.
               *
               * הערך נשמר במשתנה לפני עדכון ה-State.
               */
              onChange={(event) => {
                const value = event.target.value

                if (field.type === "file") {
                  const file = event.target.files?.[0]
                  setFilePreviews((current) => {
                    if (current[field.name]) URL.revokeObjectURL(current[field.name])
                    return {
                      ...current,
                      [field.name]: file?.type.startsWith("image/")
                        ? URL.createObjectURL(file)
                        : undefined,
                    }
                  })
                }

                if (touchedFields[field.name]) {
                  setFieldErrors((current) => ({
                    ...current,
                    [field.name]: getFieldError(field, value),
                  }))
                }
              }}

              /*
               * onInvalid מופעל כאשר הדפדפן
               * מזהה שהקלט אינו תקין לפי HTML,
               * למשל שדה required ריק.
               */
              onInvalid={() => {
                setTouchedFields((current) => ({
                  ...current,
                  [field.name]: true,
                }))

                setFieldErrors((current) => ({
                  ...current,
                  [field.name]: getFieldError(field, ""),
                }))
              }}
            />

            {/* Preview מקומי מונע הצגת שם הקובץ במקום התמונה עצמה. */}
            {field.type === "file" && filePreviews[field.name] && (
              <img
                className="file-preview"
                src={filePreviews[field.name]}
                alt="תצוגה מקדימה של התמונה שנבחרה"
              />
            )}

            {field.help && <small>{field.help}</small>}

            {/*
              Conditional Rendering:
              הודעת השגיאה מוצגת רק אם קיימת.

              aria-describedby של ה-input
              מפנה למזהה של הודעת השגיאה.

              role="alert" מסייע בהנגשת ההודעה.
            */}
            {fieldErrors[field.name] && (
              <small
                id={`${field.name}-error`}
                className="error-message"
                role="alert"
              >
                {fieldErrors[field.name]}
              </small>
            )}

          </div>
        ))}

        {/* הודעת שגיאה כללית מהשרת */}
        {errorMessage && (
          <p
            className="form-message error-message"
            role="alert"
          >
            {errorMessage}
          </p>
        )}

        {/*
          בזמן שליחה הכפתור מנוטרל.
          הטקסט משתנה בהתאם ל-isSubmitting.
        */}
        <button
          className="primary-button"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "שולח..." : "אישור הרשמה"}
        </button>

        {/* כפתור ניווט שאינו שולח את הטופס */}
        <button
          className="text-link"
          type="button"
          onClick={() => navigate("/")}
        >
          חזרה להתחברות
        </button>

      </form>
    </main>
  )
}

export default RegistrationForm
