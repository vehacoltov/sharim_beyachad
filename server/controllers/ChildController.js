const createModelController = require("./modelControllerFactory")
const Child = require("../models/Child")

// מגדיר CRUD עבור ילד, עם אפשרות לעדכן רק שדות שקיימים במודל Child.
module.exports = createModelController({
    model: Child,
    editableFields: [
        "fullName", "parent", "id", "phone", "anothwrPhone", "age", "epilepsy",
        "sensitivity", "medicines", "canBeFilemed", "detailing", "notes", "img",
        "status", "category"
    ]
})