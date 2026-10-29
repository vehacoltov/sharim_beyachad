const { createHmac } = require("crypto")
const Permission = require("../models/Permission")
const Counter = require("../models/Counter")
const { getJwtSecret } = require("../config/jwt")
const { hashPassword } = require("./password")

// ההרשאה נוצרת פעם אחת בלבד. מומלץ להגדיר INITIAL_ADMIN_PASSWORD בסביבת
// ההרצה; ברירת המחדל נשמרת לצורך הפעלה מקומית ראשונית בלבד.
const ADMIN_NAME = "admin"
const ADMIN_PASSWORD = process.env.INITIAL_ADMIN_PASSWORD || "1234"

// bcrypt כולל salt אקראי, ולכן hash של אותו שם משתנה בכל יצירה ואינו מתאים
// לחיפוש או לאינדקס ייחודי. HMAC עם מפתח השרת דטרמיניסטי, ומאפשר לזהות
// את הרשאת admin בלי לשמור את השם הגלוי ובלי לחשוף אותו בתשובות ה-API.
const createNameLookup = name => createHmac("sha256", getJwtSecret())
    .update(name)
    .digest("hex")

// מסנכרן את המונה לפחות למזהה הגבוה שכבר קיים לפני הגדלתו. כך seed שמופעל
// על מסד ותיק אינו מקצה id שכבר נמצא בשימוש, גם אם מסמך Counter חסר או מיושן.
const getNextPermissionId = async () => {
    const highestPermission = await Permission.findOne().sort({ id: -1 }).select("id").lean()
    const highestId = highestPermission?.id || 0

    await Counter.findOneAndUpdate(
        { _id: "permission" },
        { $max: { seq: highestId } },
        { new: true, upsert: true }
    )

    try {
        // $inc אטומי: אם כמה תהליכים קוראים את המונה במקביל, כל אחד מקבל
        // ערך שונה. טיפול ב-11000 מכסה התנגשות בעת יצירת מסמך המונה הראשון.
        const counter = await Counter.findOneAndUpdate(
            { _id: "permission" },
            { $inc: { seq: 1 } },
            { new: true }
        )
        return counter.seq
    } catch (error) {
        if (error.code !== 11000) throw error
        const counter = await Counter.findOneAndUpdate(
            { _id: "permission" },
            { $inc: { seq: 1 } },
            { new: true }
        )
        return counter.seq
    }
}

// פעולה idempotent: חיפוש לפי nameLookup לפני יצירה מאפשר להריץ אותה בכל
// הפעלה בלי להוסיף הרשאות admin כפולות. הסיסמה והשם נשמרים כ-bcrypt hashes.
const ensureAdminPermission = async () => {
    const nameLookup = createNameLookup(ADMIN_NAME)
    const existingAdmin = await Permission.findOne({ nameLookup }).select("_id").lean()
    if (existingAdmin) return false

    try {
        await Permission.create({
            id: await getNextPermissionId(),
            name: await hashPassword(ADMIN_NAME),
            nameLookup,
            password: await hashPassword(ADMIN_PASSWORD)
        })
        console.log("Initial admin permission created")
        return true
    } catch (error) {
        // שני מופעי שרת עלולים לבדוק במקביל ולא למצוא admin, ואז להתחרות
        // על יצירתו. אינדקס unique מכריע את המרוץ; אם admin נוצר בינתיים,
        // זו הצלחה שקולה ולא שגיאה שצריכה לעצור את השרת.
        if (error.code === 11000 && await Permission.exists({ nameLookup })) return false
        throw error
    }
}

module.exports = { ensureAdminPermission }
