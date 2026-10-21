import RegistrationForm from "./RegistrationForm"

// מציג את שדות המתנדב מהמודל, כולל שדות חובה ופרטים אופציונליים.
const fields = [
  // שם המתנדב נדרש וייחודי לפי סכמת Volunteer.
  {
    name: "fullName",
    label: "שם מלא",
    type: "text",
    autoComplete: "name",
    required: true,
    requiredMessage: "יש להזין שם מלא בעברית.",
    validate: (value) => /^[א-ת]+(?:\s[א-ת]+)*$/u.test(value.trim()),
    validationMessage: "השם המלא יכול להכיל אותיות בעברית ורווחים בלבד.",
  },
  // דוא"ל ומספר זהות מזוהים כערכים ייחודיים בטופס ההרשמה.
  { name: "email", label: "דואר אלקטרוני", type: "email", autoComplete: "email", required: true },
  { name: "id", label: "מספר זהות", type: "text", autoComplete: "off", required: true },
  // מספר טלפון הוא מחרוזת כדי לתמוך בקידומת 0 ואינו שדה מספרי.
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
  // הגיל, הסמינר והפרטים הם שדות אופציונליים בסכמה.
  { name: "age", label: "גיל", type: "number", min: 0, step: 1 },
  {
    name: "seminar",
    label: "סמינר",
    type: "text",
    validate: (value) => /^[א-ת]+(?:\s[א-ת]+)*$/u.test(value.trim()),
    validationMessage: "שם הסמינר יכול להכיל אותיות בעברית ורווחים בלבד.",
  },
  {
    name: "detaling",
    label: "פרטים נוספים",
    type: "text",
    validate: (value) => /^[א-ת\s\p{P}]+$/u.test(value),
    validationMessage: "הפרטים יכולים להכיל אותיות בעברית, רווחים וסימני פיסוק בלבד.",
  },
  // סיסמת החשבון נדרשת ונשמרת בשרת כ-bcrypt hash.
  {
    name: "password",
    label: "סיסמה",
    type: "password",
    autoComplete: "new-password",
    required: true,
    requiredMessage: "יש להזין סיסמה.",
    hint: "הסיסמה צריכה לכלול לפחות 6 תווים: אותיות וספרות",
    validate: (value) =>
      value.length >= 6 &&
      /[A-Za-zא-ת]/u.test(value) &&
      /\d/u.test(value),
    validationMessage: "הסיסמה צריכה לכלול לפחות 6 תווים, ובה אותיות וספרות.",
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
