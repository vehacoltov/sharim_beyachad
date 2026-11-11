import { useEffect, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { api, getErrorMessage } from "../api"

const dateInputValue = (value) => {
    if (!value) return ""
    return String(value).slice(0, 10)
}

const registrationIsOpen = (event, isEventActive, now = new Date()) => {
    const startReg = event?.startReg ? new Date(event.startReg) : null
    const endReg = event?.endReg ? new Date(event.endReg) : null
    return Boolean(
        isEventActive
        && startReg
        && endReg
        && now >= startReg
        && now <= endReg
    )
}

function ManageEvent() {
    const location = useLocation()
    const navigate = useNavigate()
    const { eventId } = useParams()
    const [event, setEvent] = useState(null)
    const [isEventActive, setIsEventActive] = useState(false)
    const [loadedEventId, setLoadedEventId] = useState(null)
    const [isSaving, setIsSaving] = useState(false)
    const [errorMessage, setErrorMessage] = useState("")

    useEffect(() => {
        let active = true
        api.get(`/event/${eventId}`)
            .then(({ data }) => {
                if (active) {
                    setEvent(data)
                    setIsEventActive(Boolean(data.isActive))
                    setErrorMessage("")
                    setLoadedEventId(eventId)
                }
            })
            .catch((error) => {
                if (active) {
                    setErrorMessage(getErrorMessage(error))
                    setLoadedEventId(eventId)
                }
            })

        return () => {
            active = false
        }
    }, [eventId])

    const handleSubmit = async (submitEvent) => {
        submitEvent.preventDefault()
        setErrorMessage("")

        const formData = new FormData(submitEvent.currentTarget)

        setIsSaving(true)
        try {
            await api.put("/event", {
                _id: event._id,
                name: formData.get("name").trim(),
                date: `${formData.get("date")}T00:00:00.000Z`,
                hour: formData.get("hour"),
                price: Number(formData.get("price")),
                detailingForParent: formData.get("detailingForParent").trim(),
                detailingForVolun: formData.get("detailingForVolun").trim(),
                isActive: isEventActive,
            })
            const returnPath = location.pathname.startsWith("/personal/")
                ? "/personal/all-events"
                : "/EmployeePA/all-events"
            navigate(returnPath, {
                replace: true,
                state: { successMessage: "פרטי האירוע נשמרו בהצלחה." },
            })
        } catch (error) {
            setErrorMessage(getErrorMessage(error))
        } finally {
            setIsSaving(false)
        }
    }

    const registrationOpen = registrationIsOpen(event, isEventActive)
    const isCurrentEventLoaded = loadedEventId === eventId

    return (
        <section className="manage-event" dir="rtl" aria-labelledby="manage-event-heading">
            <h2 id="manage-event-heading">ניהול האירוע</h2>
            {!isCurrentEventLoaded && <p role="status">טוען פרטי אירוע...</p>}
            {isCurrentEventLoaded && errorMessage && (
                <p className="form-message error-message" role="alert">{errorMessage}</p>
            )}
            {isCurrentEventLoaded && event && (
                <>
                <dl className="manage-event-registration-counts">
                    <div>
                        <dt>מספר הילדים שנרשמו</dt>
                        <dd>{event.Children?.length ?? 0}</dd>
                    </div>
                    <div>
                        <dt>מספר המתנדבות שנרשמו</dt>
                        <dd>{event.Volunteers?.length ?? 0}</dd>
                    </div>
                </dl>
                <form className="manage-event-form" onSubmit={handleSubmit}>
                    <div className="form-field">
                        <label htmlFor="manage-event-name">שם האירוע</label>
                        <input
                            id="manage-event-name"
                            name="name"
                            type="text"
                            defaultValue={event.name || ""}
                            required
                        />
                    </div>
                    <div className="form-field">
                        <label htmlFor="manage-event-date">תאריך</label>
                        <input
                            id="manage-event-date"
                            name="date"
                            type="date"
                            defaultValue={dateInputValue(event.date)}
                            required
                        />
                    </div>
                    <div className="form-field">
                        <label htmlFor="manage-event-hour">שעה</label>
                        <input
                            id="manage-event-hour"
                            name="hour"
                            type="time"
                            defaultValue={event.hour || ""}
                            required
                        />
                    </div>
                    <div className="form-field">
                        <label htmlFor="manage-event-price">מחיר (₪)</label>
                        <input
                            id="manage-event-price"
                            name="price"
                            type="number"
                            min="0"
                            step="0.01"
                            defaultValue={event.price ?? 0}
                            required
                        />
                    </div>
                    <div className="form-field">
                        <label htmlFor="manage-event-parent-details">פרטים להורים</label>
                        <textarea
                            id="manage-event-parent-details"
                            name="detailingForParent"
                            rows="4"
                            defaultValue={event.detailingForParent || ""}
                            required
                        />
                    </div>
                    <div className="form-field">
                        <label htmlFor="manage-event-volunteer-details">פרטים למתנדבת</label>
                        <textarea
                            id="manage-event-volunteer-details"
                            name="detailingForVolun"
                            rows="4"
                            defaultValue={event.detailingForVolun || ""}
                            required
                        />
                    </div>
                    <div className="event-status-fields">
                        <label className="event-status-field" htmlFor="manage-event-active">
                            <span>האם האירוע פעיל</span>
                            <input
                                id="manage-event-active"
                                name="isActive"
                                type="checkbox"
                                role="switch"
                                checked={isEventActive}
                                onChange={(changeEvent) => setIsEventActive(changeEvent.target.checked)}
                            />
                        </label>
                        <label className="event-status-field" htmlFor="manage-event-registration">
                            <span>האם ההרשמה פעילה</span>
                            <input
                                id="manage-event-registration"
                                type="checkbox"
                                role="switch"
                                checked={registrationOpen}
                                disabled
                                readOnly
                            />
                        </label>
                    </div>
                    <button className="primary-button" type="submit" disabled={isSaving}>
                        {isSaving ? "שומר..." : "שמירת שינויים"}
                    </button>
                </form>
                </>
            )}
            
        </section>
    )
}

export default ManageEvent
