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
import ParentChildEditPage from "./Parent/ParentChildEditPage"
import UpdateParent from "./Parent/UpdateParent"
import UpdateVolunteer from "./Volunteer/UpdateVolunteer"
import PersonalEventsPage from "./PersonalEventsPage"
import PersonalArea from "./PersonalArea"
import ProtectedRoute from "./ProtectedRoute"
import "./App.css"
import UpdateEmployee from "./Employee/UpdateEmployee"

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

/**
 * מגדיר את היררכיית הניווט.
 * Route ללא path הוא layout route: הוא מוסיף הגנה בלי להוסיף חלק לכתובת.
 * ProtectedRoute בודק התחברות ותפקיד, ומציג את Route הבן דרך Outlet.
 * לכן /personal/events הוא כתובת אחת לשני תפקידים, ואילו פעולות פרופיל
 * ונתיבי רישום הילד נמצאים תחת guard ייעודי להורה.
 */
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
            <Route index element={<section dir="rtl" />} />
            {/* אירועים הם כתובת משותפת: הרשאה לשני התפקידים, והתוכן נבחר לפי role. */}
            <Route element={<ProtectedRoute roles={["parent", "volunteer"]} />}>
              <Route path="events" element={<PersonalEventsPage />} />
            </Route>
            <Route element={<ProtectedRoute role="parent" />}>
              {/* שלבי רישום הילד נמצאים בכתובות נפרדות כדי שקישור/רענון ישמרו את השלב. */}
              <Route
                path="events/:eventId/register/:childId"
                element={<ParentEventsPage registrationStep="details" />}
              />
              <Route
                path="events/:eventId/register/:childId/edit"
                element={<ParentEventsPage registrationStep="edit" />}
              />
              <Route path="parent-details" element={<UpdateParent />} />
              {/* שאר פעולות ניהול הפרופיל והרישום לילדים מוגבלות להורה. */}
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
            {/* נתיב הפרופיל מקונן ב-/personal ונגיש רק למתנדבת המאומתת. */}
            <Route element={<ProtectedRoute role="volunteer" />}>
              <Route path="volunteer-details" element={<UpdateVolunteer />} />
            </Route>

            {/* נתיב הפרופיל מקונן ב-/personal ונגיש רק לעובד/ת המאומת/ת. */}
            <Route element={<ProtectedRoute role="employee" />}>
              <Route path="employee-details" element={<UpdateEmployee />} />
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
