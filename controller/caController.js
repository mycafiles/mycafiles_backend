const bcrypt = require('bcryptjs');
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const logger = require("../utils/logger");
const prisma = require("../config/prisma");

exports.createCa = catchAsync(async (req, res, next) => {
    logger.info("CREATE CA API HIT");
    logger.info(`BODY: ${JSON.stringify(req.body)}`);

    const { name, email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const ca = await prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
            role: "CAADMIN",
            status: "active"
        }
    });

    logger.info(`CA CREATED: ${ca.id}`);

    res.status(201).json({
        status: "success",
        data: { ...ca, _id: ca.id }
    });
});

exports.viewCa = catchAsync(async (req, res, next) => {
    const ca = await prisma.user.findMany({
        where: { role: "CAADMIN" }
    });

    logger.info(`CA FETCHED | Count: ${ca.length}`);

    res.json({
        status: "success",
        results: ca.length,
        data: ca.map(c => ({ ...c, _id: c.id }))
    });
});

exports.editCa = catchAsync(async (req, res, next) => {
    const { name, email, password } = req.body;

    const ca = await prisma.user.findUnique({
        where: { id: req.params.id }
    });

    if (!ca) {
        logger.error(`CA NOT FOUND | ID: ${req.params.id}`);
        return next(new AppError("No CA found with that ID", 404));
    }

    const updateData = {
        name: name || ca.name,
        email: email || ca.email
    };

    if (password && password.trim() !== "") {
        updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedCa = await prisma.user.update({
        where: { id: req.params.id },
        data: updateData
    });

    logger.info(`CA UPDATED | ID: ${req.params.id}`);

    res.json({
        status: "success",
        data: { ...updatedCa, _id: updatedCa.id }
    });
});

exports.updateStatusCa = catchAsync(async (req, res, next) => {
    try {
        const updatedCa = await prisma.user.update({
            where: { id: req.params.id },
            data: req.body // Expects { status: "active"/"inactive" }
        });

        logger.info(`CA STATUS UPDATED | ID: ${req.params.id}`);

        res.json({
            status: "success",
            data: { ...updatedCa, _id: updatedCa.id }
        });
    } catch (err) {
        logger.error(`CA STATUS UPDATE FAILED | ID: ${req.params.id}`);
        return next(new AppError("No CA found with that ID", 404));
    }
});

exports.deleteCa = catchAsync(async (req, res, next) => {
    try {
        await prisma.user.delete({
            where: { id: req.params.id }
        });

        logger.info(`CA DELETED | ID: ${req.params.id}`);

        res.json({
            status: "success",
            message: "CA deleted successfully"
        });
    } catch (err) {
        logger.error(`CA DELETE FAILED | ID: ${req.params.id}`);
        return next(new AppError("No CA found with that ID", 404));
    }
});
