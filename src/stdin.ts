import readline from "readline";
import { Writable } from "stream";

export default class StdinNodeJS {
    rl: readline.Interface;
    stdinHandler?: (input: string) => void;
    mutableStdout: Writable;
    muted = false;

    constructor() {
        this.mutableStdout = new Writable({
            write: (chunk, encoding, callback) => {

                if (!this.muted) {
                    process.stdout.write(chunk, encoding);
                }

                callback();
            }
        });

        this.rl = readline.createInterface({
            input: process.stdin,
            output: this.mutableStdout,
            terminal: true
        });

        this.rl.on('line', (line) => {

            if (this.stdinHandler) {
                this.stdinHandler(line);
            }
        });
    }
}