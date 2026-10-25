/*
 * /register/child מחבר את טופס הילד ליצירה ישירה ב-POST /child.
 * Child אינו בעל פונקציית register כמו משתמשי parent/employee/volunteer.
 */
import Login from "./Login"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import RegEmployee from "./RegEmployee"
import RegParent from "./RegParent"
import RegVolun from "./RegVolun"
import RegChild from "./RegChild"
import PersonalArea from "./PersonalArea"
import "./App.css"

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
        <Route path="/register/child" element={<RegChild />} />
        {/* אזור אישי מוצג לאחר קבלת אסימון התחברות מהשרת. */}
        <Route path="/personal" element={<PersonalArea />} />
        {/* כתובת לא מוכרת חוזרת למסך הכניסה. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
