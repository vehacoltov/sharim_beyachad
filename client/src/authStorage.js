const TOKEN_KEY = "accessToken"
const LEGACY_SESSION_KEYS = ["loggedInUser", "accountType"]

/**
 * קוראת את Bearer Token מהאחסון המקומי.
 * זהו המקום היחיד שמכיר את מפתח האחסון, כדי שרכיבי ממשק לא יהיו תלויים בו.
 */
export const getAccessToken = () => window.localStorage.getItem(TOKEN_KEY)

/**
 * שומרת טוקן שהתקבל מתשובת התחברות ומסירה נתוני session ישנים.
 * לא שומרים כאן סיסמה או הרשאות: השרת הוא מקור האמת עבור פרטי המשתמש.
 */
export const saveAccessToken = (token) => {
  window.localStorage.setItem(TOKEN_KEY, token)
  clearLegacySessionData()
}

/**
 * מסירה עותקי משתמש ותפקיד מגרסאות קודמות של היישום.
 * הנתונים האלה אינם חתומים ולכן אסור להשתמש בהם להכרעה על זהות או הרשאה.
 */
export const clearLegacySessionData = () => {
  LEGACY_SESSION_KEYS.forEach((key) => window.localStorage.removeItem(key))
}

/**
 * מסיימת session בדפדפן על ידי הסרת הטוקן ונתוני התאימות הישנים.
 * JWT סטטeless אינו נמחק בצד השרת בפעולה זו; הוא יידחה לאחר תפוגתו.
 */
export const clearAuthStorage = () => {
  window.localStorage.removeItem(TOKEN_KEY)
  clearLegacySessionData()
}
