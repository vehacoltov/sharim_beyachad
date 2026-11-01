const jwt = require("jsonwebtoken")

/**
 * מחזירה את סוד החתימה מתוך הגדרות הסביבה.
 * נדרשים לפחות 32 בתים כדי למנוע הפעלה עם סוד חסר או חלש; במקרה כזה
 * הפעולה זורקת שגיאה במכוון במקום להמשיך עם ברירת מחדל לא בטוחה.
 */
const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET
    // אין סוד ברירת מחדל: סוד חסר או קצר מדי עוצר את האתחול במקום להנפיק אסימונים חלשים.
    if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
        throw new Error("JWT_SECRET must be set to a secret of at least 32 bytes")
    }
    return secret
}

/**
 * מנפיקה JWT לאחר אימות סיסמה מוצלח.
 * ה-role והמזהה נחתמים בשרת; מזהה המשתמש נשמר ב-sub, והטוקן מוגבל לשעה.
 * אין לשים בטוקן סיסמה או הרשאות, מפני שפרטי הרשאות נטענים מהמסד בכל בקשה רגישה.
 */
const createAccessToken = (user, role) => jwt.sign(
    { role },
    getJwtSecret(),
    {
        // קובעים אלגוריתם, מזהה משתמש ותפוגה מפורשים; ה-role מאפשר זיהוי סוג החשבון.
        algorithm: "HS256",
        subject: user._id.toString(),
        expiresIn: "1h"
    }
)

/**
 * מאמתת חתימה, תוקף ומועד הפעלה של JWT, ומגבילה את האלגוריתם ל-HS256.
 * שגיאות אימות מועברות למתקשר כדי ש-middleware יוכל להחזיר HTTP 401.
 */
const verifyAccessToken = (token) => jwt.verify(token, getJwtSecret(), {
    algorithms: ["HS256"]
})

module.exports = { createAccessToken, verifyAccessToken, getJwtSecret }
