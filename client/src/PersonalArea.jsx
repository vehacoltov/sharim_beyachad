import EmployeePA from "./Employee/EmployeePA"
import ParentPA from "./Parent/ParentPA"
import VolunteerPA from "./Volunteer/VolunteerPA"
import { useAuth } from "./useAuth"

/**
 * בוחר את מעטפת האזור האישי לפי role שטען AuthContext מ-/auth/me או מהתחברות.
 * כל מעטפת אחראית לניווט ולפריסה של התפקיד שלה. היא אינה מחליפה את
 * ProtectedRoute: זו בחירת תצוגה, בעוד שה-guard הוא זה שמונע גישה לנתיב.
 */
function PersonalArea() {
  const { role } = useAuth()

  if (role === "parent") {
    return <ParentPA />
  }

  if (role === "employee") {
    return <EmployeePA />
  }

  if (role === "volunteer") {
    return <VolunteerPA />
  }

  return (
    <main className="page-shell">
      <section className="auth-card" dir="rtl">
        <h1>האזור האישי</h1>
        <p>סוג החשבון אינו מוכר. יש להתחבר מחדש.</p>
      </section>
    </main>
  )
}

export default PersonalArea
