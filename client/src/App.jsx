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
import ParentEventsPage from "./Parent/ParentEventsPage"
import ParentPA from "./Parent/ParentPA"
import ParentChildEditPage from "./Parent/ParentChildEditPage"
import ParentEventRegistrationPage from "./Parent/ParentEventRegistrationPage"
import UpdateParent from "./Parent/UpdateParent"
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
          <Route path="/personal" element={<PersonalArea />}>
            <Route element={<ProtectedRoute role="parent" />}>
              <Route element={<ParentPA />}>
                <Route
                  index
                  element={
                    <section dir="rtl">
                    </section>
                  }
                />
                {/* כל המסכים האלה נשארים תחת אזור ההורה ומוגנים לפי תפקיד. */}
                <Route path="events" element={<ParentEventsPage />} />
                <Route
                  path="events/:eventId/register/:childId"
                  element={<ParentEventRegistrationPage />}
                />
                <Route path="parent-details" element={<UpdateParent />} />
                <Route
                  path="children/:childId/edit"
                  element={<ParentChildEditPage />}
                />
                <Route
                  path="reg-child"
                  element={
                    <RegChild
                      cancelPath="/personal"
                      successPath="/personal"
                      embedded
                      successState={{
                        successMessage: "רישום הילד הושלם בהצלחה.",
                        refreshChildren: true,
                      }}
                    />
                  }
                />
              </Route>
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
