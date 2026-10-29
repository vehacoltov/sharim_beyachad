const { createHmac } = require("crypto")
const createModelController = require("./modelControllerFactory")
const Permission = require("../models/Permission")
const Counter = require("../models/Counter")
const { getJwtSecret } = require("../config/jwt")
const { hashPassword, isValidPassword } = require("../utils/password")
const { findEmployeePermission } = require("../utils/employeePermission")
const { getLoginLock, recordLoginFailure, clearLoginFailures } = require("../utils/loginRateLimiter")

const VALID_ACTIONS = ["permissions", "employees", "events", "matching", "registation"]

// bcrypt מייצר hash שונה בכל פעם בזכות salt אקראי, ולכן אין דרך לחפש לפי hash
// של שם ידוע מראש או להשוות בין שני hash-ים כדי לבדוק אם השמות זהים.
// לשם כך יוצרים HMAC דטרמיניסטי: אותו שם ואותו סוד יפיקו תמיד אותו ערך,
// שאפשר לשמור באינדקס ייחודי. הערך אינו מאפשר להחזיר את השם המקורי,
// והוא משמש רק למניעת שמות כפולים — ההתחברות מתבצעת לפי id.
// ה-HMAC משתמש ב-JWT_SECRET, ולכן יש לשמור על אותו סוד כל עוד הנתונים קיימים.
const createNameLookup = (name) => createHmac("sha256", getJwtSecret())
    .update(name)
    .digest("hex")

// מקצה את המזהה העסקי המספרי הבא להרשאה.
// findOneAndUpdate עם $inc מבצע את ההגדלה ב-MongoDB באופן אטומי, כך שבקשות
// הרשמה מקבילות לא יקראו את אותו ערך ולא יקבלו אותו id.
const getNextPermissionId = async () => {
    try {
        const counter = await Counter.findOneAndUpdate(
            // כל ההרשאות משתמשות במסמך מונה יחיד עם המפתח הקבוע "permission".
            { _id: "permission" },
            // הגדלה באחד; upsert יוצר את מסמך המונה אם זו ההרשמה הראשונה.
            { $inc: { seq: 1 } },
            // מחזירים את המסמך לאחר ההגדלה, כדי להשתמש במספר החדש.
            { new: true, upsert: true }
        )
        return counter.seq
    } catch (error) {
        // בשתי הרשמות ראשונות בו-זמניות, שתיהן עלולות לנסות ליצור את מסמך המונה.
        // אילוץ הייחודיות על _id מאפשר רק לאחת ליצור אותו; השנייה תקבל שגיאה 11000.
        // במקרה הזה מנסים שוב ללא upsert, כדי להגדיל את המסמך שכבר נוצר.
        // כל שגיאה אחרת אינה צפויה ולכן מועברת הלאה לטיפול ה-controller המשותף.
        if (error.code !== 11000) throw error
        const counter = await Counter.findOneAndUpdate(
            { _id: "permission" },
            { $inc: { seq: 1 } },
            { new: true }
        )
        return counter.seq
    }
}

// מכין שדות הרשאה לפני שמירתם במסד הנתונים.
// כשלא נשלח name, למשל בעדכון סיסמה בלבד, מחזירים את השדות ללא שינוי
// כדי לא להצפין מחדש שם שכבר נשמר כ-hash.
// כשנשלח name, מסירים רווחים חיצוניים, שומרים hash של bcrypt במקום השם הגלוי
// ומחשבים מחדש HMAC לצורך בדיקת ייחודיות. ה-hash של הסיסמה אינו מחושב כאן:
// ה-controller המשותף מבצע זאת באופן אחיד לכל המודלים שמגדירים passwordField.
const preparePermissionFields = async (fields) => {
    if (!("name" in fields)) return fields
    const name = fields.name.trim()
    return {
        ...fields,
        name: await hashPassword(name),
        nameLookup: createNameLookup(name)
    }
}

const permissionController = createModelController({
    model: Permission,
    // name, password ו-validActions מתקבלים רק במסלול ניהול מוגן. id מוקצה בשרת, ו-nameLookup הוא
    // שדה פנימי שנגזר מהשם; דחייתם מגינה מפני עקיפת הקצאת המזהים ובדיקת הייחודיות.
    editableFields: ["name", "password", "validActions"],
    // מסירים מהתשובות את hash השם, את ערך ה-HMAC ואת hash הסיסמה.
    // גם אם שדות אלה נשלפו לצורך פעולה פנימית, הם לא ייחשפו ללקוח.
    privateFields: ["name", "nameLookup", "password"],
    // מאפשר ל-controller המשותף לבצע hash לסיסמה ביצירה ובעדכון,
    // וכן לבדוק אותה מול ה-hash בעת התחברות.
    passwordField: "password",
    // ההתחברות מחפשת לפי המזהה העסקי המספרי. זה שונה מ-_id של MongoDB,
    // שבו משתמשים בנתיבי ה-CRUD הכלליים לקריאה, עדכון ומחיקה.
    loginFields: ["id"],
    loginIdentifierField: "id",
    // ה-API מקבל id כמספר JSON או כמחרוזת ספרות חיובית ללא אפס מוביל.
    // Number.isSafeInteger מונע ערכים גדולים מדי לייצוג מדויק ב-JavaScript.
    loginIdentifierValidator: value =>
        (typeof value === "number" && Number.isSafeInteger(value) && value > 0) ||
        (typeof value === "string" && /^[1-9]\d*$/.test(value)),
    // שומרים id כמספר ב-MongoDB, לכן ממירים מחרוזת תקינה למספר לפני החיפוש.
    loginIdentifierLookup: value => Number(value),
    // ולידציה מקדימה לשם: הוא חייב להיות מחרוזת לא ריקה אחרי trim,
    // ובאורך של עד 72 בתים ב-UTF-8. זו מגבלת bcrypt; דוחים שם ארוך
    // במפורש כדי שלא ייחתך או יתנגש עם שם אחר לאחר ההצפנה.
    validateFields: (fields) => {
        if (
            "name" in fields &&
            (typeof fields.name !== "string" ||
                !fields.name.trim() ||
                Buffer.byteLength(fields.name.trim(), "utf8") > 72)
        ) {
            return "Name must be a non-empty string of at most 72 UTF-8 bytes"
        }
        if (
            "validActions" in fields &&
            (!Array.isArray(fields.validActions) ||
                fields.validActions.some(action => !VALID_ACTIONS.includes(action)))
        ) {
            return "validActions must be an array containing only supported actions"
        }
        return null
    },
    // הכנה זו משותפת ליצירה ולעדכון, כדי ששינוי שם יעדכן גם את ה-hash וגם את ה-HMAC.
    prepareFields: preparePermissionFields,
    // לפני יצירה מכינים את השם ומקצים id חדש. ה-id אינו מתקבל מהלקוח
    // ואינו משתנה בעדכון, שבו משתמשים רק ב-prepareFields.
    prepareCreateFields: async fields => ({
        ...await preparePermissionFields(fields),
        id: await getNextPermissionId()
    })
})

// בודק בצד השרת אם הסיסמה תואמת להרשאה ייעודית לאחד מתפקידי העובדים.
// הפעולה אינה מחזירה hash או שם הרשאה, אלא רק תפקיד מוכר לצורך ממשק ההרשמה.
permissionController.verifyEmployeeAccess = async (req, res) => {
    const { password } = req.body || {}
    if (!isValidPassword(password)) {
        return res.status(400).json({ message: "יש להזין סיסמת הרשאת גישה תקינה" })
    }

    const ipAddress = req.ip || req.socket?.remoteAddress || "unknown"
    // מגביל ניסיונות של קודי הרשאה לפי IP, ומשתף את החסימה עם נתיב הרישום לעובד.
    const { key, retryAfterSeconds } = getLoginLock(
        "employee-registration-access",
        ipAddress,
        "access"
    )
    if (retryAfterSeconds > 0) {
        res.set("Retry-After", String(retryAfterSeconds))
        return res.status(429).json({
            message: "נחסמה בדיקת ההרשאה. נסו שוב מאוחר יותר",
            retryAfterSeconds
        })
    }

    try {
        // משווה את הקוד מול סיסמאות ההרשאה השמורות, ואז מאמת שההרשאה מצביעה לתפקיד עובד.
        const permission = await findEmployeePermission(password)
        if (!permission) {
            recordLoginFailure(key)
            const lock = getLoginLock("employee-registration-access", ipAddress, "access")
            if (lock.retryAfterSeconds > 0) {
                res.set("Retry-After", String(lock.retryAfterSeconds))
                return res.status(429).json({
                    message: "נחסמה בדיקת ההרשאה. נסו שוב מאוחר יותר",
                    retryAfterSeconds: lock.retryAfterSeconds
                })
            }
            return res.status(403).json({ message: "סיסמת הרשאת הגישה אינה מורשית" })
        }

        clearLoginFailures(key)
        return res.json({
            authorized: true,
            permission: {
                id: permission.id,
                validActions: permission.validActions
            }
        })
    } catch (error) {
        console.error("Failed to verify employee access permission:", error)
        return res.status(500).json({ message: "בדיקת הרשאת הגישה נכשלה" })
    }
}

module.exports = permissionController
