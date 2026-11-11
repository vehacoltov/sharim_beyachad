const createModelRouter = require("./modelRouteFactory")
const employeeController = require("../controllers/EmployeeController")
const requireAction = require("../middleware/requireAction")

const router = createModelRouter(employeeController, {
    getAll: requireAction("employees"),
    getById: requireAction("employees"),
    update: requireAction("employees"),
    remove: requireAction("employees"),
})

const managePermissions = requireAction("permissions")

router.get(
    "/:id/access-permission",
    managePermissions,
    employeeController.getAccessPermission,
)

router.patch(
    "/:id/access-permission",
    managePermissions,
    employeeController.updateAccessPermission,
)

module.exports = router