const createModelController = require("./modelControllerFactory")
const Volunteer = require("../models/Volun")

// מגדיר CRUD למתנדב, ומונע החזרת הסיסמה בתגובות ה־API.
module.exports = createModelController({
    model: Volunteer,
    editableFields: ["fullName", "password", "email", "id", "phone", "age", "seminar", "detaling"],
    privateFields: ["password"],
    passwordField: "password",
    loginFields: ["email", "fullName"]
})