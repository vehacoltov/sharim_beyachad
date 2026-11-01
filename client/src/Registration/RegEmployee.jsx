import RegistrationForm from "./RegistrationForm"

// שדות העובד ממופים לסכמת Employee; סיסמת ההרשאה משמשת לאימות בלבד.
// בדיקות validate רצות בטופס לפני שליחה; השרת מבצע את אותן בדיקות מחדש
// כדי למנוע עקיפה באמצעות קריאת API שאינה עוברת דרך ממשק המשתמש.
const fields = [
  // פרטים בסיסיים של העובד; שם מלא, מספר זהות ושם משתמש נדרשים במודל.
  {
    name: "fullName",
    label: "שם מלא",
    type: "text",
    autoComplete: "name",
    required: true,
    requiredMessage: "יש להזין שם מלא בעברית.",
    validate: (value) => /^ *[א-ת]+(?: +[א-ת]+)* *$/u.test(value),
    validationMessage: "השם המלא יכול להכיל אותיות בעברית ורווחים בלבד.",
  },
  {
    name: "id",
    label: "מספר זהות",
    type: "text",
    autoComplete: "off",
    required: true,
    validate: (value) => /^\d{9}$/u.test(value),
    validationMessage: "מספר הזהות חייב להכיל בדיוק 9 ספרות.",
  },
  {
    name: "phone",
    label: "טלפון",
    type: "tel",
    autoComplete: "tel",
    required: true,
    requiredMessage: "יש להזין מספר טלפון המתחיל ב-0.",
    validate: (value) => /^0\d{8,9}$/u.test(value),
    validationMessage: "מספר הטלפון חייב להכיל 9 או 10 ספרות ולהתחיל ב-0.",
  },
  { name: "userName", label: "שם משתמש", type: "text", autoComplete: "username", required: true },
  // סיסמת חשבון העובד נדרשת ונשמרת כ-hash נפרד מסיסמת ההרשאה.
  {
    name: "password",
    label: "סיסמה לחשבון",
    type: "password",
    autoComplete: "new-password",
    required: true,
    requiredMessage: "יש להזין סיסמה.",
    hint: "הסיסמה צריכה לכלול לפחות 8 תווים, לפחות אות אחת ולפחות ספרה אחת.",
    // נדרשים יחד אורך מינימלי, אות עברית/אנגלית וספרה; אין להסתפק בתנאי יחיד.
    validate: (value) =>
      value.length >= 8 &&
      /[A-Za-zא-ת]/u.test(value) &&
      /\d/u.test(value),
    validationMessage: "הסיסמה חייבת להכיל לפחות 8 תווים, לפחות אות אחת בעברית או באנגלית ולפחות ספרה אחת.",
  },
  // השרת בודק את הסיסמה מול מודל Permission ואינו שומר אותה בעובד.
  {
    name: "authorizationPassword",
    label: "סיסמה להרשאת גישה",
    type: "password",
    autoComplete: "off",
    required: true,
  },
]

function RegEmployee() {
  // השרת מאמת מחדש את סיסמת ההרשאה ואינו שומר אותה ברשומת העובד.
  return (
    <RegistrationForm
      title="הרשמת עובד/ת"
      endpoint="/employee"
      fields={fields}
      verifyEmployeeAccess
    />
  )
}

export default RegEmployee
