const express = require("express")

// יוצר נתב REST אחיד לכל מודל ומחבר אליו את פעולות ה־controller.
const createModelRouter = (controller, routeGuards = {}) => {
    const router = express.Router()
    const guardsFor = routeName => {
        const guard = routeGuards[routeName]
        return guard ? (Array.isArray(guard) ? guard : [guard]) : []
    }
    // מסלולי רישום וכניסה נוצרים רק לבקרים שמספקים את הפעולות האלה.
    if (controller.login) router.post("/login", ...guardsFor("login"), controller.login)
    if (controller.register) router.post("/register", ...guardsFor("register"), controller.register)
    router.route("/")
        .get(...guardsFor("getAll"), controller.getAll)
        .post(...guardsFor("create"), controller.create)
    router.route("/:id")
        .get(...guardsFor("getById"), controller.getById)
        .put(...guardsFor("update"), controller.update)
        .patch(...guardsFor("update"), controller.update)
        .delete(...guardsFor("remove"), controller.remove)
    return router
}

module.exports = createModelRouter