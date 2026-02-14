const express = require('express');
const router = express.Router();
const notificationController = require('../controller/notificationController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/test', notificationController.sendTestNotification);
router.get('/', notificationController.getNotifications);
router.patch('/mark-all-read', notificationController.markAllRead);
router.patch('/:id/read', notificationController.markAsRead);
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
