/*
 * /register/child מחבר את טופס הילד ליצירה ישירה ב-POST /child.
 * Child אינו בעל פונקציית register כמו משתמשי parent/employee/volunteer.
 */
import Login from "./Login"
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate } from "react-router-dom"
import RegEmployee from "./Registration/RegEmployee"
import RegParent from "./Registration/RegParent"
import RegVolun from "./Registration/RegVolun"
import RegChild from "./Parent/RegChild"
import PersonalArea from "./PersonalArea"
import EmployeePA from "./Employee/EmployeePA"
import AddEvent from "./Event/AddEvent"
import AllEvents from "./Event/AllEvents"
import ManageEvent from "./Event/ManageEvent"
import Matching from "./Event/Matching"
import ProtectedRoute from "./ProtectedRoute"
import "./App.css"

// ביטול או שמירה מוצלחת מפעילים onClose ומחזירים למסך העובד; בשגיאה הטופס נשאר פתוח,
// כי AddEvent אינו מפעיל את ה־callback בכשל. replace מונע הוספת שלב להיסטוריה הישנה.
function EmployeeAddEventRoute() {
  const navigate = useNavigate()
  return <AddEvent onClose={() => navigate("/EmployeePA", { replace: true })} />
}

// מציג יעד ברור למשתמש מאומת שניסה לפתוח נתיב שאינו מורשה עבורו.
function Unauthorized() {
  return (
    <main className="page-shell" dir="rtl">
      <section className="auth-card">
        <h1>אין הרשאה</h1>
        <p>החשבון המחובר אינו מורשה להציג את העמוד או לבצע את הפעולה.</p>
        <Link to="/personal">חזרה לאזור האישי</Link>
      </section>
    </main>
  )
}

// מגדיר את ה-Router; Route ללא path משמש layout route, ו-ProtectedRoute מחזיר Outlet.
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* מסך כניסה יחיד המשותף לכל סוגי החשבונות. */}
        <Route path="/" element={<Login />} />
        {/* מסכי ההרשמה מקושרים מתוך חלונית הבחירה במסך הכניסה. */}
        <Route path="/register/parent" element={<RegParent />} />
        <Route path="/register/volunteer" element={<RegVolun />} />
        <Route path="/register/employee" element={<RegEmployee />} />
        <Route element={<ProtectedRoute role="parent" />}>
          <Route path="/register/child" element={<RegChild />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="/personal" element={<PersonalArea />} />
        </Route>
        {/* EmployeePA משמשת מעטפת משותפת: הנתיבים מציגים את תוכן המסך ב־Outlet. */}
        <Route element={<ProtectedRoute role="employee" />}>
          <Route path="/EmployeePA" element={<EmployeePA />}>
            {/* המסכים הוטמעו בעבר רק תחת Can(permission="events"); הנתיבים שומרים אותה הגבלה. */}
            <Route element={<ProtectedRoute permission="events" />}>
              <Route path="AllEvents" element={<AllEvents />} />
              <Route path="AddEvent" element={<EmployeeAddEventRoute />} />
              <Route path="UpdateEvent/:eventId" element={<ManageEvent />} />
            </Route>
            {/* שליפות האירוע, הרשומות והמתנדבות דורשות events, matching ו-employees בהתאמה. */}
            <Route element={<ProtectedRoute permissions={["events", "matching", "employees"]} />}>
              <Route path="Matching/:eventId" element={<Matching />} />
            </Route>
          </Route>
        </Route>
        <Route path="/unauthorized" element={<Unauthorized />} />
        {/* כתובת לא מוכרת חוזרת למסך הכניסה. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
