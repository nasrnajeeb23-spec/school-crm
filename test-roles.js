const axios = require('axios');

const BASE_URL = 'http://127.0.0.1:5000/api';
const AUTH_URL = 'http://127.0.0.1:5000/api/auth';
const SUPER_ADMIN_EMAIL = 'super@admin.com';
const SUPER_ADMIN_PASSWORD = 'password123';

const runTest = async () => {
  console.log('🧪 Starting Roles API Test...');

  try {
    // 1. Login
    console.log('Logging in...');
    const loginRes = await axios.post(`${AUTH_URL}/login`, {
      email: SUPER_ADMIN_EMAIL,
      password: SUPER_ADMIN_PASSWORD
    });
    const token = loginRes.data.token;
    console.log('✅ Login Successful');

    const headers = { 'Authorization': `Bearer ${token}` };

    // 2. List Roles
    console.log('Listing Roles...');
    const listRes = await axios.get(`${BASE_URL}/roles`, { headers });
    console.log(`✅ Roles Found: ${listRes.data.length}`);
    const initialCount = listRes.data.length;

    // 3. Create Role
    console.log('Creating Test Role...');
    const newRoleKey = `test_role_${Date.now()}`;
    const createRes = await axios.post(`${BASE_URL}/roles`, {
      name: 'Test Manager',
      description: 'A test role created by script',
      key: newRoleKey
    }, { headers });
    console.log('✅ Role Created:', createRes.data.id);
    const newRoleId = createRes.data.id;

    // 4. Update Role
    console.log('Updating Test Role...');
    const updateRes = await axios.put(`${BASE_URL}/roles/${newRoleId}`, {
      name: 'Test Manager Updated',
      description: 'Updated description'
    }, { headers });
    console.log('✅ Role Updated:', updateRes.data.name);

    // 5. Delete Role
    console.log('Deleting Test Role...');
    await axios.delete(`${BASE_URL}/roles/${newRoleId}`, { headers });
    console.log('✅ Role Deleted');

    // 6. Verify Deletion
    const listResAfter = await axios.get(`${BASE_URL}/roles`, { headers });
    if (listResAfter.data.length === initialCount) {
        console.log('✅ Verification Successful: Role count matched');
    } else {
        console.warn('⚠️ Verification Warning: Role count mismatch');
    }

    console.log('🎉 Roles API Test Completed Successfully!');

  } catch (error) {
    console.error('❌ Test Failed:', error.response ? error.response.data : error.message);
  }
};

runTest();
