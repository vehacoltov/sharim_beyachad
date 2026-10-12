const mongoose = require('mongoose')
const Child = require('./Child')
const childInEventSchema = mongoose.Schema({
    child: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'Child'
    },
    volunteer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VolunteerInEvent'
    }
}, {
    timestamps: true
})
module.exports = mongoose.model('ChildInEvent', childInEventSchema)