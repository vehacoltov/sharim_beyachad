const createModelRouter = require("./modelRouteFactory")
const volunteerEventController = require("../controllers/VolunEventController")
const requireAction = require("../middleware/requireAction")

// קשרי מתנדב-ילד הם חלק מתהליך השידוך ולכן מוגנים בפעולת matching.
const matching = requireAction("matching")
module.exports = createModelRouter(volunteerEventController, {
	getAll: matching,
	create: matching,
	getById: matching,
	update: matching,
	remove: matching
})
