const Permission = require("../models/Permission")
const { isValidPassword, verifyPassword } = require("./password")

// אלה הערכים היחידים שמודל Employee מקבל בשדה ההרשאה שלו.
const EMPLOYEE_ROLES = ["manager", "canMatch", "Basic"]

// מאתר הרשאת עובד לפי סיסמת הגישה, ומחזיר תפקיד רק אם יש התאמה יחידה ומוכרת.
const findEmployeePermission = async (accessPassword) => {
    // דוחים סיסמאות ריקות או ארוכות מהמגבלה הנתמכת על ידי bcrypt.
    if (!isValidPassword(accessPassword)) return null

    // שני הערכים select:false במודל Permission, לכן מבקשים אותם במפורש לבדיקה בלבד.
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
    // שם ההרשאה עצמו נשמר כ-bcrypt hash; משווים מול כל תפקיד מותר כדי לזהות אותו.
    for (const role of EMPLOYEE_ROLES) {
        if (await verifyPassword(role, matchingPermission.name)) return role
    }
    return null
}

module.exports = { findEmployeePermission }
