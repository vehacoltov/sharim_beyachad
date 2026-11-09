import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { api, getErrorMessage } from "../api"
import { useAuth } from "../useAuth"

const UpdateParent = () => {
    const { user, refreshUser } = useAuth()
    const navigate = useNavigate()

    const [email, setEmail] = useState(user?.email || "")
    const [password, setPassword] = useState("")
    const [errorMessage, setErrorMessage] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (event) => {
        event.preventDefault()
        setErrorMessage("")
        setIsSubmitting(true)

        const payload = { email }

        // שולחים סיסמה רק אם ההורה בחר לשנות אותה.
        if (password) {
            payload.password = password
        }

        try {
            await api.patch(`/parent/${user._id}`, payload)
            // מרעננים מהשרת כדי שה-Context יכיל את הנתונים המאומתים לאחר העדכון.
            await refreshUser()
            navigate("/personal", {
                replace: true,
                state: { successMessage: "פרטי ההורה עודכנו בהצלחה." },
            })
        } catch (error) {
            setErrorMessage(getErrorMessage(error))
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!user?._id) {
        return <p role="alert">לא ניתן לטעון את פרטי ההורה. יש להתחבר מחדש.</p>
    }



    return (
      <>
        <h2>עדכון פרטי הורה</h2>
        <form onSubmit={handleSubmit}>
            <div className="form-field">
                <label htmlFor="email">אימייל:</label>
                <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className="form-field">
                <label htmlFor="password">סיסמה חדשה:</label>
                <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="סיסמה חדשה"
                    autoComplete="new-password"
                />
            </div>

            {errorMessage && <p role="alert">{errorMessage}</p>}
            <button className="secondary-button" type="button" onClick={() => navigate("/personal")}>
                ביטול
            </button>
            <button className="primary-button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "שומר..." : "שמור"}
            </button>
        </form>
      </>
    )
}

export default UpdateParent
