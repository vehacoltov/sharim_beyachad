import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { api, getErrorMessage } from "../api"
import { useAuth } from "../useAuth"
import EventDetails from "./EventDetails"
import Can from "../Can"

const AllEvents = ({
    selectedEventId,
    selectedChildId,
    registrationStep,
    childrenForRegistration = [],
    childrenLoading = false,
    childrenError = "",
    onChildUpdated,
    onRegistrationSuccess,
}) => {
    const navigate = useNavigate()
    const { role, hasPermission } = useAuth()
    const [events, setEvents] = useState([])
    const [eventsError, setEventsError] = useState("")
    const [eventsLoading, setEventsLoading] = useState(true)

    useEffect(() => {
        // האירועים נטענים פעם אחת בכניסה למסך. active הוא cleanup guard:
        // אם המשתמש עוזב לפני סיום הבקשה, תוצאתה לא תעדכן state של רכיב שהוסר.
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

    return (
        <section className="parent-events" aria-labelledby="parent-events-heading">
            <h2 id="parent-events-heading">אירועים</h2>
            {/* {onClose && (
                <button className="secondary-button" type="button" onClick={onClose}>
                    סגירה
                </button>
            )} */}
            {eventsLoading && <p role="status">טוען אירועים...</p>}
            {eventsError && <p className="form-message error-message" role="alert">{eventsError}</p>}
            {!eventsLoading && !eventsError && events.length === 0 && (
                <p>אין אירועים להצגה כרגע.</p>
            )}
            {role === "employee"
                ? events.map((event) => (
                    <article key={event._id} className="parent-event-card">
                        <h3>{event.name}</h3>
                        <p><strong>תאריך:</strong> {new Date(event.date).toLocaleDateString("he-IL")}</p>
                        <p><strong>שעה:</strong> {event.hour}</p>
                        {hasPermission("events") && (
                            <button
                                className="secondary-button"
                                type="button"
                                onClick={() => navigate(`/personal/event/${event._id}/edit`)}
                            >
                                עריכת האירוע
                            </button>
                        )}

                        <Can permissions={["events", "matching", "employees"]}>
                            <button
                                className="secondary-button"
                                type="button"
                                onClick={() => navigate(`/EmployeePA/Matching/${event._id}`)}
                            >
                                צפייה בילדים ובמתנדבות לאירוע
                            </button>
                        </Can>

                    </article>
                ))
                : events.map((event) => (
                    <EventDetails
                        key={event._id}
                        event={event}
                        childrenForRegistration={childrenForRegistration}
                        childrenLoading={childrenLoading}
                        childrenError={childrenError}
                        onChildUpdated={onChildUpdated}
                        onRegistrationSuccess={onRegistrationSuccess}
                    />
                ))}
        </section>
    )
}

export default AllEvents