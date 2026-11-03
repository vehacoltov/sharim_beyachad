import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import RegChild from "./RegChild"
import UpdateParent from "./UpdateParent"
import UpdateChild from "./UpdateChild"
import { useAuth } from "../useAuth"
import Can from "../Can"
import { api, getErrorMessage } from "../api"

// האזור קורא את זהות ההורה מה-Context במקום לפרש נתונים מקומיים מהדפדפן.
function ParentPA() {
  const navigate = useNavigate()
  const { role, logout } = useAuth()
  const [regChild, setRegChild] = useState(false)
  const [updatePar, setUpdatePar] = useState(false)
  const [childToUpdate, setChildToUpdate] = useState(null)
  const [presentEvents, setPresentEvents] = useState(false)
  const [childrenForSelection, setChildrenForSelection] = useState([])
  const [showChildSelection, setShowChildSelection] = useState(false)
  const [isLoadingChildren, setIsLoadingChildren] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [events, setEvents] = useState([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [eventsError, setEventsError] = useState("")

  useEffect(() => {
    let active = true
    api.get("/event")
      .then((eventsResponse) => {
        if (!active) return
        setEvents(eventsResponse.data)
      })
      .catch((error) => {
        if (active) setEventsError(getErrorMessage(error))
      })
      .finally(() => {
        if (active) setEventsLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const signOut = () => {
    logout()
    navigate("/", { replace: true })
  }

  const toggleChildUpdate = async () => {
    if (childToUpdate || showChildSelection) {
      setChildToUpdate(null)
      setShowChildSelection(false)
      return
    }

    setSuccessMessage("")
    setEventsError("")
    setIsLoadingChildren(true)
    try {
      const { data } = await api.get("/child")
      setChildrenForSelection(data)
      if (data.length === 0) {
        setEventsError("לא נמצאו ילדים המשויכים לחשבון ההורה.")
      } else if (data.length === 1) {
        setChildToUpdate(data[0])
      } else {
        setShowChildSelection(true)
      }
    } catch (error) {
      setEventsError(getErrorMessage(error))
    } finally {
      setIsLoadingChildren(false)
    }
  }

  return (
    <main className="page-shell">
      <section className="auth-card" dir="rtl">
        <h1>האזור האישי</h1>
        <p>התחברת בהצלחה ({role}).</p>
        <p>פרטי המשתמש נטענו לאחר אימות מול השרת.</p>
        {successMessage && <p className="form-message success-message" role="status">{successMessage}</p>}
        <Can role="parent">
          <button className="primary-button" type="button" onClick={() => { setSuccessMessage(""); setRegChild(!regChild) }}>להרשמת ילד</button>
          <button className="primary-button" type="button" onClick={() => { setUpdatePar(!updatePar) }}>עדכון פרטי הורה</button>
          <button className="primary-button" id="parent-events-heading" onClick={() => setPresentEvents(!presentEvents)}>אירועים</button>

          <button
            className="primary-button"
            type="button"
            onClick={toggleChildUpdate}
            disabled={isLoadingChildren}
          >
            {isLoadingChildren ? "טוען ילדים..." : "עדכון פרטי ילד"}
          </button>
        </Can>
        <button className="primary-button" type="button" onClick={signOut}>יציאה</button>
        {regChild && (
          <RegChild
            setRegChild={setRegChild}
            onSuccess={() => {
              setSuccessMessage("רישום הילד הושלם בהצלחה.")
            }}
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
        {childToUpdate && (
          <UpdateChild
            child={childToUpdate}
            onCancel={() => setChildToUpdate(null)}
            onSuccess={(updatedChild) => {
              setChildToUpdate(null)
              setChildrenForSelection((current) => current.map((child) =>
                child._id === updatedChild._id ? updatedChild : child
              ))
              setSuccessMessage("פרטי הילד עודכנו בהצלחה.")
            }}
          />
        )}
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
                    setChildToUpdate(child)
                    setShowChildSelection(false)
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
        {presentEvents &&
          <section className="parent-events" aria-labelledby="parent-events-heading">
            {eventsLoading && <p role="status">טוען אירועים...</p>}
            {eventsError && <p className="form-message error-message" role="alert">{eventsError}</p>}
            {!eventsLoading && !eventsError && events.length === 0 && (
              <p>אין אירועים להצגה כרגע.</p>
            )}
            {events.map((event) => {
              return (
                <article className="parent-event-card" key={event._id}>
                  <h3>{event.name}</h3>
                  <p><strong>תאריך:</strong> {new Date(event.date).toLocaleDateString("he-IL")}</p>
                  <p><strong>שעה:</strong> {event.hour}</p>
                  <p><strong>פרטים להורים:</strong> {event.detailingForParent}</p>
                  {event.registrationOpen ? (
                    <button className="primary-button" type="button" disabled>
                      הרשמה
                    </button>
                  ) : (
                    <p>{event.registrationMessage}</p>
                  )}
                </article>
              )
            })}
          </section>}
      </section>
    </main>
  )
}

export default ParentPA
