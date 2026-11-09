import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../useAuth"
import Can from "../Can"

// Layout למתנדבת: NavLink משנה נתיב בלי טעינת דף, ו-Outlet מציג את תוכן נתיב-הבן.
// הזהות והיציאה מגיעות מ-AuthContext ולא ממצב מקומי נפרד.
function VolunteerPA() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()

  const signOut = () => {
    logout()
    navigate("/", { replace: true })
  }

  return (
    <main className="page-shell parent-area-shell">
      <section className="auth-card parent-area-card" dir="rtl">
        <header className="parent-area-header">
          <h1>האזור האישי למתנדב/ת</h1>
          <Can role="volunteer">
            <p>שלום {user?.fullName || user?.email || "מתנדב/ת"}.</p>
          </Can>
        </header>
        {location.state?.successMessage && (
          <p className="form-message success-message" role="status">
            {location.state.successMessage}
          </p>
        )}
        <nav className="parent-nav" aria-label="ניווט באזור האישי">
          <NavLink
            to="events"
            className={({ isActive }) =>
              `parent-nav-link${isActive ? " active" : ""}`
            }
          >
            אירועים
          </NavLink>
          <NavLink
            to="volunteer-details"
            className={({ isActive }) =>
              `parent-nav-link${isActive ? " active" : ""}`
            }
          >
            עדכון פרטים אישיים
          </NavLink>
          <button className="parent-nav-link" type="button" onClick={signOut}>יציאה</button>
        </nav>
        <div className="parent-content">
          <Outlet />
        </div>
      </section>
    </main>
  )
}

export default VolunteerPA