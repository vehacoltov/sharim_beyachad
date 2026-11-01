import { useCallback, useEffect, useMemo, useState } from "react"
import { api, getErrorMessage } from "./api"
import AuthContext from "./authContext"
import {
  clearAuthStorage,
  clearLegacySessionData,
  getAccessToken,
  saveAccessToken,
} from "./authStorage"

const permissionsFor = (user) =>
  Array.isArray(user?.validActions) ? user.validActions : []

// מאחדת את פורמט תשובת ההתחברות ואת פורמט /auth/me למבנה session יחיד ב-Context.
// הרשאות נלקחות מהשדה הכללי, ובתאימות לתשובות ישנות גם מ-user.validActions.
const sessionFromResponse = (data) => ({
  user: data.user,
  role: data.role || data.accountType,
  permissions: Array.isArray(data.permissions) ? data.permissions : permissionsFor(data.user),
})

/**
 * מרכז את זהות המשתמש והרשאות הפעולה בזיכרון React.
 * useState מנהל את הנתונים; שינוי value ב-Provider גורם ל-React לרנדר מחדש
 * את כל הרכיבים שקראו useAuth. useEffect משחזר את המושב לאחר טעינת היישום.
 * הטוקן נשאר באחסון המקומי רק דרך authStorage, וכל בקשת API מקבלת אותו דרך api.js.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [permissions, setPermissions] = useState([])
  const [loading, setLoading] = useState(() => Boolean(getAccessToken()))
  const [authError, setAuthError] = useState("")

  // מנקה את הטוקן ואת כל נתוני המשתמש שבזיכרון כדי שלא יישאר session חלקי.
  const clearSession = useCallback(() => {
    clearAuthStorage()
    setUser(null)
    setRole(null)
    setPermissions([])
    setAuthError("")
  }, [])

  /**
   * מרעננת את פרטי החשבון מול השרת במקום לסמוך על cache מקומי.
   * 401 מסמן שהאימות נכשל ולכן המושב נמחק; שגיאת רשת משאירה את הטוקן,
   * מפני שכשל זמני בתקשורת אינו הוכחה שהמשתמש התנתק.
   */
  const refreshUser = useCallback(async () => {
    if (!getAccessToken()) {
      clearSession()
      setLoading(false)
      return null
    }

    clearLegacySessionData()
    setLoading(true)
    setAuthError("")
    try {
      // לאחר רענון דף, השרת מאמת את ה-JWT וטוען מחדש את החשבון ואת ההרשאות העדכניות.
      const { data } = await api.get("/auth/me")
      const session = sessionFromResponse(data)
      setUser(session.user)
      setRole(session.role)
      setPermissions(session.permissions)
      return session.user
    } catch (error) {
      if (error.response?.status === 401) {
        clearSession()
        return null
      }

      // שגיאת רשת אינה הוכחה שהטוקן נפסל: משאירים אותו ומאפשרים ניסיון חוזר.
      setAuthError(getErrorMessage(error))
      return null
    } finally {
      setLoading(false)
    }
  }, [clearSession])

  /**
   * שולחת פרטי כניסה לנתיב המתאים לסוג החשבון, ושומרת session רק לאחר
   * קבלת טוקן ומשתמש בתשובה. finally מאפס loading גם בהצלחה וגם בכשל.
   */
  const login = useCallback(async (accountType, endpoint, credentials) => {
    setLoading(true)
    setAuthError("")
    try {
      const { data } = await api.post(endpoint, credentials)
      if (typeof data.accessToken !== "string" || !data.user) {
        throw new Error("תגובת ההתחברות מהשרת אינה תקינה.")
      }

      saveAccessToken(data.accessToken)
      const session = sessionFromResponse(data)
      if (session.role !== accountType) {
        throw new Error("סוג החשבון שהוחזר מהשרת אינו תואם למסלול ההתחברות.")
      }
      setUser(session.user)
      setRole(session.role)
      setPermissions(session.permissions)
      return session.user
    } catch (error) {
      setAuthError(getErrorMessage(error))
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  // התנתקות מקומית: מוחקת טוקן ומאפסת מצב; השרת לא מנהל רשימת ביטול JWT.
  const logout = useCallback(() => {
    clearSession()
    setLoading(false)
  }, [clearSession])

  useEffect(() => {
    // מאזין לאסימון שפג תוקפו ולשינוי הרשאות שזוהו בשכבת API.
    // האזנה זו מחברת תוצאת HTTP לשינוי state כדי שכל צרכני ה-Context יתעדכנו.
    let active = true
    // מטפל באירוע 401 מבקשת API מוגנת ומסיים את המושב בכל צרכני ה-Context.
    const handleUnauthorized = () => {
      clearSession()
      setLoading(false)
    }
    // לאחר 403 מבקש מהשרת הרשאות עדכניות; האכיפה עצמה נשארת בצד השרת.
    const handlePermissionRefresh = () => {
      void refreshUser()
    }

    window.addEventListener("auth:unauthorized", handleUnauthorized)
    window.addEventListener("auth:refresh-permissions", handlePermissionRefresh)
    clearLegacySessionData()
    if (getAccessToken()) {
      // טעינה אסינכרונית בעת עליית האפליקציה; loading מאותחל לפי קיום טוקן,
      // ולכן הנתיבים המוגנים ממתינים לתוצאה בלי לעדכן state באופן סינכרוני ב-effect.
      api.get("/auth/me")
        .then(({ data }) => {
          if (!active) return
          const session = sessionFromResponse(data)
          setUser(session.user)
          setRole(session.role)
          setPermissions(session.permissions)
        })
        .catch((error) => {
          if (!active) return
          if (error.response?.status === 401) {
            clearSession()
          } else {
            // שגיאת רשת אינה הוכחה שהטוקן נפסל: מאפשרים למשתמש לנסות שוב.
            setAuthError(getErrorMessage(error))
          }
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    }
    return () => {
      // מונע עדכון state מתשובת רשת שמגיעה אחרי ש-Provider הוסר מהעץ.
      active = false
      window.removeEventListener("auth:unauthorized", handleUnauthorized)
      window.removeEventListener("auth:refresh-permissions", handlePermissionRefresh)
    }
  }, [clearSession, refreshUser])

  // בודקת הרשאה מקומית לצורכי תצוגה בלבד; השרת חייב לאכוף כל פעולה רגישה בנפרד.
  const hasPermission = useCallback(
    (permission) => permissions.includes(permission),
    [permissions],
  )

  // memo מייצב את אובייקט ה-Context בין רינדורים, אך מחליף אותו כשערכי session משתנים.
  // החלפה זו היא האות ל-React לרנדר מחדש את הרכיבים שמשתמשים ב-useAuth.
  const value = useMemo(() => ({
    user,
    role,
    accountType: role,
    permissions,
    loading,
    isAuthenticated: Boolean(user),
    authError,
    login,
    logout,
    refreshUser,
    hasPermission,
  }), [user, role, permissions, loading, authError, login, logout, refreshUser, hasPermission])

  // children הם כל רכיבי היישום; Provider מאפשר להם לצרוך את אותו מצב התחברות.
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
