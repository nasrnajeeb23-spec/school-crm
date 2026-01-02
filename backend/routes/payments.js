const express = require('express');
const router = express.Router();
const { verifyToken, requireRole, canParentAccessStudent } = require('../middleware/auth');
const { Invoice, Payment, Student } = require('../models');
const { createPaymentSession, verifyPayment } = require('../utils/payment');

const ENABLE_PAYMENT = String(process.env.ENABLE_PAYMENT || '').toLowerCase() === 'true';

// @route   POST api/payments/session
// @desc    Create a payment session for a parent invoice
// @access  Private (Parent)
router.post('/session', verifyToken, requireRole('PARENT'), async (req, res) => {
  try {
    if (!ENABLE_PAYMENT) return res.status(503).json({ msg: 'Payments disabled' });
    const invoiceId = Number(req.body?.invoiceId || 0);
    if (!invoiceId) return res.status(400).json({ msg: 'invoiceId required' });

    const inv = await Invoice.findByPk(invoiceId);
    if (!inv) return res.status(404).json({ msg: 'Invoice not found' });
    const student = await Student.findByPk(inv.studentId);
    if (!student) return res.status(404).json({ msg: 'Student not found' });
    const ok = await canParentAccessStudent(req, Number(student.schoolId || req.user.schoolId || 0), String(student.id));
    if (!ok) {
      return res.status(403).json({ msg: 'Access denied' });
    }

    const amount = Number(inv.amount || 0) - Number(inv.discount || 0) + Number(inv.taxAmount || 0) - Number(inv.paidAmount || 0);
    if (amount <= 0) return res.status(400).json({ msg: 'Invoice already paid' });

    const session = await createPaymentSession({
      invoiceId: inv.id,
      studentId: inv.studentId,
      parentId: req.user.parentId,
      amount,
      currency: inv.currencyCode || 'SAR',
      description: `School invoice #${inv.id} for student ${inv.studentId}`
    });
    return res.json(session);
  } catch (e) {
    console.error('Create payment session error:', e);
    return res.status(500).json({ msg: 'Server Error' });
  }
});

// @route   POST api/payments/webhook
// @desc    Handle payment gateway webhooks
// @access  Public
<<<<<<< HEAD
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
=======
router.post('/webhook', async (req, res) => {
  try {
    const ok = await verifyPayment(req.body || {});
    if (!ok) return res.status(400).json({ msg: 'Invalid payment' });
    const payload = req.body || {};
    const invoiceId = Number(payload.invoiceId || 0);
    const amount = Number(payload.amount || 0);
    const reference = String(payload.reference || payload.sessionId || '');
    if (!invoiceId || !amount) return res.status(400).json({ msg: 'Missing invoiceId/amount' });
    const inv = await Invoice.findByPk(invoiceId);
    if (!inv) return res.status(404).json({ msg: 'Invoice not found' });

    const payment = await Payment.create({
      invoiceId: inv.id,
      amount,
      method: 'Card',
      reference,
      currencyCode: inv.currencyCode || 'SAR',
      notes: 'Gateway webhook'
    });

    const newPaid = Number(inv.paidAmount || 0) + amount;
    inv.paidAmount = newPaid;
    const totalDue = Number(inv.amount || 0) - Number(inv.discount || 0) + Number(inv.taxAmount || 0);
    inv.status = newPaid >= totalDue ? 'PAID' : 'PARTIALLY_PAID';
    await inv.save();

    return res.json({ ok: true, paymentId: payment.id, invoiceStatus: inv.status });
  } catch (e) {
    console.error('Payment webhook error:', e);
    return res.status(500).json({ msg: 'Server Error' });
>>>>>>> 35e46d4998a9afd69389675582106f2982ed28ae
  }
});

module.exports = router;
