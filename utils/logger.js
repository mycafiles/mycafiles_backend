const time = () => new Date().toLocaleTimeString();

exports.info = (msg) => {
    console.log(`🟢 [${time()}] ${msg}`);
};

exports.error = (msg) => {
    console.error(`🔴 [${time()}] ${msg}`);
};

exports.warn = (msg) => {
    console.warn(`🟡 [${time()}] ${msg}`);
};
