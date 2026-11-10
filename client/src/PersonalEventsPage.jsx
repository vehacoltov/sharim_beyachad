import { Navigate } from "react-router-dom"
import AllEvents from "./Event/AllEvents"
import ParentEventsPage from "./Parent/ParentEventsPage"
import { useAuth } from "./useAuth"

/**
 * בוחר את תוכן עמוד האירועים לאחר שה-Route guard התיר parent או volunteer.
 * נתיב משותף מונע שתי הגדרות מתחרות לאותה כתובת; לכל תפקיד מוצג רכיב
 * שמכיר את הנתונים והפעולות שלו (ילדי ההורה לעומת הרשמת המתנדבת).
 */
function PersonalEventsPage() {
  const { role } = useAuth()

  // ParentEventsPage מקבל את רשימת הילדים מ-ParentPA דרך Outlet context.
  if (role === "parent") {
    return <ParentEventsPage />
  }

  // AllEvents אינו דורש נתוני ילדים; סטטוס המתנדבת מגיע לכל אירוע מה-API.
  if (role === "volunteer") {
    return <AllEvents />
  }

  return <Navigate to="/unauthorized" replace />
}

export default PersonalEventsPage
