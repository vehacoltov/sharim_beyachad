
import { useState } from "react"
import { api, getErrorMessage } from "../api"

const AddEvent = () => {
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage("")
    setSuccessMessage("")

    const formData = new FormData(event.currentTarget)
    const splitIds = (value) => value.split(",").map((id) => id.trim()).filter(Boolean)
    const children = splitIds(formData.get("Children") || "")
    const volunteers = splitIds(formData.get("Volunteers") || "")
    const objectIdPattern = /^[a-f\d]{24}$/iu

    if (!children.length || children.some((id) => !objectIdPattern.test(id))) {
      setErrorMessage("יש להזין מזהי MongoDB תקינים למסמכי הילדים באירוע.")
      return
    }
    if (!volunteers.length || volunteers.some((id) => !objectIdPattern.test(id))) {
      setErrorMessage("יש להזין מזהי MongoDB תקינים למסמכי המתנדבים באירוע.")
      return
    }

    const payload = {
      name: formData.get("name").trim(),
      Children: children,
      Volunteers: volunteers,
      date: formData.get("date"),
      isActive: formData.has("isActive"),
    }

    const id = formData.get("id")
    const sumOfChilds = formData.get("sumOfChilds")
    const savedPlaces = formData.get("SavedPlaces")
    const hour = formData.get("hour")
    const startReg = formData.get("startReg")
    const endReg = formData.get("endReg")
    const detailingForParent = formData.get("detailingForParent").trim()
    const detailingForVolun = formData.get("detailingForVolun").trim()

    if (id) payload.id = Number(id)
    if (sumOfChilds) payload.sumOfChilds = Number(sumOfChilds)
    if (savedPlaces) payload.SavedPlaces = Number(savedPlaces)
    if (hour) payload.hour = hour
    if (startReg) payload.startReg = startReg
    if (endReg) payload.endReg = endReg
    if (detailingForParent) payload.detailingForParent = detailingForParent
    if (detailingForVolun) payload.detailingForVolun = detailingForVolun

    setIsSubmitting(true)
    try {
      await api.post("/event", payload)
      event.currentTarget.reset()
      setSuccessMessage("האירוע נוצר בהצלחה.")
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="auth-card registration-card" onSubmit={handleSubmit} dir="rtl">
      <h1>יצירת אירוע</h1>

      <div className="form-field">
        <label htmlFor="event-name">שם האירוע</label>
        <input id="event-name" name="name" type="text" required />
      </div>

      <div className="form-field">
        <label htmlFor="event-children">מזהי רשומות ילדים באירוע</label>
        <input
          id="event-children"
          name="Children"
          type="text"
          placeholder="ObjectId אחד או יותר, מופרדים בפסיקים"
          required
        />
        <small>יש להזין מזהים של מסמכי ChildInEvent בני 24 תווים הקסדצימליים.</small>
      </div>

      <div className="form-field">
        <label htmlFor="event-volunteers">מזהי רשומות מתנדבים באירוע</label>
        <input
          id="event-volunteers"
          name="Volunteers"
          type="text"
          placeholder="ObjectId אחד או יותר, מופרדים בפסיקים"
          required
        />
        <small>יש להזין מזהים של מסמכי VolunteerInEvent בני 24 תווים הקסדצימליים.</small>
      </div>

      <div className="form-field">
        <label htmlFor="event-id">מספר אירוע</label>
        <input id="event-id" name="id" type="number" min="0" step="1" />
        <small>אופציונלי; חייב להיות ייחודי אם הוזן.</small>
      </div>

      <div className="form-field">
        <label htmlFor="event-date">תאריך</label>
        <input id="event-date" name="date" type="date" required />
      </div>

      <div className="form-field">
        <label htmlFor="event-start-reg">פתיחת הרשמה</label>
        <input id="event-start-reg" name="startReg" type="datetime-local" />
      </div>

      <div className="form-field">
        <label htmlFor="event-end-reg">סיום הרשמה</label>
        <input id="event-end-reg" name="endReg" type="datetime-local" />
      </div>

      <div className="form-field">
        <label htmlFor="event-hour">שעה</label>
        <input id="event-hour" name="hour" type="time" />
      </div>



      <div className="form-field">
        <label htmlFor="event-child-count">מספר ילדים</label>
        <input id="event-child-count" name="sumOfChilds" type="number" min="0" step="1" />
      </div>

      <div className="form-field">
        <label htmlFor="event-saved-places">מקומות שמורים</label>
        <input id="event-saved-places" name="SavedPlaces" type="number" min="0" step="1" />
      </div>

      <div className="form-field checkbox-field">
        <label htmlFor="event-active">אירוע פעיל</label>
        <input id="event-active" name="isActive" type="checkbox" />
      </div>

      <div className="form-field">
        <label htmlFor="event-detailing-parent">פרטים להורים</label>
        <textarea id="event-detailing-parent" name="detailingForParent" rows="4" />
      </div>

      <div className="form-field">
        <label htmlFor="event-detailing-volun">פרטים למתנדבים</label>
        <textarea id="event-detailing-volun" name="detailingForVolun" rows="4" />
      </div>

      {errorMessage && <p className="form-message error-message" role="alert">{errorMessage}</p>}
      {successMessage && <p className="form-message success-message" role="status">{successMessage}</p>}

      <button className="primary-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "שומר..." : "יצירת אירוע"}
      </button>
    </form>
  )
};

export default AddEvent;