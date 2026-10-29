const Permission = require("../models/Permission")
const { isValidPassword, verifyPassword } = require("./password")

const REGISTRATION_ACTION = "registation"

// מאתר הרשאה לפי סיסמת הגישה ומקבל רק הרשאה ייחודית שמורשית לרישום עובדים.
const findEmployeePermission = async (accessPassword) => {
    // דוחים סיסמאות ריקות או ארוכות מהמגבלה הנתמכת על ידי bcrypt.
    if (!isValidPassword(accessPassword)) return null

    // שם וסיסמה מוסתרים בברירת מחדל, ולכן נשלפים רק לצורך אימות הקוד.
    const permissions = await Permission.find().select("+name +password")
    const matchingPermissions = []
    // לא מסתפקים בהתאמה הראשונה: קוד הרשאה כפול ייחשב עמום ולא יאושר.
    for (const permission of permissions) {
        if (await verifyPassword(accessPassword, permission.password)) {
            matchingPermissions.push(permission)
        }
    }

    if (matchingPermissions.length !== 1) return null

    const matchingPermission = matchingPermissions[0]
    if (!matchingPermission.validActions.includes(REGISTRATION_ACTION)) return null
    return matchingPermission
}

module.exports = { findEmployeePermission }
