const express = require("express")
const childEventController = require("../controllers/ChildEventController")
const requireAction = require("../middleware/requireAction")
const { requireRoleOrAction } = require("../middleware/requireUserAccess")

const router = express.Router()
// matching שומר על קריאה/עריכה ניהולית; הורה מקבל חריג רק ליצירה ולבדיקת הילד שלו.
const matching = requireAction("matching")

router.route("/")
    .get(matching, childEventController.getAll)
    .post(
        requireRoleOrAction(["Parent"], "matching"),
        childEventController.create
    )

router.get(
    "/check",
    // הגנה זהה ליצירה: middleware מתיר הורה או עובד מורשה; controller בודק בעלות ילד.
    requireRoleOrAction(["Parent"], "matching"),
    childEventController.checkRegistration
)

router.route("/:id")
    .get(matching, childEventController.getById)
    .put(matching, childEventController.update)
    .patch(matching, childEventController.update)
    .delete(matching, childEventController.remove)

module.exports = router
