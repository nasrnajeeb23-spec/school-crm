const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://127.0.0.1:5000/api';
const FRONTEND_URL = 'http://127.0.0.1:3000';
const ADMIN_EMAIL = 'admin@school.com';
const ADMIN_PASSWORD = 'password';

// Utilities
const log = (msg, type = 'INFO') => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const color = type === 'ERROR' ? '\x1b[31m' : (type === 'SUCCESS' ? '\x1b[32m' : '\x1b[36m');
    console.log(`${color}[${timestamp}] [${type}] ${msg}\x1b[0m`);
};

let authToken = '';
let createdStudentId = '';
let createdFeeId = '';

async function runTests() {
    log('Starting Comprehensive System Test...', 'INFO');

    try {
        // 1. Health Checks
        log('--- Phase 1: Infrastructure Health ---', 'INFO');
        
        // Frontend Check
        try {
            await axios.head(FRONTEND_URL);
            log('Frontend is accessible (HTTP 200/OK)', 'SUCCESS');
        } catch (e) {
            log(`Frontend Check Failed: ${e.message}`, 'ERROR');
        }

        // Backend Health
        try {
            const health = await axios.get(`${BASE_URL.replace('/api', '')}/health`);
            if (health.data.status === 'healthy') {
                log('Backend is healthy', 'SUCCESS');
            } else {
                log('Backend returned unhealthy status', 'ERROR');
            }
        } catch (e) {
            log(`Backend Health Check Failed: ${e.message}`, 'ERROR');
        }

        // 2. Authentication Flow
        log('--- Phase 2: Authentication ---', 'INFO');
        try {
            const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
                email: ADMIN_EMAIL,
                password: ADMIN_PASSWORD
            });
            authToken = loginRes.data.token;
            log(`Logged in as ${loginRes.data.user.name} (${loginRes.data.user.role})`, 'SUCCESS');
        } catch (e) {
            log(`Login Failed: ${e.message}`, 'ERROR');
            process.exit(1);
        }

        const authHeaders = { headers: { Authorization: `Bearer ${authToken}` } };

        // 3. Help Center Verification (User's specific request)
        log('--- Phase 3: Help Center Data ---', 'INFO');
        try {
            const docsRes = await axios.get(`${BASE_URL}/help/list`, authHeaders);
            if (docsRes.data.length > 0) {
                log(`Retrieved ${docsRes.data.length} documentation files`, 'SUCCESS');
                const docId = docsRes.data[0].fileName;
                const contentRes = await axios.get(`${BASE_URL}/help/content/${docId}`, authHeaders);
                if (contentRes.data.content && contentRes.data.content.length > 0) {
                    log(`Successfully read content of ${docId}`, 'SUCCESS');
                } else {
                    log(`Content of ${docId} is empty`, 'ERROR');
                }
            } else {
                log('No documentation files found', 'ERROR');
            }
        } catch (e) {
            log(`Help Center Test Failed: ${e.message}`, 'ERROR');
        }

        // 4. Student Management Flow
        log('--- Phase 4: Student Operations ---', 'INFO');
        try {
            // Get Classes
            const classesRes = await axios.get(`${BASE_URL}/school/classes`, authHeaders);
            let classId = classesRes.data[0]?.id;
            
            if (!classId) {
                // Create Class if none exists
                log('No classes found, creating one...', 'INFO');
                const newClass = await axios.post(`${BASE_URL}/school/classes`, {
                    gradeLevel: 'Grade 1',
                    section: 'A'
                }, authHeaders);
                classId = newClass.data.id;
            }

            // Create Student
            const uniqueName = `TestStudent_${Date.now()}`;
            const studentRes = await axios.post(`${BASE_URL}/school/students`, {
                name: uniqueName,
                dateOfBirth: '2015-01-01',
                gender: 'Male',
                classId: classId,
                parentName: 'Test Parent',
                parentPhone: '0500000000',
                registrationDate: new Date().toISOString().split('T')[0]
            }, authHeaders);
            
            createdStudentId = studentRes.data.id;
            log(`Created Student: ${uniqueName} (ID: ${createdStudentId})`, 'SUCCESS');

        } catch (e) {
            log(`Student Operations Failed: ${e.message}`, 'ERROR');
        }

        // 5. Finance Flow (Fees & Payments)
        log('--- Phase 5: Finance & Payments ---', 'INFO');
        try {
            // Create Fee Type
            const feeRes = await axios.post(`${BASE_URL}/finance/fees`, {
                title: 'Tuition 2026',
                amount: 5000,
                dueDate: '2026-09-01',
                description: 'Annual Tuition'
            }, authHeaders);
            createdFeeId = feeRes.data.id;
            log(`Created Fee Structure: Tuition 2026 (Amount: 5000)`, 'SUCCESS');

            // Assign Fee to Student (Invoice)
            const invoiceRes = await axios.post(`${BASE_URL}/finance/invoices`, {
                studentId: createdStudentId,
                title: 'Tuition 2026',
                amount: 5000,
                dueDate: '2026-09-01',
                items: [{ description: 'Tuition', amount: 5000 }]
            }, authHeaders);
            const invoiceId = invoiceRes.data.id;
            log(`Generated Invoice #${invoiceId} for Student`, 'SUCCESS');

            // Record Partial Payment
            const paymentRes = await axios.post(`${BASE_URL}/finance/payments`, {
                invoiceId: invoiceId,
                amount: 2000,
                method: 'Cash',
                reference: 'REF123',
                date: new Date().toISOString().split('T')[0]
            }, authHeaders);
            log(`Recorded Payment of 2000`, 'SUCCESS');

            // Verify Balance
            const invoiceCheck = await axios.get(`${BASE_URL}/finance/invoices/${invoiceId}`, authHeaders);
            const remaining = invoiceCheck.data.amount - invoiceCheck.data.paidAmount;
            if (remaining === 3000) {
                log(`Balance verification passed (Remaining: ${remaining})`, 'SUCCESS');
            } else {
                log(`Balance verification failed (Expected 3000, Got ${remaining})`, 'ERROR');
            }

        } catch (e) {
            log(`Finance Flow Failed: ${e.message}`, 'ERROR');
        }

        log('--- Test Suite Completed ---', 'INFO');

    } catch (err) {
        log(`Critical Error: ${err.message}`, 'ERROR');
    }
}

runTests();
