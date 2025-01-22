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
exports.analyticRoute = void 0;
const express_1 = __importDefault(require("express"));
const analyticRoute = express_1.default.Router();
exports.analyticRoute = analyticRoute;
const resolver_1 = require("./resolver");
const middleware_1 = __importDefault(require("../middleware"));
// --TODO: Fix this typescipt error
// @ts-ignore
analyticRoute.get("/analytic/:alias", middleware_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const urlId = req.params.alias;
        if (!userId) {
            return res.status(400).json({ message: "User not authenticated" });
        }
        if (!urlId) {
            return res.status(400).json({ message: "URL Id not found" });
        }
        const urlAnalytics = yield (0, resolver_1.getAnayticsById)(urlId, userId); // Await the promise
        return res.json({ data: urlAnalytics });
    }
    catch (error) {
        // Catch and send the error in response
        console.error("Error in /analytic/:alias route:", error.message);
        return res.status(500).json({
            message: error.message || "Failed to get analytics data.",
        });
    }
}));
analyticRoute.get("/analytic/topic/:topic", 
//@ts-ignore
(req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const topic = req.params.topic;
    if (!topic) {
        return res.status(400).json({ message: "Topic is required" });
    }
    try {
        const analytics = yield (0, resolver_1.getTopicAnalytics)(topic);
        return res.json({ data: analytics });
    }
    catch (error) {
        console.error("Error in /analytic/topic/:topic route:", error.message);
        return res
            .status(422)
            .json({ message: error.message || "Something Went wrong" });
    }
})); //@ts-ignore
analyticRoute.get("/analytics/overall", middleware_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("i'm here");
    const userId = req.userId;
    if (!userId) {
        return res.status(400).json({ message: "User is not authenticated" });
    }
    console.log(userId);
    try {
        const analytics = yield (0, resolver_1.getOverallAnalytics)(userId);
        console.log(analytics);
        return res.json({ data: analytics });
    }
    catch (error) {
        console.error("Error in /analytic/overall route:", error.message);
        return res.status(500).json({
            message: error.message || "Failed to fetch overall analytics.",
        });
    }
}));
