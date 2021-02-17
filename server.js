const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './config.env' });
const app = require('./app');

// console.log(app.get('env'));
// console.log(process.env);

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose
  // local connection
  // .connect(process.env.DATABASE_LOCAL, {
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false, // deprecation warnings
  })
  .then(() => console.log('DB connection successful!'));
// .then((con) => console.log('DB connection successful!', con.connections));

const port = process.env.Port || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`App running on port ${port}....`);
});
