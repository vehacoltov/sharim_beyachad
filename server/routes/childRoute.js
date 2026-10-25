/*
 * POST /child עובר דרך Multer כדי ליצור req.file. memoryStorage מונע קבצי temp
 * חצי מאומתים; הקובץ נבדק בשירות לפני כתיבה לדיסק ולמסד נשלח רק relative path.
 */
const express = require("express")
const multer = require("multer")
const childController = require("../controllers/ChildController")

// memoryStorage אינו משתמש בשמירה זמנית בדיסק: הבקר מקבל Buffer
// ומעביר אותו לשירות האחסון רק לאחר שהקובץ עבר בדיקות גבול וגודל.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })
const router = express.Router()

router.route("/").get(childController.getAll).post(upload.single("img"), childController.create)
router.route("/:id")
    .get(childController.getById)
    .put(childController.update)
    .patch(childController.update)
    .delete(childController.remove)

module.exports = router