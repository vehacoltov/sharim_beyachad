const express = require("express")
const paymentController = require("../controllers/PaymentController")
const { requireRoleOrAction } = require("../middleware/requireUserAccess")

const router = express.Router()
const paymentAccess = requireRoleOrAction(["Parent"])

router.route("/")
    .get(paymentAccess, paymentController.getAll)
    .post(paymentAccess, paymentController.create)

router.route("/:id")
    .get(paymentAccess, paymentController.getById)

module.exports = router
