"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jwt_1 = __importDefault(require("../services/jwt")); // Import JWTService
// Middleware to validate JWT and extract userId
const authenticateToken = (req, res, next) => {
    var _a;
    const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(" ")[1]; // Get token from Authorization header
    if (!token) {
        return res
            .status(401)
            .json({ message: "Authentication token is required" });
    }
    try {
        // Verify the token and decode it
        const decoded = jwt_1.default.decodeToken(token); // Use decodeToken without secret, since the JWT_SECRET is already handled inside
        if (!decoded) {
            return res.status(403).json({ message: "Invalid or expired token" });
        }
        // Attach the userId to the request object for further use
        req.userId = decoded.id; // Assuming your payload has 'id' field
        req.email = decoded.email; // Assuming your payload has 'email' field
        next(); // Call the next middleware or route handler
    }
    catch (error) {
        return res.status(403).json({ message: "Invalid or expired token" });
    }
};
exports.default = authenticateToken;
