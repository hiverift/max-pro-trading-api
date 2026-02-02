export declare const COMMON: {
    CREATED_SUCESSFULLY: (entity: string) => string;
    NOT_FOUND: (entity: string) => string;
    FOUND: (entity: string) => string;
    DELETE: (entity: string) => string;
    CREATED_SUCESSFULLY_FAIL: (entity: string) => string;
    UPDATE: (entity: string) => string;
    UPDATE_FAIL: (entity: string) => string;
    DELETE_FAIL: (entity: string) => string;
    ID: string;
    PID: string;
    EMAIL: string;
    PHONE: string;
};
export declare const ENTITY: {
    USER: string;
    DISCOUNT: string;
};
export declare const ROUTE: {
    AUTH: string;
    SIGNIN: string;
    SINGUP: string;
    UPLOAD: string;
    USG: string;
    OTP: string;
    SEND: string;
    RESEND: string;
    VERIFY: string;
    RESET_PASSWORD: string;
    CATEGORY: string;
    ORDER: string;
    USER: string;
    RIDER: string;
    BANNER: string;
    MENU: string;
};
export declare const MESSAGE: {
    USER: {
        USER_CREATED_SUCCESSFULLY: string;
        USER_NOT_FOUND: string;
    };
    UPLOAD: {
        UPLOADED_SUCCESSFULLY: string;
        FILE_NOT_FOUND: string;
        FILE_FETCHED: string;
    };
    OTP: {
        SENT: string;
        RESENT: string;
        VERIFY: string;
    };
    PASSWORD: {
        RESET_SUCCESSFULL: string;
        RESET_FAIL: string;
    };
};
export declare const VALUES: {
    LOCAL_MONGO_URL: string;
    UPLOAD_FILE_LOC: string;
};
