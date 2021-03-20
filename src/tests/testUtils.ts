export type TestList = { name: string, func: () => boolean[] | boolean | Promise<boolean[] | boolean> }[];

export async function runTests(testList: TestList) {

    let fail = false;
    for (const test of testList) {
        let result: boolean;

        let funcRes = test.func();

        if (!(funcRes instanceof Array) && typeof funcRes === 'object') {
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