const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';

async function verifyUserDetail() {
    try {
        console.log('Verifying User Detail Aggregation...');

        // 1. Get All Users to find an ID
        const allUsers = await axios.get(`${BASE_URL}/user`);
        const userId = allUsers.data.data[0]._id;
        console.log(`Testing with User ID: ${userId}`);

        // 2. Get User Detail
        const userDetail = await axios.get(`${BASE_URL}/user/${userId}`);
        const data = userDetail.data;

        console.log('User Detail Response keys:', Object.keys(data));
        console.log(`Total Trades: ${data.totalTrades}`);
        console.log(`Total Orders: ${data.totalOrders}`);
        console.log(`Total Deposit: ${data.totalDeposit}`);
        console.log(`Transaction Count: ${data.transactionCount}`);
        console.log(`Wallet Balance: ${data.walletBalance}`);

        if (data.totalTrades !== undefined && data.totalDeposit !== undefined) {
            console.log('SUCCESS: Aggregation fields present.');
        } else {
            console.log('FAILURE: Aggregation fields missing.');
        }

    } catch (error) {
        if (error.response) {
            console.error(`Error: ${error.response.status} - ${error.response.statusText}`);
            console.error(error.response.data);
        } else {
            console.error('Error connecting to API:', error.message);
        }
    }
}

verifyUserDetail();
