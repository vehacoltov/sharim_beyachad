import { useState } from "react"
import { api, getErrorMessage } from "../api"

const FormChildReg = ({ child, event, onSuccess }) => {
    const [favoriteVolun, setFavoriteVolun] = useState("")
    const [errorMessage, setErrorMessage] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (submitEvent) => {
        submitEvent.preventDefault()
        setErrorMessage("")
        setIsSubmitting(true)

        try {
            await api.post("/child-event", {
                child: child._id,
                event: event._id,
                favoriteVolun: favoriteVolun.trim(),
            })
            onSuccess?.()
        } catch (error) {
            setErrorMessage(getErrorMessage(error))
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <form className="auth-card registration-card" onSubmit={handleSubmit} dir="rtl">
            <h2>הרשמה לאירוע</h2>
            <p><strong>שם הילד:</strong> {child.fullName}</p>
            <p><strong>שם האירוע:</strong> {event.name}</p>
            <p><strong>תאריך:</strong> {new Date(event.date).toLocaleDateString("he-IL")}</p>
            <p><strong>שעה:</strong> {event.hour}</p>
            <p><strong>פרטים להורים:</strong> {event.detailingForParent}</p>
            <div className="form-field">
                <label htmlFor="registration-favorite-volunteer">האם יש מתנדבת שתעדיפו?</label>
                <input
                    id="registration-favorite-volunteer"
                    name="favoriteVolun"
                    type="text"
                    value={favoriteVolun}
                    onChange={(inputEvent) => setFavoriteVolun(inputEvent.target.value)}
                />
            </div>
            {errorMessage && <p className="form-message error-message" role="alert">{errorMessage}</p>}
            <button className="primary-button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "שולח הרשמה..." : "אישור"}
            </button>
        </form>
    )
}

export default FormChildReg