import { spawn } from "child_process";

const PNG = require("png-js");

// Make numbers 2 digits
export function twoDigits(num: number | string) {
	if (typeof num === "string") {
		const str = <string> num;
		if (str.length <= 1) return Array(2 - str.length).fill("0").join("") + str;
		else return str;
	} else {
		if (num < 10) return `0${num}`;
		else return num.toString();
	}
}

// Promisified decode PNG
export function decode(path: string) {
	return new Promise<number[]>(res => PNG.decode(path, res));
}

// Promisified spawn
export function execute(command: string, args: string[], verbose = false) {
	return new Promise<void>((res, rej) => {
		const proc = spawn(command, args);
		
		if (verbose) {
			proc.stdout.on('data', (data) => {
				process.stdout.write(`stdout: ${data}`);
			});
	
			proc.stderr.on('data', (data) => {
				process.stderr.write(`stderr: ${data}`);
			});
		}

		proc.on("close", signal => {
			if (!signal) res();
			else rej(signal);
		});
	});
}