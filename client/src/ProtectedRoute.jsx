import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuth } from "./useAuth"

/**
 * שומר נתיב מפני משתמש לא מחובר או חסר הרשאה.
 * ממתין לטעינת session לפני החלטת ניווט כדי למנוע הפניה מוקדמת ושגויה.
 * Navigate מבצע הפניה declarative ושומר את המיקום הקודם לשיבה אחרי login.
 * children מאפשר להגן על רכיב יחיד; ללא children Outlet מציג נתיב צאצא.
 * role/roles ו-permission/permissions הם בדיקות ממשק בלבד; אכיפה מחייבת middleware בשרת.
 */
function ProtectedRoute({
  children,
  role,
  roles = [],
  permission,
  permissions = [],
  requireAll = true,
  loadingFallback,
}) {
  const { isAuthenticated, loading, authError, refreshUser, role: currentRole, hasPermission } = useAuth()
  const location = useLocation()

  if (loading) {
    return loadingFallback || <p role="status">בודק את מצב ההתחברות...</p>
  }

  if (!isAuthenticated) {
    if (authError) {
      return (
        <main className="page-shell" dir="rtl">
          <section className="auth-card" role="alert">
            <p>לא ניתן לאמת את ההתחברות כרגע: {authError}</p>
            <button className="primary-button" type="button" onClick={() => void refreshUser()}>
              ניסיון חוזר
            </button>
          </section>
        </main>
      )
    }
    return <Navigate to="/" replace state={{ from: location }} />
  }

  const requiredRoles = [...(role ? [role] : []), ...roles]
  const requiredPermissions = [...(permission ? [permission] : []), ...permissions]
  const roleMatches = requiredRoles.length === 0 || requiredRoles.includes(currentRole)
  const permissionMatches = requiredPermissions.length === 0 || (
    requireAll
      ? requiredPermissions.every(hasPermission)
      : requiredPermissions.some(hasPermission)
  )

  if (!roleMatches || !permissionMatches) {
    return <Navigate to="/unauthorized" replace />
  }

  return children || <Outlet />
}

export default ProtectedRoute
