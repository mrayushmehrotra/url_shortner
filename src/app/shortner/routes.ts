import express from "express";
import { fetchLongUrl, urlClickPostReq, urlShortner } from "./resolver";
import middleware from "../middleware";
import rateLimit from "express-rate-limit";

const shortnerRouter = express.Router();

const shortenerRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each user to 10 requests per `windowMs`
  message: {
    message: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
// Route to create a short URL (only authenticated user can do this)
shortnerRouter.post(
  "/shorten",
  shortenerRateLimiter,
  // @ts-ignore
  middleware,
  async (req, res) => {
    const id = req.userId;

    if (!id) {
      return res.status(400).json({ message: "User is not authenticated" });
    }

    const { longUrl, topic, customAlias } = req.body; // Get long URL and expiry from the request body

    if (!longUrl) {
      return res.status(400).json({ message: "URL is required" });
    }

    try {
      const shortUrl = await urlShortner(longUrl, id, topic, customAlias); // Generate short URL
      return res
        .status(200)
        .json({ shortUrl: shortUrl.shortUrl, createdAt: shortUrl.createdAt });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  },
);

// @ts-ignore
// Route to fetch the long URL and quickly redirect or return it
shortnerRouter.get("/shorten/:shortUrl", async (req, res) => {
  const shortUrl = req.params.shortUrl;

  if (!shortUrl) {
    return res.status(400).json({ message: "Short URL is required" });
  }

  try {
    // Fetch the long URL for the given short URL
    const link = await fetchLongUrl(shortUrl);
    console.log(link);
    if (!link) {
      return res.status(404).json({ message: "Short URL not found" });
    }

    // Immediately return the long URL
    return res.redirect(302, link);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

// Route to handle analytics and user information tracking
// @ts-ignore

shortnerRouter.post("/shorten/:shortUrl", async (req, res) => {
  const shortUrl = req.params.shortUrl;
  const { userAgent, ipAddress, osName, deviceType, geolocation } = req.body;

  if (!shortUrl || !userAgent || !ipAddress || !osName || !deviceType) {
    return res.status(400).json({ message: "Please provide all the details" });
  }

  try {
    // Track click data asynchronously
    await urlClickPostReq(
      shortUrl,
      userAgent as string,
      ipAddress as string,
      osName as string,
      deviceType as string,
      geolocation as string,
    );

    // Return a quick success response without waiting for the processing
    return res.status(200).json({ message: "Click data received" });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

export { shortnerRouter };
