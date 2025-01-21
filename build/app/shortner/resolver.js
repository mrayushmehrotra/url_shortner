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
exports.fetchLongUrl = exports.urlClickPostReq = exports.urlShortner = void 0;
const db_1 = require("../../clients/db"); // Import prisma client
const shortner_1 = require("../../services/shortner");
const ioredis_1 = __importDefault(require("ioredis"));
const urlShortner = function (longUrl, userId, topic, customAlias) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!longUrl)
            throw new Error("Url is required for shortening");
        if (!userId)
            throw new Error("You are not authenticated inside the fn");
        try {
            // Generate a random short URL of 7 characters
            const shortUrl = (0, shortner_1.generateShortUrl)();
            // Check if the short URL or custom alias already exists
            const existingUrl = yield db_1.prismaClient.link.findUnique({
                where: { shortUrl },
            });
            if (existingUrl) {
                // If URL or alias exists, recursively try generating a new one (handle collision)
                return yield urlShortner(longUrl, userId, customAlias, topic);
            }
            // Calculate the expiry date (1 year from now)
            const expiryDate = new Date();
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
            // Create a new Link and associate it with the user
            const newLink = yield db_1.prismaClient.link.create({
                data: {
                    longUrl,
                    shortUrl,
                    userId, // Associate the link with the user directly via userId
                    customAlias: customAlias || null,
                    //@ts-ignore
                    topic: topic || null,
                    expiry: expiryDate,
                },
            });
            // Return the generated short URL
            return newLink;
        }
        catch (error) {
            throw new Error(error.message);
        }
    });
};
exports.urlShortner = urlShortner;
const urlClickPostReq = function (shortUrl, userAgent, ipAddress, osName, deviceType, geolocation) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Find the link by short URL
            const link = yield db_1.prismaClient.link.findUnique({
                where: { shortUrl },
            });
            if (!link) {
                throw new Error("Link not found");
            }
            // Check if the link has expired
            if (link.expiry && new Date(link.expiry) < new Date()) {
                throw new Error("This link has expired");
            }
            // Increment the click count for the link
            const updatedLink = yield db_1.prismaClient.link.update({
                where: { id: link.id },
                data: { clickCount: link.clickCount + 1 },
            });
            // Track unique clicks
            const uniqueClick = yield db_1.prismaClient.analytics.create({
                data: {
                    linkId: link.id,
                    userAgent,
                    ipAddress,
                    osName,
                    deviceType,
                    geolocation,
                },
            });
            const uniqueClicksCount = yield db_1.prismaClient.analytics.count({
                where: {
                    linkId: link.id,
                },
            });
            yield db_1.prismaClient.link.update({
                where: { id: link.id },
                data: {
                    uniqueClicks: uniqueClicksCount,
                },
            });
            return console.log("Data received by shortUrl");
        }
        catch (error) {
            throw new Error(error.message);
        }
    });
};
exports.urlClickPostReq = urlClickPostReq;
// Initialize Redis client
let redis = null;
try {
    redis = new ioredis_1.default(); // Create Redis client only if Redis is available
}
catch (error) {
    console.error("Redis is not available. Falling back to PrismaClient.", error);
}
const fetchLongUrl = function (shortUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Check if Redis is available
            if (redis) {
                // Try to get the long URL from Redis
                const cachedLongUrl = yield redis.get(shortUrl);
                if (cachedLongUrl) {
                    return cachedLongUrl;
                }
            }
            // If Redis is not available or cache miss, fetch from the database using Prisma
            const realLink = yield db_1.prismaClient.link.findUnique({
                where: { shortUrl },
            });
            if (!realLink) {
                return null; // Short URL not found in the database
            }
            // If Redis is available, store the long URL in Redis with an expiration time
            if (redis) {
                yield redis.set(shortUrl, realLink.longUrl, "EX", 3600); // 3600 seconds = 1 hour
            }
            return realLink.longUrl;
        }
        catch (error) {
            console.error("Error fetching long URL:", error);
            // If Redis is not available, always fallback to PrismaClient
            const realLink = yield db_1.prismaClient.link.findUnique({
                where: { shortUrl },
            });
            if (realLink) {
                return realLink.longUrl;
            }
            throw new Error("Failed to fetch long URL");
        }
    });
};
exports.fetchLongUrl = fetchLongUrl;
exports.default = fetchLongUrl;
