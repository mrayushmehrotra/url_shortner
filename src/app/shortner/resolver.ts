import { prismaClient } from "../../clients/db"; // Import prisma client
import { generateShortUrl } from "../../services/shortner";

const urlShortner = async function (longUrl: string, userId: string) {
  if (!longUrl) throw new Error("Url is required for shortening");

  try {
    // Generate a random short URL of 7 characters
    const shortUrl = generateShortUrl();

    // Check if short URL already exists (to prevent collisions)
    const existingUrl = await prismaClient.link.findUnique({
      where: { shortUrl },
    });

    if (existingUrl) {
      // If URL exists, recursively try generating a new one (handle collision)
      return await urlShortner(longUrl, userId);
    }

    // Calculate the expiry date (1 year from now)
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1); // Set expiry to 1 year from now

    // Create a new Link and associate it with the user
    const newLink = await prismaClient.link.create({
      data: {
        longUrl: longUrl,
        shortUrl: shortUrl,
        userId: userId, // Associate the link with the user directly via userId
        expiry: expiryDate, // Set expiry date to 1 year from now
      },
    });

    // Return the generated short URL
    return newLink.shortUrl;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

const urlClick = async function (
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

    return updatedLink;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export { urlShortner, urlClick };
