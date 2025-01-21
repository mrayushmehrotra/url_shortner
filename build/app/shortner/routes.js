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
const middleware_1 = __importDefault(require("../middleware"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const shortnerRouter = express_1.default.Router();
exports.shortnerRouter = shortnerRouter;
const shortenerRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each user to 10 requests per `windowMs`
    message: {
        message: "Too many requests from this IP, please try again later.",
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
// Route to create a short URL (only authenticated user can do this)
shortnerRouter.post("/shorten", shortenerRateLimiter, 
// @ts-ignore
middleware_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.userId;
    if (!id) {
        return res.status(400).json({ message: "User is not authenticated" });
    }
    const { longUrl, topic, customAlias } = req.body; // Get long URL and expiry from the request body
    if (!longUrl) {
        return res.status(400).json({ message: "URL is required" });
    }
    try {
        const shortUrl = yield (0, resolver_1.urlShortner)(longUrl, id, topic, customAlias); // Generate short URL
        return res
            .status(200)
            .json({ shortUrl: shortUrl.shortUrl, createdAt: shortUrl.createdAt });
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
}));
// @ts-ignore
// Route to fetch the long URL and quickly redirect or return it
shortnerRouter.get("/shorten/:shortUrl", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const shortUrl = req.params.shortUrl;
    if (!shortUrl) {
        return res.status(400).json({ message: "Short URL is required" });
    }
    try {
        // Fetch the long URL for the given short URL
        const link = yield (0, resolver_1.fetchLongUrl)(shortUrl);
        console.log(link);
        if (!link) {
            return res.status(404).json({ message: "Short URL not found" });
        }
        // Immediately return the long URL
        return res.redirect(302, link);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
}));
// Route to handle analytics and user information tracking
// @ts-ignore
shortnerRouter.post("/shorten/:shortUrl", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const shortUrl = req.params.shortUrl;
    const { userAgent, ipAddress, osName, deviceType, geolocation } = req.body;
    if (!shortUrl || !userAgent || !ipAddress || !osName || !deviceType) {
        return res.status(400).json({ message: "Please provide all the details" });
    }
    try {
        // Track click data asynchronously
        yield (0, resolver_1.urlClickPostReq)(shortUrl, userAgent, ipAddress, osName, deviceType, geolocation);
        // Return a quick success response without waiting for the processing
        return res.status(200).json({ message: "Click data received" });
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
}));
