import { prismaClient } from "../../clients/db";
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

const getAnayticsById = async function (alias: string, userId: string) {
  if (!userId) {
    throw new Error("User is not authenticated");
  }

  if (!alias) {
    throw new Error("Short link is required");
  }

  try {
    const cacheKey = `analytics:${alias}`;
    const cachedData = await getCachedAnalyticsData(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    const link = await prismaClient.link.findUnique({
      where: { shortUrl: alias },
      include: { analytics: true },
    });

    if (!link) {
      throw new Error("Link not found");
    }

    const totalClicks = link.clickCount;
    const uniqueClicks = link.uniqueClicks;

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
      date: click.timestamp.toISOString().split("T")[0],
      clickCount: click._count,
    }));

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
    return analyticsData;
  } catch (error) {
    console.error("Error fetching analytics:", error);
    throw new Error("Failed to fetch analytics");
  }
};

//@ts-ignore

const getTopicAnalytics = async function (topic: string) {
  const cacheKey = `analytics:topic:${topic}`;

  try {
    // Check for cached data
    const cachedData = await getCachedAnalyticsData(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    // Fetch all links under the specified topic
    const links = await prismaClient.link.findMany({
      where: { topic },
      include: { analytics: true },
    });

    if (!links || links.length === 0) {
      throw new Error(`No links found under the topic "${topic}"`);
    }

    // Calculate total clicks and unique users for the topic
    const totalClicks = links.reduce(
      (sum, link) => sum + (link.clickCount || 0),
      0,
    );
    const uniqueUsers = links.reduce(
      (sum, link) => sum + (link.uniqueClicks || 0),
      0,
    );

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
      totalClicks: link.clickCount || 0,
      uniqueUsers: link.uniqueClicks || 0,
    }));

    // Construct analytics data
    const topicData = {
      totalClicks,
      uniqueUsers,
      clicksByDate:
        formattedClicksByDate.length > 0 ? formattedClicksByDate : [],
      urls,
    };

    // Cache analytics data
    await cacheAnalyticsData(cacheKey, topicData);

    return topicData;
  } catch (error: any) {
    console.error("Error fetching topic analytics:", error.message);
    throw new Error(error.message || "Failed to fetch topic analytics.");
  }
};

const getOverallAnalytics = async function (userId: string) {
  const cacheKey = `redis:analytics:overall:${userId}`;

  try {
    const cachedData = await getCachedAnalyticsData(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    // Fetch all links created by the user
    const links = await prismaClient.link.findMany({
      where: { userId },
      include: { analytics: true },
    });
    console.log("Link MIla: ", links);

    if (!links || links.length === 0) {
      throw new Error("No links found for this user");
    }

    const linkIds = links.map((link) => link.id);

    // Ensure analytics exist for the fetched links
    const hasAnalytics = links.some(
      (link) => link.analytics && link.analytics.length > 0,
    );
    if (!hasAnalytics) {
      throw new Error("No analytics data found for the user's links");
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
        linkId: { in: linkIds },
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
      where: { linkId: { in: linkIds } },
      _count: { osName: true },
    });

    const formattedOsType = osType.map((os) => ({
      osName: os.osName,
      uniqueClicks: os._count.osName,
    }));

    // Clicks grouped by device type
    const deviceType = await prismaClient.analytics.groupBy({
      by: ["deviceType"],
      where: { linkId: { in: linkIds } },
      _count: { deviceType: true },
    });

    const formattedDeviceType = deviceType.map((device) => ({
      deviceName: device.deviceType,
      uniqueClicks: device._count.deviceType,
    }));
    console.log("i'm good until now");
    const overallAnalyticsData = {
      totalUrls,
      totalClicks,
      uniqueUsers,
      clicksByDate: formattedClicksByDate,
      osType: formattedOsType,
      deviceType: formattedDeviceType,
    };

    await cacheAnalyticsData(cacheKey, overallAnalyticsData);

    return overallAnalyticsData;
  } catch (error: any) {
    console.error("Error in getOverallAnalytics:", error.message);
    throw new Error(error.message || "Failed to fetch overall analytics.");
  }
};

export { getAnayticsById, getTopicAnalytics, getOverallAnalytics };
