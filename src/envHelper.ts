import fs from "fs";
import path from "path";
import StdinNodeJS from "./stdin";
import dotenv from "dotenv";

const defaultConfigFileName = 'envConfig.json';

type StringMap = { [key: string]: string };

export type VarInfo = { desc?: string, default?: string, value?: string, secure?: boolean };
export type EnvConfig = { [key: string]: VarInfo }
export interface Env {
    filePath: string;
    data: StringMap;
};
export interface Options {
    clear?: boolean;
    useDefaultAsValue?: boolean;
    emulateInput?: string | ((varName: string) => string);
    dontOverwriteFiles?: boolean;
}

export default function checkCredentials(configPath: string, options: Options): Promise<Env[]> {
    if (!fs.existsSync(configPath)) {
        throw 'Error: Invalid path to configuration file';
    }

    if (fs.lstatSync(configPath).isDirectory()) {
        configPath = path.join(configPath, defaultConfigFileName);

        if (!fs.existsSync(configPath)) {
            throw 'Error: Environment configuration file not found';
        }
    }

    const buf = fs.readFileSync(configPath, 'utf8');
    const fileData = JSON.parse(buf);

    if (!fileData) {
        throw 'Error: Invalid JSON configuration file';
    }

    _checkConfigProps(fileData, { config: ['object'], module: ['object'] }, 'root of configuration file');
    _checkConfigProps(fileData.module, { name: ['string'], dependencies: ['array', 'undefined'] }, '"module" block');

    const config = fileData.config;
    const module = fileData.module;

    const env = {
        filePath: '_' + module.name + ".env",
        data: {},
    } as Env;
    let needEnter: EnvConfig = {};

    // сначала проверяем уже существующие учетные данные
    if (!options.clear && fs.existsSync(env.filePath)) {

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

        return [env];
    });

    return res;
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

        stdin.muted = !!item.secure;

        console.log('-- Введите значение> ');

        stdin.stdinHandler = (line) => {
            if (line === '' && item.default) {
                line = item.default;
            }

            fileData[key] = line;

            console.log(`${key}=${item.secure ? '<secure>': line}`);
            console.log('');
            resolve();
        };
    });
}

function _checkConfigProps(obj: any, schema: { [field: string]: string[] }, whereItIs: string) {
    for (const prop in schema) {
        let isValid = false;

        for (const type of schema[prop]) {
            if (typeof obj[prop] === type) {
                isValid = true;
                break;
            }
        }

        if (!isValid) {
            throw `Error: Field ${prop} (in ${whereItIs}) should be ${schema[prop].join(', or ')}`;
        }
    }
}
