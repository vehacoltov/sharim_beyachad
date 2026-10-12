const mongoose = require('mongoose')
const eventSchema = mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    id:{
        type:Number,
        index:true,
        unique:true
    },
    Children: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'ChildInEvent',
        required:true
    },
    Volunteers: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'VolunteerInEvent',
        required:true
    },
    date:{
        type:Date,
        required:true
    },
    detailing:{
        type:String
    }
}, {
    timestamps: true
})
module.exports = mongoose.model('Event', eventSchema)