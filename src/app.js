const express = require('express')
const morgan = require('morgan')

const AppError = require('./utils/AppError')
const globalErroHandler = require('./controllers/errorController')
const tourRouter = require('./routes/tourRoutes')
const userRouter = require('./routes/userRoutes')

const app = express()

// MIDDLEWARE
// this middleware (global) before all route handlers
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
}
app.use(express.json())
app.use(express.static(`${__dirname}/public`))

//  applies to each and every single request
// becuase we didn't specify a route
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString()
  next()
})

// MOUNT ROUTES
app.use('/api/v1/tours', tourRouter)
app.use('/api/v1/users', userRouter)

// middleware, catches any other route not handled
app.all('*', (req, res, next) => {
  const message = `Cant find ${req.originalUrl} on this server`
  // to reach the error
  // if the next func receives an argument, express will automatically known its an error
  // skips all other middleware in the stack and sends the error to global error handling middleware
  next(new AppError(message, 404))
})

// err handling middleware
// 4 arguments, express will know its an error
app.use(globalErroHandler)

module.exports = app

// 10 2
