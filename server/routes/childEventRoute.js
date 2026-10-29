const createModelRouter = require("./modelRouteFactory")
const childEventController = require("../controllers/ChildEventController")
const requireAction = require("../middleware/requireAction")

// קשרי ילד-מתנדב הם חלק מתהליך השידוך ולכן מוגנים בפעולת matching.
const matching = requireAction("matching")
module.exports = createModelRouter(childEventController, {
	getAll: matching,
	create: matching,
	getById: matching,
	update: matching,
	remove: matching
})