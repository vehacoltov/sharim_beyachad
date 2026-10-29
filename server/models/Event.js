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
    sumOfChilds: {
        type: Number,
        default: 0,
        min: 0
    },
    SavedPlaces: {
        type: Number,
        default: 0,
        min: 0
    },
    isActive: {
        type: Boolean
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
    startReg: {
        type: Date
    },
    endReg: {
        type: Date
    },
    hour: {
        type: String,
        match: /^([01]\d|2[0-3]):[0-5]\d$/
    },
    detailingForParent: {
        type: String
    },
    detailingForVolun:{
        type:String
    }
}, {
    timestamps: true
})

module.exports = mongoose.model('Event', eventSchema)