const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';

async function verifyFilters() {
    try {
        console.log('Verifying User Filters...');

        // 1. Get All Users
        const allUsers = await axios.get(`${BASE_URL}/user`);
        console.log(`All Users: ${allUsers.data.total}`);

        // 2. Active Users
        const activeUsers = await axios.get(`${BASE_URL}/user?filter=active`);
        console.log(`Active Users: ${activeUsers.data.total}`);

        // 3. Banned Users
        const bannedUsers = await axios.get(`${BASE_URL}/user?filter=banned`);
        console.log(`Banned Users: ${bannedUsers.data.total}`);

        // 4. Email Unverified
        const emailUnverified = await axios.get(`${BASE_URL}/user?filter=email_unverified`);
        console.log(`Email Unverified: ${emailUnverified.data.total}`);

        // 5. Mobile Unverified
        const mobileUnverified = await axios.get(`${BASE_URL}/user?filter=mobile_unverified`);
        console.log(`Mobile Unverified: ${mobileUnverified.data.total}`);

        // 6. KYC Unverified
        const kycUnverified = await axios.get(`${BASE_URL}/user?filter=kyc_unverified`);
        console.log(`KYC Unverified: ${kycUnverified.data.total}`);

    } catch (error) {
        if (error.response) {
            console.error(`Error: ${error.response.status} - ${error.response.statusText}`);
            console.error(error.response.data);
        } else {
            console.error('Error connecting to API:', error.message);
        }
    }
}

verifyFilters();
