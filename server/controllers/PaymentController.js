const mongoose = require("mongoose")
const Event = require("../models/Event")
const Payment = require("../models/Payment")

const getAll = async (req, res) => {
    try {
        const payments = await Payment.find({ payerId: req.user.id })
            .populate("event", "name date")
            .sort({ createdAt: -1 })
            .lean()
        return res.json(payments)
    } catch (error) {
        console.error("Failed to fetch payments:", error)
        return res.status(500).json({ message: "טעינת התשלומים נכשלה" })
    }
}

const getById = async (req, res) => {
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: "מזהה תשלום אינו תקין" })
    }

    try {
        const payment = await Payment.findOne({ _id: id, payerId: req.user.id })
            .populate("event", "name date")
            .lean()
        if (!payment) {
            return res.status(404).json({ message: "התשלום לא נמצא" })
        }
        return res.json(payment)
    } catch (error) {
        console.error("Failed to fetch payment:", error)
        return res.status(500).json({ message: "טעינת התשלום נכשלה" })
    }
}

const create = async (req, res) => {
    const unsupportedFields = Object.keys(req.body ?? {}).filter(field => field !== "event")
    if (unsupportedFields.length > 0) {
        return res.status(400).json({
            message: "ניתן לשלוח רק מזהה אירוע",
            fields: unsupportedFields
        })
    }

    const { event: eventId } = req.body ?? {}
    if (!mongoose.isValidObjectId(eventId)) {
        return res.status(400).json({ message: "מזהה אירוע אינו תקין" })
    }

    try {
        const event = await Event.findById(eventId).select("_id price").lean()
        if (!event) {
            return res.status(404).json({ message: "האירוע לא נמצא" })
        }
        if ((event.price ?? 0) <= 0) {
            return res.status(400).json({ message: "לא ניתן ליצור תשלום עבור אירוע ללא עלות" })
        }

        const payment = await Payment.create({
            payerId: req.user.id,
            event: event._id,
            amount: event.price ?? 0,
            status: "pending"
        })
        return res.status(201).json(payment)
    } catch (error) {
        if (error.name === "ValidationError" || error.name === "CastError") {
            return res.status(400).json({ message: "נתוני התשלום אינם תקינים" })
        }
        console.error("Failed to create payment:", error)
        return res.status(500).json({ message: "יצירת התשלום נכשלה" })
    }
}

module.exports = { getAll, getById, create }
