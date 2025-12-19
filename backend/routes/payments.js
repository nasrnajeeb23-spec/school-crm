const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
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
    if (String(req.user.parentId || '') !== String(student.parentId || '')) {
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
  }
});

module.exports = router;
