const createModelRouter = require("./modelRouteFactory")
const employeeController = require("../controllers/EmployeeController")
const requireAction = require("../middleware/requireAction")

// CRUD עובדים מוגן; login ו-register נשארים בנתיבים הייעודיים של הבקר.
module.exports = createModelRouter(employeeController, {
	getAll: requireAction("employees"),
	getById: requireAction("employees"),
	update: requireAction("employees"),
	remove: requireAction("employees")
})