const Employee = require("../models/Employee")
const Permission = require("../models/Permission")
const verifyToken = require("./verifyToken")

// בודק את הפעולה מול Permission העדכני במסד בכל בקשה, כדי ששינוי הרשאה
// ייכנס לתוקף מיד ולא יישאר פעיל עד שפג תוקף JWT ישן.
const requireAction = action => (req, res, next) => verifyToken(req, res, () => {
    const authorize = async () => {
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
