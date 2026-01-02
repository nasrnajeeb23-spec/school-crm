const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
let schoolAdminToken = null;
let schoolId = null;

async function runDriverTest() {
  console.log('--- Starting Driver Workflow Test ---');

  // 1. Login as School Admin
  try {
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@school.com',
      password: 'password'
    });
    schoolAdminToken = loginRes.data.token;
    schoolId = loginRes.data.user.schoolId;
    console.log('✅ Logged in as Admin. School ID:', schoolId);

    if (!schoolId) {
        console.log('⚠️ User is not bound to a school (Super Admin?). Using School ID 1 for test.');
        schoolId = 1;
    }
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    return;
  }

  const headers = { Authorization: `Bearer ${schoolAdminToken}` };

  // 2. Create a Driver (Bus Operator)
  let operatorId = null;
  try {
    const driverData = {
      name: 'Test Driver Ahmed',
      email: `ahmed.driver.${Date.now()}@test.com`,
      phone: '0501234567',
      licenseNumber: 'LIC-999888',
      busPlateNumber: 'BUS-1234',
      busCapacity: 30,
      busModel: 'Toyota Coaster',
      schoolId: schoolId
    };

    // Note: The UI uses a public endpoint for application OR a protected endpoint for manual add.
    // Let's use the protected manual add endpoint if it exists, or the public one.
    // Looking at transportation.js: router.post('/:schoolId/operators', ...) might exist?
    // Let's check the code I read earlier.
    // I didn't see a specific "create operator" protected route in the snippet, but I saw `router.post('/operator/application', ...)`
    // And `DriversList.tsx` calls `api.createBusOperator`. Let's assume there is a protected create route or use the public one.
    // Wait, let me check `transportation.js` again or just try the public application one which is easiest.
    
    const appRes = await axios.post(`${BASE_URL}/transportation/operator/application`, driverData);
    operatorId = appRes.data.id;
    console.log('✅ Driver Application Created. ID:', operatorId);

  } catch (error) {
    console.error('❌ Failed to create driver:', error.response?.data || error.message);
    return;
  }

  // 3. Approve the Driver
  try {
    const approveRes = await axios.put(`${BASE_URL}/transportation/operator/${operatorId}/approve`, {}, { headers });
    console.log('✅ Driver Approved. Status:', approveRes.data.status);
    console.log('   User ID created:', approveRes.data.userId);

    if (approveRes.data.status === 'معتمد' || approveRes.data.status === 'Approved') {
        console.log('✅ Approval logic confirmed.');
    } else {
        console.error('❌ Status did not change to Approved.');
    }

  } catch (error) {
    console.error('❌ Failed to approve driver:', error.response?.data || error.message);
  }

  // 4. Generate Invite Link
  try {
    const inviteRes = await axios.get(`${BASE_URL}/transportation/operator/${operatorId}/invite-link`, { headers });
    console.log('✅ Invite Link Generated:', inviteRes.data.activationLink);
  } catch (error) {
    console.error('❌ Failed to generate invite link:', error.response?.data || error.message);
  }

  console.log('--- Driver Workflow Test Completed ---');
}

runDriverTest();
