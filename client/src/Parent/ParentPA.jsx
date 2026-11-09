import { useEffect, useState } from "react"
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../useAuth"
import Can from "../Can"
import { api, getErrorMessage } from "../api"

// האזור קורא את זהות ההורה מה-Context במקום לפרש נתונים מקומיים מהדפדפן.
function ParentPA() {
  const navigate = useNavigate()
  const location = useLocation()
  const { role, logout } = useAuth()
  const [childrenForSelection, setChildrenForSelection] = useState([])
  const [showChildSelection, setShowChildSelection] = useState(false)
  const [isLoadingChildren, setIsLoadingChildren] = useState(true)
  const [successMessage, setSuccessMessage] = useState("")
  const [childrenError, setChildrenError] = useState("")

  useEffect(() => {
    let active = true

    api.get("/child")
      .then(({ data }) => {
        if (!active) return
        setChildrenForSelection(data)
        setChildrenError(data.length === 0 ? "לא נמצאו ילדים המשויכים לחשבון ההורה." : "")
      })
      .catch((error) => {
        if (active) setChildrenError(getErrorMessage(error))
      })
      .finally(() => {
        if (active) setIsLoadingChildren(false)
      })

    return () => {
      active = false
    }
  }, [location.state?.refreshChildren])

  const signOut = () => {
    logout()
    navigate("/", { replace: true })
  }

  const toggleChildUpdate = () => {
    if (showChildSelection) {
      setShowChildSelection(false)
      return
    }

    setSuccessMessage("")
    if (childrenError) return
    if (childrenForSelection.length === 0) {
      setChildrenError("לא נמצאו ילדים המשויכים לחשבון ההורה.")
    } else if (childrenForSelection.length === 1) {
      navigate(`children/${childrenForSelection[0]._id}/edit`)
    } else {
      setShowChildSelection(true)
    }
  }

  return (
    <main className="page-shell parent-area-shell">
      <section className="auth-card parent-area-card" dir="rtl">
        <header className="parent-area-header">
          <h1>האזור האישי</h1>
          <p>התחברת בהצלחה ({role}). פרטי המשתמש נטענו לאחר אימות מול השרת.</p>
        </header>
        {(successMessage || location.state?.successMessage) && (
          <p className="form-message success-message" role="status">
            {successMessage || location.state.successMessage}
          </p>
        )}
        <Can role="parent">
          <nav className="parent-nav" aria-label="ניווט באזור האישי">
            <NavLink
              to="reg-child"
              className={({ isActive }) =>
                `parent-nav-link${isActive ? " active" : ""}`
              }
            >
              להרשמת ילד
            </NavLink>
            <NavLink
              to="parent-details"
              className={({ isActive }) =>
                `parent-nav-link${isActive ? " active" : ""}`
              }
            >
              עדכון פרטי הורה
            </NavLink>
            <NavLink
              to="events"
              className={({ isActive }) =>
                `parent-nav-link${isActive ? " active" : ""}`
              }
            >
              אירועים
            </NavLink>
            <button
              className="parent-nav-link"
              type="button"
              onClick={toggleChildUpdate}
              disabled={isLoadingChildren}
            >
              {isLoadingChildren ? "טוען ילדים..." : "עדכון פרטי ילד"}
            </button>
            <button className="parent-nav-link" type="button" onClick={signOut}>
              יציאה
            </button>
          </nav>
          {childrenError && <p className="form-message error-message" role="alert">{childrenError}</p>}
        </Can>
        {showChildSelection && (
          <div className="dialog-backdrop" onClick={() => setShowChildSelection(false)}>
            <section
              className="dialog-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="child-selection-heading"
              dir="rtl"
              onClick={(event) => event.stopPropagation()}
            >
              <h2 id="child-selection-heading">בחירת ילד לעדכון</h2>
              <p>בחרו את הילד שאת פרטיו תרצו לעדכן.</p>
              {childrenForSelection.map((child) => (
                <button
                  className="secondary-button"
                  type="button"
                  key={child._id}
                  onClick={() => {
                    setShowChildSelection(false)
                    navigate(`children/${child._id}/edit`)
                  }}
                >
                  {child.fullName}
                </button>
              ))}
              <button
                className="text-link"
                type="button"
                onClick={() => setShowChildSelection(false)}
              >
                ביטול
              </button>
            </section>
          </div>
        )}
        {/* מסכי־בן, כמו אירועים, מוצגים כאן לפי הנתיב ולא באמצעות state מקומי. */}
        <div className="parent-content">
          <Outlet
            context={{
              childrenForRegistration: childrenForSelection,
              childrenLoading: isLoadingChildren,
              childrenError,
              onChildUpdated: (updatedChild) => {
                setChildrenForSelection((current) => current.map((child) =>
                  child._id === updatedChild._id ? updatedChild : child
                ))
              },
              onRegistrationSuccess: (childName, eventName) => {
                setSuccessMessage(`ההרשמה של ${childName} לאירוע "${eventName}" הושלמה בהצלחה.`)
              },
            }}
          />
        </div>
      </section>
    </main>
  )
}

export default ParentPA
