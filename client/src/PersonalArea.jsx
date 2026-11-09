import EmployeePA from "./Employee/EmployeePA"
import VolunteerPA from "./Volunteer/VolunteerPA"
import { useAuth } from "./useAuth"
import { Outlet } from "react-router-dom"

// מחלק את האזור האישי לפי סוג החשבון שהשרת אימת וה-Context טען.
function PersonalArea() {
  const { role } = useAuth()

  if (role === "parent") {
    return <Outlet />
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
