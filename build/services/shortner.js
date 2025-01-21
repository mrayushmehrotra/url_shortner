"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateShortUrl = void 0;
const uuid_1 = require("uuid");
const generateShortUrl = () => {
    const uuid = (0, uuid_1.v4)();
    // Take the first 7 characters of the UUID and remove hyphens
    const shortUrl = uuid.replace(/-/g, "").slice(0, 7);
    return shortUrl;
};
exports.generateShortUrl = generateShortUrl;
