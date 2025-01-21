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
exports.userRouter = void 0;
const express_1 = __importDefault(require("express"));
const resolver_1 = require("./resolver");
const userRouter = express_1.default.Router();
exports.userRouter = userRouter;
// --TODO: Fix this typescipt error
// @ts-ignore
userRouter.post("/verify-token", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Extract token from the request body or headers
        const token = (_a = req.headers["authorization"]) === null || _a === void 0 ? void 0 : _a.split(" ")[1];
        if (!token) {
            return res.status(400).json({ message: "Token is required." });
        }
        // Call the verifyGoogleToken function and get the JWT
        const jwt = yield (0, resolver_1.verifyGoogleToken)(token);
        // Send the generated JWT back in the response
        return res.json({ token: jwt });
    }
    catch (error) {
        // Handle any error and send a response
        return res.status(500).json({
            message: "Failed to verify Google token.",
            error: error.message,
        });
    }
}));
