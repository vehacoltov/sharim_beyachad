/*
 * תצורת טופס הילד מתרגמת את שדות Child לשדות UI בלבד; Mongoose נשאר מקור
 * הסופי לדרישות ול-enum. img מועבר כקובץ בתוך multipart ולא כמחרוזת שם.
 * הסתרת employee-only לפי localStorage היא UX בלבד: אין להסתמך עליה כהגנת API.
 */
import RegistrationForm from "./RegistrationForm"

const fields = [
  { name: "fullName", label: "שם מלא", type: "text", autoComplete: "name", required: true, requiredMessage: "יש להזין שם מלא." },
  { name: "id", label: "מספר זהות", type: "text", autoComplete: "off" },
  { name: "phone", label: "טלפון", type: "tel", autoComplete: "tel", required: true, requiredMessage: "יש להזין מספר טלפון." },
  { name: "anothwrPhone", label: "טלפון נוסף", type: "tel", autoComplete: "tel" },
  { name: "age", label: "גיל", type: "number", min: 0, step: 1 },
  { name: "epilepsy", label: "אפילפסיה", type: "text", autoComplete: "off" },
  { name: "sensitivity", label: "רגישויות או אלרגיות", type: "text", autoComplete: "off" },
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

function RegChild({ parent_Id }) {
  const accountType = localStorage.getItem("accountType")
  let loggedInParentId = parent_Id

  if (!loggedInParentId) {
    try {
      const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser") || "null")
      loggedInParentId = loggedInUser?._id || loggedInUser?.id
    } catch {
      loggedInParentId = undefined
    }
  }
  const visibleFields = fields.filter((field) =>
    !["status", "category", "notes"].includes(field.name) || accountType === "employee"
  )

  return (
    <RegistrationForm
      
      title="הרשמת ילד/ה"
      endpoint="/child"
      submitEndpoint="/child"
      fields={visibleFields}
      hiddenValues={loggedInParentId ? { parent: loggedInParentId } : {}}
    />
  )
}

export default RegChild
