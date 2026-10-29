const createModelController = require("./modelControllerFactory")
const Employee = require("../models/Employee")
const Permission = require("../models/Permission")
const { findEmployeePermission } = require("../utils/employeePermission")
const { getLoginLock, recordLoginFailure, clearLoginFailures } = require("../utils/loginRateLimiter")
const { isValidPassword } = require("../utils/password")

// מגדיר CRUD לעובד, ומסמן סיסמה ושיוך הרשאה כשדות פרטיים בתשובות.
const employeeController = createModelController({
    model: Employee,
    // הרשאה אינה שדה שניתן לבחור ישירות; היא ניתנת רק לאחר אימות קוד הרשאה.
    editableFields: ["fullName", "id", "phone", "userName", "password", "workingTime", "currentWorkingTime"],
    registrationOnlyFields: ["permission"],
    privateFields: ["password","permission"],
    passwordField: "password",
    loginFields: ["userName"],
    // מחזיר רק פעולות מורשות מה-reference, בלי לחשוף hash או פרטי Permission.
    prepareLoginUser: async employee => {
        const permission = await Permission.findById(employee.permission).select("validActions").lean()
        return { validActions: permission?.validActions || [] }
    },
    prepareRegistration: async (fields, req) => {
        const accessPassword = fields.authorizationPassword
        // חסרים או לא תקינים נדחים לפני חיפוש הרשאות או יצירת מסמך עובד.
        if (!isValidPassword(accessPassword)) {
            return { error: { status: 400, message: "סיסמת הרשאת גישה תקינה נדרשת" } }
        }

        const ipAddress = req.ip || req.socket?.remoteAddress || "unknown"
        // שיתוף מגבלת הניסיונות עם בדיקת קוד ההרשאה מחלון ההרשמה.
        const lock = getLoginLock("employee-registration-access", ipAddress, "access")
        if (lock.retryAfterSeconds > 0) {
            return {
                error: {
                    status: 429,
                    message: `נחסמה בדיקת ההרשאה. אפשר לנסות שוב בעוד ${lock.retryAfterSeconds} שניות`
                }
            }
        }

        const permission = await findEmployeePermission(accessPassword)
        if (!permission) {
            // כשל אימות אינו מגיע ליצירת העובד, ונרשם לצורך החסימה הזמנית.
            const { key } = getLoginLock("employee-registration-access", ipAddress, "access")
            recordLoginFailure(key)
            const updatedLock = getLoginLock("employee-registration-access", ipAddress, "access")
            if (updatedLock.retryAfterSeconds > 0) {
                return {
                    error: {
                        status: 429,
                        message: `נחסמה בדיקת ההרשאה. אפשר לנסות שוב בעוד ${updatedLock.retryAfterSeconds} שניות`
                    }
                }
            }
            return { error: { status: 403, message: "סיסמת הרשאת הגישה אינה תקינה או אינה מורשית" } }
        }

        // מסירים את סיסמת ההרשאה מהנתונים ושומרים את מזהה Permission המאומת.
        const employeeFields = { ...fields }
        delete employeeFields.authorizationPassword
        employeeFields.permission = permission._id
        const { key } = getLoginLock("employee-registration-access", ipAddress, "access")
        clearLoginFailures(key)
        return { fields: employeeFields }
    }
})

// גם יצירה ישירה ב-POST /employee חייבת לעבור אימות סיסמת הרשאה,
// כדי שלא יהיה אפשר לעקוף את בדיקת ההרשאה דרך נתיב ה-CRUD הכללי.
employeeController.create = employeeController.register

module.exports = employeeController