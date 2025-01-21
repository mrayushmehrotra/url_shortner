import express from "express";
import { verifyGoogleToken } from "./resolver";
const userRouter = express.Router();

// --TODO: Fix this typescipt error
// @ts-ignore
userRouter.post("/verify-token", async (req, res) => {
  try {
    // Extract token from the request body or headers
    const token = req.headers["authorization"]?.split(" ")[1];

    if (!token) {
      return res.status(400).json({ message: "Token is required." });
    }

    // Call the verifyGoogleToken function and get the JWT
    const jwt = await verifyGoogleToken(token);

    // Send the generated JWT back in the response
    return res.json({ token: jwt });
  } catch (error: any) {
    // Handle any error and send a response
    return res.status(500).json({
      message: "Failed to verify Google token.",
      error: error.message,
    });
  }
});

userRouter.get("/", (req, res) => {
  res.json("working");
});

export { userRouter };
