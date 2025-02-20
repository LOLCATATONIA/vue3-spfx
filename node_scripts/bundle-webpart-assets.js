/*
    Build and ship webpart
    @date 2022-03-15
    This script looks for a built collection of files to reference within the webpart, which will render it.
    See the webpart/src/webparts/Vue3ViteWebPart.ts file for further comments.
*/
const fs = require("fs");

const PACKAGE_SOLUTION = "webpart/config/package-solution.json",
    WEBPART_BASE = "webpart/src/webparts",
    ASSETS_BASE = "webpart/src/webparts/assets/appcode",
    WEBPART_SUFFIX = "WebPart.ts",
    INDEX_JS = 'import { renderVue } from "../assets/appcode/index',
    INDEX_CSS = 'import "../assets/appcode/index',
    VENDOR_JS = 'import "../assets/appcode/vendor',
    SUFFIX = "\";\n",
    RENDER_PREFIX = "export function renderVue(appID) {\n",
    RENDER_SUFFIX = "}\n";

const logStatus = (message) => {
        if (message) console.log("\n" + message);
    },
    logError = (errorData) => {
        console.error("\nERROR:\n");
        console.error(errorData);
    },
    getPackageVersion = (basePath) => {
        try {
            let package = JSON.parse(fs.readFileSync(basePath + "package.json", "utf-8"));
            return package.version;
        } catch (e) {
            logError(e);
            return ""
        }
    },
    updatePackageSolutionVersion = (basePath, newVersion) => {
        try {
            let packageSolution = JSON.parse(fs.readFileSync(basePath + PACKAGE_SOLUTION, "utf-8"));
            packageSolution.solution.version = newVersion;
            fs.writeFileSync(basePath + PACKAGE_SOLUTION, JSON.stringify(packageSolution, null, "\t"));
            logStatus("package-solution.json version updated to " + newVersion);
        } catch (e) {
            logError(e);
        }
    },
    getWebpartName = (basePath) => {
        let folders = [],
            webpartName = "";
        try {
            fs.readdirSync(basePath + WEBPART_BASE).forEach((file) => {
                let itemPath = basePath + WEBPART_BASE + `/` + file;
                let isDir = fs.statSync(itemPath).isDirectory();
                if (isDir && file != "assets") webpartName = file;
            });
        } catch (e) {
            logError(e);
        }
        return webpartName;
    },
    getAssetFiles = (basePath) => {
        let assetFiles = [];
        try {
            fs.readdirSync(basePath + ASSETS_BASE).forEach((file) => {
                let itemPath = basePath + ASSETS_BASE + `/` + file;
                let isDir = fs.statSync(itemPath).isDirectory();
                if (!isDir) assetFiles.push(file);
            });
        } catch (e) {
            logError(e);
        }
        return assetFiles;
    },
    replaceLine = (textContents, linePrefix, newText, eolText) => {
        if (textContents && linePrefix && newText) {
            let p = textContents.indexOf(linePrefix),
                eol = textContents.indexOf("\n", p);
            if (p >= 0 && eol > p) {
                return textContents.substring(0, p) + linePrefix + newText + eolText + textContents.substring(eol + 1);
            } else return textContents;
        } else return textContents;
    },
    updateRefsInWebpart = (basePath, webpartName, assetFiles) => {
        if (basePath && webpartName && assetFiles) {
            try {
                let webpartFilePath = basePath + WEBPART_BASE + '/' + webpartName + '/' + webpartName + WEBPART_SUFFIX,
                    script = fs.readFileSync(webpartFilePath, "utf-8"),
                    indexJsAsset = assetFiles.find((file) => file.match(/index\.[\w\d]+.js/ig) != null),
                    indexCssAsset = assetFiles.find((file) => file.match(/index\.[\w\d]+.css/ig) != null),
                    vendorJsAsset = assetFiles.find((file) => file.match(/vendor\.[\w\d]+.js/ig) != null);
                if (script && indexJsAsset && indexCssAsset && vendorJsAsset) {
                    script = replaceLine(script, INDEX_JS, indexJsAsset.replace("index", ""), SUFFIX);
                    script = replaceLine(script, INDEX_CSS, indexCssAsset.replace("index", ""), SUFFIX);
                    script = replaceLine(script, VENDOR_JS, vendorJsAsset.replace("vendor", ""), SUFFIX);
                }
                fs.writeFileSync(webpartFilePath, script);
                logStatus("Webpart script references new assets.");
            } catch (e) {
                logError(e);
            }
        }
    },
    addRenderFn = (assetsBase, assetFiles, prefix, suffix) => {
        if (assetsBase) {
            try {
                let indexJsAsset = assetFiles.find((file) => file.match(/index\.[\w\d]+.js/ig) != null);
                if (indexJsAsset) {
                    let script = fs.readFileSync(assetsBase + indexJsAsset, "utf-8"),
                        varCodePos = script.lastIndexOf("var ");
                    if (varCodePos > 0) {
                        let renderFn = script.substring(varCodePos);
                        script = script.substring(0, varCodePos) + "\n\n";
                        renderFn = renderFn.replace(/\"\#[\w\d\-]+\"/, "appID");
                        script = script + prefix + renderFn + suffix;
                        fs.writeFileSync(assetsBase + indexJsAsset, script);
                        logStatus("App script updated with render function.");
                    }
                } else logError("Can't find index.js asset.");
            } catch (e) {
                logError(e);
            }
        }
    },
    run = () => {
        let basePath = process.cwd() + "\\",
            version = getPackageVersion(basePath);
        if (version) {
            let webpartName = getWebpartName(basePath);
            logStatus("Build and ship webpart: " + webpartName);
            updatePackageSolutionVersion(basePath, version+".0");
            let assetFiles = getAssetFiles(basePath);
            logStatus("Bundle assets: " + assetFiles.join(", "));
            updateRefsInWebpart(basePath, webpartName, assetFiles);
            addRenderFn(ASSETS_BASE + "/", assetFiles, RENDER_PREFIX, RENDER_SUFFIX);
            console.log("\n\n");
        }
    }

run();