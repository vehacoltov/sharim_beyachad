import axios from "axios"
import { clearAuthStorage, getAccessToken } from "./authStorage"

// מרכז את כתובת השרת ואת הוספת Bearer Token לכל הקריאות; רכיבים אינם מטפלים בטוקן.
// בסביבת פיתוח ניתן לשנות את הכתובת באמצעות VITE_API_URL.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:7001",
})

// Interceptor רץ לפני כל בקשה; הוא קורא את הטוקן מהשירות המרכזי ומוסיף Bearer.
api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  // תשובה מוצלחת מועברת ללא שינוי לקוד שקרא ל-api.
  (response) => response,
  // מטפל בשגיאות אימות והרשאה לפני שהן מוחזרות לרכיב שיזם את הבקשה.
  (error) => {
    const requestHadToken = Boolean(error.config?.headers?.Authorization)
    const status = error.response?.status
    const requestUrl = error.config?.url || ""

    // כשל פרטי התחברות אינו מנתק משתמש, אך 401 מאסימון קיים מנקה session שפג תוקפו.
    if (
      requestHadToken &&
      status === 401 &&
      !/\/(login|register|verify-employee-access)(?:\/|$)/u.test(requestUrl)
    ) {
      clearAuthStorage()
      window.dispatchEvent(new Event("auth:unauthorized"))
    } else if (requestHadToken && status === 403) {
      // ייתכן שמנהל שינה הרשאות בזמן שהעובד מחובר; מרעננים אותן מהשרת לאחר סירוב.
      window.dispatchEvent(new Event("auth:refresh-permissions"))
    }

    return Promise.reject(error)
  },
)

/**
 * מחלצת הודעת משתמש מתשובת השרת; כשאין תשובת HTTP (למשל נתק רשת),
 * מחזירה הודעה כללית שאינה חושפת פרטים פנימיים של המערכת.
 */
export const getErrorMessage = (error) =>
  error.response?.data?.message || "אירעה שגיאה. נסו שוב מאוחר יותר."
