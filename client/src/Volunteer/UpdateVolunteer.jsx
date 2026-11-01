import { useState } from "react"
const UpdateVolunteer = ({ user, onCancel, onSuccess }) => {

    const [email, setEmail] = useState(user?.email || "")
    const [fullName, setFullName] = useState(user?.fullName || "")
    const [phone, setPhone] = useState(user?.phone || "")
    const [age, setAge] = useState(user?.age ?? "")
    const [seminar, setSeminar] = useState(user?.seminar || "")
    const [detaling, setDetaling] = useState(user?.detaling || "")
    const [password, setPassword] = useState("")

    if (!user?._id) {
        return <p role="alert">לא ניתן לטעון את פרטי המתנדב/ת. יש להתחבר מחדש.</p>
    }

    return <>
        <div className="form-field">
            <label htmlFor="fullName">שם מלא:</label>
            <input type="text" id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>

        <div className="form-field">
            <label htmlFor="email">אימייל:</label>
            <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        <div className="form-field">
            <label htmlFor="phone">טלפון:</label>
            <input type="tel" id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>

        <div className="form-field">
            <label htmlFor="age">גיל:</label>
            <input type="number" id="age" min="0" step="1" value={age} onChange={(e) => setAge(e.target.value)} />
        </div>

        <div className="form-field">
            <label htmlFor="seminar">סמינר:</label>
            <input type="text" id="seminar" value={seminar} onChange={(e) => setSeminar(e.target.value)} />
        </div>

        <div className="form-field">
            <label htmlFor="detaling">פרטים נוספים:</label>
            <input type="text" id="detaling" value={detaling} onChange={(e) => setDetaling(e.target.value)} />
        </div>

        <div className="form-field">
            <label htmlFor="password">סיסמה חדשה:</label>
            <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="סיסמה חדשה" autoComplete="new-password" />
        </div>

        <button className="primary-button" type="button" onClick={onCancel}>ביטול</button>
        <button className="primary-button" type="button" onClick={() => onSuccess()}>שמור</button>
    </>

}

export default UpdateVolunteer




