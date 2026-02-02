"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = exports.generateOTP = void 0;
const nodemailer = require('nodemailer');
const generateOTP = () => {
    return Math.floor(Math.random() * 900000) + 100000;
};
exports.generateOTP = generateOTP;
const sendEmail = async (to, subject, text) => {
    const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to,
        subject,
        text,
    };
    await transporter.sendMail(mailOptions);
};
exports.sendEmail = sendEmail;
//# sourceMappingURL=mailerutil.js.map