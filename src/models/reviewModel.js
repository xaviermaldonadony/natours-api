const mongoose = require('mongoose');
const Tour = require('./tourModel');

// review , rating, createdAt , ref to tour, ref to user
const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review can not be empty'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    // Parent Referencing
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour'],
    },

    // Parent Referencing
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'review must belong to a user'],
    },
  },
  // when we have a virtual property, a field that is not store in the database
  // but calculated some other value, we want this to show up when ever there is an output
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);
// tour and user will alwasy be unique
reviewSchema.index(
  { tour: 1, user: 1 },
  {
    unique: true,
  },
);

reviewSchema.pre(/^find/, function (next) {
  // this.populate({
  //   path: 'tour',
  //   select: 'name',
  // }).populate({
  //   path: 'user',
  //   select: 'name photo',
  // });
  this.populate({
    path: 'user',
    select: 'name photo',
  });

  next();
});

// static method
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  // this points to the model
  // select all the reviews that belong to the passed tour
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

// post since the review is save in the doc
reviewSchema.post('save', function () {
  // this points to current review
  // we cant call the Review yet
  // it's a static method so we need to call it on the model
  this.constructor.calcAverageRatings(this.tour);
});

// findByIdAndUpdate
// findByIdAndDelete
// there is no doc middle ware, use query middleware
// this middleware passed the data from the pre to the post middle ware
reviewSchema.pre(/^findOneAnd/, async function (next) {
  // acess the query, and get the doc that is currently processed
  this.r = await this.findOne();
  next();
});

reviewSchema.post(/^findOneAnd/, async function () {
  // await this.findOne(); does NOT work here, query has already executed
  // the review update has already finished
  // the model is, this.r.constructor
  // it's a static method so we need to call it on the model
  await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
