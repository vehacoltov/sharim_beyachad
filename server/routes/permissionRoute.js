const createModelRouter = require("./modelRouteFactory")
const permissionController = require("../controllers/PermissionController")
const requireAction = require("../middleware/requireAction")

// יצירת/ניהול הרשאות מוגבלים ל-admin; login ואימות קוד עובד נשארים נגישים.
const managePermissions = requireAction("permissions")
const router = createModelRouter(permissionController, {
	register: managePermissions,
	getAll: managePermissions,
	create: managePermissions,
	getById: managePermissions,
	update: managePermissions,
	remove: managePermissions
})
router.post("/verify-employee-access", permissionController.verifyEmployeeAccess)

module.exports = router
