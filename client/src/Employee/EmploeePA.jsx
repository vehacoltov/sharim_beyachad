const actionLabels = {
  permissions: "ניהול הרשאות",
  employees: "ניהול עובדים",
  events: "ניהול אירועים",
  matching: "שידוך ילדים ומתנדבים",
  registation: "רישום עובדים",
}

const EmploeePA = ({ user, onSignOut }) => {
  const validActions = Array.isArray(user?.validActions) ? user.validActions : []

  return (
    <main className="page-shell">
      <section className="auth-card" dir="rtl">
        <h1>האזור האישי לעובד</h1>
        <p>ההרשאות הפעילות בחשבון:</p>
        {validActions.length > 0 ? (
          <ul>
            {validActions.map((action) => (
              <li key={action}>{actionLabels[action] || action}</li>
            ))}
          </ul>
        ) : (
          <p>לא הוגדרו פעולות מורשות לחשבון.</p>
        )}
        <button className="primary-button" type="button" onClick={onSignOut}>יציאה</button>
      </section>
    </main>
  );
}

export default EmploeePA