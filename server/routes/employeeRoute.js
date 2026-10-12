const createModelRouter = require("./modelRouteFactory")
const employeeController = require("../controllers/EmployeeController")

// בונה נתיבי CRUD ומחבר אותם לפעולות של EmployeeController.
module.exports = createModelRouter(employeeController)