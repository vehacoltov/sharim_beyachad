import { useContext } from "react"
import AuthContext from "./authContext"

/**
 * Hook צריכה יחיד למידע ולפעולות האימות.
 * useContext מחבר את הרכיב ל-Provider הקרוב; שינוי value ב-Provider גורם
 * ל-React לעדכן אוטומטית את הרכיב. שגיאה מחוץ ל-Provider מצביעה על חיבור שגוי.
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth חייב להיקרא בתוך AuthProvider.")
  }
  return context
}
