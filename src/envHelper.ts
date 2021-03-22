import fs from "fs";
import path from "path";
import StdinNodeJS from "./stdin";
import dotenv from "dotenv";

const defaultConfigFileName = 'envConfig.json';

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
const stringFields = ["desc", "default", "value", "refTo"];
const booleanFields = ["secret", "optional", "clearBefore"];

type StringMap = { [key: string]: string };

interface ModuleBlock {
    name: string;
    dependencies?: StringMap;
}

export type EnvConfig = { [varName: string]: VarInfo };

export interface EnvFile {
    filePath: string;
    data: StringMap;
}

export interface Env {
    envFilePath: string;
    configFilePath: string;
    data: EnvConfig;
}

export type EnvMap = { [moduleAlias: string]: Env };

export interface Options {
    clearAll?: boolean;
    useDefaultAsValue?: boolean;
    emulateInput?: string | ((varName: string) => string);
    dontOverwriteFiles?: boolean;
}

function _moduleNameConflict(moduleAlias: string, configPath1: string, configPath2: string) {
    throw `Error: Module name conflict, the module name "${moduleAlias}" was found simultaneously in the config "${configPath1}" and "${configPath2}"`
}

function _parseConfig(configPath: string, thisModuleAlias?: string): EnvMap {
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

    const module = fileData.module as ModuleBlock;
    _checkConfigProps(module, { name: ['string'], dependencies: ['object', 'undefined'] }, '"module" block of ' + logEnd);

    const deps = module.dependencies;
    let childModulesEnv: EnvMap = {};

    if (deps) {
        _checkConfigProps(deps, _createSchema(Object.keys(deps), ['string']), `"module.dependencies" block of ` + logEnd);

        for (const moduleAlias in deps) {
            const modulePath = deps[moduleAlias];
            const childEnv = _parseConfig(path.join(dirName, modulePath), moduleAlias);

            for (const alias in childEnv) {
                if (typeof childModulesEnv[alias] !== 'undefined') {
                    _moduleNameConflict(alias, childModulesEnv[alias].configFilePath, childEnv[alias].configFilePath);
                }
                childModulesEnv[alias] = childEnv[alias];
            }
        }
    }

    const config = fileData.config as EnvConfig;
    _checkConfigProps(config, _createSchema(Object.keys(config), ['object']), `"config" block of ` + logEnd);

    const env = {
        envFilePath: '_' + module.name + ".env",
        configFilePath: configPath,
        data: {},
    } as Env;

    for (const varName in config) {
        const varInfo = config[varName] as VarInfo;
        _checkConfigProps(varInfo, varInfoSchema, `"config.${varName}" block of ` + logEnd);

        if (typeof varInfo.refTo == 'string') {
            const words = varInfo.refTo.split('.');
            const refModuleAlias = words[0];
            const refVarName = words[1];

            if (typeof refModuleAlias === 'string'
                && typeof refVarName === 'string'
                && childModulesEnv[refModuleAlias]
                && childModulesEnv[refModuleAlias].data[refVarName]
            ) {
                env.data[varName] = childModulesEnv[refModuleAlias].data[refVarName];
            } else {
                throw `Error: Broken reference "${varInfo.refTo}" in ` + logEnd;
            }

            for (const prop in varInfo) {
                if (prop === 'refTo') {
                    continue;
                }

                (env.data[varName] as any)[prop] = (varInfo as any)[prop];
            }
        } else {
            env.data[varName] = varInfo;
        }
    }

    if (!thisModuleAlias) {
        thisModuleAlias = module.name;
    }

    if (typeof childModulesEnv[thisModuleAlias] !== 'undefined') {
        _moduleNameConflict(thisModuleAlias, childModulesEnv[thisModuleAlias].configFilePath, configPath);
    }
    childModulesEnv[thisModuleAlias] = env;

    return childModulesEnv;
}

export default async function checkEnv(configPath: string, options: Options): Promise<EnvFile[]> {
    const allEnv = _parseConfig(configPath);
    const allEnvFiles: EnvFile[] = [];

    for (const moduleAlias in allEnv) {
        const env = allEnv[moduleAlias];
        const envFile = await checkOneEnv(env, options);
        allEnvFiles.push(envFile);
    }

    return allEnvFiles;
}

function checkOneEnv(env: Env, options: Options): Promise<EnvFile> {
    let needEnter: EnvConfig = {};
    const config = env.data;
    const envFile: EnvFile = {
        filePath: env.envFilePath,
        data: {},
    };

    // сначала проверяем уже существующие учетные данные
    if (!options.clearAll && fs.existsSync(env.envFilePath)) {

        const buf = fs.readFileSync(env.envFilePath, 'utf8');
        const _envFileData = dotenv.parse(buf) as StringMap;
        //const _fileData = JSON.parse(buf);

        if (!_envFileData) {
            throw `Error: Invalid .env file "${env.envFilePath}"`;
        }

        for (const varName in config) {
            const varInfo = config[varName];

            if (typeof _envFileData[varName] === 'undefined') {
                needEnter[varName] = varInfo;
            } else {
                envFile.data[varName] = _envFileData[varName];
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
            envFile.data[varName] = varInfo.value;
            delete needEnter[varName];
            continue;
        }

        if (typeof varInfo.default === 'string' && options.useDefaultAsValue) {
            // useDefaultAsValue перезаписывает переменную
            envFile.data[varName] = varInfo.default;
            delete needEnter[varName];
            continue;
        }
    }

    const variablesList = Object.keys(needEnter);

    // нет нужды в обновлении
    if (variablesList.length === 0) {
        // console.log("Все ключи уже введены, сохранены в файле " + filePath);
        return Promise.resolve(envFile);
    }

    const stdin = new StdinNodeJS();

    let p = Promise.resolve();

    variablesList.forEach(function (key) {
        const item = needEnter[key];
        p = p.then(_ => enterItem(key, item, stdin, envFile.data, options));
    });

    const res = p.then(() => {
        stdin.rl.close();

        if (!options.dontOverwriteFiles) {
            //const serialized = JSON.stringify(fileData, null, '\t');
            const serialized = Object.keys(envFile.data).map((varName) => {
                return varName + '=' + envFile.data[varName];
            }).join('\n');

            fs.writeFileSync(envFile.filePath, serialized, 'utf8');
        }

        return envFile;
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

type Schema = { [field: string]: string[] };

function _createSchema(propsNames: string[], allowedTypes: string[], out?: Schema): Schema {
    if (!out) {
        out = {};
    }
    for (const prop of propsNames) {
        out[prop] = allowedTypes;
    }
    return out;
}

const varInfoSchema = _createSchema(stringFields, ['string', 'undefined']);
_createSchema(booleanFields, ['boolean', 'undefined'], varInfoSchema);

function _checkConfigProps(obj: any, schema: Schema, whereIsIt: string) {
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
