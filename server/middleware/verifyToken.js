const { verifyAccessToken } = require("../config/jwt")

const verifyToken = (req, res, next) => {
    const authorization = req.headers.authorization
    // דורשים את סכמת Bearer התקנית, שבה הלקוח שולח את האסימון בכותרת Authorization.
    if (typeof authorization !== "string" || !authorization.startsWith("Bearer ")) {
        return res.status(401).json({ message: "A bearer token is required" })
    }

    const token = authorization.slice("Bearer ".length).trim()
    if (!token) {
        return res.status(401).json({ message: "A bearer token is required" })
    }

    try {
        // verify בודק חתימה ותפוגה; בדיקת מבנה נוספת מוודאת שיש נתונים הדרושים להמשך הבקשה.
        const payload = verifyAccessToken(token)
        if (!payload || typeof payload !== "object" || typeof payload.sub !== "string" || typeof payload.role !== "string") {
            return res.status(401).json({ message: "Invalid token" })
        }
        // מעבירים רק את זהות המשתמש והתפקיד לנתיבים הבאים, ולא את כל תוכן האסימון.
        req.user = { id: payload.sub, role: payload.role }
        return next()
    } catch (error) {
        // אסימון פגום או שפג תוקפו הוא שגיאת אימות של הלקוח; שגיאות מערכת מדווחות כ-500.
        if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError" || error.name === "NotBeforeError") {
            return res.status(401).json({ message: "Invalid or expired token" })
        }
        console.error("Failed to verify access token:", error)
        return res.status(500).json({ message: "Failed to verify access token" })
    }
}

module.exports = verifyToken
