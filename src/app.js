const express = require('express');
const path = require('path');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const cors = require('cors');

const AppError = require('./utils/AppError');
const globalErroHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const bookingController = require('./controllers/bookingController');
const viewRouter = require('./routes/viewRoutes');

const app = express();

// will work with heroku
app.enable('trust proxy');

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// GLOBAL MIDDLEWARE
// Implement CORS
app.use(cors());
// Access-Control-Allow-Origin
// eg, api.natours.com, FE natours.com
// app.use(cors({
//   origin: 'https://www.natours.com'
// }))

// Non simple requests, put patch delete, req use cookies, req that use non standar headers
// They require a pre flight phase, the browser first does an option req to figure out if its safe
// to send. We need to res to that option req. opt is just another http method like get post del....
// When we get the option req we need to send back the same acces control allow origin header.
// Then the browser will know is safe to perform and will execute the req that was issued

app.options('*', cors());

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

// Define here, when we receive the body from stripe the function that reads the info
// needs it in raw form.
app.post(
  '/webhook-checkout',
  // bodyParser.raw({ type: 'application/json' }),
  express.raw({ type: 'application/json' }),
  bookingController.webhookCheckout,
);

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

app.use(compression());

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
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

// JWT stateless, no state is left in the server so the server does not know the users logged in
// a user is logged in as soon as he gets back his unique valid jwt, which is not saved in the sever
// which makes this process stateles
// when a user wants to acces a protected router he uses his token
// Once the req hits the server our app verifies if the jwt is valid
// all this must happen over https.

// data sanitization, 2 packages

// TO DO
// review tour that have been actually booked
// advanced authentication features: confirm user email, keep users logged in with refresh tokens, two-factor authentication,
// prevent duplicate booking
