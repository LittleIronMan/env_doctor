import fs from "fs";
import path from "path";
import StdinNodeJS from "./stdin";
import dotenv from "dotenv";

const defaultConfigFileName = 'envConfig.json';

type StringMap = { [key: string]: string };

export interface VarInfo {
    /** Variable description, very useful if you are not psychic */
    desc?: string;

    /** The default value of the variable if the user entered an empty string */
    default?: string;

    /** Forced value of variable, no input required */
    value?: string;

    /** The config of this variable refers to the variable from dependencies list */
    refTo?: string;

    /**
     * If true - value of the variable will not be displayed on the screen when typing it from the keyboard.
     * Also warnings will be displayed if you mistakenly set the "value" or "default" fields
     */
    secret?: boolean;

    /** If true - and if the value of the variable is empty string, this variable will not be saved in the .env file */
    optional?: boolean;

    /** If true - value of the variable in the corresponding .env file will be CLEARED before checking */
    clearBefore?: boolean;
};
export type EnvConfig = { [key: string]: VarInfo }
export interface Env {
    filePath: string;
    data: StringMap;
};
export interface Options {
    clearAll?: boolean;
    useDefaultAsValue?: boolean;
    emulateInput?: string | ((varName: string) => string);
    dontOverwriteFiles?: boolean;
}

export default async function checkEnv(configPath: string, options: Options): Promise<Env[]> {
    if (!fs.existsSync(configPath)) {
        throw `Error: Invalid path to configuration file ${configPath}`;
    }

    if (fs.lstatSync(configPath).isDirectory()) {
        configPath = path.join(configPath, defaultConfigFileName);

        if (!fs.existsSync(configPath)) {
            throw `Error: Environment configuration file not found ${configPath}`;
        }
    }

    const dirName = path.dirname(configPath);
    const buf = fs.readFileSync(configPath, 'utf8');
    const fileData = JSON.parse(buf);

    if (!fileData) {
        throw 'Error: Invalid JSON configuration file';
    }

    const logEnd = `configuration file ${configPath}`;
    _checkConfigProps(fileData, { config: ['object'], module: ['object'] }, 'root of ' + logEnd);
    _checkConfigProps(fileData.module, { name: ['string'], dependencies: ['object', 'undefined'] }, '"module" block of ' + logEnd);

    const module = fileData.module;
    const deps = module.dependencies;
    let childModulesEnv: Env[] = [];

    if (deps) {
        for (const moduleName in deps) {
            const schema: any = {};
            schema[moduleName] = ['string'];
            _checkConfigProps(deps, schema, `"module.dependencies.${moduleName}" block of ` + logEnd);

            const childModulePath = deps[moduleName];
            const childEnv = await checkEnv(path.join(dirName, childModulePath), options);
            childModulesEnv = childModulesEnv.concat(childEnv);
        }
    }

    const config = fileData.config;

    const env = {
        filePath: '_' + module.name + ".env",
        data: {},
    } as Env;
    let needEnter: EnvConfig = {};

    // сначала проверяем уже существующие учетные данные
    if (!options.clearAll && fs.existsSync(env.filePath)) {

        const buf = fs.readFileSync(env.filePath, 'utf8');
        const _envData = dotenv.parse(buf) as StringMap;
        //const _fileData = JSON.parse(buf);

        if (!_envData) {
            throw `Error: Invalid .env file "${env.filePath}"`;
        }

        for (const varName in config) {
            const varInfo = config[varName];

            if (typeof _envData[varName] === 'undefined') {
                needEnter[varName] = varInfo;
            } else {
                env.data[varName] = _envData[varName];
            }
        }

    } else {
        // необходимо ввести все данные заново
        needEnter = config;
    }

    for (const varName in needEnter) {
        const varInfo = needEnter[varName] as VarInfo;

        if (typeof varInfo.value === 'string') {
            // value перезаписывает переменную
            env.data[varName] = varInfo.value;
            delete needEnter[varName];
            continue;
        }

        if (typeof varInfo.default === 'string' && options.useDefaultAsValue) {
            // useDefaultAsValue перезаписывает переменную
            env.data[varName] = varInfo.default;
            delete needEnter[varName];
            continue;
        }
    }

    const variablesList = Object.keys(needEnter);

    // нет нужды в обновлении
    if (variablesList.length === 0) {
        // console.log("Все ключи уже введены, сохранены в файле " + filePath);
        return Promise.resolve([env]);
    }

    const stdin = new StdinNodeJS();

    let p = Promise.resolve();

    variablesList.forEach(function (key) {
        const item = needEnter[key];
        p = p.then(_ => enterItem(key, item, stdin, env.data, options));
    });

    const res = p.then(() => {
        stdin.rl.close();

        if (!options.dontOverwriteFiles) {
            //const serialized = JSON.stringify(fileData, null, '\t');
            const serialized = Object.keys(env.data).map((varName) => {
                return varName + '=' + env.data[varName];
            }).join('\n');

            fs.writeFileSync(env.filePath, serialized, 'utf8');
        }

        return env;
    });

    const thisModuleEnv = await res;

    return childModulesEnv.concat(thisModuleEnv);
}

function enterItem(key: string, item: VarInfo, stdin: StdinNodeJS, fileData: StringMap, options: Options): Promise<void> {
    return new Promise(function (resolve, reject) {

        if (options.emulateInput) {
            if (typeof options.emulateInput === 'function') {
                fileData[key] = options.emulateInput(key);
                return resolve();
            } else if (typeof options.emulateInput === 'string') {
                fileData[key] = options.emulateInput;
                return resolve();
            }
        }

        console.log('Ключ ' + key);

        if (item.default) {
            console.log(`-- Значение по-умолчанию == "${item.default}"`);
        }

        if (item.desc) {
            console.log('-- Описание: ' + item.desc);
        }

        stdin.muted = !!item.secret;

        console.log('-- Введите значение> ');

        stdin.stdinHandler = (line) => {
            if (line === '' && item.default) {
                line = item.default;
            }

            fileData[key] = line;

            console.log(`${key}=${item.secret ? '<secret>': line}`);
            console.log('');
            resolve();
        };
    });
}

function _checkConfigProps(obj: any, schema: { [field: string]: string[] }, whereIsIt: string) {
    for (const prop in schema) {
        let isValid = false;

        for (const type of schema[prop]) {
            if (typeof obj[prop] === type) {
                isValid = true;
                break;
            }
        }

        if (!isValid) {
            throw `Error: Field "${prop}" (in ${whereIsIt}) should be ${schema[prop].join(', or ')}`;
        }
    }
}
