import { useState } from "react"
import { api, getErrorMessage } from "../api"
import { useAuth } from "../useAuth"

const UpdateParent = ({ onCancel, onSuccess }) => {
    const { user, refreshUser } = useAuth()

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
            const updatedUser = await refreshUser()
            onSuccess?.(updatedUser)
        } catch (error) {
            setErrorMessage(getErrorMessage(error))
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!user?._id) {
        return <p role="alert">לא ניתן לטעון את פרטי ההורה. יש להתחבר מחדש.</p>
    }



    return <>

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
            <button type="button" onClick={onCancel}>ביטול</button>
            <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "שומר..." : "שמור"}
            </button>
        </form>





        {/* <button className="primary-button" type="button" onClick={onCancel}>ביטול</button>
        <button className="primary-button" type="button" onClick={() => onSuccess()}>שמור</button> */}
    </>

}

export default UpdateParent

