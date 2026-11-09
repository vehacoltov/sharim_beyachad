import { useEffect, useState } from "react"
import { api, getErrorMessage } from "../api"
import EventDetails from "./EventDetails"

const AllEvents = ({
    childrenForRegistration,
    childrenLoading,
    childrenError,
}) => {
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
            {events.map((event) => (
                <EventDetails
                    key={event._id}
                    event={event}
                    childrenForRegistration={childrenForRegistration}
                    childrenLoading={childrenLoading}
                    childrenError={childrenError}
                />
            ))}
        </section>
    )
}

export default AllEvents