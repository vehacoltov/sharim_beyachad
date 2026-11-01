import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { api, getErrorMessage } from "./api"
import { useAuth } from "./useAuth"

// לכל סוג חשבון מוגדר נתיב השרת ושדה הזיהוי המתאים לו.
const accountTypes = {
  parent: { label: "הורה", endpoint: "/parent/login", identifier: "id", prompt: "מספר זהות" },
  volunteer: {
    label: "מתנדב/ת",
    endpoint: "/volunteer/login",
    identifier: "userName",
    prompt: "דואר אלקטרוני או שם מלא",
  },
  employee: {
    label: "עובד/ת",
    endpoint: "/employee/login",
    identifier: "userName",
    prompt: "שם משתמש",
  },
}

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [accountType, setAccountType] = useState("parent")
  const [errorMessage, setErrorMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [registrationDialog, setRegistrationDialog] = useState("")
  const [authorizationPassword, setAuthorizationPassword] = useState("")

  /**
   * מעבירה פרטי כניסה ל-AuthContext, שמעדכן session רק לאחר תשובת שרת תקינה.
   * בהצלחה חוזרים לנתיב המקורי אם נשמר, אחרת לאזור האישי; finally משחרר
   * את מצב הטעינה גם אם השרת דחה את פרטי הכניסה.
   */
  const handleLogin = async (event) => {
    event.preventDefault()
    setErrorMessage("")
    setIsSubmitting(true)

    const values = new FormData(event.currentTarget)
    const account = accountTypes[accountType]
    const credentials = {
      [account.identifier]: values.get("identifier"),
      password: values.get("password"),
    }

    try {
      await login(accountType, account.endpoint, credentials)
      const destination = location.state?.from?.pathname || "/personal"
      navigate(destination, { replace: true })
    } catch (error) {
      // במקרה של חסימה, מציג את זמן ההמתנה שהשרת מחזיר.
      const retryAfter = error.response?.data?.retryAfterSeconds
      setErrorMessage(
        retryAfter
          ? `נחסמה הכניסה לאחר ניסיונות כושלים. אפשר לנסות שוב בעוד ${retryAfter} שניות.`
          : getErrorMessage(error),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  /**
   * סוגרת את חלונית ההרשמה ומנקה סיסמת גישה זמנית לפני מעבר למסך אחר,
   * כדי שהערך לא יישאר בטופס אם המשתמש יפתח אותו מחדש.
   */
  const openRegistration = (path) => {
    setRegistrationDialog("")
    setAuthorizationPassword("")
    navigate(path)
  }

  /**
   * בודקת מול השרת קוד הרשאה לעובד לפני הצגת טופס הרישום.
   * הבדיקה מיועדת לזרימת הממשק; השרת מאמת את ההרשאה שוב בזמן יצירת העובד.
   */
  const verifyEmployeeAccess = async (event) => {
    event.preventDefault()
    setErrorMessage("")
    setIsSubmitting(true)
    try {
      await api.post("/permission/verify-employee-access", { password: authorizationPassword })
      openRegistration("/register/employee")
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  const account = accountTypes[accountType]

  // מסך ההתחברות מאפשר לבחור סוג משתמש ומציג קישור לפתיחת אפשרויות הרשמה.
  return (
    <main className="page-shell">
      <form className="auth-card" onSubmit={handleLogin} dir="rtl">
        <h1>התחברות</h1>
        {location.state?.message && (
          <p className="form-message success-message" role="status">{location.state.message}</p>
        )}
        <div className="form-field">
          <label htmlFor="accountType">סוג חשבון</label>
          <select
            id="accountType"
            value={accountType}
            onChange={(event) => setAccountType(event.target.value)}
          >
            {Object.entries(accountTypes).map(([value, option]) => (
              <option value={value} key={value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="identifier">{account.prompt}</label>
          <input
            id="identifier"
            name="identifier"
            type="text"
            autoComplete="username"
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="password">סיסמה</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        {errorMessage && <p className="form-message error-message" role="alert">{errorMessage}</p>}
        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "מתחבר..." : "כניסה לאזור האישי"}
        </button>
        <button
          className="text-link"
          type="button"
          onClick={() => {
            setErrorMessage("")
            setRegistrationDialog("choose")
          }}
        >
          עדיין לא רשום/ה במערכת?
        </button>
      </form>

      {/* החלונית מציעה רישום הורה ומתנדב, או בדיקת הרשאה לעובד. */}
      {registrationDialog && (
        <div className="dialog-backdrop" onClick={() => setRegistrationDialog("")}>
          <section
            className="dialog-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="registration-title"
            dir="rtl"
            onClick={(event) => event.stopPropagation()}
          >
            {registrationDialog === "choose" ? (
              <>
                <h2 id="registration-title">בחירת סוג הרשמה</h2>
                <button className="secondary-button" onClick={() => openRegistration("/register/parent")}>
                  הרשמה בתור הורה
                </button>
                <button className="secondary-button" onClick={() => openRegistration("/register/volunteer")}>
                  הרשמה בתור מתנדב/ת
                </button>
                <button
                  className="secondary-button"
                  onClick={() => {
                    setErrorMessage("")
                    setRegistrationDialog("employee")
                  }}
                >
                  הרשמה בתור עובד/ת
                </button>
              </>
            ) : (
              <form onSubmit={verifyEmployeeAccess}>
                <h2 id="registration-title">בדיקת הרשאת עובד</h2>
                <div className="form-field">
                  <label htmlFor="authorizationPassword">הכניסו סיסמה להרשאת גישה</label>
                  <input
                    id="authorizationPassword"
                    type="password"
                    autoComplete="off"
                    value={authorizationPassword}
                    onChange={(event) => setAuthorizationPassword(event.target.value)}
                    required
                  />
                </div>
                {errorMessage && <p className="form-message error-message" role="alert">{errorMessage}</p>}
                <button className="primary-button" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "בודק..." : "אישור"}
                </button>
                <button className="text-link" type="button" onClick={() => setRegistrationDialog("choose")}>
                  חזרה לבחירת הרשמה
                </button>
              </form>
            )}
            <button className="dialog-close" type="button" aria-label="סגירה" onClick={() => setRegistrationDialog("")}>
              ×
            </button>
          </section>
        </div>
      )}
    </main>
  )
}

export default Login
