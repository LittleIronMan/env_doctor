export declare type TestList = {
    name: string;
    func: () => boolean[] | boolean | Promise<boolean[] | boolean>;
}[];
export declare function runTests(testList: TestList): Promise<boolean>;
