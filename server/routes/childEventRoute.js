const express = require("express")
const childEventController = require("../controllers/ChildEventController")
const requireAction = require("../middleware/requireAction")
const { requireRoleOrAction } = require("../middleware/requireUserAccess")

const router = express.Router()
const matching = requireAction("matching")

router.route("/")
    .get(matching, childEventController.getAll)
    .post(
        requireRoleOrAction(["Parent"], "matching"),
        childEventController.create
    )

// שמירת שיבוץ מתבצעת רק לעובד בעל הרשאת matching, בדומה לניהול קשרי המשתתפים.
router.post("/assign", matching, childEventController.assign)

router.route("/:id")
    .get(matching, childEventController.getById)
    .put(matching, childEventController.update)
    .patch(matching, childEventController.update)
    .delete(matching, childEventController.remove)

module.exports = router
