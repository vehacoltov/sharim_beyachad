const express = require('express')
const eventController = require('../controllers/EventController')
const requireAction = require("../middleware/requireAction")

const router = express.Router()

router.route('/')
    .get(requireAction("events"), eventController.getAllEvents)
    .post(requireAction("events"), eventController.createEvent)
    .put(requireAction("events"), eventController.update)
    .delete(requireAction("events"), eventController.deleteEvent)

router.route('/:id')
    .get(requireAction("events"), eventController.getById)

module.exports = router


