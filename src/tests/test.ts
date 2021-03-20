import { runTests } from "./testUtils";
import checkCredentials, { Env, Options } from "../envHelper";

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

runTests([
    {
        name: "simpleTests",
        func: async () => {
            const result = await checkCredentials("src/tests/simpleTest", options);

            return equals(result, [
                {
                    filePath: "_simpleTest.env",
                    data: {
                        MAGIC_VAR_2: "Default value 3.141592",
                        MAGIC_VAR_1: "Forced value 1.618034",
                    },
                }
            ]);
        }
    },
]);