const createModelRouter = require("./modelRouteFactory")
const parentController = require("../controllers/ParentController")
const requireAction = require("../middleware/requireAction")
const { requireOwnerOrAction } = require("../middleware/requireUserAccess")

// הרשמה והתחברות נשארות פתוחות; CRUD כללי מותר לעובדים מורשים בלבד.
const manageParents = requireAction("employees")
const accessParent = requireOwnerOrAction("Parent", "employees", {
    selfFields: ["email", "password"]
})

module.exports = createModelRouter(parentController, {
    getAll: manageParents,
    create: manageParents,
    getById: accessParent,
    update: accessParent,
    remove: manageParents
})