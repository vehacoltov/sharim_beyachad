const Employee = require("../models/Employee")
const Permission = require("../models/Permission")
const verifyToken = require("./verifyToken")

/**
 * יוצרת Middleware של Authorization לפעולה אחת.
 * לאחר אימות JWT, בודקת שהחשבון הוא עובד וטוענת בכל בקשה Permission עדכני
 * מ-MongoDB; לכן שינוי הרשאה משפיע מיד גם על session קיים.
 * 401 הוא כשל זיהוי, ואילו 403 פירושו שהמשתמש זוהה אך הפעולה אסורה.
 */
const requireAction = action => (req, res, next) => verifyToken(req, res, () => {
    // פונקציה אסינכרונית נפרדת מאפשרת להעביר שגיאות MongoDB למנגנון השגיאות של Express.
    const authorize = async () => {
        // הרשאות פעולה שייכות לעובדים בלבד; role שמופיע באסימון נחתם בשרת.
        if (req.user.role !== "Employee") {
            return res.status(403).json({ message: "אין הרשאה לבצע פעולה זו" })
        }

        const employee = await Employee.findById(req.user.id).select("permission").lean()
        if (!employee?.permission) {
            return res.status(403).json({ message: "אין הרשאה לבצע פעולה זו" })
        }

        const permission = await Permission.findById(employee.permission)
            .select("validActions")
            .lean()
        if (!permission?.validActions?.includes(action)) {
            return res.status(403).json({ message: "אין הרשאה לבצע פעולה זו" })
        }

        req.user.validActions = permission.validActions
        return next()
    }

    authorize().catch(next)
})

module.exports = requireAction
