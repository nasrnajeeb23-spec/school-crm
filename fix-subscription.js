const { sequelize, Subscription } = require('./backend/models');

async function fixSubscription() {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');

    const sub = await Subscription.findOne({ where: { schoolId: 1 } });
    if (sub) {
      sub.status = 'ACTIVE';
      sub.renewalDate = new Date('2030-01-01');
      sub.endDate = new Date('2030-01-01');
      await sub.save();
      console.log('✅ Updated School 1 subscription to 2030.');
    } else {
      console.log('❌ No subscription found for School 1.');
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await sequelize.close();
  }
}

fixSubscription();
