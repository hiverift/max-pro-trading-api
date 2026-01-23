const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';
// Use the admin email from .env or a standard test email
const TEST_EMAIL = 'rs5045280@gmail.com';

async function verifyForgotPassword() {
    try {
        console.log(`Requesting Password Reset for ${TEST_EMAIL}...`);

        const response = await axios.post(`${BASE_URL}/auth/forgot-password`, {
            email: TEST_EMAIL
        });

        console.log('Response Status:', response.status);
        console.log('Response Data:', response.data);

        if (response.data.message.includes('link sent')) {
            console.log('SUCCESS: Forgot Password API accepted the request and attempted to send email.');
        } else {
            console.log('FAILURE: Unexpected response message.');
        }

    } catch (error) {
        if (error.response) {
            console.error(`Error: ${error.response.status} - ${error.response.statusText}`);
            console.error(error.response.data);
        } else {
            console.error('Error connecting to API:', error.code, error.message);
            if (error.response) console.error(JSON.stringify(error.response.data, null, 2));
        }
    }
}

verifyForgotPassword();
