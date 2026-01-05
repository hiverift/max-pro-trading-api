"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VALUES = exports.MESSAGE = exports.ROUTE = exports.ENTITY = exports.COMMON = void 0;
exports.COMMON = {
    CREATED_SUCESSFULLY: (entity) => `${entity} created successfully`,
    NOT_FOUND: (entity) => `${entity} not found`,
    FOUND: (entity) => `${entity} found sucessfully`,
    DELETE: (entity) => `${entity} deleted successfully`,
    CREATED_SUCESSFULLY_FAIL: (entity) => `${entity} creation failed`,
    UPDATE: (entity) => `${entity} updated successfully`,
    UPDATE_FAIL: (entity) => `${entity} updation failed.`,
    DELETE_FAIL: (entity) => `${entity} deletion failed `,
    ID: ':id',
    PID: 'id',
    EMAIL: 'email',
    PHONE: 'phone',
};
exports.ENTITY = {
    USER: 'User',
    DISCOUNT: "discount"
};
exports.ROUTE = {
    AUTH: 'auth',
    SIGNIN: 'signin',
    SINGUP: 'signup',
    UPLOAD: 'upload',
    USG: 'usg',
    OTP: 'otp',
    SEND: 'send',
    RESEND: 'resend',
    VERIFY: 'verify',
    RESET_PASSWORD: 'reset-password',
    CATEGORY: 'categories',
    ORDER: 'order',
    USER: 'user',
    RIDER: 'rider',
    BANNER: 'banner',
    MENU: 'menu',
};
exports.MESSAGE = {
    USER: {
        USER_CREATED_SUCCESSFULLY: 'User created successfully',
        USER_NOT_FOUND: 'User not found',
    },
    UPLOAD: {
        UPLOADED_SUCCESSFULLY: 'File uploaded successfully.',
        FILE_NOT_FOUND: 'File not found',
        FILE_FETCHED: 'Successfully fetch file',
    },
    OTP: {
        SENT: 'Otp sent successfully.',
        RESENT: 'Otp re-send successfully.',
        VERIFY: 'Otp verified successfully.',
    },
    PASSWORD: {
        RESET_SUCCESSFULL: "Password has been changed succesfully",
        RESET_FAIL: "Password change has been failed, please try again with new otp"
    }
};
exports.VALUES = {
    LOCAL_MONGO_URL: 'mongodb://127.0.0.1:27017/ultrasoundclinicbackend',
    UPLOAD_FILE_LOC: './uploads',
};
//# sourceMappingURL=constants.js.map