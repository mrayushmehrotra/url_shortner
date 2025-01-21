import { prismaClient } from "../../clients/db"; // Import prisma client
import { generateShortUrl } from "../../services/shortner";

import Redis from "ioredis";

const urlShortner = async function (
  longUrl: string,
  userId: string,
  topic?: string | undefined,
  customAlias?: string | undefined,
) {
  if (!longUrl) throw new Error("Url is required for shortening");
  if (!userId) throw new Error("You are not authenticated inside the fn");

  try {
    // Generate a random short URL of 7 characters
    const shortUrl = generateShortUrl();

    // Check if the short URL or custom alias already exists
    const existingUrl = await prismaClient.link.findUnique({
      where: { shortUrl },
    });

    if (existingUrl) {
      // If URL or alias exists, recursively try generating a new one (handle collision)
      return await urlShortner(longUrl, userId, customAlias, topic);
    }

    // Calculate the expiry date (1 year from now)
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    // Create a new Link and associate it with the user
    const newLink = await prismaClient.link.create({
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
  } catch (error: any) {
    throw new Error(error.message);
  }
};

const urlClickPostReq = async function (
  shortUrl: string,
  userAgent: string,
  ipAddress: string,
  osName: string,
  deviceType: string,
  geolocation?: string,
) {
  try {
    // Find the link by short URL

    const link = await prismaClient.link.findUnique({
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
    const updatedLink = await prismaClient.link.update({
      where: { id: link.id },
      data: { clickCount: link.clickCount + 1 },
    });

    // Track unique clicks
    const uniqueClick = await prismaClient.analytics.create({
      data: {
        linkId: link.id,
        userAgent,
        ipAddress,
        osName,
        deviceType,
        geolocation,
      },
    });

    const uniqueClicksCount = await prismaClient.analytics.count({
      where: {
        linkId: link.id,
      },
    });

    await prismaClient.link.update({
      where: { id: link.id },
      data: {
        uniqueClicks: uniqueClicksCount,
      },
    });
    return console.log("Data received by shortUrl");
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Initialize Redis client
let redis: Redis | null = null;
try {
  redis = new Redis(); // Create Redis client only if Redis is available
} catch (error) {
  console.error("Redis is not available. Falling back to PrismaClient.", error);
}

const fetchLongUrl = async function (shortUrl: string): Promise<string | null> {
  try {
    // Check if Redis is available
    if (redis) {
      // Try to get the long URL from Redis
      const cachedLongUrl = await redis.get(shortUrl);
      if (cachedLongUrl) {
        return cachedLongUrl;
      }
    }

    // If Redis is not available or cache miss, fetch from the database using Prisma

    const realLink = await prismaClient.link.findUnique({
      where: { shortUrl },
    });

    if (!realLink) {
      return null; // Short URL not found in the database
    }

    // If Redis is available, store the long URL in Redis with an expiration time
    if (redis) {
      await redis.set(shortUrl, realLink.longUrl, "EX", 3600); // 3600 seconds = 1 hour
    }

    return realLink.longUrl;
  } catch (error) {
    console.error("Error fetching long URL:", error);
    // If Redis is not available, always fallback to PrismaClient
    const realLink = await prismaClient.link.findUnique({
      where: { shortUrl },
    });

    if (realLink) {
      return realLink.longUrl;
    }

    throw new Error("Failed to fetch long URL");
  }
};

export default fetchLongUrl;

export { urlShortner, urlClickPostReq, fetchLongUrl };
