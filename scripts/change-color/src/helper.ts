import { exec } from "child_process";

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

// Promisified exec
export function execute(command: string) {
	return new Promise(res => {
		exec(command, res);
	});
}