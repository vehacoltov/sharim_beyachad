import { useState } from "react"
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../useAuth"
import Can from "../Can"
import AddEvent from "../Event/AddEvent"
import AllEvents from "../Event/AllEvents"

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
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [showAllEvents, setShowAllEvents] = useState(false)
  const signOut = () => {
    logout()
    navigate("/", { replace: true })
  }

  return (
    <main className="page-shell">
      <section className="auth-card" dir="rtl">
        <h1>האזור האישי לעובד</h1>
        {location.state?.successMessage && (
          <p className="form-message success-message" role="status">
            {location.state.successMessage}
          </p>
        )}
        <nav className="parent-nav" aria-label="ניווט באזור האישי לעובד">
          <NavLink
            to="employee-details"
            className={({ isActive }) =>
              `parent-nav-link${isActive ? " active" : ""}`
            }
          >
            עדכון פרטים אישיים
          </NavLink>
        </nav>
        <Outlet />
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
        <Can permission="events">
          {!showAddEvent && (
            <button
              className="primary-button"
              type="button"
              onClick={() => setShowAddEvent(!showAddEvent)}
            >
              הוסף אירוע
            </button>
          )}


          <button
            className="primary-button"
            type="button"
            onClick={() => setShowAllEvents(!showAllEvents)}
          >
            כל האירועים
          </button>


          <NavLink
            to="employee-details"
            className={({ isActive }) =>
              `parent-nav-link${isActive ? " active" : ""}`
            }
          >
            עדכון פרטים אישיים
          </NavLink>

        </Can>
        {showAddEvent && <AddEvent onClose={() => setShowAddEvent(false)} />}
        {showAllEvents && <AllEvents />}
        {/* onClose={() => setShowAllEvents(false)} />} */}
        <button className="primary-button" type="button" onClick={signOut}>יציאה</button>
      </section>
    </main>
  );
}

export default EmployeePA