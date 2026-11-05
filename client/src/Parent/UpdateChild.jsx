import { useState } from "react"
import { api, getErrorMessage } from "../api"
import { childFields } from "./RegChild"

const parentEditableFields = childFields.filter(
  (field) => !["status", "category", "notes", "img"].includes(field.name)
)

const UpdateChild = ({ child, onCancel, onSuccess, read, setToEdit }) => {
  const [values, setValues] = useState(() =>
    Object.fromEntries(parentEditableFields.map((field) => {
      const value = child[field.name]
      if (field.type === "array") return [field.name, Array.isArray(value) ? value.join(", ") : ""]
      if (field.type === "boolean") return [field.name, Boolean(value)]
      return [field.name, value ?? ""]
    }))
  )
  const [fieldErrors, setFieldErrors] = useState({})
  const [errorMessage, setErrorMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  // const [toRead, setToRead] = useState(read ? true : false)
  const toRead = read ? true : false

  const validateField = (field, value) => {
    const textValue = String(value ?? "")
    if (field.required && !textValue.trim()) {
      return field.requiredMessage || "זהו שדה חובה."
    }
    if (!textValue.trim() || !field.validate || field.validate(textValue)) return ""
    return field.validationMessage || "הערך שהוזן אינו תקין."
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage("")

    const errors = Object.fromEntries(
      parentEditableFields
        .map((field) => [field.name, validateField(field, values[field.name])])
        .filter(([, message]) => message)
    )
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      setErrorMessage("יש לתקן את השדות המסומנים.")
      return
    }

    const payload = { ...values }
    for (const field of parentEditableFields) {
      if (field.type === "number") {
        if (payload[field.name] === "") delete payload[field.name]
        else payload[field.name] = Number(payload[field.name])
      } else if (field.type === "array") {
        payload[field.name] = payload[field.name]
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      }
    }

    setIsSubmitting(true)
    try {
      const { data } = await api.patch(`/child/${child._id}`, payload)
      onSuccess?.(data)
    } catch (error) {
      const details = error.response?.data?.details
      if (details && typeof details === "object") {
        setFieldErrors(details)
        setErrorMessage("יש לתקן את השדות המסומנים.")
      } else {
        setErrorMessage(getErrorMessage(error))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateClick = (event) => {
    event.preventDefault()
    setToEdit(true)
  }

  const confirmClick = (event) => {
    event.preventDefault()
    onSuccess?.(child)
  }

  return (

    <form className="auth-card registration-card" onSubmit={handleSubmit} dir="rtl">

      <h2>{read ? "פרטי ילד" : "עדכון פרטי ילד"} </h2>
      {parentEditableFields.map((field) => (
        <div className="form-field" key={field.name}>
          <label htmlFor={`update-child-${field.name}`}>{field.label}</label>
          {field.type === "boolean" ? (
            <input disabled={toRead}
              id={`update-child-${field.name}`}
              name={field.name}
              type="checkbox"
              checked={values[field.name]}
              onChange={(event) => setValues((current) => ({
                ...current,
                [field.name]: event.target.checked,
              }))}
            />
          ) : field.type === "select" ? (
            <select disabled={toRead}
              id={`update-child-${field.name}`}
              name={field.name}
              value={values[field.name]}
              onChange={(event) => setValues((current) => ({
                ...current,
                [field.name]: event.target.value,
              }))}
            >
              <option value="">בחרו {field.label}</option>
              {field.options.map((option) => (
                <option disabled={toRead} key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          ) : (
            <input
              disabled={toRead}
              id={`update-child-${field.name}`}
              name={field.name}
              type={field.type === "array" ? "text" : field.type}
              autoComplete={field.autoComplete}
              min={field.min}
              step={field.step}
              placeholder={field.placeholder}
              value={values[field.name]}
              required={field.required}
              onFocus={() => {
                setFieldErrors((current) => {
                  if (!current[field.name]) return current
                  const next = { ...current }
                  delete next[field.name]
                  return next
                })
              }}
              onBlur={() => {
                const message = validateField(field, values[field.name])
                setFieldErrors((current) => {
                  const next = { ...current }
                  if (message) next[field.name] = message
                  else delete next[field.name]
                  return next
                })
              }}
              onChange={(event) => setValues((current) => ({
                ...current,
                [field.name]: event.target.value,
              }))}
              aria-invalid={Boolean(fieldErrors[field.name])}
              aria-describedby={fieldErrors[field.name] ? `update-child-${field.name}-error` : undefined}
            />
          )}
          {field.help && <small>{field.help}</small>}
          {fieldErrors[field.name] && (
            <small
              id={`update-child-${field.name}-error`}
              className="error-message"
              role="alert"
            >
              {fieldErrors[field.name]}
            </small>
          )}
        </div>
      ))}
      {errorMessage && <p className="form-message error-message" role="alert">{errorMessage}</p>}
      {!toRead &&
        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "שומר..." : "שמירת פרטי הילד"}
        </button>}
      {toRead && <>
        <button className="primary-button" type="button" onClick={confirmClick}>אישור</button>
        <button onClick={updateClick} className="primary-button" type="button">עדכון פרטי הילד</button></>}
      <button className="secondary-button" type="button" onClick={onCancel} disabled={isSubmitting}>
        ביטול
      </button>
    </form>
  )
}

export default UpdateChild
