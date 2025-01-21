import { Request, Response, NextFunction } from "express";
import JWTService from "../services/jwt"; // Import JWTService

// Middleware to validate JWT and extract userId
const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1]; // Get token from Authorization header

  if (!token) {
    return res
      .status(401)
      .json({ message: "Authentication token is required" });
  }

  try {
    // Verify the token and decode it
    const decoded = JWTService.decodeToken(token); // Use decodeToken without secret, since the JWT_SECRET is already handled inside

    if (!decoded) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }

    // Attach the userId to the request object for further use
    req.userId = decoded.id; // Assuming your payload has 'id' field
    req.email = decoded.email; // Assuming your payload has 'email' field

    next(); // Call the next middleware or route handler
  } catch (error) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

export default authenticateToken;
