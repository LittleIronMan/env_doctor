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

    _valueFromEnvFile?: string;
    _enteredValue?: string;
};
const stringFields = ["default", "value", "refTo"];
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
    name: string;
    alias: string;
    configFilePath: string;
    data: EnvConfig;
    _deepth: number;
    _envFile: EnvFile;
}

export type EnvMap = { [moduleAlias: string]: Env };

export interface Options {
    clearAll?: boolean;
    useDefaultAsValue?: boolean;
    emulateInput?: string | ((varName: string) => string);
    dontOverwriteFiles?: boolean;
}

export default async function checkEnv(configPath: string, options: Options): Promise<EnvFile[]> {
    const allEnv = _parseConfig(configPath);
    const descend = (a: Env, b: Env) => (a._deepth > b._deepth) ? -1 : ((b._deepth > a._deepth) ? 1 : 0);
    allEnv.sort(descend);

    for (const env of allEnv) {
        _checkExistingEnvFile(env, options);
    }

    for (const env of allEnv) {
        await _enterMissingVariables(env, options);
    }

    for (const env of allEnv) {
        for (const varName in env.data) {
            const varInfo = env.data[varName];
            const finishValue = _getFinishValue(varInfo, options);

            if (typeof finishValue === 'string') {
                if (finishValue === '' && varInfo.optional) {
                    continue;
                }

                env._envFile.data[varName] = finishValue;
            } else {
                console.warn(`The script could not get the value of the variable ${varName} for an unknown reason`);
            }
        }

        if (!options.dontOverwriteFiles) {
            //const serialized = JSON.stringify(fileData, null, '\t');
            const serialized = Object.keys(env._envFile.data).map((varName) => {
                return varName + '=' + env._envFile.data[varName];
            }).join('\n');

            fs.writeFileSync(env._envFile.filePath, serialized, 'utf8');
        }
    }

    console.log('All environment variables are ready');
    return allEnv.map((env) => env._envFile);
}


function _moduleNameConflict(moduleAlias: string, configPath1: string, configPath2: string) {
    err(`Module name conflict, the module name "${moduleAlias}" was found simultaneously in the config "${configPath1}" and "${configPath2}"`)
}

function _getModule(allEnv: Env[], moduleAlias: string): Env | undefined {
    for (let i = 0; i < allEnv.length; i++) {
        if (allEnv[i].alias == moduleAlias) {
            return allEnv[i];
        }
    }
}

function _parseConfig(configPath: string, thisModuleAlias?: string, deepth: number = 0): Env[] {
    if (!fs.existsSync(configPath)) {
        err(`Invalid path to configuration file ${configPath}`);
    }

    if (fs.lstatSync(configPath).isDirectory()) {
        configPath = path.join(configPath, defaultConfigFileName);

        if (!fs.existsSync(configPath)) {
            err(`Environment configuration file not found ${configPath}`);
        }
    }

    const dirName = path.dirname(configPath);
    const buf = fs.readFileSync(configPath, 'utf8');
    const fileData = JSON.parse(buf);

    if (!fileData) {
        err('Error: Invalid JSON configuration file');
    }

    const logEnd = `configuration file ${configPath}`;
    _checkConfigProps(fileData, { config: ['object'], module: ['object'] }, 'root of ' + logEnd);

    const module = fileData.module as ModuleBlock;
    _checkConfigProps(module, { name: ['string'], dependencies: ['object', 'undefined'] }, '"module" block of ' + logEnd);

    const deps = module.dependencies;
    let childModulesEnv: Env[] = [];

    // parse module dependencies
    if (deps) {
        _checkConfigProps(deps, _createSchema(Object.keys(deps), ['string']), `"module.dependencies" block of ` + logEnd);

        for (const moduleAlias in deps) {
            const modulePath = deps[moduleAlias];
            const childEnv = _parseConfig(path.join(dirName, modulePath), moduleAlias, deepth + 1);

            for (const child of childEnv) {
                const anotherChild = _getModule(childModulesEnv, child.alias);

                if (anotherChild) {
                    _moduleNameConflict(child.alias, anotherChild.configFilePath, child.configFilePath);
                }

                childModulesEnv.push(child);
            }
        }
    }

    // parse config of module
    const config = fileData.config as EnvConfig;
    _checkConfigProps(config, _createSchema(Object.keys(config), ['object']), `"config" block of ` + logEnd);

    const env: Env = {
        name: module.name,
        alias: thisModuleAlias || module.name,
        configFilePath: configPath,
        data: {},
        _deepth: deepth,
        _envFile: {
            filePath: '_' + module.name + ".env",
            data: {},
        }
    };

    for (const varName in config) {
        const varInfo = config[varName] as VarInfo;
        _checkConfigProps(varInfo, varInfoSchema, `"config.${varName}" block of ` + logEnd);

        if (typeof varInfo.desc === 'object') {
            if (varInfo.desc as string[] instanceof Array) {
                // Multiline description
                varInfo.desc = (varInfo.desc as string[]).join('\n');
            } else {
                delete varInfo.desc;
            }
        }

        if (typeof varInfo.refTo == 'string') {
            const words = varInfo.refTo.split('.');
            const refModuleAlias = words[0];
            const refVarName = words[1];
            let refBroken = false;

            if (typeof refModuleAlias !== 'string' || typeof refVarName !== 'string') {
                refBroken = true;
            }

            if (!refBroken) {
                const child = _getModule(childModulesEnv, refModuleAlias)

                if (child && child.data[refVarName]) {
                    env.data[varName] = child.data[refVarName];
                } else {
                    refBroken = true;
                }
            }

            if (refBroken) {
                err(`Broken reference "${varInfo.refTo}" in `) + logEnd;
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

    const twin = _getModule(childModulesEnv, env.alias);

    if (twin) {
        _moduleNameConflict(env.alias, twin.configFilePath, configPath);
    }

    childModulesEnv.push(env);

    return childModulesEnv;
}

function _checkExistingEnvFile(env: Env, options: Options) {
    const config = env.data;

    if (!options.clearAll && fs.existsSync(env._envFile.filePath)) {

        const buf = fs.readFileSync(env._envFile.filePath, 'utf8');
        const _envFileData = dotenv.parse(buf) as StringMap;
        //const _fileData = JSON.parse(buf);

        if (!_envFileData) {
            err(`Invalid .env file "${env._envFile.filePath}"`);
        }

        env._envFile.data = _envFileData;

        for (const varName in config) {
            const varInfo = config[varName];

            let valueFromFile = _envFileData[varName];

            if (typeof valueFromFile === 'string') {
                varInfo._valueFromEnvFile = valueFromFile;
            }
        }
    }
}

function _getFinishValue(varInfo: VarInfo, options: Options): string | undefined {
    if (typeof varInfo._valueFromEnvFile === 'string' && !varInfo.clearBefore && !options.clearAll) {
        return varInfo._valueFromEnvFile;
    }

    if (typeof varInfo.value === 'string') {
        return varInfo.value;
    }

    if (options.useDefaultAsValue && typeof varInfo.default === 'string') {
        return varInfo.default;
    }

    if (varInfo._enteredValue) {
        return varInfo._enteredValue;
    }

    return undefined;
}

function _needEnter(varInfo: VarInfo, options: Options): boolean {
    const finishValue = _getFinishValue(varInfo, options);

    if (typeof finishValue === 'undefined') {
        return true;
    }

    return false;
}

async function _enterMissingVariables(env: Env, options: Options) {

    const variablesList = Object.keys(env.data).filter((varName) => {
        return _needEnter(env.data[varName], options);
    });

    // нет нужды в обновлении
    if (variablesList.length === 0) {
        return;
    }

    const stdin = new StdinNodeJS();

    for (const varName of variablesList) {
        const varInfo = env.data[varName];
        varInfo._enteredValue = await _enterVariableValue(varName, varInfo, stdin, options);
    }

    stdin.rl.close();
}

async function _enterVariableValue(varName: string, varInfo: VarInfo, stdin: StdinNodeJS, options: Options): Promise<string> {
    return new Promise(function (resolve, reject) {

        if (options.emulateInput) {
            if (typeof options.emulateInput === 'function') {
                return resolve(options.emulateInput(varName));
            } else if (typeof options.emulateInput === 'string') {
                return resolve(options.emulateInput);
            }
        }

        console.log('(Variable name): ' + varName);

        if (varInfo.default) {
            console.log(`(Default value) == "${varInfo.default}"`);
        }

        if (varInfo.desc) {
            console.log('(Description): ' + varInfo.desc);
        }

        stdin.muted = !!varInfo.secret;

        console.log('(Enter value)> ');

        stdin.stdinHandler = (line) => {
            if (line === '' && varInfo.default) {
                line = varInfo.default;
            }

            console.log(`${varName}=${varInfo.secret ? '<secret>': line}`);
            console.log('');
            resolve(line);
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
_createSchema(['desc'], ['string', 'object', 'undefined'], varInfoSchema);

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
            err(`Field "${prop}" (in ${whereIsIt}) should be ${schema[prop].join(', or ')}`);
        }
    }
}

export function err(msg: string) {
    console.error("Error: " + msg);
    process.exit();
}
