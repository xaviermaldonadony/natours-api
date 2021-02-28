const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');

const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const sendEmail = require('../utils/email');

// 											payload, secret, opt
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createAndSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ), // convert ms
    // cookie will only be sent on an encrypted connection, https
    // can not be access or modified by the browser
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  // secure jwt in cookie
  res.cookie('jwt', token, cookieOptions);
  // remove password from the otuput
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

// sign up and log in
exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create(req.body);
  createAndSendToken(newUser, 201, res);
});

// login a user in basically means, to sign a jwt and send it back to the client
// only if the user exists and the password is correct
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  //  1) check if email and passowrd exist
  if (!email || !password) {
    const message = 'Please provide email and password.';
    return next(new AppError(message, 404));
  }
  // 2) check if user exist && password is correct
  // + to add the field, to explicityly select it
  const user = await User.findOne({ email }).select('+password');
  // console.log(user);

  if (!user || !(await user.correctPassword(password, user.password))) {
    const message = 'Incorrect email or passowrd';
    // 401 unauthorized
    return next(new AppError(message, 401));
  }

  // 3) If everything ok, send token to client
  createAndSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  let token;

  // 1) get token and check it
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access'),
      401,
    );
  }
  // 2) verificate/validate token
  // promisify it
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError('The user belonging to the token no longer exist', 401),
    );
  }

  // 4) check is user changed passowrd after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password. Please log in again', 401),
    );
  }

  // if passes all tests grant access to protect route
  req.user = currentUser;
  next();
});

// wrapper function
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles ['admin', 'lead-guide'] role='user' it goes in if
    if (!roles.includes(req.user.role)) {
      // 403 forbidden
      return next(
        new AppError('You do not have permission to perfom this action', 403),
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on posted email
  const user = await User.findOne({ email: req.body.email });
  let errMessage;
  if (!user) {
    errMessage = `There is no user with ${req.body.email} address.`;
    return next(new AppError(errMessage), 404);
  }

  // 2) generate random token
  const resetToken = user.createPasswordResetToken();
  // we modified the document, so we need to save it
  // deactivate all validators in schema
  await user.save({ validateBeforeSave: false });

  //  3) send it to user's email
  const resetURL = `${req.protocol}://${req.get(
    'host',
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!t`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (valid for 10 min)',
      message,
    });
    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    // if it fails reset the fields save and create error
    user.passwordResetToekn = undefined;
    user.passwordResetExpires = undefined;

    await user.save({ validateBeforeSave: false });
    errMessage = 'There was an error sending the email. Try again later!';
    console.log('try catch');

    return next(AppError(errMessage, 500));
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  console.log('RESETPASSWORD');
  const message = 'Token is invalid or has expired';

  // 1) Get user based on the token
  // params becuase is in the params url
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  // if token expired it wont return a user
  // property has to be greater than the current date / time
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  //  2) If token has not expired, and there is user, se the new password
  if (!user) {
    return next(new AppError(message, 400));
  }

  // 3) Update pawwsord property for the user and reet password reset properties
  // save and validate
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  //  pre save middleware runs and changes changedPasswordAt property

  // 4) Log the user in, send the JWT
  createAndSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  const message = 'Your current password is wrong';
  // 1) Get user from collection, autheticated users/id are stored by protect middleware
  const user = await User.findById(req.user.id).select('+password');

  // 2) Check if Posted current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError(message, 401));
  }

  // 3) If so, update the password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  // validation then gets done by the schema validator
  console.log('before save');
  await user.save();
  console.log('after save');
  // if we use find findByIdAndUpdate, our validators and  pre save middle ware wont work

  // 4) Log user in, send JWT
  createAndSendToken(user, 200, res);
});
