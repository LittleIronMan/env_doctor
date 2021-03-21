import { runTests } from "./testUtils";
import checkCredentials, { Env, Options } from "../envHelper";
import path from "path";
import fs from "fs";

function shallowEqual(a: any, b: any) {
    for (const key in a) {
        if (a[key] !== b[key]) {
            return false;
        }
    }

    return true;
}

const compare = (a: Env, b: Env) => (a.filePath > b.filePath) ? 1 : ((b.filePath > a.filePath) ? -1 : 0);

function equals(arr: Env[], brr: Env[]) {
    arr.sort(compare);
    brr.sort(compare);

    if (arr.length != brr.length) {
        return false;
    }

    for (let i = 0; i < arr.length; i++) {
        const a = arr[i];
        const b = brr[i];

        if (a.filePath !== b.filePath) {
            return false;
        }

        if (!shallowEqual(a.data, b.data)) {
            return false;
        }

        if (Object.keys(a.data).length !== Object.keys(b.data).length) {
            return false;
        }
    }

    return true;
}

const options: Options = {
    useDefaultAsValue: true,
    emulateInput: "abc",
    dontOverwriteFiles: true,
};


if (require.main === module) {
    const argv = process.argv.slice(2);

    let basePath = "./";

    if (argv.length > 0) {
        basePath = argv[0];

        if (!fs.existsSync(basePath) || !fs.lstatSync(basePath).isDirectory()) {
            throw `The passed argument path "${basePath}" was not found`;
        }

        process.chdir(basePath);
    }


    runTests([
        {
            name: "simpleTests",
            func: async () => {
                const results: boolean[] = [];

                const simple1 = await checkCredentials("./simpleTest", options);
                results.push(equals(simple1, [
                    {
                        filePath: "_simpleTest.env",
                        data: {
                            MAGIC_VAR_2: "Default value 3.141592",
                            MAGIC_VAR_1: "Forced value 1.618034",
                        },
                    }
                ]));

                const simple2 = await checkCredentials("./simpleTest2", options);
                results.push(equals(simple2, [
                    {
                        filePath: "_simpleTest2.env",
                        data: {
                            MAGIC_VAR_1: "Value from .env file",
                            MAGIC_VAR_2: "Default value 3.141592",
                            MAGIC_VAR_3: "Forced value 3",
                        },
                    }
                ]));


                //console.log(results);
                return results;
            }
        },
    ]);
}