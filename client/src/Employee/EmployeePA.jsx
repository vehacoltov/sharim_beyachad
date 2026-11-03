import { useState } from "react"
import { useNavigate } from "react-router-dom"
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
}

const EmployeePA = () => {
  const navigate = useNavigate()
  const { permissions, logout } = useAuth()
  const [showAddEvent, setShowAddEvent] = useState(false)
  const[showAllEvents,setShowAllEvents]=useState(false)
  const signOut = () => {
    logout()
    navigate("/", { replace: true })
  }

  return (
    <main className="page-shell">
      <section className="auth-card" dir="rtl">
        <h1>האזור האישי לעובד</h1>
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