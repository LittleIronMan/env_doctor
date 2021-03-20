import checkCredentials from "./envHelper";

if (require.main === module) {
    const pathArgs = process.argv.slice(2);

    if (pathArgs.length < 1) {
        console.warn(
            "Please enter path as arguments"
        );
        process.exit(1);
    }

    // console.log("Cleaning working tree...");

    const envConfigPath = pathArgs[0];
    //checkCredentials(envConfigPath);
}

export default checkCredentials;