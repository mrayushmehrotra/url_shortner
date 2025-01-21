import express from "express";
import bodyParser from "body-parser";
import cors from "cors";

import { User } from "./user";
import { ShortURL } from "./shortner";
import authenticateTokenMiddleware from "./middleware";

export async function initServer() {
  const app = express();

  app.use(cors());
  app.use(bodyParser.json());

  app.use("/api/user", User.userRouter);
  // TODO: Fix this
  // @ts-ignore
  app.use("/api/url", authenticateTokenMiddleware, ShortURL.shortnerRouter);

  app.get("/", (req, res) => {
    res.status(200).json({
      success: true,
      message: "server is up and running",
    });
  });

  return app;
}
