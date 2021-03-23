import checkEnv, { Options } from "./envHelper";
import fs from "fs";
import minimistParse from "minimist";

export function parseArgs(argv: string[]): { options: Options, mainModule: string, allArgs: any } {
    const cliArgs: any = minimistParse(process.argv.slice(2));

    let mainModule = cliArgs._[0];

    if (typeof mainModule === 'undefined') {
        if (cliArgs.test) {
            mainModule = './';
        } else {
            throw 'Error: Required path to the directory with envConfig.json file';
        }
    } else if (typeof mainModule !== 'string' || !fs.existsSync(mainModule) || !fs.lstatSync(mainModule).isDirectory()) {
        throw `The passed argument path "${mainModule}" was not found`;
    }

    const options: Options = {};

    for (const opt of ['clearAll', 'useDefaultAsValue', 'dontOverwriteFiles', 'emulateInput']) {
        if (typeof cliArgs[opt] !== 'undefined') {
            (options[opt as keyof Options] as any) = cliArgs[opt];
        }
    }

    return { options: options, mainModule: mainModule, allArgs: cliArgs };
}

if (require.main === module) {
    const parsed = parseArgs(process.argv);
    checkEnv(parsed.mainModule, parsed.options);
}

export default checkEnv;