const mongoose=require("mongoose")
const parentSchema=mongoose.Schema({
    email: {
        type: String,
        unique: true
    },
    password:{
        type:String,
        select:false,
        required:true,
    },
    id:{
        type:String,
        required:true,
        unique:true
    },
    children:{
        type:[mongoose.Schema.Types.ObjectId],
        ref:'Child'
    }
},{
    timestamps:true
})
module.exports=mongoose.model('Parent',parentSchema)
