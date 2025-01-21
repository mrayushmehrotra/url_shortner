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
exports.analyticsRouter = void 0;
const express_1 = __importDefault(require("express"));
const db_1 = require("../../clients/db");
const middleware_1 = __importDefault(require("../middleware"));
const analyticsRouter = express_1.default.Router();
exports.analyticsRouter = analyticsRouter;
const ioredis_1 = __importDefault(require("ioredis"));
const redis = new ioredis_1.default();
const cacheAnalyticsData = (key, data) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield redis.set(key, JSON.stringify(data), "EX", 3600); // Cache for 1 hour
    }
    catch (error) {
        console.error("Error caching data in Redis:", error);
    }
});
const getCachedAnalyticsData = (key) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield redis.get(key);
        return data ? JSON.parse(data) : null;
    }
    catch (error) {
        console.error("Error getting data from Redis:", error);
        return null;
    }
});
// @ts-ignore
analyticsRouter.get("/analytics/:alias", middleware_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // here alias = shortUrl
    const alias = req.params.alias;
    if (req.userId) {
        return res.status(500).json({ message: "User is not authenticated" });
    }
    if (!alias) {
        return res.status(400).json({ message: "ShortLink is required" });
    }
    try {
        const cacheKey = `analytics:${alias}`;
        const cachedData = yield getCachedAnalyticsData(cacheKey);
        if (cachedData) {
            return res.status(200).json(cachedData);
        }
        const link = yield db_1.prismaClient.link.findUnique({
            where: { shortUrl: alias },
            include: { analytics: true },
        });
        if (!link) {
            return res.status(404).json({ message: "Link not found" });
        }
        // Calculate total clicks and unique clicks
        const totalClicks = link.clickCount;
        const uniqueClicks = link.uniqueClicks;
        // Clicks grouped by date (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const clicksByDate = yield db_1.prismaClient.analytics.groupBy({
            by: ["timestamp"],
            where: {
                linkId: link.id,
                timestamp: { gte: sevenDaysAgo },
            },
            _count: true,
            orderBy: { timestamp: "asc" },
        });
        const formattedClicksByDate = clicksByDate.map((click) => ({
            date: click.timestamp.toISOString().split("T")[0], // Format date as YYYY-MM-DD
            clickCount: click._count,
        }));
        // Clicks grouped by OS type
        const osType = yield db_1.prismaClient.analytics.groupBy({
            by: ["osName"],
            where: { linkId: link.id },
            _count: {
                osName: true,
            },
        });
        const formattedOsType = osType.map((os) => ({
            osName: os.osName,
            uniqueClicks: os._count.osName,
        }));
        // Clicks grouped by device type
        const deviceType = yield db_1.prismaClient.analytics.groupBy({
            by: ["deviceType"],
            where: { linkId: link.id },
            _count: {
                deviceType: true,
            },
        });
        const formattedDeviceType = deviceType.map((device) => ({
            deviceName: device.deviceType,
            uniqueClicks: device._count.deviceType,
        }));
        const analyticsData = {
            totalClicks,
            uniqueUsers: uniqueClicks,
            clicksByDate: formattedClicksByDate,
            osType: formattedOsType,
            deviceType: formattedDeviceType,
        };
        yield cacheAnalyticsData(cacheKey, analyticsData);
        // Return analytics data
        return res.status(200).json(analyticsData);
    }
    catch (error) {
        console.error("Error fetching analytics:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}));
//@ts-ignore
analyticsRouter.get("/analytics/topic/:topic", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const topic = req.params.topic;
    if (!topic) {
        return res.status(400).json({ message: "Topic is required" });
    }
    const cacheKey = `analytics:topic:${topic}`;
    const cachedData = yield getCachedAnalyticsData(cacheKey);
    if (cachedData) {
        return res.status(200).json(cachedData);
    }
    try {
        // Fetch all links under the specified topic
        const links = yield db_1.prismaClient.link.findMany({
            where: { topic },
            include: { analytics: true },
        });
        if (links.length === 0) {
            return res
                .status(404)
                .json({ message: "No links found under this topic" });
        }
        // Calculate total clicks and unique users for the topic
        const totalClicks = links.reduce((sum, link) => sum + link.clickCount, 0);
        const uniqueUsers = links.reduce((sum, link) => sum + link.uniqueClicks, 0);
        // Clicks grouped by date (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const clicksByDate = yield db_1.prismaClient.analytics.groupBy({
            by: ["timestamp"],
            where: {
                linkId: { in: links.map((link) => link.id) },
                timestamp: { gte: sevenDaysAgo },
            },
            _count: true,
            orderBy: { timestamp: "asc" },
        });
        const formattedClicksByDate = clicksByDate.map((click) => ({
            date: click.timestamp.toISOString().split("T")[0],
            clickCount: click._count,
        }));
        // URLs and their respective performance
        const urls = links.map((link) => ({
            shortUrl: link.shortUrl,
            totalClicks: link.clickCount,
            uniqueUsers: link.uniqueClicks,
        }));
        // Return analytics data
        const topicData = {
            totalClicks,
            uniqueUsers,
            clicksByDate: formattedClicksByDate,
            urls,
        };
        yield cacheAnalyticsData(cacheKey, topicData);
        return res.status(200).json(topicData);
    }
    catch (error) {
        console.error("Error fetching topic analytics:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}));
//@ts-ignore
analyticsRouter.get("/analytics/overall", middleware_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.userId;
    if (!userId) {
        return res.status(400).json({ message: "User is not authenticated" });
    }
    const cacheKey = `redis:analytics:overall:${userId}`;
    const cachedData = yield getCachedAnalyticsData(cacheKey);
    if (cachedData) {
        return res.status(200).json(cachedData);
    }
    try {
        // Fetch all links created by the user
        const links = yield db_1.prismaClient.link.findMany({
            where: { userId },
            include: { analytics: true },
        });
        if (links.length === 0) {
            return res.status(404).json({ message: "No links found for this user" });
        }
        // Calculate total URLs, total clicks, and unique users
        const totalUrls = links.length;
        const totalClicks = links.reduce((sum, link) => sum + link.clickCount, 0);
        const uniqueUsers = links.reduce((sum, link) => sum + link.uniqueClicks, 0);
        // Clicks grouped by date (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const clicksByDate = yield db_1.prismaClient.analytics.groupBy({
            by: ["timestamp"],
            where: {
                linkId: { in: links.map((link) => link.id) },
                timestamp: { gte: sevenDaysAgo },
            },
            _count: true,
            orderBy: { timestamp: "asc" },
        });
        const formattedClicksByDate = clicksByDate.map((click) => ({
            date: click.timestamp.toISOString().split("T")[0],
            clickCount: click._count,
        }));
        // Clicks grouped by OS type
        const osType = yield db_1.prismaClient.analytics.groupBy({
            by: ["osName"],
            where: {
                linkId: { in: links.map((link) => link.id) },
            },
            _count: {
                osName: true,
            },
        });
        const formattedOsType = osType.map((os) => ({
            osName: os.osName,
            uniqueClicks: os._count.osName,
        }));
        // Clicks grouped by device type
        const deviceType = yield db_1.prismaClient.analytics.groupBy({
            by: ["deviceType"],
            where: {
                linkId: { in: links.map((link) => link.id) },
            },
            _count: {
                deviceType: true,
            },
        });
        const formattedDeviceType = deviceType.map((device) => ({
            deviceName: device.deviceType,
            uniqueClicks: device._count.deviceType,
        }));
        const overallAnalyticsData = {
            totalUrls,
            totalClicks,
            uniqueUsers,
            clicksByDate: formattedClicksByDate,
            osType: formattedOsType,
            deviceType: formattedDeviceType,
        };
        yield cacheAnalyticsData(cacheKey, overallAnalyticsData);
        // Return analytics data
        return res.status(200).json(overallAnalyticsData);
    }
    catch (error) {
        console.error("Error fetching overall analytics:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}));
