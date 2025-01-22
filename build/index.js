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
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const Redis = require("ioredis");
const redisHost = process.env.REDIS_HOST || "localhost";
const redisPort = process.env.REDIS_PORT || 6379;
const redisClient = new Redis({
    host: redisHost,
    port: redisPort,
});
redisClient.on("connect", () => console.log("Connected to Redis"));
redisClient.on("error", (err) => console.error("Redis error:", err));
function init() {
    return __awaiter(this, void 0, void 0, function* () {
        const app = yield (0, app_1.initServer)();
        app.listen(4000, () => {
            console.log("Server is running on port 8000");
        });
    });
}
init();
