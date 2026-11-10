import { Outlet, useLocation, useNavigate, NavLink } from "react-router-dom"
import { useAuth } from "../useAuth"
import Can from "../Can"

const actionLabels = {
  permissions: "ניהול הרשאות",
  employees: "ניהול עובדים",
  events: "ניהול אירועים",
  matching: "שידוך ילדים ומתנדבים",
  registation: "רישום עובדים",
  payments: "ניהול תשלומים",
}

const EmployeePA = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { permissions, logout } = useAuth()
  const signOut = () => {
    logout()
    navigate("/", { replace: true })
  }
  const returnToEmployeeHome = () => {
    // במסך /personal כפתור הבית כבר נמצא בדף הבית; בנתיב משנה חוזרים לנתיב הבסיס.
    if (location.pathname.startsWith("/EmployeePA/")) {
      navigate("/EmployeePA", { replace: true })
    }
  }

  return (
    <main className="page-shell" >
      <section className="auth-card" dir="rtl">
        <button
          className="employee-home-button"
          type="button"
          aria-label="חזרה לדף הבית של עובד"
          title="חזרה לדף הבית של עובד"
          onClick={returnToEmployeeHome}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-6v-7h-4v7H4a1 1 0 0 1-1-1V10Z" />
          </svg>
        </button>
        <h1>האזור האישי לעובד</h1>
        {location.state?.successMessage && (
          <p className="form-message success-message" role="status">
            {location.state.successMessage}
          </p>
        )}
        <nav className="parent-nav" aria-label="ניווט באזור האישי לעובד">
          <NavLink
            to="/personal/employee-details"
            className={({ isActive }) =>
              `parent-nav-link${isActive ? " active" : ""}`
            }
          >
            עדכון פרטים אישיים
          </NavLink>
          <NavLink
            to="/personal/all-events"
            className={({ isActive }) =>
              `parent-nav-link${isActive ? " active" : ""}`
            }
          >
            כל האירועים
          </NavLink>
          <Can permission="events">
            <NavLink
              to="/personal/add-event"
              className={({ isActive }) =>
                `parent-nav-link${isActive ? " active" : ""}`
              }
            >
              הוסף אירוע
            </NavLink>
          </Can>
          <button className="parent-nav-link" type="button" onClick={signOut}>
            יציאה
          </button>
        </nav>
        <Can permission="permissions">
          <p>חשבון זה כולל הרשאות ניהול.</p>
        </Can>
        <p>ההרשאות הפעילות בחשבון:</p>
        {permissions.length > 0 ? (
          <ul>
            {permissions.map((action) => (
              <Can permission={action} key={action}>
                <li>{actionLabels[action] || action}</li>
              </Can>
            ))}
          </ul>
        ) : (
          <p>לא הוגדרו פעולות מורשות לחשבון.</p>
        )}

        <Outlet />
      </section>
    </main >
  )

}
export default EmployeePA