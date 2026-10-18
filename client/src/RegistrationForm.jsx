import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { api, getErrorMessage } from "./api"

// טופס הרשמה משותף להורה, מתנדב ועובד; כל מסך מעביר לו את השדות והנתיב שלו.
function RegistrationForm({ title, endpoint, fields, verifyEmployeeAccess = false }) {
  const navigate = useNavigate()
  const [errorMessage, setErrorMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // בודק את הטופס, ממיר שדות מיוחדים ושולח את פרטי הרישום לשרת.
  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage("")
    setIsSubmitting(true)

    // אוסף את הערכים לפי שמות השדות כדי להתאים למבנה מודל Mongoose.
    const formData = new FormData(event.currentTarget)
    const values = Object.fromEntries(formData.entries())

    // שדות מספריים נשמרים כמספרים, ומזהי ילדים מומר למערך מופרד בפסיקים.
    for (const field of fields) {
      if (field.type === "number") {
        if (values[field.name] === "") {
          delete values[field.name]
        } else {
          values[field.name] = Number(values[field.name])
        }
      }
      if (field.type === "children") {
        values.children = values.children
          ? values.children.split(",").map((id) => id.trim()).filter(Boolean)
          : []
      }
    }

    try {
      // הרשמת עובד נבדקת מראש ומאומתת שוב בשרת בזמן יצירת החשבון.
      if (verifyEmployeeAccess) {
        await api.post("/permission/verify-employee-access", {
          password: values.authorizationPassword,
        })
      }
      // שולח את הנתונים לנתיב הרישום המתאים לסוג המשתמש.
      await api.post(`${endpoint}/register`, values)
      navigate("/", { state: { message: "ההרשמה הושלמה. אפשר להתחבר למערכת." } })
    } catch (error) {
      // מציג למשתמש שגיאות שרת, כגון ערך ייחודי שכבר קיים או הרשאה חסרה.
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  // הטופס מציג את השדות שהוגדרו לקומפוננטת ההרשמה המסוימת.
  return (
    <main className="page-shell">
      <form className="auth-card registration-card" onSubmit={handleSubmit} dir="rtl">
        <h1>{title}</h1>
        {fields.map((field) => (
          <div className="form-field" key={field.name}>
            <label htmlFor={field.name}>{field.label}</label>
            <input
              id={field.name}
              name={field.name}
              type={field.type === "children" ? "text" : field.type}
              autoComplete={field.autoComplete}
              required={field.required}
              min={field.min}
              max={field.max}
              step={field.step}
              placeholder={field.placeholder}
            />
            {field.help && <small>{field.help}</small>}
          </div>
        ))}
        {errorMessage && <p className="form-message error-message" role="alert">{errorMessage}</p>}
        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "שולח..." : "אישור הרשמה"}
        </button>
        <button className="text-link" type="button" onClick={() => navigate("/")}>
          חזרה להתחברות
        </button>
      </form>
    </main>
  )
}

export default RegistrationForm
