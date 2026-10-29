import axios from "axios"

// מרכז את כתובת השרת ואת כותרת ה-JSON לכל קריאות הלקוח.
// בסביבת פיתוח ניתן לשנות את הכתובת באמצעות VITE_API_URL.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:7001",
})

// מחלץ הודעת שגיאה שהשרת החזיר, עם הודעה כללית לשגיאות רשת.
export const getErrorMessage = (error) =>
  error.response?.data?.message || "אירעה שגיאה. נסו שוב מאוחר יותר."
