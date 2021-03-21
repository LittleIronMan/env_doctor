import { runTests } from "./testUtils";
import checkCredentials, { Env, Options } from "../envHelper";
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

const randomWord = "abc";

const options: Options = {
    useDefaultAsValue: true,
    emulateInput: randomWord,
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
        {
            name: "simpleTests",
            func: async () => {
                const complex1 = await checkCredentials("./complexTest1/nodejs_server", options);
                const result = equals(complex1, [
                    {
                        filePath: "_couchdb.env",
                        data: {
                            COUCHDB_USER: "BilboBaggins",
                            COUCHDB_PASSWORD: randomWord, 
                        }
                    },
                    {
                        filePath: "_deep1.env",
                        data: {
                            DEEP_1: "James Cameron",
                        }
                    },
                    {
                        filePath: "_deep2.env",
                        data: {
                            DEEP_2: "James Cameron",
                        }
                    },
                    {
                        filePath: "_deep3.env",
                        data: {
                            DEEP_3: "James Cameron",
                        }
                    },
                    {
                        filePath: "_empty_module.env",
                        data: {}
                    },
                    {
                        filePath: "_flags_check.env",
                        data: {
                            CLEAR_BEFORE: "Value from config",
                            // OPTIONAL_VAR: "", // should not be in .env file, because optional and empty
                        }
                    },
                    {
                        filePath: "_lonely_module.env",
                        data: {
                            LONELY_VARIABLE: randomWord,
                        }
                    },
                    {
                        filePath: "_nodejs-express-server.env",
                        data: {
                            POSTGRES_HOST: "amazing-postgres-db",
                            POSTGRES_PORT: "5432",
                            POSTGRES_DB: "mydatabase",
                            POSTGRES_USER: "TonyStark",
                            POSTGRES_PASSWORD: "ThAnOs JeRk", // Warning should appear, because variable is secret and value is set in config. And Thanos is not a jerk at all
                            COUCHDB_USER: "BilboBaggins",
                            COUCHDB_PASSWORD: randomWord, 
                        },
                    },
                    {
                        filePath: "_postgres.env",
                        data: {
                            POSTGRES_DB: "mydatabase",
                            POSTGRES_USER: "TonyStark",
                            POSTGRES_PASSWORD: "ThAnOs JeRk",
                        }
                    },
                ]);

                return result;
            }
        }
    ]);
}