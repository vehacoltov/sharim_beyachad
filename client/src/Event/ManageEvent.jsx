// הנתיב והעברת מזהה האירוע כבר פעילים; ממשק ניהול האירוע יתווסף בשלב נפרד.
import { useNavigate, useParams } from "react-router-dom"
import Can from "../Can"

// מסך ניהול האירוע מספק קישור למסך ההתאמה תוך שימוש במזהה שבכתובת הנוכחית.
function ManageEvent() {
    const navigate = useNavigate()
    const { eventId } = useParams()

    return (
        <section className="manage-event" dir="rtl" aria-labelledby="manage-event-heading">
            <h2 id="manage-event-heading">ניהול האירוע</h2>
            <Can permissions={["events", "matching", "employees"]}>
                <button
                    className="primary-button"
                    type="button"
                    onClick={() => navigate(`/EmployeePA/Matching/${eventId}`)}
                >
                    צפייה בילדים ובמתנדבות לאירוע
                </button>
            </Can>
        </section>
    )
}

export default ManageEvent