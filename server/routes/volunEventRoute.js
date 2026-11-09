const express = require("express")
const createModelRouter = require("./modelRouteFactory")
const volunteerEventController = require("../controllers/VolunEventController")
const requireAction = require("../middleware/requireAction")
const { requireRoleOrAction } = require("../middleware/requireUserAccess")

// פעולות CRUD כלליות על קשרי VolunteerEvent הן ניהול שידוכים ולכן דורשות matching.
const matching = requireAction("matching")
const router = express.Router()

// רישום/ביטול עצמי הם פעולות שונות מ-CRUD ניהולי ומותרים למתנדבת מאומתת.
router.post(
    "/register",
    // requireRoleOrAction מאמת JWT, תפקיד וסיום שהחשבון עדיין קיים.
    requireRoleOrAction(["Volunteer"], null),
    volunteerEventController.registerForEvent
)
router.post(
    "/unregister",
    // ה-controller משתמש בזהות שב-token ומסנן לפיה, לא מקבל volunteerId מהלקוח.
    requireRoleOrAction(["Volunteer"], null),
    volunteerEventController.cancelEventRegistration
)

// הנתב הגנרי נשאר מוגן ב-matching; הנתיבים הייעודיים מעליו אינם יורשים guard זה.
router.use(createModelRouter(volunteerEventController, {
	getAll: matching,
	create: matching,
	getById: matching,
	update: matching,
	remove: matching
}))

module.exports = router
