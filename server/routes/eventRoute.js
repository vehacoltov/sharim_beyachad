const express = require('express')
const eventController = require('../controllers/EventController')
const requireAction = require("../middleware/requireAction")
const { requireRoleOrAction } = require("../middleware/requireUserAccess")

const router = express.Router()

router.route('/')
    .get(requireRoleOrAction(["Parent", "Volunteer", "Employee"], "events"), eventController.getAllEvents)
    .post(requireAction("events"), eventController.createEvent)
    .put(requireAction("events"), eventController.update)
    .delete(requireAction("events"), eventController.deleteEvent)

router.route('/:id')
    .get(requireRoleOrAction(["Parent", "Volunteer"], "events"), eventController.getById)

module.exports = router
