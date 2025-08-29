const express = require('express');
const router = express.Router();
const { sendEmail, sendSMS, sendPushNotification } = require('../controllers/notificationController');
const checkToken  = require('../middlewares/checkJWT');

router.post('/email', sendEmail);
router.post('/sms', sendSMS);
// router.post('/push', sendPushNotification);

module.exports = router;
