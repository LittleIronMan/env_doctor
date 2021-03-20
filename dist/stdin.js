"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var readline_1 = __importDefault(require("readline"));
var stream_1 = require("stream");
var StdinNodeJS = /** @class */ (function () {
    function StdinNodeJS() {
        var _this = this;
        this.muted = false;
        this.mutableStdout = new stream_1.Writable({
            write: function (chunk, encoding, callback) {
                if (!_this.muted) {
                    process.stdout.write(chunk, encoding);
                }
                callback();
            }
        });
        this.rl = readline_1.default.createInterface({
            input: process.stdin,
            output: this.mutableStdout,
            terminal: true
        });
        this.rl.on('line', function (line) {
            if (_this.stdinHandler) {
                _this.stdinHandler(line);
            }
        });
    }
    return StdinNodeJS;
}());
exports.default = StdinNodeJS;
