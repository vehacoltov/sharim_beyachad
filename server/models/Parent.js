const mongoose=require("mongoose")
const parentSchema=mongoose.Schema({
    UserName:{
        type:String,
        required:true,
        unique:true
    },
    email: {
        type: String,
        unique: true
    },
    password:{
        type:String,
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
