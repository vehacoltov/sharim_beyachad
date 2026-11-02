/*
 * תצורת טופס הילד מתרגמת את שדות Child לשדות UI בלבד; Mongoose נשאר מקור
 * הסופי לדרישות ול-enum. img מועבר כקובץ בתוך multipart ולא כמחרוזת שם.
 * שדות צוות מוסתרים לפי AuthContext לצורכי UX בלבד; השרת אוכף גישה ושייכות.
 */
import RegistrationForm from "../Registration/RegistrationForm"
import { useAuth } from "../useAuth"

export const childFields = [
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
  {
    name: "id",
    label: "מספר זהות",
    type: "text",
    autoComplete: "off",
    required: true,
    requiredMessage: "יש להזין מספר זהות.",
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
  {
    name: "anothwrPhone",
    label: "טלפון נוסף",
    type: "tel",
    autoComplete: "tel",
    validate: (value) => /^0\d{8,9}$/u.test(value),
    validationMessage: "מספר הטלפון הנוסף חייב להכיל 9 או 10 ספרות ולהתחיל ב-0.",
  },
  { name: "age", label: "גיל", type: "number", min: 0, step: 1 },
  { name: "epilepsy", label: "האם יש לילד/ה אפילפסיה,אם כן פרט/י", type: "text", autoComplete: "off" },
  { name: "sensitivity", label: "האם יש לילד/ה רגישויות או אלרגיות, אם כן פרט/י", type: "text", autoComplete: "off" },
  { name: "medicines", label: "תרופות", type: "text", autoComplete: "off" },
  { name: "canBeFilemed", label: "הילד/ה יכול/ה להיות מצולם/ת", type: "boolean" },
  { name: "detailing", label: "פרטים נוספים", type: "text", autoComplete: "off" },
  { name: "notes", label: "הערות", type: "text", autoComplete: "off" },
  { name: "img", label: "תמונת הילד/ה", type: "file", accept: "image/*" },
  {
    name: "status",
    label: "סטטוס",
    type: "select",
    placeholder: "בחרו סטטוס",
    options: [
      { value: "undependent", label: "עצמאי" },
      { value: "needChangig", label: "זקוק לשינוי" },
      { value: "minHelping", label: "זקוק לעזרה מינימלית" },
    ],
  },
  {
    name: "category",
    label: "קטגוריות",
    type: "array",
    placeholder: "easy, ASD",
    help: "אפשרויות: easy, med, chalenged, ASD, down, mr",
  },
]

function RegChild({ setRegChild, onSuccess }) {
  const { user, role } = useAuth()
  const loggedInParentId = role === "parent" ? user?._id : undefined
  const visibleFields = childFields.filter((field) =>
    !["status", "category", "notes"].includes(field.name) || role === "employee"
  )

  return (
    <RegistrationForm
      setRegChild={setRegChild}
      title="הרשמת ילד/ה"
      endpoint="/child"
      submitEndpoint="/child"
      fields={visibleFields}
      hiddenValues={loggedInParentId ? { parent: loggedInParentId } : {}}
      onSuccess={onSuccess}
    />
  )
}

export default RegChild
