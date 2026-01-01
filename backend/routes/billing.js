const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { sequelize, School, Plan, Subscription, SubscriptionModule, ModuleCatalog, SchoolTransaction, Notification } = require('../models');
const { Op } = require('sequelize');

// @route   POST api/billing/payment-proof
// @desc    Submit payment proof for manual review
// @access  Private
router.post('/payment-proof', verifyToken, async (req, res) => {
  try {
    const p = req.body || {};
    const title = String(p.relatedService || 'Payment Proof');
    const desc = `Method: ${p.method || ''} | Amount: ${p.amount || 0} | Ref: ${p.reference || ''} | School: ${p.schoolName || ''}`;
    await Notification.create({ type: 'Approval', title, description: desc, status: 'Pending' });
    res.json({ success: true });
  } catch (e) {
    console.error(e?.message || e);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/billing/upgrade-plan
// @desc    Upgrade subscription plan using school balance
// @access  Private (SchoolAdmin)
router.post('/upgrade-plan', verifyToken, requireRole('SCHOOL_ADMIN'), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { planId, period } = req.body;
    const schoolId = req.user.schoolId;
    if (!planId) return res.status(400).json({ msg: 'planId required' });

    const school = await School.findByPk(schoolId, { transaction: t });
    if (!school) {
      await t.rollback();
      return res.status(404).json({ msg: 'School not found' });
    }

    const plan = await Plan.findByPk(planId, { transaction: t });
    if (!plan) {
      await t.rollback();
      return res.status(404).json({ msg: 'Plan not found' });
    }

    // Determine price (simple logic: full price for new period)
    // In a real system, we would pro-rate based on remaining time of current subscription
    let price = Number(plan.price); 
    if (period === 'ANNUAL' && plan.annualPrice) {
        price = Number(plan.annualPrice);
    }

    if (Number(school.balance) < price) {
      await t.rollback();
      return res.status(400).json({ msg: 'Insufficient balance', required: price, balance: school.balance });
    }

    // Deduct balance
    school.balance = Number(school.balance) - price;
    await school.save({ transaction: t });

    // Record Transaction
    await SchoolTransaction.create({
      schoolId: school.id,
      type: 'UPGRADE',
      amount: price,
      balanceAfter: school.balance,
      description: `Upgrade to plan: ${plan.name} (${period || 'MONTHLY'})`,
      performedBy: req.user.id
    }, { transaction: t });

    // Update or Create Subscription
    let subscription = await Subscription.findOne({ where: { schoolId: school.id }, transaction: t });
    
    const startDate = new Date();
    const renewalDate = new Date();
    if (period === 'ANNUAL') {
        renewalDate.setFullYear(renewalDate.getFullYear() + 1);
    } else {
        renewalDate.setMonth(renewalDate.getMonth() + 1);
    }

    if (subscription) {
      subscription.planId = plan.id;
      subscription.status = 'ACTIVE';
      subscription.renewalDate = renewalDate;
      // Reset custom limits if switching plans? 
      // Maybe keep them, but for safety let's keep them as is unless null.
      await subscription.save({ transaction: t });
    } else {
      subscription = await Subscription.create({
        schoolId: school.id,
        planId: plan.id,
        status: 'ACTIVE',
        startDate: startDate,
        renewalDate: renewalDate
      }, { transaction: t });
    }

    await t.commit();
    res.json({ success: true, msg: 'Plan upgraded successfully', plan: plan.name, newBalance: school.balance });

  } catch (e) {
    await t.rollback();
    console.error('Upgrade plan error:', e);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @route   POST api/billing/purchase-addon
// @desc    Purchase add-on module using school balance
// @access  Private (SchoolAdmin)
router.post('/purchase-addon', verifyToken, requireRole('SCHOOL_ADMIN'), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { moduleId } = req.body;
    const schoolId = req.user.schoolId;
    if (!moduleId) return res.status(400).json({ msg: 'moduleId required' });

    const school = await School.findByPk(schoolId, { transaction: t });
    if (!school) {
      await t.rollback();
      return res.status(404).json({ msg: 'School not found' });
    }

    const moduleItem = await ModuleCatalog.findByPk(moduleId, { transaction: t });
    if (!moduleItem) {
      await t.rollback();
      return res.status(404).json({ msg: 'Module not found' });
    }

    const subscription = await Subscription.findOne({ where: { schoolId: school.id }, transaction: t });
    if (!subscription) {
      await t.rollback();
      return res.status(400).json({ msg: 'Active subscription required' });
    }

    // Check if already active
    const existing = await SubscriptionModule.findOne({
      where: { subscriptionId: subscription.id, moduleId: moduleItem.id, active: true },
      transaction: t
    });
    if (existing) {
      await t.rollback();
      return res.status(400).json({ msg: 'Module already active' });
    }

    const price = Number(moduleItem.monthlyPrice || 0);
    
    if (Number(school.balance) < price) {
      await t.rollback();
      return res.status(400).json({ msg: 'Insufficient balance', required: price, balance: school.balance });
    }

    // Deduct balance
    school.balance = Number(school.balance) - price;
    await school.save({ transaction: t });

    // Record Transaction
    await SchoolTransaction.create({
      schoolId: school.id,
      type: 'PURCHASE',
      amount: price,
      balanceAfter: school.balance,
      description: `Purchase add-on: ${moduleItem.name}`,
      performedBy: req.user.id
    }, { transaction: t });

    // Create SubscriptionModule
    await SubscriptionModule.create({
      subscriptionId: subscription.id,
      moduleId: moduleItem.id,
      priceSnapshot: price,
      active: true,
      activationDate: new Date()
    }, { transaction: t });

    await t.commit();
    res.json({ success: true, msg: 'Module purchased successfully', module: moduleItem.name, newBalance: school.balance });

  } catch (e) {
    await t.rollback();
    console.error('Purchase addon error:', e);
    res.status(500).json({ msg: 'Server Error' });
  }
});

module.exports = router;
