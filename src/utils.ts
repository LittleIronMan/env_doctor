import fs from "fs";
import path from "path";
import { Options } from "./envHelper";
import minimistParse from "minimist";

export const defaultConfigFileName = 'envConfig.json';

export function err(e: any) {
    let msg = 'unknown';

    if (typeof e === 'string') {
        msg = e;
    } else if (typeof e === 'object' && e.message) {
        msg = e.message;
    }

    console.error("Error: " + msg);
    process.exit();
}

export function join2(a: string, b: string): string {
    return path.join(a, b).replace(/\\/g, '/');
}

export function parseArgs(): { options: Options, mainModule: string, allArgs: any } {
    const booleanArgs = ['clearAll', 'useDefaultAsValue', 'dontOverwriteFiles'];
    const cliArgs: any = minimistParse(process.argv.slice(2), { boolean: booleanArgs });

    let mainModule = cliArgs._[0];
    // console.log(cliArgs);

    if (typeof mainModule !== 'string') {
        if (cliArgs.test) {
            mainModule = './';
        } else {
            err(`Required path to file or directory with "${defaultConfigFileName}" file`);
        }
    }

    const options: Options = {};

    for (const opt of booleanArgs.concat(['emulateInput'])) {
        if (typeof cliArgs[opt] !== 'undefined') {
            (options[opt as keyof Options] as any) = cliArgs[opt];
        }
    }

    return { options: options, mainModule: mainModule, allArgs: cliArgs };
}

export function resolveEnvConfigPath(configPath: string): string {
    if (!fs.existsSync(configPath)) {
        return configPath;
    }

    let isDirectory = false;

    if (fs.lstatSync(configPath).isSymbolicLink()) {
        const realpath = fs.realpathSync(configPath);
        isDirectory = fs.lstatSync(realpath).isDirectory();
    } else {
        isDirectory = fs.lstatSync(configPath).isDirectory();
    }
    
    if (isDirectory) {
        configPath = path.join(configPath, defaultConfigFileName);
    }

    configPath = configPath.replace(/\\/g, '/');

    if (configPath !== '' && !path.isAbsolute(configPath) && !configPath.startsWith('./') && !configPath.startsWith('../') && configPath !== '.') {
        configPath = './' + configPath;
    }

    return configPath;
}

export function defaultFileReader(configPath: string): string {
    if (!fs.existsSync(configPath)) {
        throw `File does not exist ${configPath}`;
    }

    configPath = resolveEnvConfigPath(configPath);

    if (!fs.existsSync(configPath)) {
        throw `File does not exist ${configPath}`;
    }

    if (fs.lstatSync(configPath).isSymbolicLink()) {
        configPath = fs.realpathSync(configPath);
    }

    const buf = fs.readFileSync(configPath, 'utf8');
    return buf;
}

export function defaultEnvFileName(moduleName: string): string {
    return '_' + moduleName + '.env';
}

// https://stackoverflow.com/a/41407246
const UNDERLINE = '\x1b[4m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';
export const OVERWRITE_LINE = '\x1b[0G';
export const header = (s: string) => UNDERLINE + s + RESET;
export const highlight = (s: string) => YELLOW + s + RESET;
export const secret = (s: string) => BLUE + s + RESET;
