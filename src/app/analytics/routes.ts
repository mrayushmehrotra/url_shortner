import express from "express";
const analyticRoute = express.Router();
import {
  getAnayticsById,
  getTopicAnalytics,
  getOverallAnalytics,
} from "./resolver";
import middleware from "../middleware";

// --TODO: Fix this typescipt error
// @ts-ignore

analyticRoute.get("/analytic/:alias", middleware, async (req, res) => {
  try {
    const userId = req.userId;
    const urlId = req.params.alias;

    if (!userId) {
      return res.status(400).json({ message: "User not authenticated" });
    }

    if (!urlId) {
      return res.status(400).json({ message: "URL Id not found" });
    }

    const urlAnalytics = await getAnayticsById(urlId, userId); // Await the promise
    return res.json({ data: urlAnalytics });
  } catch (error: any) {
    // Catch and send the error in response
    console.error("Error in /analytic/:alias route:", error.message);
    return res.status(500).json({
      message: error.message || "Failed to get analytics data.",
    });
  }
});

analyticRoute.get(
  "/analytic/topic/:topic",
  //@ts-ignore
  async (req, res) => {
    const topic = req.params.topic;
    if (!topic) {
      return res.status(400).json({ message: "Topic is required" });
    }

    try {
      const analytics = await getTopicAnalytics(topic);
      return res.json({ data: analytics });
    } catch (error: any) {
      console.error("Error in /analytic/topic/:topic route:", error.message);
      return res
        .status(422)
        .json({ message: error.message || "Something Went wrong" });
    }
  },
); //@ts-ignore

analyticRoute.get("/analytics/overall", middleware, async (req, res) => {
  console.log("i'm here");

  const userId = req.userId;

  if (!userId) {
    return res.status(400).json({ message: "User is not authenticated" });
  }
  console.log(userId);

  try {
    const analytics = await getOverallAnalytics(userId);
    console.log(analytics);
    return res.json({ data: analytics });
  } catch (error: any) {
    console.error("Error in /analytic/overall route:", error.message);
    return res.status(500).json({
      message: error.message || "Failed to fetch overall analytics.",
    });
  }
});

export { analyticRoute };
