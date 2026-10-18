const express = require("express")

// יוצר נתב REST אחיד לכל מודל ומחבר אליו את פעולות ה־controller.
const createModelRouter = (controller) => {
    const router = express.Router()
    // מסלולי רישום וכניסה נוצרים רק לבקרים שמספקים את הפעולות האלה.
    if (controller.login) router.post("/login", controller.login)
    if (controller.register) router.post("/register", controller.register)
    router.route("/").get(controller.getAll).post(controller.create)
    router.route("/:id")
        .get(controller.getById)
        .put(controller.update)
        .patch(controller.update)
        .delete(controller.remove)
    return router
}

module.exports = createModelRouter