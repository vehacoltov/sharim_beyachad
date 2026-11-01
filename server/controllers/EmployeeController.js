const createModelController = require("./modelControllerFactory")
const Employee = require("../models/Employee")
const Permission = require("../models/Permission")
const { findEmployeePermission } = require("../utils/employeePermission")
const { getLoginLock, recordLoginFailure, clearLoginFailures } = require("../utils/loginRateLimiter")
const { isValidPassword } = require("../utils/password")

// הבדיקות בצד השרת נדרשות גם כשהטופס בדק את הערכים: בקשת HTTP יכולה לעקוף את ממשק המשתמש.
// בדיקת הטיפוס מונעת מקריסת הביטויים הרגולריים על ערכים שאינם מחרוזות.
const isValidEmployeeFullName = (value) =>
    typeof value === "string" && /^ *[א-ת]+(?: +[א-ת]+)* *$/u.test(value)

const isValidEmployeePhone = (value) =>
    typeof value === "string" && /^0\d{8,9}$/u.test(value)

const isValidEmployeePassword = (value) =>
    typeof value === "string" &&
    value.length >= 8 &&
    /[A-Za-zא-ת]/u.test(value) &&
    /\d/u.test(value)

// מגדיר CRUD לעובד, ומסמן סיסמה ושיוך הרשאה כשדות פרטיים בתשובות.
const employeeController = createModelController({
    model: Employee,
    // הרשאה אינה שדה שניתן לבחור ישירות; היא ניתנת רק לאחר אימות קוד הרשאה.
    editableFields: ["fullName", "id", "phone", "userName", "password", "workingTime", "currentWorkingTime"],
    registrationOnlyFields: ["permission"],
    privateFields: ["password","permission"],
    passwordField: "password",
    loginFields: ["userName"],
    validateFields: (fields) => {
        if ("fullName" in fields && !isValidEmployeeFullName(fields.fullName)) {
            return "שם מלא חייב להכיל אותיות בעברית ורווחים בלבד."
        }
        if ("phone" in fields && !isValidEmployeePhone(fields.phone)) {
            return "מספר הטלפון חייב להכיל 9 או 10 ספרות ולהתחיל ב-0."
        }
        if ("password" in fields && !isValidEmployeePassword(fields.password)) {
            return "הסיסמה חייבת להכיל לפחות 8 תווים, לפחות אות אחת בעברית או באנגלית ולפחות ספרה אחת."
        }
        return null
    },
    // מחזיר רק פעולות מורשות מה-reference, בלי לחשוף hash או פרטי Permission.
    prepareLoginUser: async employee => {
        const permission = await Permission.findById(employee.permission).select("validActions").lean()
        return { validActions: permission?.validActions || [] }
    },
    prepareCreateFields: async (fields) => {
        const safeFields = { ...fields }
        // ערכי שעות שמגיעים מהלקוח אינם מהימנים; ברישום עובד חדש מתחילים תמיד מאפס.
        delete safeFields.workingTime
        delete safeFields.currentWorkingTime
        safeFields.workingTime = 0
        safeFields.currentWorkingTime = 0
        return safeFields
    },
    prepareRegistration: async (fields, req) => {
        const accessPassword = fields.authorizationPassword

        // phone אופציונלי בסכמת Mongoose מטעמי תאימות לנתונים ישנים,
        // אך בהרשמה חדשה הוא חובה ולכן בודקים אותו גם אם הלקוח השמיט את השדה.
        if (!isValidEmployeePhone(fields.phone)) {
            return { error: { status: 400, message: "מספר הטלפון חייב להכיל 9 או 10 ספרות ולהתחיל ב-0." } }
        }

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
        // מסירים ערכים שנשלחו לשדות השעות לפני בדיקת רשימת השדות המותרים.
        // ברירת המחדל המהימנה 0 תוגדר בהמשך ב-prepareCreateFields, אחרי בדיקת הרשימה.
        delete employeeFields.workingTime
        delete employeeFields.currentWorkingTime
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