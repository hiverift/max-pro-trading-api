"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.randomFileNameUtil = void 0;
const randomFileNameUtil = () => {
    return Date.now() + '-' + Math.round(Math.random() * 1e9);
};
exports.randomFileNameUtil = randomFileNameUtil;
//# sourceMappingURL=serviceutil.js.map