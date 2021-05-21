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
    if (fs.lstatSync(configPath).isSymbolicLink()) {
        configPath = fs.realpathSync(configPath);
    }
    
    if (fs.lstatSync(configPath).isDirectory()) {
        configPath = path.join(configPath, defaultConfigFileName);
    }

    return configPath.replace(/\\/g, '/');
}

export function defaultFileReader(configPath: string): string {
    if (!fs.existsSync(configPath)) {
        throw `File does not exist ${configPath}`;
    }

    configPath = resolveEnvConfigPath(configPath);

    if (!fs.existsSync(configPath)) {
        throw `File does not exist ${configPath}`;
    }

    const buf = fs.readFileSync(configPath, 'utf8');
    return buf;
}

