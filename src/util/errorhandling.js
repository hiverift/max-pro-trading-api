"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.throwException = void 0;
const common_1 = require("@nestjs/common");
const throwException = (message) => {
    throw new common_1.HttpException({
        status: common_1.HttpStatus.BAD_REQUEST,
        message: message?.message,
    }, common_1.HttpStatus.BAD_REQUEST, {
        cause: message,
    });
};
exports.throwException = throwException;
//# sourceMappingURL=errorhandling.js.map