const createModelRouter = require("./modelRouteFactory")
const volunteerEventController = require("../controllers/VolunEventController")

// בונה נתיבי CRUD ומחבר אותם לפעולות של VolunEventController.
module.exports = createModelRouter(volunteerEventController)