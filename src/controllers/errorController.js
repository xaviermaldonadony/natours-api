const AppError = require('../utils/AppError')

const handleValidationErrorDB = (err) => {
  // array of error messages
  const errors = Object.values(err.errors).map((el) => el.message)
  const message = `Invalid input data. ${errors.join('. ')}`

  return new AppError(message, 400)
}

const handleDuplicateFieldsDB = (err) => {
  const value = err.message.match(/(["'])(\\?.)*?\1/)[0]
  const message = `Duplicate field value: ${value} Please use another value.`

  return new AppError(message, 400)
}

// convert operational error  to display to client
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`
  return new AppError(message, 400)
}

// checks different errors and calls apropiate function
const handlerErrors = (error) => {
  if (error.name === 'CastError') {
    error = handleCastErrorDB(error)
  }
  if (error.code === 11000) {
    error = handleDuplicateFieldsDB(error)
  }
  if (error.name === 'ValidationError') {
    error = handleValidationErrorDB(error)
  }
  return error
}
const sendErroDev = (err, res) => {
  // console.log('ERROR DEV---------------', err)
  res.status(err.statusCode).json({
    stastus: err.status,
    errors: err,
    message: err.message,
    stack: err.stack,
  })
}
const sendErroProd = (err, res) => {
  // operational, trusted error show to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      stastus: err.status,
      message: err.message,
    })
  } else {
    // log to console
    console.error('ERROR ------------------------', err)
    // Programming or unkown error, don't leak details
    // generic error
    res.status(500).json({
      status: 'error',
      message: 'Something went very wrong',
    })
  }
}

module.exports = (err, req, res, next) => {
  // console.log(err.stack)
  // for default errors, 500 = internal server error
  err.statusCode = err.statusCode || 500
  err.status = err.status || 'error'

  // create a new error object from the old one
  let error = {
    ...err,
    message: err.message,
    name: err.name,
  }
  if (process.env.NODE_ENV === 'development') {
    sendErroDev(err, res)
  } else if (process.env.NODE_ENV === 'production') {
    // checks different erros
    error = handlerErrors(error)
    sendErroProd(error, res)
  }
}
