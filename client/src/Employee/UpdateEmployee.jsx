import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { api, getErrorMessage } from "../api"
import { useAuth } from "../useAuth"

/**
 * טופס עדכון הפרופיל של המתנדבת המחוברת.
 * השרת מזהה את בעלת החשבון לפי JWT ובודק שה-id בכתובת תואם לה; לכן הטופס
 * שולח PATCH ל-/volunteer/:id ולא שולח מזהה משתמש בתוך גוף הבקשה.
 */
const UpdateEmployee = () => {
    const { user, refreshUser } = useAuth()
    const navigate = useNavigate()
    const [userName, setUserName] = useState(user?.userName || "")
    const [phone, setPhone] = useState(user?.phone || "")
    const [password, setPassword] = useState("")
    const [errorMessage, setErrorMessage] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)


    const handleSubmit = async (event) => {
        event.preventDefault()
        setErrorMessage("")
        setIsSubmitting(true)

        // PATCH שולח רק שדות פרופיל. סיסמה ריקה מושמטת כדי לא לדרוס את הקיימת.
        // age נשמר בסכמה כמספר שלם, לכן ממירים את ערך ה-input (שהוא מחרוזת).
        const payload = {
            userName: userName.trim(),
            phone: phone.trim(),
        }

        if (password) {
            payload.password = password
        }

        try {
            await api.patch(`/employee/${user._id}`, payload)
            await refreshUser()
            navigate("/personal", {
                replace: true,
                state: { successMessage: "פרטי העובד/ת עודכנו בהצלחה." },
            })
        } catch (error) {
            setErrorMessage(getErrorMessage(error))
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!user?._id) {
        return <p role="alert">לא ניתן לטעון את פרטי העובד/ת. יש להתחבר מחדש.</p>
    }

    return (
        <>
            <h2>עדכון פרטי עובד/ת</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-field">
                    <label htmlFor="volunteer-fullName">שם משתמש:</label>
                    <input
                        type="text"
                        id="employee-userName"
                        value={userName}
                        onChange={(event) => setUserName(event.target.value)}
                        required
                    />
                </div>

                <div className="form-field">
                    <label htmlFor="employee-phone">טלפון:</label>
                    <input
                        type="tel"
                        id="employee-phone"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        required
                    />
                </div>

                <div className="form-field">
                    <label htmlFor="employee-password">סיסמה חדשה:</label>
                    <input
                        type="password"
                        id="employee-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        // placeholder="השאירי ריק אם אינך רוצה לשנות סיסמה"
                        autoComplete="new-password"
                    />
                </div>

                {errorMessage && <p className="form-message error-message" role="alert">{errorMessage}</p>}
                <div className="volunteer-registration-actions">
                    <button
                        className="secondary-button"
                        type="button"
                        onClick={() => navigate("/personal")}
                        disabled={isSubmitting}
                    >
                        ביטול
                    </button>
                    <button className="primary-button" type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "שומר..." : "שמור"}
                    </button>
                </div>
            </form>
        </>
    )

}

export default UpdateEmployee

