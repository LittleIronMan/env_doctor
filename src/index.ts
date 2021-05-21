#!/usr/bin/env node
import checkEnv from "./envHelper";
import { parseArgs, defaultFileReader, resolveEnvConfigPath } from "./utils";

if (require.main === module) {
    const parsed = parseArgs();
    checkEnv(parsed.mainModule, parsed.options);
}

export default checkEnv;
export { defaultFileReader, resolveEnvConfigPath };