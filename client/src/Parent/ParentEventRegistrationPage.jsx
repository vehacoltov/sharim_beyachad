import { useEffect, useState } from "react"
import { useNavigate, useOutletContext, useParams } from "react-router-dom"
import { api, getErrorMessage } from "../api"
import RegChildToEvent from "../Child/RegChildToEvent"

// טוען את האירוע לפי הכתובת ומוודא שהילד שנבחר משויך להורה המחובר.
function ParentEventRegistrationPage() {
  const { eventId, childId } = useParams()
  const navigate = useNavigate()
  const {
    childrenForRegistration,
    childrenLoading,
    onChildUpdated,
  } = useOutletContext()
  const [event, setEvent] = useState(null)
  const [eventError, setEventError] = useState("")
  const [isLoadingEvent, setIsLoadingEvent] = useState(true)

  useEffect(() => {
    let active = true

    api.get(`/event/${eventId}`)
      .then(({ data }) => {
        if (active) setEvent(data)
      })
      .catch((error) => {
        if (active) setEventError(getErrorMessage(error))
      })
      .finally(() => {
        if (active) setIsLoadingEvent(false)
      })

    return () => {
      active = false
    }
  }, [eventId])

  if (isLoadingEvent || childrenLoading) {
    return <p role="status">טוען את פרטי ההרשמה...</p>
  }

  const child = childrenForRegistration.find((item) => item._id === childId)
  if (eventError || !event || !child) {
    return (
      <section dir="rtl" role="alert">
        <p>{eventError || "האירוע או הילד שנבחרו לא נמצאו בחשבון שלך."}</p>
        <button
          className="secondary-button"
          type="button"
          onClick={() => navigate("/personal/events")}
        >
          חזרה לאירועים
        </button>
      </section>
    )
  }

  if (!event.registrationOpen) {
    return (
      <section dir="rtl">
        <p className="form-message error-message" role="alert">
          {event.registrationMessage || "ההרשמה לאירוע אינה פתוחה."}
        </p>
        <button
          className="secondary-button"
          type="button"
          onClick={() => navigate("/personal/events")}
        >
          חזרה לאירועים
        </button>
      </section>
    )
  }

  return (
    <RegChildToEvent
      event={event}
      childrenForRegistration={[child]}
      onCancel={() => navigate("/personal/events")}
      onChildUpdated={onChildUpdated}
      onRegistrationSuccess={() => {
        navigate("/personal", {
          replace: true,
          state: {
            successMessage: `ההרשמה של ${child.fullName} לאירוע "${event.name}" הושלמה בהצלחה.`,
          },
        })
      }}
    />
  )
}

export default ParentEventRegistrationPage
