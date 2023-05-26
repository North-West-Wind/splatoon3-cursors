"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.execute = exports.decode = exports.twoDigits = void 0;
const child_process_1 = require("child_process");
const PNG = require("png-js");
// Make numbers 2 digits
function twoDigits(num) {
    if (typeof num === "string") {
        const str = num;
        if (str.length <= 1)
            return Array(2 - str.length).fill("0").join("") + str;
        else
            return str;
    }
    else {
        if (num < 10)
            return `0${num}`;
        else
            return num.toString();
    }
}
exports.twoDigits = twoDigits;
// Promisified decode PNG
function decode(path) {
    return new Promise(res => PNG.decode(path, res));
}
exports.decode = decode;
// Promisified spawn
function execute(command, args, verbose = false) {
    return new Promise((res, rej) => {
        const proc = (0, child_process_1.spawn)(command, args);
        if (verbose) {
            proc.stdout.on('data', (data) => {
                process.stdout.write(`stdout: ${data}`);
            });
            proc.stderr.on('data', (data) => {
                process.stderr.write(`stderr: ${data}`);
            });
        }
        proc.on("close", signal => {
            if (!signal)
                res();
            else
                rej(signal);
        });
    });
}
exports.execute = execute;
//# sourceMappingURL=helper.js.map