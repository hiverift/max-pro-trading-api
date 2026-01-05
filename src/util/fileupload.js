"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileUpload = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const fileUpload = (folderName, file) => {
    const publicFolderPath = path.join(__dirname, '..', '..', 'public', `uploads/${folderName}`);
    const allowedExtensions = ['.jpg', '.jpeg', '.png'];
    if (!file) {
        throw new common_1.BadRequestException('No file uploaded');
    }
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
        throw new common_1.BadRequestException('Only .jpg, .jpeg, or .png files are allowed');
    }
    const fileName = `${Date.now()}-${file.originalname}`;
    const filePath = path.join(publicFolderPath, fileName);
    if (!fs.existsSync(publicFolderPath)) {
        fs.mkdirSync(publicFolderPath, { recursive: true });
    }
    fs.writeFileSync(filePath, file.buffer);
    return fileName;
};
exports.fileUpload = fileUpload;
//# sourceMappingURL=fileupload.js.map