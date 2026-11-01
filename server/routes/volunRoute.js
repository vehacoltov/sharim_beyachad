const createModelRouter = require("./modelRouteFactory")
const volunteerController = require("../controllers/VolunController")
const requireAction = require("../middleware/requireAction")
const { requireOwnerOrAction } = require("../middleware/requireUserAccess")

// הרשמה והתחברות פתוחות; מידע וניהול מתנדבים מוגנים לפי בעלות או הרשאת עובדים.
const manageVolunteers = requireAction("employees")
const accessVolunteer = requireOwnerOrAction("Volunteer", "employees", {
    selfFields: ["fullName", "password", "email", "phone", "age", "seminar", "detaling"]
})

module.exports = createModelRouter(volunteerController, {
    getAll: manageVolunteers,
    create: manageVolunteers,
    getById: accessVolunteer,
    update: accessVolunteer,
    remove: manageVolunteers
})