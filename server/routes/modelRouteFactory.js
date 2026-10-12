const express = require("express")

// יוצר נתב REST אחיד לכל מודל ומחבר אליו את פעולות ה־controller.
const createModelRouter = (controller) => {
    const router = express.Router()
    router.route("/").get(controller.getAll).post(controller.create)
    router.route("/:id")
        .get(controller.getById)
        .put(controller.update)
        .patch(controller.update)
        .delete(controller.remove)
    return router
}

module.exports = createModelRouter