import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../useAuth"

const EventDetails = ({
    event,
    childrenForRegistration,
    childrenLoading,
    childrenError,
}) => {
    const [showChildSelection, setShowChildSelection] = useState(false)
    const { role } = useAuth()
    const navigate = useNavigate()

    const registerForChild = (childId) => {
        setShowChildSelection(false)
        navigate(`${event._id}/register/${childId}`)
    }

    const handleRegistrationClick = () => {
        if (role !== "parent") return
        if (childrenForRegistration.length === 1) {
            registerForChild(childrenForRegistration[0]._id)
        } else if (childrenForRegistration.length > 1) {
            setShowChildSelection(true)
        }
    }

    return (
        <article className="parent-event-card">
            <h3>{event.name}</h3>
            <p><strong>תאריך:</strong> {new Date(event.date).toLocaleDateString("he-IL")}</p>
            <p><strong>שעה:</strong> {event.hour}</p>
            <p><strong>מחיר:</strong> {Number(event.price ?? 0).toLocaleString("he-IL", { style: "currency", currency: "ILS" })}</p>
            {role === "parent" && (
                <p><strong>פרטים להורים:</strong> {event.detailingForParent}</p>
            )}
            {role === "volunteer" && (
                <p><strong>פרטים למתנדבת:</strong> {event.detailingForVolunteer}</p>
            )}
            {event.registrationOpen ? (
                <button
                    onClick={handleRegistrationClick}
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
            {showChildSelection && (
                <div className="dialog-backdrop" onClick={() => setShowChildSelection(false)}>
                    <section
                        className="dialog-card"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={`event-child-selection-${event._id}`}
                        dir="rtl"
                        onClick={(clickEvent) => clickEvent.stopPropagation()}
                    >
                        <h2 id={`event-child-selection-${event._id}`}>בחירת ילד להרשמה</h2>
                        <p>לאיזה ילד תרצו לרשום את {event.name}?</p>
                        {childrenForRegistration.map((child) => (
                            <button
                                className="secondary-button"
                                type="button"
                                key={child._id}
                                onClick={() => registerForChild(child._id)}
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
        </article>
    )
}

export default EventDetails
