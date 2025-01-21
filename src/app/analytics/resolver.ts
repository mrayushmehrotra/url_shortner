import express from "express";
import { prismaClient } from "../../clients/db";
import middleware from "../middleware";
const analyticsRouter = express.Router();
import Redis from "ioredis";
const redis = new Redis();

const cacheAnalyticsData = async (key: string, data: any) => {
  try {
    await redis.set(key, JSON.stringify(data), "EX", 3600); // Cache for 1 hour
  } catch (error) {
    console.error("Error caching data in Redis:", error);
  }
};
const getCachedAnalyticsData = async (key: string) => {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Error getting data from Redis:", error);
    return null;
  }
};

// @ts-ignore
analyticsRouter.get("/analytics/:alias", middleware, async (req, res) => {
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
    const cachedData = await getCachedAnalyticsData(cacheKey);

    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    const link = await prismaClient.link.findUnique({
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

    const clicksByDate = await prismaClient.analytics.groupBy({
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
    const osType = await prismaClient.analytics.groupBy({
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
    const deviceType = await prismaClient.analytics.groupBy({
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
    await cacheAnalyticsData(cacheKey, analyticsData);
    // Return analytics data
    return res.status(200).json(analyticsData);
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

//@ts-ignore
analyticsRouter.get("/analytics/topic/:topic", async (req, res) => {
  const topic = req.params.topic;

  if (!topic) {
    return res.status(400).json({ message: "Topic is required" });
  }

  const cacheKey = `analytics:topic:${topic}`;

  const cachedData = await getCachedAnalyticsData(cacheKey);
  if (cachedData) {
    return res.status(200).json(cachedData);
  }

  try {
    // Fetch all links under the specified topic
    const links = await prismaClient.link.findMany({
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

    const clicksByDate = await prismaClient.analytics.groupBy({
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
    await cacheAnalyticsData(cacheKey, topicData);
    return res.status(200).json(topicData);
  } catch (error) {
    console.error("Error fetching topic analytics:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});
//@ts-ignore
analyticsRouter.get("/analytics/overall", middleware, async (req, res) => {
  const userId = req.userId;

  if (!userId) {
    return res.status(400).json({ message: "User is not authenticated" });
  }

  const cacheKey = `redis:analytics:overall:${userId}`;

  const cachedData = await getCachedAnalyticsData(cacheKey);
  if (cachedData) {
    return res.status(200).json(cachedData);
  }

  try {
    // Fetch all links created by the user
    const links = await prismaClient.link.findMany({
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

    const clicksByDate = await prismaClient.analytics.groupBy({
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
    const osType = await prismaClient.analytics.groupBy({
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
    const deviceType = await prismaClient.analytics.groupBy({
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

    await cacheAnalyticsData(cacheKey, overallAnalyticsData);

    // Return analytics data
    return res.status(200).json(overallAnalyticsData);
  } catch (error) {
    console.error("Error fetching overall analytics:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

export { analyticsRouter };
