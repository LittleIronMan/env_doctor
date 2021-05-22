#!/usr/bin/env node
import checkEnv from "./envHelper";
import { parseArgs, resolveEnvConfigPath, defaultFileReader, defaultEnvFileName } from "./utils";

if (require.main === module) {
    const parsed = parseArgs();
    checkEnv(parsed.mainModule, parsed.options);
}

export default checkEnv;
export { resolveEnvConfigPath, defaultFileReader, defaultEnvFileName };