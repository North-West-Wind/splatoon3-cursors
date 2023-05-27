import * as fs from "fs";
const PNG = require("png-js");
const { Encoder } = require("xcursor");

function decode(path: string) {
	return new Promise<number[]>(res => PNG.decode(path, res));
}

(async () => {
	const content = fs.readFileSync("tmp/cursor_files/alias.cursor", { encoding: "utf8" });
	const images: any[] = [];
	for (const line of content.split("\n")) {
		const [type, xhot, yhot, file, delay] = line.split(" ");
		const pixels = await decode(`tmp/images/${file}`);
		if (type == "128")
		for (let ii = 0, n = pixels.length; ii < n; ii += 4) {
			const tmp = pixels[ii+2];
			pixels[ii+2] = pixels[ii];
			pixels[ii] = tmp;
		}
		const obj: any = {
			type: parseInt(type),
			xhot: parseInt(xhot),
			yhot: parseInt(yhot),
			data: pixels
		};
		if (delay) obj.delay = parseInt(delay);
		images.push(obj);
	}
	
	if (!fs.existsSync("tmp/cursors")) fs.mkdirSync("tmp/cursors");
	fs.writeFileSync("tmp/cursors/alias", Buffer.from(new Encoder(images).pack()));
})();