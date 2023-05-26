import { SVG, SVGTypeMapping, registerWindow } from '@svgdotjs/svg.js'
import * as fs from "fs";
import getopts from "getopts"
import * as path from "path";
import { Resvg } from "@resvg/resvg-js";
import { decode, execute, twoDigits } from './helper';
import { simpleGit } from 'simple-git';
import tinycolor, { Instance } from 'tinycolor2';
import { Canvas, Image } from 'canvas';
import sizeOf from "image-size";
import commandExists from "command-exists";
const { Encoder } = require("xcursor");

// Config
const SIZES = [128, 64, 48, 32, 24];
const { createSVGWindow } = require('svgdom');
const window = createSVGWindow();
registerWindow(window, window.document);

const config: any = JSON.parse(fs.readFileSync("s3cconfig.json", { encoding: "utf8" }));

// Get command line options
const options = getopts(process.argv.slice(2), {
	alias: {
		mode: ["m"],
		"light-stroke": ["l"],
		"no-download": ["d"],
		"no-export": ["e"],
		"no-convert": ["c"],
		"no-windows": ["w"]
	},
	boolean: ["d", "e", "c", "l", "w"]
});

if (options.d && options.e && options.c && options.w) {
	console.log("There's nothing to do.");
	process.exit(0);
}

// Read mode from options
const MODES = [
	"all",
	"group",
	"individual"
];
var mode = "all";
if (options.mode) {
	if (!MODES.includes(options.mode)) {
		console.log(`Invalid mode. Only accepts "all", "group" or "individual".`);
		process.exit(1);
	}
	mode = options.mode;
}

// Create tmp directory if it doesn't exist
if (!fs.existsSync("tmp")) fs.mkdirSync("tmp");
else if (!options.d) {
	// Clean up tmp
	for (const file of fs.readdirSync("tmp"))
		fs.rmSync(path.join("tmp", file), { recursive: true });
}

// git clone the repo
const git = simpleGit("tmp");
if (options.d && options.e && options.c) x2win();
else if (options.d && options.e) convert();
else if (options.d) exportFiles();
else git.clone("https://github.com/North-West-Wind/splatoon3-cursors", undefined, () => {
	// Move cursor files and images to tmp
	fs.renameSync("tmp/splatoon3-cursors/cursor_files", "tmp/cursor_files");
	fs.renameSync("tmp/splatoon3-cursors/images", "tmp/images");
	fs.renameSync("tmp/splatoon3-cursors/html/BlitzBold.otf", "tmp/BlitzBold.otf");
	fs.renameSync("tmp/splatoon3-cursors/scripts/loading_animator/loading.png", "tmp/loading.png");
	fs.rmSync("tmp/splatoon3-cursors", { recursive: true });

	if (options.e && !options.c) convert();
	else if (!options.e) exportFiles();
});

function exportFiles() {
	// Prepping directories
	for (const file of fs.readdirSync("tmp/images"))
		if (!file.endsWith(".svg")) fs.rmSync(path.join("tmp/images", file), { recursive: true });
	for (const size of SIZES) fs.mkdirSync(path.join("tmp/images", `${size}x${size}`));
	// Start processing
	var color: Instance;
	// Ask for all colors
	if (mode == "all") color = tinycolor(config.all);
	// Ask for group colors
	var groupColors: { [key: string]: Instance } = {};
	var subgroupColors: { [key: string]: Instance } = {};
	if (mode == "group") {
		for (const group in config.groups)
			groupColors[group] = tinycolor(config.group[group]);
		for (const group in config.subgroups)
			subgroupColors[group] = tinycolor(config.subgroup[group]);
	}
	var draw: SVGTypeMapping<any>;
	for (const file of fs.readdirSync("tmp/images")) {
		if (!file.endsWith(".svg")) continue;
		// Read SVG
		console.log("Working on", file);
		const name = file.split(".").slice(0, -1).join(".");
		const content = fs.readFileSync(path.join("tmp/images", file), { encoding: "utf8" });
		draw = SVG(window.document.documentElement);
		draw.svg(content, true);
		draw = SVG(window.document.documentElement);
		// Manipulate SVG
		/// Check for exclusion
		var skip = false;
		if (!config.exclude.includes(name)) {
			// Find main object
			const main = draw.findOne("#main");
			// Override color if not using all mode
			switch (mode) {
				case "group": {
					// Find group color
					var group: string | undefined;
					for (const gp in config.groups)
						if (config.groups[gp].includes(name)) {
							group = gp;
							break;
						}
					// If no groups found, skip recoloring
					if (!group) skip = true;
					else color = groupColors[group];
					break;
				}
				case "individual": {
					// Ask for color individually
					if (!config.individual[name]) skip = true;
					else color = tinycolor(config.individual[name]);
					break;
				}
			}
	
			if (!skip) {
				// Change the fill style
				main?.css("fill", color!.toHexString());
				// Copy the color to stroke and change the stroke style
				var strokeColor = color!.clone();
				if (options.l) strokeColor.lighten(25);
				else strokeColor.darken(25);
				main?.css("stroke", strokeColor.toHexString());
			
				// Check if the images uses secondary color
				if (config.sub[name]) {
					var subcolor: Instance;
					if (mode == "group") {
						// Look for subgroup color
						var group: string | undefined;
						for (const gp in config.subgroups)
							if (config.subgroups[gp].includes(name)) {
								group = gp;
								break;
							}
						if (!group) skip = true;
						else subcolor = subgroupColors[group];
					} else if (!config.sub[name]) skip = true;
					else subcolor = tinycolor(config.sub[name]);
					if (!skip) {
						// Find sub object
						const sub = draw.findOne("#sub");
						// Change fill and stroke style of sub object
						sub?.css("fill", subcolor!.toHexString());
						strokeColor = subcolor!.clone();
						if (options.b) strokeColor.brighten(25);
						else strokeColor.darken(25);
						sub?.css("stroke", strokeColor.toHexString());
					}
				}
			}
		}
	
		// Export SVG
		for (const size of SIZES) {
			// Load in SVG string
			const resvg = new Resvg(draw.svg(), {
				fitTo: { mode: "width", value: size },
				font: { fontFiles: ["tmp/BlitzBold.otf"], defaultFontFamily: "Splatoon1" }
			});
			// Render to PNG
			fs.writeFileSync(path.join("tmp/images", `${size}x${size}`, name + ".png"), resvg.render().asPng());
		}
	}

	// Generate all of the loading animations
	/// Copied from loading_animator
	if (!fs.existsSync("tmp/frames")) fs.mkdirSync("tmp/frames");
	for (const res of SIZES)
		if (!fs.existsSync(`tmp/frames/${res}x${res}`)) fs.mkdirSync(`tmp/frames/${res}x${res}`);

	var colors: string[] = Array(3).fill(config.loading[0]).concat(Array(15).fill(config.loading[1]), Array(16).fill(config.loading[0]), Array(16).fill(config.loading[1]), Array(14).fill(config.loading[0]));
	var count = 0;
	const img = new Image();
	img.onload = () => {
		for (let ii = 0; ii < 8; ii++) {
			for (let jj = 0; jj < 8; jj++) {
				const canvas = new Canvas(128, 128, "image");
				const ctx = canvas.getContext("2d");
				ctx.drawImage(img, -jj*130 - 1, -ii*130 - 1);
				ctx.globalCompositeOperation = "source-in";
				ctx.fillStyle = tinycolor(colors[count]).toHexString();
				ctx.fillRect(0, 0, canvas.width, canvas.height);

				for (const res of SIZES) {
					const smallCanvas = new Canvas(res * 2, res * 2, "image");
					const smallCtx = smallCanvas.getContext("2d");
					smallCtx.drawImage(canvas, 0, 0, smallCanvas.width, smallCanvas.height);
					fs.writeFileSync(`tmp/frames/${res}x${res}/${twoDigits(count)}.png`, smallCanvas.toBuffer());
				}
				count++;
			}
		}

		for (const size of SIZES)
			fs.renameSync(`tmp/frames/${size}x${size}`, `tmp/images/${size}x${size}/wait`);
		if (!options.c) convert();
	}
	img.src = "tmp/loading.png";
}

async function convert() {
	console.log("Starting conversion process...");
	if (fs.existsSync("tmp/cursors")) fs.rmSync("tmp/cursors", { recursive: true });
	fs.mkdirSync("tmp/cursors");
	for (const f of fs.readdirSync("tmp/cursor_files")) {
		const content = fs.readFileSync(path.join("tmp/cursor_files", f), { encoding: "utf8" });
		const name = f.split(".").slice(0, -1).join(".");
		const images = [];
		for (const line of content.split("\n")) {
			const [type, xhot, yhot, file, delay] = line.split(" ");
			if (!file) continue;
			const dimension = sizeOf(`tmp/images/${file}`);
			const pixels = await decode(`tmp/images/${file}`);
			for (let ii = 0, n = pixels.length; ii < n; ii += 4) {
				const tmp = pixels[ii+2];
				pixels[ii+2] = pixels[ii];
				pixels[ii] = tmp;
			}
			const obj: any = {
				type: parseInt(type),
				width: dimension.width,
				height: dimension.height,
				xhot: parseInt(xhot),
				yhot: parseInt(yhot),
				data: pixels
			};
			if (delay) obj.delay = parseInt(delay);
			images.push(obj);
		}
		
		fs.writeFileSync(path.join("tmp/cursors", name), Buffer.from(new Encoder(images).pack()));
	}

	fs.cpSync("tmp/cursors", "tmp/cursors_nosym", { recursive: true });

	// Make links
	for (const file in config.symlinks)
		for (const link of config.symlinks[file])
			fs.symlinkSync(path.join("tmp/cursors", file), path.join("tmp/cursors", link));

	if (!options.w) x2win();
}

async function x2win() {
	var command = "python";
	if (!commandExists.sync(command)) {
		command = "py";
		if (!commandExists.sync(command)) {
			console.log("Python is not installed on this computer. It is required for converting Xcursors to Windows cursors.");
			process.exit(3);
		}
	}
	await execute(`${command} -m ensurepip`);
	await execute("pip install win2xcur");
	if (!fs.existsSync("tmp/wincur")) fs.mkdirSync("tmp/wincur");
	await execute(`x2wincur tmp/cursors_nosym/* -o tmp/wincur/`);
}