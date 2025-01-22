import { initServer } from "./app";
const Redis = require("ioredis");
const redisHost = process.env.REDIS_HOST || "localhost";

const redisClient = new Redis(redisHost);

redisClient.on("connect", () => console.log("Connected to Redis"));
redisClient.on("error", (err: any) => console.error("Redis error:", err));

async function init() {
  const app = await initServer();
  app.listen(4000, () => {
    console.log("Server is running on port 8000");
  });
}
init();
