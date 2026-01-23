const nodemailer = require('nodemailer');

// Use hardcoded credentials to verify
const MAIL_HOST = process.env.MAIL_HOST || 'smtp.gmail.com';
const MAIL_PORT = parseInt(process.env.MAIL_PORT) || 587;
const MAIL_USER = process.env.MAIL_USER || 'rs5045280@gmail.com';
const MAIL_PASS = process.env.MAIL_PASS || 'ggkowzeadrxbxtof';

async function verifyCredentials() {
    console.log('Testing Email Credentials...');
    console.log(`Host: ${MAIL_HOST}:${MAIL_PORT}`);
    console.log(`User: ${MAIL_USER}`);

    const transporter = nodemailer.createTransport({
        host: MAIL_HOST,
        port: MAIL_PORT,
        secure: false,
        auth: {
            user: MAIL_USER,
            pass: MAIL_PASS
        }
    });

    try {
        await transporter.verify();
        console.log('SUCCESS: Credentials verified. Server is ready to send emails.');

        // Attempt to send a test email
        const info = await transporter.sendMail({
            from: MAIL_USER,
            to: MAIL_USER, // Send to self
            subject: 'Test Email from Verification Script',
            text: 'If you see this, email sending works!'
        });
        console.log('Test Email Sent:', info.messageId);

    } catch (error) {
        console.error('FAILURE: SMTP connection failed.');
        console.error(error);
    }
}

verifyCredentials();
