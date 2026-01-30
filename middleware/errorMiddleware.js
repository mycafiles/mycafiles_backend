const sendErrorDev = (err, res) => {
    console.error("🔥 ERROR:", err);

    res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
        stack: err.stack
    });
};

const sendErrorProd = (err, res) => {
    if (err.isOperational) {
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message
        });
    } else {
        console.error("🔥 UNEXPECTED ERROR:", err);

        res.status(500).json({
            status: "error",
            message: "Something went very wrong!"
        });
    }
};

module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || "error";

    if (process.env.NODE_ENV === "development") {
        sendErrorDev(err, res);
    } else {
        sendErrorProd(err, res);
    }
};
