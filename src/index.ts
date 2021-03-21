import checkEnv from "./envHelper";

if (require.main === module) {
    const argv = process.argv.slice(2);

    if (argv.length < 1) {
        console.warn(
            "Please enter path as arguments"
        );
        process.exit(1);
    }

    // console.log("Cleaning working tree...");

    const envConfigPath = argv[0];
    //checkEnv(envConfigPath);
}

export default checkEnv;