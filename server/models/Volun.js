const mongoose = require('mongoose')
const voluteerSchema = mongoose.Schema({
    fullName: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    password:{
        type:String,
        select:false,
        required:true
    },
    email: {
        type: String,
        unique: true
    },
    id: {
        type: String,
        unique: true,
        trim: true
    },
    
    phone: {
        type: String,
        required: true,
    },
    age: {
        type: mongoose.Schema.Types.Int32
    },
    seminar: {
        type: String
    },

    detaling:{
        type:String
    },


}, {
    timestamps: true
})
module.exports = mongoose.model('Volunteer', voluteerSchema)