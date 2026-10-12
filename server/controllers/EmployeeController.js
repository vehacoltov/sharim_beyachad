const createModelController = require("./modelControllerFactory")
const Employee = require("../models/Employee")

// מגדיר CRUD לעובד, ומסמן סיסמה כשדה פרטי שלא מוחזר בתשובות.
module.exports = createModelController({
    model: Employee,
    editableFields: ["fullName", "id", "phone", "userName", "password", "permission", "workingTime", "currentWorkingTime"],
    privateFields: ["password"]
})