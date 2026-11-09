import { useEffect, useState } from "react"
import { useNavigate, useOutletContext, useParams } from "react-router-dom"
import { api, getErrorMessage } from "../api"
import RegChildToEvent from "../Child/RegChildToEvent"
import AllEvents from "../Event/AllEvents"

/**
 * מנתב בין רשימת האירועים לבין תהליך הרשמת ילד לאירוע, לפי הפרמטרים ב-URL.
 * כשיש eventId ו-childId נטענים האירוע וסטטוס ההרשמה ומוצג רק תהליך ההרשמה;
 * בלי הפרמטרים מוצגת הרשימה. כך רענון/קישור ישיר משחזרים את המסך הנכון
 * בלי להשאיר את רשימת האירועים פתוחה מאחור.
 */
function EventRegistrationContent({
  eventId,
  childId,
  registrationStep,
  childrenForRegistration,
  childrenLoading,
  childrenError,
  onChildUpdated,
  onRegistrationSuccess,
}) {
  const navigate = useNavigate()
  const [eventResult, setEventResult] = useState(null)
  const [registrationResult, setRegistrationResult] = useState(null)

  useEffect(() => {
    // שתי בקשות עצמאיות רצות במקביל: GET של האירוע ו-preflight לכפילות.
    // active מונע race שבו תגובה מנתיב ישן תדרוס state אחרי שינוי מזהה או unmount.
    let active = true

    // ה-preflight נותן הודעה מוקדמת; הוא אינו נעילה, ולכן POST בשרת בודק שוב
    // ומסד הנתונים אוכף ייחודיות במקרה ששתי בקשות מגיעות בו-זמנית.
    api.get(`/event/${eventId}`)
      .then(({ data }) => {
        if (active) setEventResult({ eventId, event: data, error: "" })
      })
      .catch((error) => {
        if (active) setEventResult({ eventId, event: null, error: getErrorMessage(error) })
      })

    api.get("/child-event/check", { params: { child: childId, event: eventId } })
      .then(({ data }) => {
        if (active) setRegistrationResult({ eventId, childId, isRegistered: data.isRegistered, error: "" })
      })
      .catch((error) => {
        if (active) {
          setRegistrationResult({
            eventId,
            childId,
            isRegistered: false,
            error: getErrorMessage(error),
          })
        }
      })

    return () => {
      active = false
    }
  }, [eventId, childId])

  if (
    !eventResult
    || eventResult.eventId !== eventId
    || !registrationResult
    || registrationResult.eventId !== eventId
    || registrationResult.childId !== childId
    || childrenLoading
  ) {
    return <p role="status">טוען את פרטי ההרשמה...</p>
  }

  // מזהה הילד מהכתובת חייב להתאים לילד שטעון בחשבון ההורה.
  const { event, error: eventError } = eventResult
  const child = childrenForRegistration.find((item) => item._id === childId)
  if (eventError || registrationResult.error || !event || !child) {
    return (
      <section dir="rtl" role="alert">
        <p>{eventError || registrationResult.error || childrenError || "האירוע או הילד שנבחרו לא נמצאו בחשבון הזה."}</p>
        <button className="secondary-button" type="button" onClick={() => navigate("/personal/events")}>
          חזרה לאירועים
        </button>
      </section>
    )
  }

  if (registrationResult.isRegistered) {
    return (
      <section dir="rtl">
        <p className="form-message error-message" role="alert">
          הילד כבר רשום לאירוע הזה.
        </p>
        <button className="secondary-button" type="button" onClick={() => navigate("/personal/events")}>
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
        <button className="secondary-button" type="button" onClick={() => navigate("/personal/events")}>
          חזרה לאירועים
        </button>
      </section>
    )
  }

  // שומר את טופס עדכון הילד וההרשמה הקיים; רק בחירת המסך תלויה בנתיב.
  return (
    <RegChildToEvent
      event={event}
      childrenForRegistration={[child]}
      registrationStep={registrationStep}
      onCancel={() => navigate("/personal/events")}
      onChildUpdated={onChildUpdated}
      onRegistrationSuccess={onRegistrationSuccess}
    />
  )
}

/**
 * מחבר את ה-URL לנתוני ParentPA. נתיב עם מזהי אירוע/ילד מציג את זרימת ההרשמה
 * בלבד; הנתיב הכללי מציג AllEvents. Outlet context מונע טעינה כפולה של הילדים
 * ומשאיר את UpdateChild ו-FormChildReg כרכיבי הליבה הקיימים.
 */
function ParentEventsPage({ registrationStep = "details" }) {
  const { eventId, childId } = useParams()
  const {
    childrenForRegistration,
    childrenLoading,
    childrenError,
    onChildUpdated,
    onRegistrationSuccess,
  } = useOutletContext()

  // Outlet context מעביר ילדים, מצב טעינה ו-callbacks מפריסת ParentPA לצאצאים.
  if (eventId && childId) {
    return (
      <EventRegistrationContent
        eventId={eventId}
        childId={childId}
        registrationStep={registrationStep}
        childrenForRegistration={childrenForRegistration}
        childrenLoading={childrenLoading}
        childrenError={childrenError}
        onChildUpdated={onChildUpdated}
        onRegistrationSuccess={onRegistrationSuccess}
      />
    )
  }

  return (
    <AllEvents
      selectedEventId={eventId}
      selectedChildId={childId}
      registrationStep={registrationStep}
      childrenForRegistration={childrenForRegistration}
      childrenLoading={childrenLoading}
      childrenError={childrenError}
      onChildUpdated={onChildUpdated}
      onRegistrationSuccess={onRegistrationSuccess}
    />
  )
}

export default ParentEventsPage
