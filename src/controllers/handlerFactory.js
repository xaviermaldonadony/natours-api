const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const APIFeatures = require('../utils/apiFeatures');

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    console.log(req.params);
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) {
      // jumpst to global error handler
      return next(new AppError('No doc found with that ID', 404));
    }

    res.status(204).json({
      status: 'succes',
      data: null,
    });
  });

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      // jumpst to global error handler
      return next(new AppError('No document found with that ID', 404));
    }
    res.status(200).json({
      status: 'succes',
      data: {
        doc,
      },
    });
  });

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    // const newTours = new Tour({})
    // newTours.save()

    const doc = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    // populates virtual field if exist
    const query = popOptions
      ? Model.findById(req.params.id).populate(popOptions)
      : Model.findById(req.params.id);
    const doc = await query;

    // null is false
    if (!doc) {
      // jumpst to global error handler
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    // to Allow for nested GET reviews on tour
    // to get all reviews
    let filter = {};
    if (req.params.tourId) {
      filter = { tour: req.params.tourId };
    }

    //create query and execute query
    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    const doc = await features.query;
    // const doc = await features.query.explain();

    // send response
    res.status(200).json({
      status: 'success',
      results: doc.length,
      data: {
        data: doc,
      },
    });
  });
