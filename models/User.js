const mongoose = require('mongoose')


const userSchema = new mongoose.Schema({
  username : {type : String,required:true,trim:true},
  email : {type : String,required:true,unique:true ,trim:true},
  password  : {type : String , required : true},
  role : {type:String,enum : ["user","admin"],default:"user"},
  plan :{type : String,enum : ["free","premium","pro"],default:"free"},
  subscriptionExpiresAt : {type:Date,default :null},
  subscriptionCancelled : {type : Boolean,default:false}
},{
  timestamps:true
})

const User = mongoose.model("User", userSchema);

module.exports = User