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
            <div className="form-field">
                <label htmlFor="registration-child-name">שם הילד</label>
                <input id="registration-child-name" type="text" value={child.fullName} readOnly />
            </div>
            <div className="form-field">
                <label htmlFor="registration-event-name">שם האירוע</label>
                <input id="registration-event-name" type="text" value={event.name} readOnly />
            </div>
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