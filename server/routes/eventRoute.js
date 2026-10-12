const express = require('express')
const eventController = require('../controllers/EventController')

const router = express.Router()

router.route('/')
    .get(eventController.getAllEvents)
    .post(eventController.createEvent)
    .put(eventController.update)
    .delete(eventController.deleteEvent)

router.route('/:id')
    .get(eventController.getById)

module.exports = router


