const mongoose = require('mongoose')
const childInEventSchema = mongoose.Schema({
    child: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'Child'
    },
    volunteer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VolunteerInEvent'
    },
    favoriteVolun: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
})
module.exports = mongoose.model('ChildInEvent', childInEventSchema)