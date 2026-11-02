
import { useState } from "react"
import { api, getErrorMessage } from "../api"
import Can from "../Can"

const AddEvent = ({ onClose }) => {
  const [errorMessage, setErrorMessage] = useState("")
  const [fieldErrors, setFieldErrors] = useState({})
  const [successMessage, setSuccessMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fieldValidationMessages = {
    name: "יש להזין שם אירוע תקין.",
    date: "יש להזין תאריך אירוע תקין.",
    startReg: "יש להזין מועד פתיחה תקין, שקודם למועד סיום ההרשמה.",
    endReg: "יש להזין מועד סיום תקין, המאוחר ממועד פתיחת ההרשמה.",
    hour: "יש להזין שעה תקינה.",
    sumOfChilds: "מספר הילדים חייב להיות מספר שלם וחיובי.",
    SavedPlaces: "מספר המקומות השמורים חייב להיות מספר שלם ולא שלילי, וקטן ממספר הילדים.",
    isActive: "יש לבחור אם האירוע פעיל או לא פעיל.",
    detailingForParent: "יש להזין פרטים להורים.",
    detailingForVolun: "יש להזין פרטים למתנדבות.",
  }

  const requiredFieldMessages = {
    name: "יש להזין שם אירוע.",
    date: "יש להזין תאריך אירוע.",
    startReg: "יש להזין מועד פתיחת הרשמה.",
    endReg: "יש להזין מועד סיום הרשמה.",
    hour: "יש להזין שעה.",
    sumOfChilds: "יש להזין את מספר הילדים.",
    SavedPlaces: "יש להזין את מספר המקומות השמורים.",
    isActive: "יש לבחור סטטוס לאירוע.",
    detailingForParent: "יש להזין פרטים להורים.",
    detailingForVolun: "יש להזין פרטים למתנדבות.",
  }

  const validateField = (name, form) => {
    const field = form.elements.namedItem(name)
    if (!field) return ""
    const textFields = ["name", "detailingForParent", "detailingForVolun"]
    if (
      field.validity.valueMissing
      || (textFields.includes(name) && !field.value.trim())
    ) {
      return requiredFieldMessages[name] || "זהו שדה חובה."
    }

    if (field.validity.rangeUnderflow || field.validity.stepMismatch || field.validity.badInput) {
      return fieldValidationMessages[name] || "יש להזין ערך תקין."
    }

    if (name === "startReg" || name === "endReg") {
      const startReg = form.elements.namedItem("startReg").value
      const endReg = form.elements.namedItem("endReg").value
      if (startReg && endReg && new Date(startReg) >= new Date(endReg)) {
        return name === "startReg"
          ? "פתיחת ההרשמה חייבת להיות לפני סיום ההרשמה."
          : "סיום ההרשמה חייב להיות אחרי פתיחת ההרשמה."
      }
    }

    if (name === "sumOfChilds" || name === "SavedPlaces") {
      const childrenCount = form.elements.namedItem("sumOfChilds").value
      const savedPlacesCount = form.elements.namedItem("SavedPlaces").value
      if (
        childrenCount !== ""
        && savedPlacesCount !== ""
        && Number(savedPlacesCount) >= Number(childrenCount)
      ) {
        return name === "sumOfChilds"
          ? "מספר הילדים חייב להיות גדול ממספר המקומות השמורים."
          : "מספר המקומות השמורים חייב להיות קטן ממספר הילדים."
      }
    }

    return ""
  }

  const handleFieldBlur = (event) => {
    const { name, form } = event.target
    const message = validateField(name, form)
    setFieldErrors((current) => {
      if (message) return { ...current, [name]: message }
      const next = { ...current }
      delete next[name]
      return next
    })
  }

  const handleFieldFocus = (event) => {
    const { name } = event.target
    setErrorMessage("")
    setFieldErrors((current) => {
      if (!current[name]) return current
      const next = { ...current }
      delete next[name]
      return next
    })
  }

  const handleInvalid = (event) => {
    event.preventDefault()
    const { name, form } = event.target
    const message = validateField(name, form)
    if (message) setFieldErrors((current) => ({ ...current, [name]: message }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage("")
    setFieldErrors({})
    setSuccessMessage("")

    const form = event.currentTarget
    const formData = new FormData(form)
    const validationErrors = {}

    const startReg = formData.get("startReg")
    const endReg = formData.get("endReg")
    if (new Date(startReg) >= new Date(endReg)) {
      validationErrors.startReg = "פתיחת ההרשמה חייבת להיות לפני סיום ההרשמה."
    }

    const sumOfChilds = Number(formData.get("sumOfChilds"))
    const savedPlaces = Number(formData.get("SavedPlaces"))
    if (savedPlaces >= sumOfChilds) {
      validationErrors.SavedPlaces = "מספר המקומות השמורים חייב להיות קטן ממספר הילדים."
      validationErrors.sumOfChilds = "מספר הילדים חייב להיות גדול ממספר המקומות השמורים."
    }

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors)
      return
    }

    const payload = {
      name: formData.get("name").trim(),
      date: formData.get("date"),
      startReg,
      endReg,
      hour: formData.get("hour"),
      sumOfChilds,
      SavedPlaces: savedPlaces,
      isActive: formData.get("isActive") === "true",
      detailingForParent: formData.get("detailingForParent").trim(),
      detailingForVolun: formData.get("detailingForVolun").trim(),
    }

    setIsSubmitting(true)
    try {
      await api.post("/event", payload)
      form.reset()
      if (onClose) {
        onClose()
      } else {
        setSuccessMessage("האירוע נוצר בהצלחה.")
      }
    } catch (error) {
      const responseData = error.response?.data
      if (responseData?.details && typeof responseData.details === "object") {
        const localizedErrors = Object.fromEntries(
          Object.entries(responseData.details).map(([field, message]) => [
            field,
            /[\u0590-\u05FF]/u.test(message)
              ? message
              : fieldValidationMessages[field] || "הערך שהוזן אינו תקין.",
          ])
        )
        setFieldErrors(localizedErrors)
        setErrorMessage(responseData.message || "יש לתקן את השדות המסומנים.")
      } else {
        const duplicateField = responseData?.message?.match(/שדה (\w+)/u)?.[1]
        if (duplicateField) {
          setFieldErrors({ [duplicateField]: responseData.message })
          setErrorMessage("")
        } else {
          setErrorMessage(getErrorMessage(error))
        }
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const fieldError = (name) => fieldErrors[name] && (
    <small id={`event-${name}-error`} className="error-message" role="alert">
      {fieldErrors[name]}
    </small>
  )

  const fieldProps = (name) => ({
    "aria-invalid": Boolean(fieldErrors[name]),
    "aria-describedby": fieldErrors[name] ? `event-${name}-error` : undefined,
    onBlur: handleFieldBlur,
    onFocus: handleFieldFocus,
  })

  return (
    <Can permission="events">
    <form
      className="auth-card registration-card"
      onSubmit={handleSubmit}
      onInvalid={handleInvalid}
      dir="rtl"
    >
      <h1>יצירת אירוע</h1>
      {onClose && (
        <button className="secondary-button" type="button" onClick={onClose}>
          סגירת טופס האירוע
        </button>
      )}

      <div className="form-field">
        <label htmlFor="event-name">שם האירוע</label>
        <input id="event-name" name="name" type="text" required {...fieldProps("name")} />
        {fieldError("name")}
      </div>

      <div className="form-field">
        <label htmlFor="event-date">תאריך</label>
        <input id="event-date" name="date" type="date" required {...fieldProps("date")} />
        {fieldError("date")}
      </div>

      <div className="form-field">
        <label htmlFor="event-hour">שעה</label>
        <input id="event-hour" name="hour" type="time" required {...fieldProps("hour")} />
        {fieldError("hour")}
      </div>

      <div className="form-field">
        <label htmlFor="event-start-reg">פתיחת הרשמה</label>
        <input id="event-start-reg" name="startReg" type="datetime-local" required {...fieldProps("startReg")} />
        {fieldError("startReg")}
      </div>

      <div className="form-field">
        <label htmlFor="event-end-reg">סיום הרשמה</label>
        <input id="event-end-reg" name="endReg" type="datetime-local" required {...fieldProps("endReg")} />
        {fieldError("endReg")}
      </div>

      <div className="form-field">
        <label htmlFor="event-child-count">מספר ילדים</label>
        <input id="event-child-count" name="sumOfChilds" type="number" min="1" step="1" required {...fieldProps("sumOfChilds")} />
        {fieldError("sumOfChilds")}
      </div>

      <div className="form-field">
        <label htmlFor="event-saved-places">מקומות שמורים</label>
        <input id="event-saved-places" name="SavedPlaces" type="number" min="0" step="1" required {...fieldProps("SavedPlaces")} />
        {fieldError("SavedPlaces")}
      </div>

      <div className="form-field checkbox-field">
        <label htmlFor="event-active">אירוע פעיל</label>
        <select id="event-active" name="isActive" defaultValue="" required {...fieldProps("isActive")}>
          <option value="" disabled>בחרו סטטוס</option>
          <option value="true">פעיל</option>
          <option value="false">לא פעיל</option>
        </select>
        {fieldError("isActive")}
      </div>

      <div className="form-field">
        <label htmlFor="event-detailing-parent">פרטים להורים</label>
        <textarea id="event-detailing-parent" name="detailingForParent" rows="4" required {...fieldProps("detailingForParent")} />
        {fieldError("detailingForParent")}
      </div>

      <div className="form-field">
        <label htmlFor="event-detailing-volun">פרטים למתנדבות</label>
        <textarea id="event-detailing-volun" name="detailingForVolun" rows="4" required {...fieldProps("detailingForVolun")} />
        {fieldError("detailingForVolun")}
      </div>

      {errorMessage && <p className="form-message error-message" role="alert">{errorMessage}</p>}
      {successMessage && <p className="form-message success-message" role="status">{successMessage}</p>}

      <button className="primary-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "שומר..." : "הוספת האירוע"}
      </button>
    </form>
    </Can>
  )
};

export default AddEvent;