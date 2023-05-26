// Fix stuff when attempting to build with pkg
import * as fs from "fs";
import * as path from "path";

// Fix es-get-iterator package.json
const filename = path.join(__dirname, "../../node_modules/es-get-iterator/package.json");
const json = JSON.parse(fs.readFileSync(filename, { encoding: "utf8" }));
delete json.exports;
json.main = "node.js";
fs.writeFileSync(filename, JSON.stringify(json, null, 2));