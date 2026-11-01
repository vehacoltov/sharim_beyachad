
import RegistrationForm from "./RegistrationForm"

/**
 * הגדרת השדות של טופס הרשמת הורה.
 *
 * כל אובייקט במערך מתאר שדה בטופס.
 * RegistrationForm מקבלת את המערך ויוצרת לפיו
 * את שדות הקלט ואת בדיקות התקינות.
 *
 * הגישה הזו מאפשרת להשתמש באותה קומפוננטה
 * עבור סוגי משתמשים שונים, בלי לשכפל את קוד הטופס.
 */
const fields = [
  {
    name: "id",
    label: "מספר זהות",
    type: "text",

    // מנחה את הדפדפן לא להציע מילוי אוטומטי
    autoComplete: "off",
    required: true,
    validate: (value) => /^\d{9}$/u.test(value),
    validationMessage: "מספר הזהות חייב להכיל בדיוק 9 ספרות.",
  },

  {
    name: "email",
    label: "דואר אלקטרוני",
    type: "email",

    // מאפשר לדפדפן להציע כתובות דוא"ל שמורות
    autoComplete: "email",
    required: true,
  },

  {
    name: "password",
    label: "סיסמה",
    type: "password",

    // מסמן לדפדפן שמדובר ביצירת סיסמה חדשה
    autoComplete: "new-password",
    required: true,

    // הודעה המיועדת למקרה שהשדה ריק
    requiredMessage: "יש להזין סיסמה.",

    // הנחיה שמוצגת למשתמש לגבי דרישות הסיסמה
    hint: "הסיסמה צריכה לכלול לפחות 6 תווים: אותיות וספרות",

    /**
     * validate היא פונקציית Callback.
     *
     * אנחנו לא מפעילים אותה כאן, אלא מעבירים אותה
     * כחלק מהגדרת השדה ל-RegistrationForm.
     *
     * RegistrationForm יכולה להפעיל אותה בזמן
     * בדיקת הקלט ולהעביר לה את ערך הסיסמה.
     *
     * הפונקציה מחזירה true רק אם מתקיימים
     * שלושת התנאים:
     *
     * 1. לפחות 6 תווים.
     * 2. לפחות אות אחת בעברית או באנגלית.
     * 3. לפחות ספרה אחת.
     *
     * RegExp.test(value) מחזירה ערך בוליאני
     * לפי השאלה האם נמצאה התאמה לביטוי הרגולרי.
     *
     * [A-Za-zא-ת] - טווח אותיות באנגלית ובעברית.
     * \d          - ספרה בין 0 ל-9.
     * u           - דגל Unicode בביטוי הרגולרי.
     */
    validate: (value) =>
      value.length >= 6 &&
      /[A-Za-zא-ת]/u.test(value) &&
      /\d/u.test(value),

    // הודעה במקרה שהפונקציה validate מחזירה false
    validationMessage:
      "הסיסמה צריכה לכלול לפחות 6 תווים, ובה אותיות וספרות.",
  },

  // {
  //   name: "children",
  //   label: "מזהי ילדים (אופציונלי)",

  //   /**
  //    * "children" הוא סוג שדה מותאם אישית,
  //    * ולא type סטנדרטי של HTML.
  //    *
  //    * לכן RegistrationForm צריכה להכיל
  //    * לוגיקה מיוחדת שמטפלת בשדה מסוג זה.
  //    *
  //    * לפי תכנון הטופס, אפשר להזין מספר
  //    * מזהי MongoDB המופרדים בפסיקים.
  //    */
  //   type: "children",

  //   placeholder: "מזהי MongoDB מופרדים בפסיקים",
  //   help: "אפשר להשאיר ריק ולהוסיף ילדים בהמשך.",
  // },
]


/**
 * קומפוננטת React פונקציונלית.
 *
 * RegParent אינה מנהלת בעצמה את מצב הטופס.
 * היא משתמשת בקומפוננטה כללית ומעבירה לה Props.
 *
 * Props הם נתונים שקומפוננטת אב מעבירה
 * לקומפוננטת בן.
 *
 * כאן מועברים:
 *
 * title    - כותרת הטופס.
 * endpoint - נתיב הבסיס של ה-API.
 * fields   - מערך הגדרות השדות.
 *
 * ההפרדה הזו מאפשרת ל-RegistrationForm
 * לטפל בניהול הקלט ובשליחה לשרת,
 * ול-RegParent להגדיר רק את מאפייני ההורה.
 */
function RegParent() {
  return (
    <RegistrationForm
      title="הרשמת הורה"
      endpoint="/parent"
      fields={fields}
    />
  )
}

// מאפשר לייבא את הקומפוננטה כ-Default Export
export default RegParent
