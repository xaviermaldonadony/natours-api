const express = require('express');
const path = require('path');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const AppError = require('./utils/AppError');
const globalErroHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');

const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// GLOBAL MIDDLEWARE
//  Serving static files
app.use(express.static(path.join(__dirname, 'public')));
// Set security HTTP headers
// app.use(helmet());
app.use(helmet({ contentSecurityPolicy: false }));

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

// Body parser, reading data from the body into req.body
app.use(
  express.json({
    limit: '10kb',
  }),
);

// lets us parse date coming in from url encoded form
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Parse data from cookie
app.use(cookieParser());
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

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies);
  next();
});

// app.use((req, res, next) => {
//   res.setHeader(
//     'Content-Security-Policy',
//     "script-src  'self' connect.facebook.net maps.googleapis.com cdnjs.cloudflare.com cdn.quilljs.com *.aws",
//     "script-src-elem 'self' connect.facebook.net maps.googleapis.com cdnjs.cloudflare.com cdn.quilljs.com *.aws",
//     "style-src 'self' cdnjs.cloudflare.com; localhost:8000;",
//     "img-src 'self'",
//   );
//   next();
// });

// MOUNT ROUTES
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

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

// 12 19

// 5 16

// 21
// Book 25

// JWT stateless, no state is left in the server so the server does not know the users logged in
// a user is logged in as soon as he gets back his unique valid jwt, which is not saved in the sever
// which makes this process stateles
// when a user wants to acces a protected router he uses his token
// Once the req hits the server our app verifies if the jwt is valid
// all this must happen over https.

// data sanitization, 2 packages

// TO DO
// review tour that have been actually booked
// Sign up
// advanced authentication features: confirm user email, keep users logged in with refresh tokens, two-factor authentication,
// prevent duplicate booking