"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyGoogleToken = void 0;
const db_1 = require("../../clients/db");
const axios_1 = __importDefault(require("axios"));
const jwt_1 = __importDefault(require("../../services/jwt"));
const verifyGoogleToken = function (token) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!token) {
            throw new Error("Token is required.");
        }
        try {
            // Send a request to Google's tokeninfo endpoint
            const googleOauthURL = new URL("https://oauth2.googleapis.com/tokeninfo");
            googleOauthURL.searchParams.set("id_token", token);
            const { data } = yield axios_1.default.get(googleOauthURL.toString(), {
                responseType: "json",
            });
            // Ensure the response from Google is valid
            if (!data.email) {
                throw new Error("Invalid token response: Missing email.");
            }
            // Find or create the user in the database
            const user = yield db_1.prismaClient.user.upsert({
                where: { email: data.email },
                update: {}, // no updates if user exists
                create: {
                    email: data.email,
                    firstName: data.given_name,
                    lastName: data.family_name || "", // default to empty if not available
                },
            });
            // Generate the user token
            const userToken = jwt_1.default.generateTokenForUser(user);
            return userToken;
        }
        catch (error) {
            console.error("Error verifying Google token:", error);
            throw new Error("Failed to verify Google token.");
        }
    });
};
exports.verifyGoogleToken = verifyGoogleToken;
