const mongoose = require("mongoose")

const counterSchema = mongoose.Schema({
    _id: {
        type: String,
        required: true
    },
    seq: {
        type: Number,
        required: true,
        default: 0
    }
})

module.exports = mongoose.model("Counter", counterSchema)
