const createModelRouter = require("./modelRouteFactory")
const childController = require("../controllers/ChildController")

// בונה נתיבי CRUD ומחבר אותם לפעולות של ChildController.
module.exports = createModelRouter(childController)