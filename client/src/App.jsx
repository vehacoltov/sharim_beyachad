/*
 * /register/child מחבר את טופס הילד ליצירה ישירה ב-POST /child.
 * Child אינו בעל פונקציית register כמו משתמשי parent/employee/volunteer.
 */
import Login from "./Login"
import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom"
import RegEmployee from "./Registration/RegEmployee"
import RegParent from "./Registration/RegParent"
import RegVolun from "./Registration/RegVolun"
import RegChild from "./Parent/RegChild"
import PersonalArea from "./PersonalArea"
import ProtectedRoute from "./ProtectedRoute"
import "./App.css"

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
        <Route path="/unauthorized" element={<Unauthorized />} />
        {/* כתובת לא מוכרת חוזרת למסך הכניסה. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
