const createModelController = require("./modelControllerFactory")
const Parent = require("../models/Parent")

// מגדיר CRUD להורה, ומסמן סיסמה כשדה פרטי שלא מוחזר בתשובות.
module.exports = createModelController({
    model: Parent,
    editableFields: ["UserName", "email", "password", "id", "children"],
    privateFields: ["password"]
})