const createModelController = require("./modelControllerFactory")
const VolunteerEvent = require("../models/VolunEvent")

// מגדיר CRUD עבור הקישור בין מתנדב לילד באירוע, כולל הערות והעדפת ילד.
module.exports = createModelController({
    model: VolunteerEvent,
    editableFields: ["child", "volunteer", "notes", "favouredChild"]
})