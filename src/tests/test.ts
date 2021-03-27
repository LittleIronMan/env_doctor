import checkEnv, { Options } from "../envHelper";
import { equals, runTests } from "./testUtils";
import { parseArgs } from "../index";

if (require.main === module) {
    const parsed = parseArgs();

    if (parsed.allArgs.test == 1) {
        test1(parsed.options);
    } else if (parsed.allArgs.test == 2) {
        test2(parsed.options);
    } else {
        console.log('Argument "test" not found');
    }
}

function test1(options: Options) {
    runTests([
        {
            name: "simpleTests",
            func: async () => {
                const results: boolean[] = [];

                const simple1 = await checkEnv("./simpleTest", options);
                results.push(equals('simple1 test', simple1, [
                    {
                        filePath: "_simpleTest.env",
                        data: {
                            MAGIC_VAR_2: "Default value 3.141592",
                            MAGIC_VAR_1: "Forced value 1.618034",
                        },
                    }
                ]));

                const simple2 = await checkEnv("./simpleTest2", options);
                results.push(equals('simple2 test', simple2, [
                    {
                        filePath: "_simpleTest2.env",
                        data: {
                            MAGIC_VAR_1: "Value from .env file",
                            MAGIC_VAR_2: "Default value 3.141592",
                            MAGIC_VAR_3: "Forced value 3",
                            FREEDOM: "Glory to anarchy!", // This variable is not in any of the config files. But it must remain in the env file
                        },
                    }
                ]));


                //console.log(results);
                return results;
            }
        },
        {
            name: "complexTest1",
            func: async () => {
                const complex1 = await checkEnv("./complexTest1/nodejs_server", options);
                const result = equals('complex1 test', complex1, [
                    {
                        filePath: "_couchdb.env",
                        data: {
                            COUCHDB_USER: "BilboBaggins",
                            COUCHDB_PASSWORD: 'abc', 
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
                            LONELY_VARIABLE: 'abc',
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
                            COUCHDB_PASSWORD: 'abc', 
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

function test2(options: Options) {
    runTests([
        {
            name: "exampleProject",
            func: async () => {
                const complex1 = await checkEnv("./nodejs", options);
                const result = equals('complex1 test', complex1, [
                    {
                        filePath: "_my-nodejs-server.env",
                        data: {
                            MY_MAGIC_VAR: "Forced value 1.618034",
                            POSTGRES_PORT: "5432",
                            PROJECT_NAME: 'keyboard_input',
                            POSTGRES_PASSWORD: "keyboard_input",
                            COUCHDB_PASSWORD: "keyboard_input"
                        },
                    },
                    {
                        filePath: "_postgres.env",
                        data: {
                            POSTGRES_USER: "postgres",
                            POSTGRES_PASSWORD: "keyboard_input",
                        }
                    },
                    {
                        filePath: "_couchdb.env",
                        data: {
                            COUCHDB_USER: "BilboBaggins",
                            COUCHDB_PASSWORD: "keyboard_input" 
                        }
                    },
                ]);

                return result;
            }
        }
    ]);
}