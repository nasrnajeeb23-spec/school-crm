const express = require('express');
const router = express.Router();

// @route   POST api/payments/webhook
// @desc    Handle payment gateway webhooks
// @access  Public
router.post('/webhook', (req, res) => {
  res.json({ msg: 'Payment webhook placeholder' });
});

module.exports = router;
