"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = __importDefault(require("fs"));
var path_1 = __importDefault(require("path"));
var stdin_1 = __importDefault(require("./stdin"));
var dotenv_1 = __importDefault(require("dotenv"));
var defaultConfigFileName = 'envConfig.json';
;
function checkCredentials(configPath, options) {
    if (!fs_1.default.existsSync(configPath)) {
        throw 'Error: Invalid path to configuration file';
    }
    if (fs_1.default.lstatSync(configPath).isDirectory()) {
        configPath = path_1.default.join(configPath, defaultConfigFileName);
        if (!fs_1.default.existsSync(configPath)) {
            throw 'Error: Environment configuration file not found';
        }
    }
    var buf = fs_1.default.readFileSync(configPath, 'utf8');
    var fileData = JSON.parse(buf);
    if (!fileData) {
        throw 'Error: Invalid JSON configuration file';
    }
    checkConfigProps(fileData, { config: ['object'], module: ['object'] }, 'root of configuration file');
    checkConfigProps(fileData.module, { name: ['string'], dependencies: ['array', 'undefined'] }, '"module" block');
    var config = fileData.config;
    var module = fileData.module;
    var env = {
        filePath: '_' + module.name + ".env",
        data: {},
    };
    var needEnter = {};
    // сначала проверяем уже существующие учетные данные
    if (!options.clear && fs_1.default.existsSync(env.filePath)) {
        var buf_1 = fs_1.default.readFileSync(env.filePath, 'utf8');
        var _envData = dotenv_1.default.parse(buf_1);
        //const _fileData = JSON.parse(buf);
        if (!_envData) {
            throw "Error: Invalid .env file \"" + env.filePath + "\"";
        }
        for (var varName in config) {
            var varInfo = config[varName];
            if (typeof _envData[varName] === 'undefined') {
                needEnter[varName] = varInfo;
            }
            else {
                env.data[varName] = _envData[varName];
            }
        }
    }
    else {
        // необходимо ввести все данные заново
        needEnter = config;
    }
    for (var varName in needEnter) {
        var varInfo = needEnter[varName];
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
    var variablesList = Object.keys(needEnter);
    // нет нужды в обновлении
    if (variablesList.length === 0) {
        // console.log("Все ключи уже введены, сохранены в файле " + filePath);
        return Promise.resolve([env]);
    }
    var stdin = new stdin_1.default();
    var p = Promise.resolve();
    variablesList.forEach(function (key) {
        var item = needEnter[key];
        p = p.then(function (_) { return enterItem(key, item, stdin, env.data, options); });
    });
    var res = p.then(function () {
        stdin.rl.close();
        if (!options.dontOverwriteFiles) {
            //const serialized = JSON.stringify(fileData, null, '\t');
            var serialized = Object.keys(env.data).map(function (varName) {
                return varName + '=' + env.data[varName];
            }).join('\n');
            fs_1.default.writeFileSync(env.filePath, serialized, 'utf8');
        }
        return [env];
    });
    return res;
}
exports.default = checkCredentials;
function enterItem(key, item, stdin, fileData, options) {
    return new Promise(function (resolve, reject) {
        if (options.emulateInput) {
            if (typeof options.emulateInput === 'function') {
                fileData[key] = options.emulateInput(key);
                return resolve();
            }
            else if (typeof options.emulateInput === 'string') {
                fileData[key] = options.emulateInput;
                return resolve();
            }
        }
        console.log('Ключ ' + key);
        if (item.default) {
            console.log("-- \u0417\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u043F\u043E-\u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E == \"" + item.default + "\"");
        }
        if (item.desc) {
            console.log('-- Описание: ' + item.desc);
        }
        stdin.muted = !!item.secure;
        console.log('-- Введите значение> ');
        stdin.stdinHandler = function (line) {
            if (line === '' && item.default) {
                line = item.default;
            }
            fileData[key] = line;
            console.log(key + "=" + (item.secure ? '<secure>' : line));
            console.log('');
            resolve();
        };
    });
}
function checkConfigProps(obj, schema, whereItIs) {
    for (var prop in schema) {
        var isValid = false;
        for (var _i = 0, _a = schema[prop]; _i < _a.length; _i++) {
            var type = _a[_i];
            if (typeof obj[prop] === type) {
                isValid = true;
                break;
            }
        }
        if (!isValid) {
            throw "Error: Field " + prop + " (in " + whereItIs + ") should be " + schema[prop].join(', or ');
        }
    }
}
