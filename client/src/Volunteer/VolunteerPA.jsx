import { useNavigate } from "react-router-dom"
import { useAuth } from "../useAuth"
import Can from "../Can"

// מסך בסיסי למתנדב המציג את הזהות שאומתה מול השרת ומאפשר יציאה דרך מנגנון מרכזי.
function VolunteerPA() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const signOut = () => {
    logout()
    navigate("/", { replace: true })
  }

  return (
    <main className="page-shell">
      <section className="auth-card" dir="rtl">
        <h1>האזור האישי למתנדב/ת</h1>
        <Can role="volunteer">
          <p>שלום {user?.fullName || user?.email || "מתנדב/ת"}.</p>
        </Can>
        <button className="primary-button" type="button" onClick={signOut}>יציאה</button>
      </section>
    </main>
  )
}

export default VolunteerPA