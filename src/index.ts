#!/usr/bin/env node
import checkEnv, { Options, err } from "./envHelper";
import minimistParse from "minimist";

export function parseArgs(): { options: Options, mainModule: string, allArgs: any } {
    const booleanArgs = ['clearAll', 'useDefaultAsValue', 'dontOverwriteFiles'];
    const cliArgs: any = minimistParse(process.argv.slice(2), { boolean: booleanArgs });

    let mainModule = cliArgs._[0];
    // console.log(cliArgs);

    if (typeof mainModule !== 'string') {
        if (cliArgs.test) {
            mainModule = './';
        } else {
            err('Required path to file or directory with "envConfig.json" file');
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

if (require.main === module) {
    const parsed = parseArgs();
    checkEnv(parsed.mainModule, parsed.options);
}

export default checkEnv;