const jwt = require("jsonwebtoken")

const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET
    // אין סוד ברירת מחדל: סוד חסר או קצר מדי עוצר את האתחול במקום להנפיק אסימונים חלשים.
    if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
        throw new Error("JWT_SECRET must be set to a secret of at least 32 bytes")
    }
    return secret
}

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

// מגבילים לאלגוריתם שבו נחתמו האסימונים, כדי לא לקבל אסימון חתום בשיטה אחרת.
const verifyAccessToken = (token) => jwt.verify(token, getJwtSecret(), {
    algorithms: ["HS256"]
})

module.exports = { createAccessToken, verifyAccessToken, getJwtSecret }
