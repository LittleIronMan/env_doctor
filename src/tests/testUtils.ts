import { Env } from "../envHelper";

export type TestList = { name: string, func: () => boolean[] | boolean | Promise<boolean[] | boolean> }[];

export async function runTests(testList: TestList) {

    let fail = false;

    for (const test of testList) {
        let result: boolean;

        let funcRes = test.func();

        if (typeof funcRes === 'object' && !(funcRes instanceof Array)) {
            funcRes = await funcRes;
        }

        if (funcRes instanceof Array) {
            result = funcRes.reduce((totalRes, localRes) => totalRes && localRes);
        } else {
            result = funcRes;
        }

        if (!result) {
            fail = true;
            console.log(`Test ${test.name} failed!`);
        }
    }

    if (!fail) {
        console.log(`All ${testList.length} tests OK!`);
    }

    return !fail;
}

function shallowEqual(a: any, b: any) {
    for (const key in a) {
        if (a[key] !== b[key]) {
            return false;
        }
    }

    return true;
}

const compare = (a: Env, b: Env) => (a.filePath > b.filePath) ? 1 : ((b.filePath > a.filePath) ? -1 : 0);

export function equals(whereIsIt: string, arr: Env[], brr: Env[]) {
    arr.sort(compare);
    brr.sort(compare);

    if (arr.length != brr.length) {
        // console.warn(`(In ${whereIsIt}) Array lengths don't match, expected ${brr.length} but received ${arr.length}`);
        console.log("Required: ", brr.map((b) => b.filePath));
        console.log("Actually: ", arr.map((a) => a.filePath));
        return false;
    }

    for (let i = 0; i < arr.length; i++) {
        const a = arr[i];
        const b = brr[i];

        if (a.filePath !== b.filePath) {
            // console.warn(`(In ${whereIsIt}) required filePath "${b.filePath}" but actually "${a.filePath}"`);
            console.log("Required: ", brr.map((b) => b.filePath));
            console.log("Actually: ", arr.map((a) => a.filePath));
            return false;
        }

        if (!shallowEqual(a.data, b.data)) {
            console.warn(`(In ${whereIsIt}, env file "${a.filePath}")`);
            console.log("Required: ", b.data);
            console.log("Actually: ", a.data);
            return false;
        }

        if (Object.keys(a.data).length !== Object.keys(b.data).length) {
            return false;
        }
    }

    return true;
}
