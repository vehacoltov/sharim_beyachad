/*
 * POST /child עובר דרך Multer כדי ליצור req.file. memoryStorage מונע קבצי temp
 * חצי מאומתים; הקובץ נבדק בשירות לפני כתיבה לדיסק ולמסד נשלח רק relative path.
 */
const express = require("express")
const multer = require("multer")
const mongoose = require("mongoose")
const childController = require("../controllers/ChildController")
const requireAction = require("../middleware/requireAction")
const verifyToken = require("../middleware/verifyToken")
const Child = require("../models/Child")
const Parent = require("../models/Parent")

// memoryStorage אינו משתמש בשמירה זמנית בדיסק: הבקר מקבל Buffer
// ומעביר אותו לשירות האחסון רק לאחר שהקובץ עבר בדיקות גבול וגודל.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })
const router = express.Router()

// קריאה או עדכון של ילד מותרים להורה שלו או לעובד עם הרשאת matching עדכנית.
const requireChildOwnerOrMatching = (req, res, next) => verifyToken(req, res, () => {
    const authorize = async () => {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "נדרש מזהה MongoDB תקין" })
        }
        if (req.user.role === "Employee") {
            return requireAction("matching")(req, res, next)
        }
        if (req.user.role !== "Parent") {
            return res.status(403).json({ message: "אין הרשאה לגשת לפרטי הילד" })
        }

        const [parent, child] = await Promise.all([
            Parent.findById(req.user.id).select("_id").lean(),
            Child.findById(req.params.id).select("parent").lean()
        ])
        if (!parent) {
            return res.status(401).json({ message: "חשבון ההורה אינו קיים או שאינו פעיל" })
        }
        if (!child) {
            return res.status(404).json({ message: "הילד לא נמצא" })
        }
        if (String(child.parent) !== req.user.id) {
            return res.status(403).json({ message: "אין הרשאה לגשת לפרטי ילד זה" })
        }
        if (req.method !== "GET" && Object.prototype.hasOwnProperty.call(req.body || {}, "parent")) {
            return res.status(403).json({ message: "אין הרשאה לשנות את שיוך ההורה של הילד" })
        }
        return next()
    }

    authorize().catch(next)
})

// הורה יכול ליצור ילד רק לעצמו; מזהה ההורה מגוף הבקשה מוחלף בזהות מה-JWT.
const requireChildCreate = (req, res, next) => {
    const authorize = async () => {
        if (req.user.role === "Employee") {
            return requireAction("matching")(req, res, next)
        }
        if (req.user.role !== "Parent") {
            return res.status(403).json({ message: "אין הרשאה לרשום ילד" })
        }
        const parent = await Parent.findById(req.user.id).select("_id").lean()
        if (!parent) {
            return res.status(401).json({ message: "חשבון ההורה אינו קיים או שאינו פעיל" })
        }
        req.body = { ...(req.body || {}), parent: req.user.id }
        return next()
    }
    authorize().catch(next)
}

// רשימת הילדים של הורה מסוננת בבקר; צוות מורשה רואה את הרשומות לצורך שידוך.
router.route("/")
    .get(verifyToken, (req, res, next) => {
        if (req.user.role === "Parent") return next()
        return requireAction("matching")(req, res, next)
    }, childController.getAll)
    .post(verifyToken, upload.single("img"), requireChildCreate, childController.create)
router.route("/:id")
    .get(requireChildOwnerOrMatching, childController.getById)
    .put(requireChildOwnerOrMatching, childController.update)
    .patch(requireChildOwnerOrMatching, childController.update)
    .delete(requireChildOwnerOrMatching, childController.remove)

module.exports = router