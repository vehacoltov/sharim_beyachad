import { useState } from "react"
import { useNavigate } from "react-router-dom"
import RegChild from "./RegChild"
import UpdateParent from "./UpdateParent"
import { useAuth } from "../useAuth"
import Can from "../Can"

// האזור קורא את זהות ההורה מה-Context במקום לפרש נתונים מקומיים מהדפדפן.
function ParentPA() {
  const navigate = useNavigate()
  const { role, logout } = useAuth()
  const [regChild, setRegChild] = useState(false)
  const [updatePar, setUpdatePar] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  const signOut = () => {
    logout()
    navigate("/", { replace: true })
  }

  return (
    <main className="page-shell">
      <section className="auth-card" dir="rtl">
        <h1>האזור האישי</h1>
        <p>התחברת בהצלחה ({role}).</p>
        <p>פרטי המשתמש נטענו לאחר אימות מול השרת.</p>
        {successMessage && <p className="form-message success-message" role="status">{successMessage}</p>}
        <Can role="parent">
          {!regChild && <button className="primary-button" type="button" onClick={() => { setSuccessMessage(""); setRegChild(true) }}>להרשמת ילד</button>}
          {!updatePar && <button className="primary-button" type="button" onClick={() => {setUpdatePar(true)}}>עדכון פרטי הורה</button>}
        </Can>
        <button className="primary-button" type="button" onClick={signOut}>יציאה</button>
        {regChild && (
          <RegChild
            setRegChild={setRegChild}
            onSuccess={() => setSuccessMessage("רישום הילד הושלם בהצלחה.")}
          />
        )}
        {updatePar && 
          <UpdateParent
            onCancel={() => setUpdatePar(false)}
            onSuccess={() => {
              setUpdatePar(false)
              setSuccessMessage("פרטי ההורה עודכנו בהצלחה.")
            }}
          />
        }
      </section>
    </main>
  )
}

export default ParentPA
