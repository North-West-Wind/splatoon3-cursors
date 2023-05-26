import * as fs from "fs";
const { Decoder } = require("xcursor");

const decoder = new Decoder(fs.readFileSync("../../cursors/alias"));
const pixels = decoder.getData(decoder.getByType(128)[0]);
for (let ii = 0, n = pixels.length; ii < n; ii += 4) {
	console.log(pixels[ii], pixels[ii+1], pixels[ii+2], pixels[ii+3]);
	if (pixels[ii+3] != 0) {
		break;
	}
}