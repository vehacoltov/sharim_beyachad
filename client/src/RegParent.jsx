import RegistrationForm from "./RegistrationForm"

// שדות ההורה ממופים לסכמת Parent; מזהה וסיסמה נדרשים במודל.
const fields = [
  // מזהה הורה הוא שדה חובה וייחודי במודל, ומשמש גם להתחברות.
  { name: "id", label: "מספר זהות", type: "text", autoComplete: "off", required: true },
  // כתובת הדוא"ל נדרשת בטופס ונשמרת בשדה email של ההורה.
  { name: "email", label: "דואר אלקטרוני", type: "email", autoComplete: "email", required: true },
  // סיסמת החשבון נדרשת לרישום ונשמרת בשרת כ-bcrypt hash.
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
  // מזהי הילדים אינם חובה; הטופס שולח אותם כמערך של ObjectId.
  {
    name: "children",
    label: "מזהי ילדים (אופציונלי)",
    type: "children",
    placeholder: "מזהי MongoDB מופרדים בפסיקים",
    help: "אפשר להשאיר ריק ולהוסיף ילדים בהמשך.",
  },
]

function RegParent() {
  // הטופס רושם הורה לנתיב /parent/register.
  return (
    <RegistrationForm
      title="הרשמת הורה"
      endpoint="/parent"
      fields={fields}
    />
  )
}

export default RegParent
