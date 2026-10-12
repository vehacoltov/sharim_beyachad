const createModelRouter = require("./modelRouteFactory")
const parentController = require("../controllers/ParentController")

// בונה נתיבי CRUD ומחבר אותם לפעולות של ParentController.
module.exports = createModelRouter(parentController)