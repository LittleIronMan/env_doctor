declare type StringMap = {
    [key: string]: string;
};
export declare type VarInfo = {
    desc?: string;
    default?: string;
    value?: string;
    secure?: boolean;
};
export declare type EnvConfig = {
    [key: string]: VarInfo;
};
export interface Env {
    filePath: string;
    data: StringMap;
}
export interface Options {
    clear?: boolean;
    useDefaultAsValue?: boolean;
    emulateInput?: string | ((varName: string) => string);
    dontOverwriteFiles?: boolean;
}
export default function checkCredentials(configPath: string, options: Options): Promise<Env[]>;
export {};
