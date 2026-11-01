const Employee = require("../models/Employee")
const Parent = require("../models/Parent")
const Permission = require("../models/Permission")
const Volunteer = require("../models/Volun")

const accountModels = {
    Employee: Employee,
    Parent: Parent,
    Volunteer: Volunteer
}

const accountTypes = {
    Employee: "employee",
    Parent: "parent",
    Volunteer: "volunteer"
}

/**
 * מחזיר פרטי משתמש אחרי ש-verifyToken אימת JWT.
 * Role מזהה את סוג המודל; הרשאות עובד נטענות בנפרד מתוך Permission, כך שהלקוח
 * משחזר session עם מידע עדכני ולא עם עותק localStorage שאינו מהימן.
 * מחזיר 401 לחשבון שנמחק, 500 לשגיאת מסד, ואינו חושף סיסמה או מזהה Permission.
 */
const getCurrentUser = async (req, res) => {
    const Model = accountModels[req.user.role]
    if (!Model) {
        return res.status(401).json({ message: "סוג החשבון שבאסימון אינו תקין" })
    }

    try {
        const account = await Model.findById(req.user.id).lean()
        if (!account) {
            return res.status(401).json({ message: "החשבון אינו קיים או שאינו פעיל" })
        }

        const user = { ...account }
        delete user.password
        delete user.permission
        let permissions = []

        if (req.user.role === "Employee") {
            const employee = await Employee.findById(req.user.id).select("permission").lean()
            const permission = employee?.permission
                ? await Permission.findById(employee.permission).select("validActions").lean()
                : null
            permissions = Array.isArray(permission?.validActions) ? permission.validActions : []
            user.validActions = permissions
        }

        return res.json({
            user,
            role: accountTypes[req.user.role],
            permissions
        })
    } catch (error) {
        console.error("Failed to load the authenticated account:", error)
        return res.status(500).json({ message: "טעינת פרטי החשבון נכשלה" })
    }
}

module.exports = { getCurrentUser }
