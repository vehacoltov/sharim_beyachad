import { useNavigate } from "react-router-dom"
import { useAuth } from "../useAuth"
import Can from "../Can"

const actionLabels = {
  permissions: "ניהול הרשאות",
  employees: "ניהול עובדים",
  events: "ניהול אירועים",
  matching: "שידוך ילדים ומתנדבים",
  registation: "רישום עובדים",
}

const EmploeePA = () => {
  const navigate = useNavigate()
  const { permissions, logout } = useAuth()
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
        <button className="primary-button" type="button" onClick={signOut}>יציאה</button>
      </section>
    </main>
  );
}

export default EmploeePA