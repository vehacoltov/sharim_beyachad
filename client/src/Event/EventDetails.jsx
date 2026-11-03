import { useState } from "react"
import { useAuth } from "../useAuth"
import RegChildToEvent from "../Child/RegChildToEvent"

const EventDetails = ({
    event,
    childrenForRegistration,
    childrenLoading,
    childrenError,
    onChildUpdated,
    onRegistrationSuccess,
}) => {
    const [toRegisterEvent, setToRegisterEvent] = useState(false)
    const { role } = useAuth()

    const handleCancelRegistration = () => {
        setToRegisterEvent(false)
    }

    return (
        <article className="parent-event-card">
            <h3>{event.name}</h3>
            <p><strong>תאריך:</strong> {new Date(event.date).toLocaleDateString("he-IL")}</p>
            <p><strong>שעה:</strong> {event.hour}</p>
            {role === "parent" && (
                <p><strong>פרטים להורים:</strong> {event.detailingForParent}</p>
            )}
            {role === "volunteer" && (
                <p><strong>פרטים למתנדבת:</strong> {event.detailingForVolunteer}</p>
            )}
            {event.registrationOpen ? (
                <button
                    onClick={() => setToRegisterEvent((isOpen) => !isOpen)}
                    className="primary-button"
                    type="button"
                    disabled={role === "parent" && (
                        childrenLoading || Boolean(childrenError) || childrenForRegistration.length === 0
                    )}
                >
                    {role === "parent" && childrenLoading ? "טוען ילדים..." : "הרשמה"}
                </button>
            ) : (
                <p>{event.registrationMessage}</p>
            )}
            {toRegisterEvent && role === "parent" && (
                <RegChildToEvent
                    event={event}
                    childrenForRegistration={childrenForRegistration}
                    onCancel={handleCancelRegistration}
                    onChildUpdated={onChildUpdated}
                    onRegistrationSuccess={onRegistrationSuccess}
                />
            )}
        </article>
    )
}

export default EventDetails
