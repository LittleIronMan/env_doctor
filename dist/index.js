"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var envHelper_1 = __importDefault(require("./envHelper"));
if (require.main === module) {
    var pathArgs = process.argv.slice(2);
    if (pathArgs.length < 1) {
        console.warn("Please enter path as arguments");
        process.exit(1);
    }
    // console.log("Cleaning working tree...");
    var envConfigPath = pathArgs[0];
    //checkCredentials(envConfigPath);
}
exports.default = envHelper_1.default;
