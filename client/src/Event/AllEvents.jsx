import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { api, getErrorMessage } from "../api"
import { useAuth } from "../useAuth"
import EventDetails from "./EventDetails"

const AllEvents = ({
    childrenForRegistration,
    childrenLoading,
    childrenError,
    onChildUpdated,
    onRegistrationSuccess,
    // onClose,
}) => {
    const navigate = useNavigate()
    const { role } = useAuth()
    const [events, setEvents] = useState([])
    const [eventsError, setEventsError] = useState("")
    const [eventsLoading, setEventsLoading] = useState(true)

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
                    <button
                        key={event._id}
                        className="secondary-button"
                        type="button"
                        onClick={() => navigate(`/EmployeePA/UpdateEvent/${event._id}`)}
                    >
                        {event.name}
                    </button>
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