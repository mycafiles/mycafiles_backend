const sendErrorDev = (err, res) => {
    console.error("🔥 ERROR:", err);

    res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
        stack: err.stack
    });
};

const sendErrorProd = (err, res) => {
    // Handling Multer errors specifically
    if (err.name === 'MulterError') {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                status: 'fail',
                message: `File is too large. Only 50 MB acceptable.`
            });
        }
        return res.status(400).json({
            status: 'fail',
            message: err.message
        });
    }

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

    // In development, also handle Multer errors specifically for better feedback
    if (err.name === 'MulterError' && err.code === 'LIMIT_FILE_SIZE') {
        err.message = `File is too large. Only 50 MB acceptable.`;
        err.statusCode = 400;
    }

    if (process.env.NODE_ENV === "development") {
        sendErrorDev(err, res);
    } else {
        sendErrorProd(err, res);
    }
};
