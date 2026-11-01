const Employee = require("../models/Employee")
const Parent = require("../models/Parent")
const Volunteer = require("../models/Volun")
const requireAction = require("./requireAction")
const verifyToken = require("./verifyToken")

const accountModels = {
    Employee,
    Parent,
    Volunteer
}

/**
 * בונה Middleware לנתיב חשבון יחיד: בעל החשבון מורשה למידע/שדות העצמיים
 * שהוגדרו, ועובד חייב לעבור requireAction מול הרשאה עדכנית.
 * options.selfFields מגביל עדכון עצמי לשדות מותרים ומונע שינוי מזהה או תפקיד.
 */
const requireOwnerOrAction = (accountRole, employeeAction, options = {}) =>
    (req, res, next) => verifyToken(req, res, () => {
        // authorize אסינכרונית מפני שאימות בעלות מחייב בדיקה מול מסד הנתונים.
        const authorize = async () => {
            if (req.user.role === "Employee") {
                if (!employeeAction) {
                    return res.status(403).json({ message: "אין הרשאה לבצע פעולה זו" })
                }
                return requireAction(employeeAction)(req, res, next)
            }

            if (req.user.role !== accountRole || req.params.id !== req.user.id) {
                return res.status(403).json({ message: "אין הרשאה לגשת לחשבון זה" })
            }

            const account = await accountModels[accountRole].findById(req.user.id).select("_id").lean()
            if (!account) {
                return res.status(401).json({ message: "החשבון אינו קיים או שאינו פעיל" })
            }

            if (options.selfFields && req.method !== "GET") {
                const submittedFields = Object.keys(req.body || {})
                const unsupportedFields = submittedFields.filter(
                    field => !options.selfFields.includes(field)
                )
                if (unsupportedFields.length > 0) {
                    return res.status(403).json({
                        message: "אין הרשאה לעדכן את השדות שנשלחו",
                        fields: unsupportedFields
                    })
                }
            }

            return next()
        }

        authorize().catch(next)
    })

/**
 * בונה Middleware לקריאה המותרת לסוגי חשבון נתונים, או לעובד בעל פעולה מוגדרת.
 * תפקיד העובד מגיע מ-JWT חתום; ההרשאה עצמה נבדקת מחדש מול Permission במסד.
 */
const requireRoleOrAction = (accountRoles, employeeAction) =>
    (req, res, next) => verifyToken(req, res, () => {
        // מאמת שהחשבון עדיין קיים לפני מסירת מידע לתפקיד שאינו עובד.
        const authorize = async () => {
            if (req.user.role === "Employee") {
                return requireAction(employeeAction)(req, res, next)
            }

            if (!accountRoles.includes(req.user.role)) {
                return res.status(403).json({ message: "אין הרשאה לבצע פעולה זו" })
            }

            const Model = accountModels[req.user.role]
            const account = await Model.findById(req.user.id).select("_id").lean()
            if (!account) {
                return res.status(401).json({ message: "החשבון אינו קיים או שאינו פעיל" })
            }
            return next()
        }

        authorize().catch(next)
    })

module.exports = { requireOwnerOrAction, requireRoleOrAction }
