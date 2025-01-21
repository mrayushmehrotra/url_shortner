import express from "express";
import { urlClick, urlShortner } from "./resolver";

const shortnerRouter = express.Router();

// Route to create a short URL
// @ts-ignore
shortnerRouter.post("/shortner", async (req, res) => {
  const id = req.userId;

  if (!id) {
    return res.status(400).json({ message: "User is not authenticated" });
  }

  const { longUrl, expiry } = req.body; // Get long URL and expiry from the request body

  if (!longUrl) {
    return res.status(400).json({ message: "URL is required" });
  }

  try {
    const shortUrl = await urlShortner(longUrl, id); // Generate short URL
    return res.status(200).json({ shortUrl });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

// Route to track URL clicks
// @ts-ignore
shortnerRouter.get("/click/:shortUrl", async (req, res) => {
  const shortUrl = req.params.shortUrl;
  const { userAgent, ipAddress, osName, deviceType, geolocation } = req.body; // Get click data from the request

  if (!shortUrl) {
    return res.status(400).json({ message: "Short URL is required" });
  }

  try {
    // Call the urlClick function to handle click tracking
    const updatedLink = await urlClick(
      shortUrl,
      userAgent as string,
      ipAddress as string,
      osName as string,
      deviceType as string,
      geolocation as string,
    );

    return res
      .status(200)
      .json({ message: "Click tracked successfully", link: updatedLink });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

export { shortnerRouter };
