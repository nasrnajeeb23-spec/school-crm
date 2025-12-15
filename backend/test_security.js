const { User } = require('./models');
const bcrypt = require('bcryptjs');

async function testSecurity() {
    try {
        console.log('Testing Security Hooks...');

        // Test 1: Create User
        const testUser = await User.create({
            name: 'Security Test User',
            email: `security_test_${Date.now()}@example.com`,
            password: 'plain_password_123',
            role: 'SchoolAdmin',
            mfaSecret: 'my_super_secret_mfa_key',
            isActive: true
        });

        console.log(`User created with ID: ${testUser.id}`);

        // Verify Password Hash
        const isPasswordHashed = testUser.password !== 'plain_password_123';
        const isPasswordValid = await bcrypt.compare('plain_password_123', testUser.password);
        console.log(`Password Hashed? ${isPasswordHashed}`);
        console.log(`Password Valid? ${isPasswordValid}`);

        // Verify MFA Encryption
        const rawSecretInDb = testUser.getDataValue('mfaSecret');
        const decryptedSecret = testUser.getMfaSecret(); // changing to method based on my implementation

        // Note: In Sequelize, accessing property directly might return the getter result if defined on model options, 
        // but here we modified the model to use hooks for setting. 
        // However, I implemented `getMfaSecret` method. 
        // Let's check raw value via getDataValue if possible or just inspect the string.

        const isMfaEncrypted = rawSecretInDb !== 'my_super_secret_mfa_key';
        const isMfaDecryptedCorrectly = decryptedSecret === 'my_super_secret_mfa_key';

        console.log(`MFA Secret Encrypted in DB? ${isMfaEncrypted}`);
        console.log(`MFA Secret Decrypts Correctly? ${isMfaDecryptedCorrectly}`);

        if (isPasswordHashed && isPasswordValid && isMfaEncrypted && isMfaDecryptedCorrectly) {
            console.log('✅ All Security Tests Passed');
        } else {
            console.error('❌ Security Tests Failed');
        }

        // Cleanup
        await testUser.destroy();

    } catch (error) {
        console.error('Test Failed:', error);
    }
}

testSecurity();
