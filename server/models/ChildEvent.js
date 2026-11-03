const mongoose = require('mongoose')
const childInEventSchema = mongoose.Schema({
    child: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Child',
        required: true
    },
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
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

childInEventSchema.index(
    { child: 1, event: 1 },
    {
        unique: true,
        partialFilterExpression: {
            child: { $type: 'objectId' },
            event: { $type: 'objectId' }
        }
    }
)

module.exports = mongoose.model('ChildInEvent', childInEventSchema)