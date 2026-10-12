const createModelController = require("./modelControllerFactory")
const ChildEvent = require("../models/ChildEvent")

// מגדיר CRUD עבור קישור בין ילד למתנדב באירוע.
module.exports = createModelController({
    model: ChildEvent,
    editableFields: ["child", "volunteer"]
})