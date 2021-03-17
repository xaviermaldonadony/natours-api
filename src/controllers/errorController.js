const AppError = require('../utils/AppError');

const handleValidationErrorDB = (err) => {
  // array of error messages
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;

  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.message.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value} Please use another value.`;

  return new AppError(message, 400);
};

// convert operational error  to display to client
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again', 401);

const handleJWTExpiredError = () =>
  new AppError('Your session has expired! Please log in again', 401);

// checks different errors and calls apropiate function
const handlerErrors = (err) => {
  if (err.name === 'CastError') {
    err = handleCastErrorDB(err);
  }
  if (err.code === 11000) {
    err = handleDuplicateFieldsDB(err);
  }
  if (err.name === 'ValidationError') {
    err = handleValidationErrorDB(err);
  }
  if (err.name === 'JsonWebTokenError') {
    err = handleJWTError(err);
  }
  if (err.name === 'TokenExpiredError') {
    err = handleJWTExpiredError(err);
  }

  return err;
};

const sendErrorDev = (err, req, res) => {
  // A case API
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      stastus: err.status,
      errors: err,
      message: err.message,
      stack: err.stack,
    });
  }

  // B case Rendered website
  console.error('ERROR ------------------------', err);
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: err.message,
  });
};

const sendErrorProd = (err, req, res) => {
  //A API
  if (req.originalUrl.startsWith('/api')) {
    // A case Operational, trusted error show to client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        stastus: err.status,
        message: err.message,
      });
    }

    // log to console
    console.error('ERROR ------------------------', err);
    // B case, Programming or unkown error, don't leak details
    // generic error
    return res
      .status(500)
      .json({ status: 'error', message: 'Something went very wrong' });
  }

  //B Rendered website
  // A case Operational, trusted error show to client
  if (err.isOperational) {
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message,
    });
  }

  // log to console
  console.error('ERROR ------------------------', err);
  // B Programming or unkown error, don't leak details
  // generic error
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: 'Please try again later',
  });
};

module.exports = (err, req, res, next) => {
  // console.log(err.stack)
  // for default errors, 500 = internal server error
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // create a new error object from the old one
  let error = {
    ...err,
    message: err.message,
    name: err.name,
  };
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    // checks different erros
    error = handlerErrors(error);
    sendErrorProd(error, req, res);
  }
};
