const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

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
    validate: [validator.isEmail, 'Please provide a valid email'],
  },
  photo: String,
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },

  password: {
    type: String,
    require: [true, 'Please provide a password'],
    minlength: 6,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Passwords are not the same'],
    validate: {
      // This only works on SAVE
      validator: function (el) {
        return el === this.password;
      },
      message: 'Passowrds are not the same',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

// after getting the data before saving it
userSchema.pre('save', async function (next) {
  // if password not modified return
  if (!this.isModified('password')) {
    return next();
  }

  // hash password cost of 12
  this.password = await bcrypt.hash(this.password, 12);
  // delete passwordConfirm
  this.passwordConfirm = undefined;
});

// this function runs before a document is saved
// use this when the password has been changed, resetted
userSchema.pre('save', function (next) {
  // if pwd not modified return, or doc is new
  if (!this.isModified('password') || this.isNew) {
    return next();
  }

  // this property could be created after the token in the authController, That would lead to a bug
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function (next) {
  // this points to the current  query
  this.find({ active: { $ne: false } });
  next();
});

// instance methods, is available on all documents of a certain collection
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword,
) {
  // this.password not available
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );
    // if jwt < changed time return true, checks to see if the token issued is less than the changedTime
    return JWTTimestamp < changedTimestamp; // 100 < 200
  }
  // field could be undefined other wise false in if check return false
  // return false;
};

userSchema.methods.createPasswordResetToken = function () {
  // create a random token
  const resetToken = crypto.randomBytes(32).toString('hex');

  // encrypt
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // token expires for security purposes
  // 10 mins, 10 * 60 sec * 1000 ms
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  // console.log({ resetToken }, this.passwordResetToken);

  return resetToken;
};

const UserSchema = mongoose.model('User', userSchema);

module.exports = UserSchema;
