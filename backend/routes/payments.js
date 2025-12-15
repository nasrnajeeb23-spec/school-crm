const express = require('express');
const router = express.Router();

// @route   POST api/payments/webhook
// @desc    Handle payment gateway webhooks
// @access  Public
// Import models
const { Notification, Invoice, School, Student } = require('../models');

// @route   POST api/payments/webhook
// @desc    Handle payment gateway webhooks
// @access  Public
router.post('/webhook', async (req, res) => {
  try {
    const { event, data } = req.body;

    // This is a placeholder logic adaptable to Stripe/PayPal/etc.
    // Assume `data` contains `invoiceId`, `status`, `amount`, `failureReason`

    if (event === 'payment.failed') {
      const { invoiceId, failureReason, amount } = data;

      // Find related school via Invoice -> Student -> School
      // Or if Invoice is directly linked to School (for subscription payments)
      // Assuming Invoice is linked to Student for now, but we need School Context

      // Let's assume this is a SCHOOL SUBSCRIPTION payment failure
      // So we might look up a specialized Invoice model or Subscription model directly
      // For simplicity, we'll log a generic Financial Warning for Super Admin

      await Notification.create({
        type: 'Financial',
        title: 'فشل عملية دفع',
        description: `فشلت عملية الدفع للفاتورة رقم ${invoiceId || 'N/A'}. المبلغ: ${amount}. السبب: ${failureReason || 'غير محدد'}`,
        status: 'Sent',
        isRead: false
      });

      console.log(`Payment failed for invoice ${invoiceId}: ${failureReason}`);
    } else if (event === 'payment.succeeded') {
      // Handle success (e.g., extend subscription)
      // Implementation would go here
      console.log(`Payment succeeded for invoice ${data?.invoiceId}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook Error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// @route   POST api/payments/proof
// @desc    Submit payment proof
// @access  Public
router.post('/proof', async (req, res) => {
  try {
    const { method, amount, reference, relatedService, schoolName } = req.body;

    // Notify Super Admin
    await Notification.create({
      type: 'Financial',
      title: 'إثبات دفع جديد',
      description: `تم استلام إثبات دفع بقيمة ${amount} للخدمة: ${relatedService}. المدرسة: ${schoolName}. المرجع: ${reference}`,
      status: 'Sent',
      userId: 1, // Assumptions Super Admin ID 1
      isRead: false
    });

    res.json({ success: true, msg: 'Payment proof received' });
  } catch (err) {
    console.error('Payment Proof Error:', err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
