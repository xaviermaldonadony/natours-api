const mongoose = require('mongoose');
const dotenv = require('dotenv');

process.on('uncaughtException', (err) => {
  console.log(err.name, err.message);
  console.log('UNCAUGHT EXCEPTION Shutting down...');
  // terminate gracefully
  process.exit(1);
});

dotenv.config({ path: './config.env' });
const app = require('./app');

// console.log(app.get('env'));
// console.log(process.env);

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);

mongoose
  // local connection
  // .connect(process.env.DATABASE_LOCAL, {
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false, // deprecation warnings
    useUnifiedTopology: true,
  })
  .then(() => console.log('DB connection successful!'));
// .then((con) => console.log('DB connection successful!', con.connections));

const port = process.env.Port || 3000;
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`App running on port ${port}....`);
});

// subscribe to this event
process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  console.log('UNHANDLED REJECTION Shutting down...');
  // terminate gracefully
  server.close(() => {
    process.exit(1);
  });
});
