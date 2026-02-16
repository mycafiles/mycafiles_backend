const CA = require("../models/User");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const logger = require("../utils/logger");

exports.createCa = catchAsync(async (req, res, next) => {
    logger.info("CREATE CA API HIT");
    logger.info(`BODY: ${JSON.stringify(req.body)}`);

    const { name, email, password } = req.body;

    const ca = await CA.create({ name, email, password });

    logger.info(`CA CREATED: ${ca._id}`);

    res.status(201).json({
        status: "success",
        data: ca
    });
});


exports.viewCa = catchAsync(async (req, res, next) => {
    const ca = await CA.find({ role: "CAADMIN" });

    logger.info(`CA FETCHED | Count: ${ca.length}`);

    res.json({
        status: "success",
        results: ca.length,
        data: ca
    });
});

exports.editCa = catchAsync(async (req, res, next) => {
    const { name, email, password } = req.body;

    const ca = await CA.findById(req.params.id);

    if (!ca) {
        logger.error(`CA NOT FOUND | ID: ${req.params.id}`);
        return next(new AppError("No CA found with that ID", 404));
    }

    if (name) ca.name = name;
    if (email) ca.email = email;
    if (password && password.trim() !== "") {
        ca.password = password;
    }

    await ca.save();

    logger.info(`CA UPDATED | ID: ${req.params.id}`);

    res.json({
        status: "success",
        data: ca
    });
});

exports.updateStatusCa = catchAsync(async (req, res, next) => {
    const ca = await CA.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    if (!ca) {
        logger.error(`CA STATUS UPDATE FAILED | ID: ${req.params.id}`);
        return next(new AppError("No CA found with that ID", 404));
    }

    logger.info(`CA STATUS UPDATED | ID: ${req.params.id}`);

    res.json({
        status: "success",
        data: ca
    });
});

exports.deleteCa = catchAsync(async (req, res, next) => {
    const ca = await CA.findByIdAndDelete(req.params.id);

    if (!ca) {
        logger.error(`CA DELETE FAILED | ID: ${req.params.id}`);
        return next(new AppError("No CA found with that ID", 404));
    }

    logger.info(`CA DELETED | ID: ${req.params.id}`);

    res.json({
        status: "success",
        message: "CA deleted successfully"
    });
});
