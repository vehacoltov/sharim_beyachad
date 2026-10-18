import { Navigate, useNavigate } from "react-router-dom"

// מסך היעד לאחר התחברות; נדרשים אסימון ופרטי משתמש ששמורים בדפדפן.
function PersonalArea() {
  const navigate = useNavigate()
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
        <button className="primary-button" type="button" onClick={signOut}>יציאה</button>
      </section>
    </main>
  )
}

export default PersonalArea
