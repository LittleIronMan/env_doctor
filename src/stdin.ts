import readline from "readline";
import { Writable } from "stream";

export default class SequreStdin {
    rl: readline.Interface;
    // stdinHandler?: (input: string) => void;
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
            // When 'terminal': false
            // the user's password will be invisible in the console while typing
            terminal: true,
        });

        // this.rl.on('line', (line) => {

        //     if (this.stdinHandler) {
        //         this.stdinHandler(line);
        //     }
        // });
    }
}

export async function input(question: string): Promise<string> {
    return new Promise(function (resolve, reject) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}