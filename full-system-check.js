const axios = require('axios');

const BASE_URL = 'http://127.0.0.1:5000/api';
const AUTH_URL = 'http://127.0.0.1:5000/api/auth';

const users = [
  { role: 'Super Admin', email: 'super@admin.com', password: 'password123', expectedPaths: ['/auth/me'] }, // Super admin paths need verification
  { role: 'School Admin', email: 'admin@school.com', password: 'password', expectedPaths: ['/school/1/students', '/school/1/teachers'] },
  { role: 'Teacher', email: 'teacher@school.com', password: 'password', expectedPaths: ['/teacher/1/dashboard', '/teacher/1/classes'] },
  { role: 'Parent', email: 'parent@school.com', password: 'password', expectedPaths: ['/parent/1/dashboard'] }
];

const login = async (role, email, password) => {
  try {
    console.log(`Logging in as ${role}...`);
    const res = await axios.post(`${AUTH_URL}/login`, { email, password });
    if (res.data.token) {
      console.log(`✅ ${role} Login Successful`);
      return res.data.token;
    } else {
      console.error(`❌ ${role} Login Failed: No token returned`);
      return null;
    }
  } catch (error) {
    console.error(`❌ ${role} Login Failed:`, error.response ? error.response.data : error.message);
    return null;
  }
};

const checkEndpoints = async (role, token, paths) => {
  if (!token) return;
  console.log(`Checking endpoints for ${role}...`);
  const headers = { 'Authorization': `Bearer ${token}` };

  for (const path of paths) {
    try {
      const url = `${BASE_URL}${path}`;
      const res = await axios.get(url, { headers });
      console.log(`  ✅ GET ${path} - Status: ${res.status}`);
    } catch (error) {
      console.error(`  ❌ GET ${path} - Failed:`, error.response ? `${error.response.status} ${error.response.statusText}` : error.message);
      if (error.response && error.response.status === 404) {
          console.error(`     (Check if route exists and ID matches seeded data)`);
      }
    }
  }
};

const runCheck = async () => {
  console.log('Starting Full System Check...');
  
  // Verify server is up first
  try {
      await axios.get('http://localhost:5000/health').catch(() => {}); // ignore 404/error, just warming up or checking connection
  } catch (e) {}

  for (const user of users) {
    const token = await login(user.role, user.email, user.password);
    if (token) {
      await checkEndpoints(user.role, token, user.expectedPaths);
      
      // Also check /auth/me
      try {
          const meRes = await axios.get(`${AUTH_URL}/me`, { headers: { 'Authorization': `Bearer ${token}` } });
          console.log(`  ✅ GET /auth/me - Role: ${meRes.data.role}`);
      } catch (e) {
          console.error(`  ❌ GET /auth/me - Failed:`, e.message);
      }
    }
    console.log('-----------------------------------');
  }
  console.log('System Check Completed.');
};

runCheck();
