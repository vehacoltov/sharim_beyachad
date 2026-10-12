const mongoose = require('mongoose')
const childSchema = mongoose.Schema({
    fullName: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'Parent'
    },
    id: {
        type: String,
        unique: true,
        trim:true
    },
    phone:{
        type:String,
        required:true,
    },
    anothwrPhone:{
        type:String,
    },
    age:{
        type:Number,
    },
    epilepsy:{
        type:String,
    },
    sensitivity:{
        type:String
    },
    medicines:{
        type:String
    },
    canBeFilemed:{
        type:Boolean
    },
    detailing:{
        type:String
    },
    notes:{
        type:String
    },
    img:{
        type:String
    },
    status:{
        type:String,
        enum:["undependent","needChangig","minHelping"]
    },
    category:{
        type:[String],
        enum:["easy","med","chalenged","ASD","down","mr"]
    }
 
}, {
    timestamps: true
})
module.exports = mongoose.model('Child', childSchema)