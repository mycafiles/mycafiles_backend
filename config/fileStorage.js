const multer = require('multer');

const upload = multer({
  storage: multer.diskStorage({
    destination: '/tmp',
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname);
    },
  }),
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB
  },
});

module.exports = { upload };
