const mongoose = require('mongoose')
const employeeSchema = mongoose.Schema({
    fullName:{
        type:String,
        required:true
    },
    id:{
        type:String,
        required:true,
        unique:true
    },
    phone:{
        type:String
    },
    userName:{
        type:String,
        required:true,
        unique:true
    },
    password:{
        type:String,
        select:false,
        required:true
    },
    permission:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Permission",
        required: true
    },
    workingTime:{
        type:Number,
        default:0
    },
    currentWorkingTime:{
        type:Number,
        default:0
    }
}, {
    timestamps: true
})
module.exports = mongoose.model('Employee', employeeSchema)