const createModelRouter = require("./modelRouteFactory")
const permissionController = require("../controllers/PermissionController")

const router = createModelRouter(permissionController)
router.post("/verify-employee-access", permissionController.verifyEmployeeAccess)

module.exports = router
