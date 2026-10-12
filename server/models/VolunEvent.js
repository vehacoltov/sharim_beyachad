const mongoose = require('mongoose')
const volunteerInEventSchema = mongoose.Schema({
    child:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'ChildInEvent'
    },
    volunteer:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Volunteer'
    },
    notes:{
        type:String
    },
    favouredChild: {
        type: String
    },
}, {
    timestamps: true
})
module.exports = mongoose.model('VolunteerInEvent', volunteerInEventSchema)