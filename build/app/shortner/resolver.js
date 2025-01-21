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
Object.defineProperty(exports, "__esModule", { value: true });
exports.urlClick = exports.urlShortner = void 0;
const db_1 = require("../../clients/db"); // Import prisma client
const shortner_1 = require("../../services/shortner");
const urlShortner = function (longUrl, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!longUrl)
            throw new Error("Url is required for shortening");
        try {
            // Generate a random short URL of 7 characters
            const shortUrl = (0, shortner_1.generateShortUrl)();
            // Check if short URL already exists (to prevent collisions)
            const existingUrl = yield db_1.prismaClient.link.findUnique({
                where: { shortUrl },
            });
            if (existingUrl) {
                // If URL exists, recursively try generating a new one (handle collision)
                return yield urlShortner(longUrl, userId);
            }
            // Calculate the expiry date (1 year from now)
            const expiryDate = new Date();
            expiryDate.setFullYear(expiryDate.getFullYear() + 1); // Set expiry to 1 year from now
            // Create a new Link and associate it with the user
            const newLink = yield db_1.prismaClient.link.create({
                data: {
                    longUrl: longUrl,
                    shortUrl: shortUrl,
                    userId: userId, // Associate the link with the user directly via userId
                    expiry: expiryDate, // Set expiry date to 1 year from now
                },
            });
            // Return the generated short URL
            return newLink.shortUrl;
        }
        catch (error) {
            throw new Error(error.message);
        }
    });
};
exports.urlShortner = urlShortner;
const urlClick = function (shortUrl, userAgent, ipAddress, osName, deviceType, geolocation) {
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
            return updatedLink;
        }
        catch (error) {
            throw new Error(error.message);
        }
    });
};
exports.urlClick = urlClick;
