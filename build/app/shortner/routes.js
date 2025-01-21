"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.shortnerRouter = void 0;
const express_1 = __importDefault(require("express"));
const resolver_1 = require("./resolver");
const shortnerRouter = express_1.default.Router();
exports.shortnerRouter = shortnerRouter;
// Route to create a short URL
// @ts-ignore
shortnerRouter.post("/shortner", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.userId;
    if (!id) {
        return res.status(400).json({ message: "User is not authenticated" });
    }
    const { longUrl, expiry } = req.body; // Get long URL and expiry from the request body
    if (!longUrl) {
        return res.status(400).json({ message: "URL is required" });
    }
    try {
        const shortUrl = yield (0, resolver_1.urlShortner)(longUrl, id); // Generate short URL
        return res.status(200).json({ shortUrl });
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
}));
// Route to track URL clicks
// @ts-ignore
shortnerRouter.get("/click/:shortUrl", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const shortUrl = req.params.shortUrl;
    const { userAgent, ipAddress, osName, deviceType, geolocation } = req.body; // Get click data from the request
    if (!shortUrl) {
        return res.status(400).json({ message: "Short URL is required" });
    }
    try {
        // Call the urlClick function to handle click tracking
        const updatedLink = yield (0, resolver_1.urlClick)(shortUrl, userAgent, ipAddress, osName, deviceType, geolocation);
        return res
            .status(200)
            .json({ message: "Click tracked successfully", link: updatedLink });
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
}));
