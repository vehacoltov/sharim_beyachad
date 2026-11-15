import { useEffect, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { api, getErrorMessage } from "../api"
import IconButton from "../ui/IconButton"
import { CancelIcon, SaveIcon } from "../ui/icons"

const PermissionDetails = () => {
  const { permissionId } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()

  const [permission, setPermission] = useState(null)
  const [actions, setActions] = useState([])
  const [enabledActions, setEnabledActions] = useState([])
  const [newAccessCode, setNewAccessCode] = useState("")
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  // const permissionName = state?.permissionName

  useEffect(() => {
    let active = true

    const fetchPermissionDetails = async () => {
      if (!permissionId) {
        setErrorMessage("לא נמצא מזהה הרשאה בכתובת.")
        setLoading(false)
        return
      }

      try {
        const [actionsResponse, permissionResponse] = await Promise.all([
          api.get("/permission/actions"),
          api.get(`/permission/${permissionId}`),
        ])

        if (!active) return

        setActions(actionsResponse.data)
        setPermission(permissionResponse.data)
        setEnabledActions(
          Array.isArray(permissionResponse.data.validActions)
            ? permissionResponse.data.validActions
            : []
        )
      } catch (error) {
        if (active) setErrorMessage(getErrorMessage(error))
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchPermissionDetails()

    return () => {
      active = false
    }
  }, [permissionId])

  const toggleAction = (action) => {
    setEnabledActions((currentActions) =>
      currentActions.includes(action)
        ? currentActions.filter((currentAction) => currentAction !== action)
        : [...currentActions, action]
    )
  }

  const handleApprove = async () => {
    setIsSaving(true)
    setErrorMessage("")
    setSuccessMessage("")

    try {
      await api.patch(`/permission/${permissionId}`, {
        validActions: enabledActions,
        ...(newAccessCode ? { password: newAccessCode } : {}),
      })
      setNewAccessCode("")
      setSuccessMessage("ההרשאה נשמרה בהצלחה.")
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section dir="rtl" className="registration-form-embedded">
      {loading && <p role="status">טוען פרטי הרשאה...</p>}

      {errorMessage && (
        <p className="form-message error-message" role="alert">
          {errorMessage}
        </p>
      )}

      {!loading && permission && (
        <>
          <h2>{permission.name || state?.permissionName || "עריכת הרשאה"}</h2>

          <div className="form-field">
            <label htmlFor="permission-access-code">קוד גישה חדש</label>
            <input
              id="permission-access-code"
              type="password"
              autoComplete="new-password"
              value={newAccessCode}
              onChange={(event) => setNewAccessCode(event.target.value)}
              aria-describedby="permission-access-code-hint"
            />
            <small id="permission-access-code-hint">
              השאירי ריק אם אינך רוצה לשנות את הקוד.
            </small>
          </div>

          <div className="permission-actions-list">
            {actions.map((action) => (
              <label className="event-status-field" key={action}>
                <span>{action}</span>
                <input
                  type="checkbox"
                  role="switch"
                  checked={enabledActions.includes(action)}
                  onChange={() => toggleAction(action)}
                />
              </label>
            ))}
          </div>

          {successMessage && (
            <p className="form-message success-message" role="status">
              {successMessage}
            </p>
          )}

        </>
      )}
      <div className="icon-actions">
        {!loading && permission && (
          <IconButton variant="save" label="שמירה" onClick={handleApprove} disabled={isSaving}>
            <SaveIcon />
          </IconButton>
        )}
        <IconButton label="ביטול" onClick={() => navigate("/personal/permissions-manage")}>
          <CancelIcon />
        </IconButton>
      </div>
    </section>
  )
};

export default PermissionDetails