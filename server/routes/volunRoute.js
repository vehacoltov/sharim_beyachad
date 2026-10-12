const createModelRouter = require("./modelRouteFactory")
const volunteerController = require("../controllers/VolunController")

// בונה נתיבי CRUD ומחבר אותם לפעולות של VolunController.
module.exports = createModelRouter(volunteerController)