const mongoose = require('mongoose')
const validator = require('validator')

// name, email, photo, password, passwrodConfirm
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A user must have a name'],
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail],
  },
  photo: String,

  password: {
    type: String,
    require: [true, 'Please provide a password'],
    minlength: 6,
    // default:false
  },
  passwordconfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
  },
})
const UserSchema = mongoose.model('User', userSchema)

module.exports = UserSchema
