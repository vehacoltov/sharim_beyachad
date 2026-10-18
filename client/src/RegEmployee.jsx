import RegistrationForm from "./RegistrationForm"

// שדות העובד ממופים לסכמת Employee; סיסמת ההרשאה משמשת לאימות בלבד.
const fields = [
  // פרטים בסיסיים של העובד; שם מלא, מספר זהות ושם משתמש נדרשים במודל.
  { name: "fullName", label: "שם מלא", type: "text", autoComplete: "name", required: true },
  { name: "id", label: "מספר זהות", type: "text", autoComplete: "off", required: true },
  { name: "phone", label: "טלפון", type: "tel", autoComplete: "tel" },
  { name: "userName", label: "שם משתמש", type: "text", autoComplete: "username", required: true },
  // שעות העבודה אופציונליות; הסכמה מגדירה להן ברירת מחדל אפס.
  { name: "workingTime", label: "שעות עבודה", type: "number", min: 0, step: 0.1 },
  { name: "currentWorkingTime", label: "שעות עבודה נוכחיות", type: "number", min: 0, step: 0.1 },
  // סיסמת חשבון העובד נדרשת ונשמרת כ-hash נפרד מסיסמת ההרשאה.
  {
    name: "password",
    label: "סיסמה לחשבון",
    type: "password",
    autoComplete: "new-password",
    required: true,
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
