const mongoose = require("mongoose")

const paymentSchema = mongoose.Schema({
    payerId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "Parent"
    },
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event",
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        required: true,
        enum: ["pending", "succeeded", "failed"],
        default: "pending"
    },
    transactionId: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
})

paymentSchema.index({ payerId: 1, createdAt: -1 })

module.exports = mongoose.model("Payment", paymentSchema)
