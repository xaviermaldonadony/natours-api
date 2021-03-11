const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

const AppError = require('./utils/AppError');
const globalErroHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');

const app = express();

// GLOBAL MIDDLEWARE
// Set security HTTP headers
app.use(helmet());

// development loggin
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// limit request from same API
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  messge: 'Too many request from this IP, please try again in an hour',
});
// affects all the routes
app.use('/api', limiter);

// Bdoy parser, reading data from the body into req.body
app.use(
  express.json({
    limit: '10kb',
  }),
);

// Data sanitization against NoSQL query injection
// it looks at the request body, req query string and req.params it filters out all of the "$"and "."
app.use(mongoSanitize());

// Data sanitization against XSS (cross site scryting attacks)
// cleans up any malicious html code with js attached to it
app.use(xss());

// Prevent parameter pollution
// whitelist params
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsAverage',
      'ratingsQuantity',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  }),
);

//  Serving static files
app.use(express.static(`${__dirname}/public`));

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.headers)
  next();
});

// MOUNT ROUTES
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);

// middleware, catches any other route not handled
app.all('*', (req, res, next) => {
  const message = `Cant find ${req.originalUrl} on this server`;
  // to reach the error
  // if the next func receives an argument, express will automatically known its an error
  // skips all other middleware in the stack and sends the error to global error handling middleware
  next(new AppError(message, 404));
});

// err handling middleware
// 4 arguments, express will know its an error
app.use(globalErroHandler);

module.exports = app;

//  11 24
// 5 16

// JWT stateless, no state is left in the server so the server does not know the users logged in
// a user is logged in as soon as he gets back his unique valid jwt, which is not saved in the sever
// which makes this process stateles
// when a user wants to acces a protected router he uses his token
// Once the req hits the server our app verifies if the jwt is valid
// all this must happen over https.

// data sanitization, 2 packages
