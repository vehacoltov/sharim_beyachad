import { useEffect, useState } from "react"
import { api, getErrorMessage } from "../api"
import { useNavigate } from "react-router-dom"
import Can from "../Can"

const ManageEmployies = () => {
    const [employees, setEmployees] = useState([])
    const [loading, setLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState("")
    const [selectedEmployee, setSelectedEmployee] = useState(null)
    const [dialogMode, setDialogMode] = useState("")
    const [permissionOptions, setPermissionOptions] = useState([])
    const [selectedPermissionId, setSelectedPermissionId] = useState("")
    const [dialogError, setDialogError] = useState("")
    const [dialogLoading, setDialogLoading] = useState(false)
    const [isSavingPermission, setIsSavingPermission] = useState(false)

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

    const closeDialog = () => {
        setSelectedEmployee(null)
        setDialogMode("")
        setDialogError("")
    }

    const openPermissionDialog = async (employee) => {
        setSelectedEmployee(employee)
        setDialogMode("permission")
        setDialogLoading(true)
        setDialogError("")

        try {
            const [permissionsResponse, currentPermissionResponse] = await Promise.all([
                api.get("/permission"),
                api.get(`/employee/${employee._id}/access-permission`),
            ])

            setPermissionOptions(permissionsResponse.data)
            setSelectedPermissionId(currentPermissionResponse.data.permissionId)
        } catch (error) {
            setDialogError(getErrorMessage(error))
        } finally {
            setDialogLoading(false)
        }
    }

    const handleSavePermission = async () => {
        if (!selectedEmployee || !selectedPermissionId) return

        setIsSavingPermission(true)
        setDialogError("")

        try {
            await api.patch(
                `/employee/${selectedEmployee._id}/access-permission`,
                { permissionId: selectedPermissionId },
            )
            closeDialog()
        } catch (error) {
            setDialogError(getErrorMessage(error))
        } finally {
            setIsSavingPermission(false)
        }
    }

    const handleDelete = async (employee) => {
        if (!window.confirm(`למחוק את העובד/ת ${employee.fullName}?`)) return

        setErrorMessage("")

        try {
            await api.delete(`/employee/${employee._id}`)
            setEmployees((current) =>
                current.filter((item) => item._id !== employee._id)
            )
        } catch (error) {
            setErrorMessage(getErrorMessage(error))
        }
    }

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

            {/* {!loading && !errorMessage && employees.length > 0 && (
                <ul>
                    {employees.map((employee) => (
                        <li key={employee._id}>
                            {employee.fullName}
                            {employee.phone && ` — ${employee.phone}`}
                        </li>
                    ))}
                </ul>
            )} */}

            {!loading && !errorMessage && employees.length > 0 && (
                <div>
                    {employees.map((employee) => (
                        <article className="parent-event-card" key={employee._id}>
                            <h3>{employee.fullName}</h3>

                            <button
                                className="secondary-button"
                                type="button"
                                onClick={() => {
                                    setSelectedEmployee(employee)
                                    setDialogMode("details")
                                    setDialogError("")
                                }}
                            >
                                צפייה בפרטים
                            </button>

                            <Can permission="permissions">
                                <button
                                    className="secondary-button"
                                    type="button"
                                    onClick={() => openPermissionDialog(employee)}
                                >
                                    שינוי הרשאת גישה
                                </button>
                            </Can>

                            <Can permission="employees">
                                <button
                                    className="secondary-button"
                                    type="button"
                                    onClick={() => handleDelete(employee)}
                                >
                                    מחיקת עובד
                                </button>
                            </Can>
                        </article>
                    ))}
                </div>
            )}

            {selectedEmployee && dialogMode && (
                <div className="dialog-backdrop" role="presentation">
                    <aside
                        className="matching-details-popup"
                        style={{
                            left: "50%",
                            top: "50%",
                            transform: "translate(-50%, -50%)",
                        }}
                        role="dialog"
                        aria-modal="true"
                        aria-label={`פרטי ${selectedEmployee.fullName}`}
                        dir="rtl"
                    >
                        <div className="matching-details-heading">
                            <h3>{selectedEmployee.fullName}</h3>
                            <button
                                className="matching-details-close"
                                type="button"
                                aria-label="סגירה"
                                onClick={closeDialog}
                            >
                                ×
                            </button>
                        </div>

                        <dl>
                            <div className="matching-detail-row">
                                <dt>שם משתמש</dt>
                                <dd>{selectedEmployee.userName || "לא הוזן"}</dd>
                            </div>
                            <div className="matching-detail-row">
                                <dt>טלפון</dt>
                                <dd>{selectedEmployee.phone || "לא הוזן"}</dd>
                            </div>
                        </dl>

                        {dialogMode === "permission" && (
                            <>
                                {dialogLoading ? (
                                    <p role="status">טוען הרשאות...</p>
                                ) : (
                                    <div className="form-field">
                                        <label htmlFor="employee-permission">קבוצת הרשאה</label>
                                        <select
                                            id="employee-permission"
                                            value={selectedPermissionId}
                                            onChange={(event) =>
                                                setSelectedPermissionId(event.target.value)
                                            }
                                        >
                                            {permissionOptions.map((permission) => (
                                                <option key={permission._id} value={permission._id}>
                                                    הרשאה {permission.id}:{" "}
                                                    {(permission.validActions || []).join(", ") || "ללא הרשאות"}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {dialogError && (
                                    <p className="form-message error-message" role="alert">
                                        {dialogError}
                                    </p>
                                )}

                                <div className="matching-confirm-actions">
                                    <button
                                        className="secondary-button"
                                        type="button"
                                        onClick={closeDialog}
                                        disabled={isSavingPermission}
                                    >
                                        ביטול
                                    </button>
                                    <button
                                        className="primary-button"
                                        type="button"
                                        onClick={handleSavePermission}
                                        disabled={
                                            dialogLoading ||
                                            isSavingPermission ||
                                            !selectedPermissionId
                                        }
                                    >
                                        {isSavingPermission ? "שומר..." : "שמירת הרשאה"}
                                    </button>
                                </div>
                            </>
                        )}
                    </aside>
                </div>
            )}
        </section>
    )
}

export default ManageEmployies;