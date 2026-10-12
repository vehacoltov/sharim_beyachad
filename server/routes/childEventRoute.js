const createModelRouter = require("./modelRouteFactory")
const childEventController = require("../controllers/ChildEventController")

// בונה נתיבי CRUD ומחבר אותם לפעולות של ChildEventController.
module.exports = createModelRouter(childEventController)