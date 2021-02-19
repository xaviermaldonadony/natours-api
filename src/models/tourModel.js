// import mongoose from 'mongoose';
// import slugify from 'slugify';
// import validator from 'validator';
const mongoose = require('mongoose');
const slugify = require('slugify');

const tourSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: [true, 'A tour must have a name'],
			unique: true,
			trim: true,
			maxlength: [40, 'A tour name must have less or equal to 40 characer'],
			minlength: [10, 'A tour name must have more or equal to 10 characer'],
			// validate: [validator.isAlpha, 'Tour name must only contain characters'],
		},
		slug: String,
		duration: {
			type: Number,
			required: [true, 'A tour must have a duration'],
		},
		maxGroupSize: {
			type: Number,
			required: [true, 'A tour must have a group size'],
		},
		difficulty: {
			type: String,
			required: [true, 'A tour musht have a difficulty'],
			enum: {
				values: ['easy', 'medium', 'difficult'],
				message: 'Difficulty is either: easy, medium, difficult',
			},
		},
		ratingsAverage: {
			type: Number,
			default: 4.5,
			min: [1, 'Rating must be above 1.0'],
			max: [5, 'Rating must be less than or 5.0'],
		},

		ratingsQuantity: {
			type: Number,
			default: 0,
		},
		price: {
			type: Number,
			required: [true, 'A tour must have a price'],
		},
		priceDiscount: {
			type: Number,
			validate: {
				validator: function (val) {
					// inside a validator func the this keyword is only going to point to the
					// current document when we are creating a new document, won't work on update
					return val < this.price;
				},
				message: 'Discount price ({VALUE}) should be below regular price',
			},
		},
		summary: {
			type: String,
			trimg: true,
			required: [true, 'A tour must have a description'],
		},
		description: {
			type: String,
			trim: true,
		},
		imageCover: {
			type: String,
			required: [true, 'A tour must have a cover image'],
		},
		images: [String],
		createdAt: {
			type: Date,
			default: Date.now(),
			// hides this field
			select: false,
		},
		startDates: [Date],
		secretTour: {
			type: Boolean,
			default: false,
		},
	},
	{
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	}
);

// virtual properties, fields defined in the schema
// that will not be persisted, can not be queried
// arrow func does not get it's own this keyword
tourSchema.virtual('durationWeeks').get(function () {
	return this.duration / 7;
});

// Document MIDDLEWARE: runs before .save() and .create
tourSchema.pre('save', function (next) {
	// in a save middleware this points to current process document
	this.slug = slugify(this.name, { lower: true });
	next();
});

// tourSchema.pre('save', function (next) {
//   console.log('Will save document..');
//   next();
// });

// exec after pre middlewares have finished
// tourSchema.post('save', function (doc, next) {
//   console.log(doc);
//   next();
// });

//  QUERY MIDDLEWARE
// find, findOne, findOneAndUpdate ...
tourSchema.pre(/^find/, function (next) {
	// this points to current query
	this.find({ secretTour: { $ne: true } });
	this.start = Date.now();
	next();
});

tourSchema.post(/^find/, function (docs, next) {
	console.log(`Query took ${Date.now() - this.start}ms`);
	next();
});

// AGGREGATION MIDDLEWARE
tourSchema.pre('aggregate', function (next) {
	// this points to current aggregation
	this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
	console.log(this.pipeline());
	next();
});

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
