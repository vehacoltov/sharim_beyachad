import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../useAuth"
import { api, getErrorMessage } from "../api"
import RegChildToEvent from "../Child/RegChildToEvent"

/**
 * כרטיס אירוע משותף לתצוגת הורה ומתנדבת, אבל פעולות ההרשמה מופרדות לפי role.
 * אצל הורה נבחר ילד וממשיכים לנתיב רישום; אצל מתנדבת נוצרת הרשמת VolunteerEvent.
 * שדות registration* ו-isVolunteerRegistered מחושבים/נטענים מהשרת, לא מהימנים
 * כתחליף לבדיקות ההרשאה והכפילות שמבוצעות שוב בשרת.
 */
const EventDetails = ({
    event,
    selectedChildId,
    registrationStep,
    childrenForRegistration,
    childrenLoading,
    childrenError,
    onChildUpdated,
    onRegistrationSuccess,
}) => {
    const [showChildSelection, setShowChildSelection] = useState(false)
    // מצב התחלתי מגיע מהשרת; השרת הוא מקור האמת למניעת הרשמה כפולה.
    const [volunteerRegistered, setVolunteerRegistered] = useState(Boolean(event.isVolunteerRegistered))
    const [showVolunteerRegistrationForm, setShowVolunteerRegistrationForm] = useState(false)
    const [favouredChild, setFavouredChild] = useState("")
    const [volunteerRegistrationPending, setVolunteerRegistrationPending] = useState(false)
    const [volunteerRegistrationError, setVolunteerRegistrationError] = useState("")
    // const [volunteerRegistrationSuccess, setVolunteerRegistrationSuccess] = useState("")
    const { role } = useAuth()
    const navigate = useNavigate()

    const registerForChild = (childId) => {
        setShowChildSelection(false)
        // מזהי האירוע והילד בכתובת מאפשרים לשחזר ולשתף את שלב הרישום.
        navigate(`${event._id}/register/${childId}`)
    }

    const handleRegistrationClick = () => {
        if (role !== "parent") return
        if (childrenForRegistration.length === 1) {
            registerForChild(childrenForRegistration[0]._id)
        } else if (childrenForRegistration.length > 1) {
            setShowChildSelection(true)
        }
    }

    /**
     * שולח את הרשמת המתנדבת לאחר שליחת הטופס.
     * favouredChild הוא טקסט העדפה אופציונלי (לא מזהה ילד ולא reference).
     * הכרטיס עובר למצב registered רק אחרי תשובת POST מוצלחת, וכך הודעת
     * ההצלחה אינה מוצגת לפני שהשרת יצר את הקשר ושייך אותו לאירוע.
     */
    const registerVolunteer = async (submitEvent) => {
        submitEvent.preventDefault()
        setVolunteerRegistrationError("")
        setVolunteerRegistrationPending(true)
        try {
            const preferredChild = favouredChild.trim()
            // POST אחד יוצר את הקשר מתנדבת-אירוע; favouredChild הוא שדה רשות.
            await api.post("/volunteer-event/register", {
                event: event._id,
                favouredChild: preferredChild,
            })
            setVolunteerRegistered(true)
            setShowVolunteerRegistrationForm(false)
            // setVolunteerRegistrationSuccess(preferredChild
            //     ? `נרשמת לאירוע בהצלחה. הילד/ה שבחרת: ${preferredChild}.`
            //     : "נרשמת לאירוע בהצלחה.")
        } catch (error) {
            // למשל 409 אם ההרשמה נסגרה או אם בקשה אחרת כבר יצרה רישום.
            setVolunteerRegistrationError(getErrorMessage(error))
        } finally {
            setVolunteerRegistrationPending(false)
        }
    }

    /**
     * מבטל רק את רישום המתנדבת המחוברת לאירוע הנוכחי.
     * עדכון ה-UI מתבצע רק אחרי הצלחת השרת; כשל משאיר את מצב ההרשמה הקודם
     * כדי שלא יוצג כאילו הביטול הצליח כשעדיין קיימת הרשמה במסד.
     */
    const cancelVolunteerRegistration = async () => {
        setVolunteerRegistrationError("")
        // setVolunteerRegistrationSuccess("")
        setVolunteerRegistrationPending(true)
        try {
            // השרת גוזר את מזהה המתנדבת מה-JWT, לכן הלקוח שולח רק את מזהה האירוע.
            await api.post("/volunteer-event/unregister", { event: event._id })
            setVolunteerRegistered(false)
            setFavouredChild("")
            // setVolunteerRegistrationSuccess("ההרשמה לאירוע בוטלה. אפשר להירשם שוב.")
        } catch (error) {
            setVolunteerRegistrationError(getErrorMessage(error))
        } finally {
            setVolunteerRegistrationPending(false)
        }
    }

    const selectedChild = childrenForRegistration.find((child) => child._id === selectedChildId)

    return (
        <article className="parent-event-card">
            <h3>{event.name}</h3>
            <p><strong>תאריך:</strong> {new Date(event.date).toLocaleDateString("he-IL")}</p>
            <p><strong>שעה:</strong> {event.hour}</p>

            
            {role === "parent" && <>
            <p><strong>מחיר:</strong> {Number(event.price ?? 0).toLocaleString("he-IL", { style: "currency", currency: "ILS" })}</p>

                <p><strong>פרטים להורים:</strong> {event.detailingForParent}</p>
            </>}
            {/* אותו כרטיס מציג פרטים לשני התפקידים; כל פעולת רישום מוצגת רק לבעליה. */}
            {role === "volunteer" && (
                <>
                <p><strong>פרטים למתנדבת:</strong> {event.detailingForVolun}</p>
                {/* state מקומי מעדכן מיד אחרי POST; בטעינה הבאה הערך מאותחל מתשובת השרת. */}
                {volunteerRegistered ? (
                    <div className="volunteer-registration-status">
                        <button
                            className={`secondary-button volunteer-registration-button${volunteerRegistrationPending ? " is-pending" : ""}`}
                            type="button"
                            onClick={cancelVolunteerRegistration}
                            disabled={volunteerRegistrationPending}
                        >
                            {volunteerRegistrationPending ? "מבטלת הרשמה..." : "ביטול הרשמה"}
                        </button>
                        <p className="form-message success-message" role="status">
                            נרשמת לאירוע.
                        </p>
                    </div>
                ) : event.volunteerRegistrationOpen ? (
                    showVolunteerRegistrationForm ? (
                        <form className="volunteer-registration-form" onSubmit={registerVolunteer}>
                            <div className="form-field">
                                <label htmlFor={`favoured-child-${event._id}`}>
                                    שם הילד/ה שהיית רוצה ללוות
                                </label>
                                <input
                                    id={`favoured-child-${event._id}`}
                                    name="favouredChild"
                                    type="text"
                                    value={favouredChild}
                                    onChange={(changeEvent) => setFavouredChild(changeEvent.target.value)}
                                    maxLength={100}
                                    autoFocus
                                />
                            </div>
                            <div className="volunteer-registration-actions">
                                <button
                                    className={`primary-button volunteer-registration-button${volunteerRegistrationPending ? " is-pending" : ""}`}
                                    type="submit"
                                    disabled={volunteerRegistrationPending}
                                >
                                    {volunteerRegistrationPending ? "נרשמת..." : "שליחת הרשמה"}
                                </button>
                                <button
                                    className="secondary-button"
                                    type="button"
                                    onClick={() => setShowVolunteerRegistrationForm(false)}
                                    disabled={volunteerRegistrationPending}
                                >
                                    ביטול
                                </button>
                            </div>
                        </form>
                    ) : (
                        <button
                            className="primary-button volunteer-registration-button"
                            type="button"
                            onClick={() => setShowVolunteerRegistrationForm(true)}
                        >
                            הרשמה לאירוע
                        </button>
                    )
                ) : (
                    <p>{event.volunteerRegistrationMessage}</p>
                )}
                {/* {!volunteerRegistered && volunteerRegistrationSuccess && (
                    <p className="form-message success-message" role="status">
                        {volunteerRegistrationSuccess}
                    </p>
                )} */}

                {volunteerRegistrationError && (
                    <p className="form-message error-message" role="alert">
                        {volunteerRegistrationError}
                    </p>
                )}
                </>
            )}
            {/* ההורה ממשיך לזרימה המקורית: בחירת ילד והמשך לנתיב וטופס רישום הילד. */}
            {role === "parent" && event.registrationOpen && !selectedChildId ? (
                <button
                    onClick={handleRegistrationClick}
                    className="primary-button"
                    type="button"
                    disabled={role === "parent" && (
                        childrenLoading || Boolean(childrenError) || childrenForRegistration.length === 0
                    )}
                >

                    {role === "parent" && childrenLoading ? "טוען ילדים..." : "הרשמה"}
                </button>
            ) : role === "parent" && !event.registrationOpen ? (
                <p>{event.registrationMessage}</p>
            ) : null}
            {selectedChildId && selectedChild && event.registrationOpen && (
                <RegChildToEvent
                    event={event}
                    childrenForRegistration={[selectedChild]}
                    registrationStep={registrationStep}
                    onCancel={() => navigate("/personal/events")}
                    onChildUpdated={onChildUpdated}
                    onRegistrationSuccess={onRegistrationSuccess}
                />
            )}
            {selectedChildId && !selectedChild && (
                <p className="form-message error-message" role="alert">
                    הילד שנבחר אינו משויך לחשבון הזה.
                </p>
            )}
            {showChildSelection && (
                <div className="dialog-backdrop" onClick={() => setShowChildSelection(false)}>
                    <section
                        className="dialog-card"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={`event-child-selection-${event._id}`}
                        dir="rtl"
                        onClick={(clickEvent) => clickEvent.stopPropagation()}
                    >
                        <h2 id={`event-child-selection-${event._id}`}>בחירת ילד להרשמה</h2>
                        <p>לאיזה ילד תרצו לרשום את {event.name}?</p>
                        {childrenForRegistration.map((child) => (
                            <button
                                className="secondary-button"
                                type="button"
                                key={child._id}
                                onClick={() => registerForChild(child._id)}
                            >
                                {child.fullName}
                            </button>
                        ))}
                        <button
                            className="text-link"
                            type="button"
                            onClick={() => setShowChildSelection(false)}
                        >
                            ביטול
                        </button>
                    </section>
                </div>
            )}
        </article>
    )
}

export default EventDetails
