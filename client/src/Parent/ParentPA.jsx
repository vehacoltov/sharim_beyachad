import { useState } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import RegChild from "../RegChild"

// מסך היעד לאחר התחברות; נדרשים אסימון ופרטי משתמש ששמורים בדפדפן.
function ParentPA() {
  const navigate = useNavigate()
  const [regChild, setRegChild] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const accessToken = localStorage.getItem("accessToken")
  // נתוני אחסון פגומים אינם מפילים את המסך, אלא מחייבים התחברות מחדש.
  let user = null
  try {
    user = JSON.parse(localStorage.getItem("loggedInUser") || "null")
  } catch {
    localStorage.removeItem("loggedInUser")
  }
  const accountType = localStorage.getItem("accountType")

  if (!accessToken || !user) {
    return <Navigate to="/" replace />
  }

  const parent_Id = user._id // מזהה ההורה שנשמר ב-localStorage לאחר התחברות

  // מסיר נתוני התחברות מקומיים ומחזיר את המשתמש למסך הכניסה.
  const signOut = () => {
    localStorage.removeItem("accessToken")
    localStorage.removeItem("loggedInUser")
    localStorage.removeItem("accountType")
    navigate("/", { replace: true })
  }

  return (
    <main className="page-shell">
      <section className="auth-card" dir="rtl">
        <h1>האזור האישי</h1>
        <p>התחברת בהצלחה ({accountType}).</p>
        <p>פרטי המשתמש נטענו לאחר אימות מול השרת.</p>
        {successMessage && <p className="form-message success-message" role="status">{successMessage}</p>}
        {!regChild && <button className="primary-button" type="button" onClick={() => { setSuccessMessage(""); setRegChild(true) }}>להרשמת ילד</button>}
        <button className="primary-button" type="button" onClick={signOut}>יציאה</button>
        {regChild && (
          <RegChild
            parent_Id={parent_Id}
            setRegChild={setRegChild}
            onSuccess={() => setSuccessMessage("רישום הילד הושלם בהצלחה.")}
          />
        )}
      </section>
    </main>
  )
}

export default ParentPA
