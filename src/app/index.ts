import express from "express";
import bodyParser from "body-parser";
import cors from "cors";

import { User } from "./user";
import { ShortURL } from "./shortner";
import authenticateTokenMiddleware from "./middleware";
import { Analytics } from "./analytics";

export async function initServer() {
  const app = express();

  app.use(cors());
  app.use(bodyParser.json());

  app.use("/api", User.userRouter);
  // TODO: Fix this
  // @ts-ignore
  app.use("/api", ShortURL.shortnerRouter);
  app.use("/api", Analytics.analyticRoute);

  app.get("/", (req, res) => {
    res.status(200).json({
      success: true,
      message: "server is up and running",
    });
  });

  return app;
}
