import { useEffect, useState } from "react"
import { api, getErrorMessage } from "../api"

const ManageEmployies = () => {
    const [employees, setEmployees] = useState([])
    const [loading, setLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState("")

    useEffect(() => {
        let active = true

        const fetchEmployees = async () => {
            try {
                const { data } = await api.get("/employee")
                if (active) setEmployees(data)
            } catch (error) {
                if (active) setErrorMessage(getErrorMessage(error))
            } finally {
                if (active) setLoading(false)
            }
        }

        fetchEmployees()

        return () => {
            active = false
        }
    }, [])

    return (
        <section dir="rtl">
            <h2>ניהול עובדים</h2>

            {loading && <p role="status">טוען עובדים...</p>}
            {errorMessage && (
                <p className="form-message error-message" role="alert">
                    {errorMessage}
                </p>
            )}

            {!loading && !errorMessage && employees.length === 0 && (
                <p>לא נמצאו עובדים.</p>
            )}

            {!loading && !errorMessage && employees.length > 0 && (
                <ul>
                    {employees.map((employee) => (
                        <li key={employee._id}>
                            {employee.fullName}
                            {employee.phone && ` — ${employee.phone}`}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    )
}

export default ManageEmployies;