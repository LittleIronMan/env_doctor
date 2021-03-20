/// <reference types="node" />
import readline from "readline";
import { Writable } from "stream";
export default class StdinNodeJS {
    rl: readline.Interface;
    stdinHandler?: (input: string) => void;
    mutableStdout: Writable;
    muted: boolean;
    constructor();
}
