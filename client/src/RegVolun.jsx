import RegistrationForm from "./RegistrationForm"

// מציג את שדות המתנדב מהמודל, כולל שדות חובה ופרטים אופציונליים.
const fields = [
  // שם המתנדב נדרש וייחודי לפי סכמת Volunteer.
  { name: "fullName", label: "שם מלא", type: "text", autoComplete: "name", required: true },
  // דוא"ל ומספר זהות מזוהים כערכים ייחודיים בטופס ההרשמה.
  { name: "email", label: "דואר אלקטרוני", type: "email", autoComplete: "email", required: true },
  { name: "id", label: "מספר זהות", type: "text", autoComplete: "off", required: true },
  // הטלפון נדרש במודל ונשלח כמספר.
  { name: "phone", label: "טלפון", type: "number", autoComplete: "tel", required: true },
  // הגיל, הסמינר והפרטים הם שדות אופציונליים בסכמה.
  { name: "age", label: "גיל", type: "number", min: 0, step: 1 },
  { name: "seminar", label: "סמינר", type: "text" },
  { name: "detaling", label: "פרטים נוספים", type: "text" },
  // סיסמת החשבון נדרשת ונשמרת בשרת כ-bcrypt hash.
  {
    name: "password",
    label: "סיסמה",
    type: "password",
    autoComplete: "new-password",
    required: true,
  },
]

function RegVolun() {
  // הטופס רושם מתנדב לנתיב /volunteer/register.
  return (
    <RegistrationForm
      title="הרשמת מתנדב/ת"
      endpoint="/volunteer"
      fields={fields}
    />
  )
}

export default RegVolun
