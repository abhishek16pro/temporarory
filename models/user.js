import mongoose from "mongoose";

const UserSchema =  new mongoose.Schema({
    email:{
        type : String,
        require: true,
        unique : true,
        max : 50
    },
    password:{
        type:String,
        require:true,
        min:10,
        max:50
    }
},
{ timestamps: true }
)

mongoose.pluralize(null);
const User = mongoose.model("admin", UserSchema);
export default User;