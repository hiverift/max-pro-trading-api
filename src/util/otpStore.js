"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteOTP = exports.getOTP = exports.setOTP = void 0;
const otps = new Map();
const setOTP = (email, otp, type = "login") => {
    const expiresAt = Date.now() + 3600000;
    otps.set(email, { otp, expiresAt, type });
};
exports.setOTP = setOTP;
const getOTP = (email) => otps.get(email);
exports.getOTP = getOTP;
const deleteOTP = (email) => otps.delete(email);
exports.deleteOTP = deleteOTP;
//# sourceMappingURL=otpStore.js.map