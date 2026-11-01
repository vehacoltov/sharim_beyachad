import { useAuth } from "./useAuth"

/**
 * מסתיר תוכן בממשק לפי תפקיד או הרשאה; אין בכך תחליף לאכיפה בשרת.
 * permission ו-permissions מאפשרים להעביר הרשאה יחידה או רשימה; role ו-roles
 * פועלים באותה צורה עבור סוגי חשבון. requireAll קובע אם נדרשות כל ההרשאות
 * או אחת מהן. children הם התוכן המותנה ו-fallback מוצג כאשר הבדיקה נכשלת.
 */
function Can({
  permission,
  permissions = [],
  role,
  roles = [],
  requireAll = true,
  fallback = null,
  children,
}) {
  const { role: currentRole, hasPermission } = useAuth()
  const requiredPermissions = [...(permission ? [permission] : []), ...permissions]
  const requiredRoles = [...(role ? [role] : []), ...roles]
  const roleMatches = requiredRoles.length === 0 || requiredRoles.includes(currentRole)
  const permissionMatches = requiredPermissions.length === 0 || (
    requireAll
      ? requiredPermissions.every(hasPermission)
      : requiredPermissions.some(hasPermission)
  )

  return roleMatches && permissionMatches ? children : fallback
}

export default Can
