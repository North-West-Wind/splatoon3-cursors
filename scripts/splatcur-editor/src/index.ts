#!/usr/bin/env node
import { SVG, SVGTypeMapping, registerWindow } from '@svgdotjs/svg.js'
import * as fs from "fs";
import * as path from "path";
import { Resvg } from "@resvg/resvg-js";
import { decode, execute, twoDigits } from './helper';
import { simpleGit } from 'simple-git';
import tinycolor, { Instance } from 'tinycolor2';
import { Canvas, Image } from 'canvas';
import sizeOf from "image-size";
import commandExists from "command-exists";
import log from "loglevel";
import { Option, program } from 'commander';
import AdmZip from "adm-zip";
import { Presets, SingleBar } from "cli-progress";
const { Encoder } = require("xcursor");

// Config
const SIZES = [128, 64, 48, 32, 24];
const { createSVGWindow } = require('svgdom');
const window = createSVGWindow();
registerWindow(window, window.document);

const MODES = [
	"all",
	"group",
	"individual"
];

// Get command line options
program.name("splatcur-editor").description("A script to generate NorthWestWind's Splatoon cursor pack with different colors.");
program
	.addOption(new Option("-m, --mode <mode>", "specifies a color replacement mode").choices(MODES).default(MODES[0]))
	.option("-i, --individual-fallback", "fallback to individual color if cursor is not in group")
	.option("-l, --light-stroke", "make strokes lighter instead of darker")
	.option("-d, --no-download", "skip the process of downloading files")
	.option("-e, --no-export", "skip the process of exporting images")
	.option("-c, --no-convert", "skip the process of converting images to usable cursor files")
	.option("-w, --no-windows", "skip the process of converting Xcursors to Windows cursors")
	.option("-p, --no-package", "skip the process of packing cursors into ZIP files")
	.option("-r, --no-remove", "skip the process of removing the 'tmp' directory after running")
	.option("-v, --verbose", "output debug info as well");
const options = program.parse().opts();

// Check if config exists
var config: any;
var copyConfig = false;
if (!fs.existsSync("s3cconfig.json")) {
	if (!options.download) {
		console.log("s3cconfig.json is not found with no-download option enabled. Nothing can be done. Bye.");
		process.exit(1);
	}
	copyConfig = true;
} else config = JSON.parse(fs.readFileSync("s3cconfig.json", { encoding: "utf8" }));

// Set logging level according to verbose
if (options.verbose) log.setDefaultLevel("debug");
else log.setDefaultLevel("info");

// Read mode from options
const mode = options.mode;

// Create tmp directory if it doesn't exist
if (!fs.existsSync("tmp")) fs.mkdirSync("tmp");
else if (options.download) {
	// Clean up tmp
	for (const file of fs.readdirSync("tmp"))
		fs.rmSync(path.join("tmp", file), { recursive: true });
}

const STACK: { [key: string]: (() => void) } = {
	download: clone,
	export: exportFiles,
	convert,
	windows: x2win,
	package: pack,
	remove: clean
};

const finalStack: (() => void)[] = [];

for (const option in STACK)
	if (options[option])
		finalStack.push(STACK[option]);

if (!finalStack.length) {
	log.info("There's nothing to do. Bye.");
	process.exit(0);
}

next();

function next() {
	const func = finalStack.shift();
	if (!func) process.exit(0);
	func();
}

function clone() {
	log.info("Cloning repository...");
	// git clone the repo
	const git = simpleGit("tmp").outputHandler((_command, stdout) => stdout.pipe(process.stdout));
	git.clone("https://github.com/North-West-Wind/splatoon3-cursors", undefined, () => {
		// Move cursor files and images to tmp
		fs.renameSync("tmp/splatoon3-cursors/index.theme", "tmp/index.theme");
		fs.renameSync("tmp/splatoon3-cursors/cursor_files", "tmp/cursor_files");
		fs.renameSync("tmp/splatoon3-cursors/images", "tmp/images");
		fs.renameSync("tmp/splatoon3-cursors/html/BlitzBold.otf", "tmp/BlitzBold.otf");
		fs.renameSync("tmp/splatoon3-cursors/scripts/loading_animator/loading.png", "tmp/loading.png");
		// If there's no config, also take it from repo
		if (copyConfig) {
			fs.renameSync("tmp/splatoon3-cursors/scripts/splatcur-editor/s3cconfig.json", "s3cconfig.json");
			config = JSON.parse(fs.readFileSync("s3cconfig.json", { encoding: "utf8" }));
			log.info("Only git clone is run this time in order to pull in s3cconfig.json. Next run will generate everything.");
		}
		// Removed the clone
		fs.rmSync("tmp/splatoon3-cursors", { recursive: true });
		if (copyConfig) process.exit(0);

		next();
	});
}

function exportFiles() {
	log.info("Exporting image files to various sizes...");
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
	const files = fs.readdirSync("tmp/images").filter(f => f.endsWith(".svg"));
	// Setup progress bar
	const bar = new SingleBar({ clearOnComplete: false, hideCursor: true, format: " {bar} {percentage}% | ETA: {eta}s | {value}/{total}" }, Presets.shades_classic);
	bar.start(files.length, 0);

	for (const file of files) {
		// Read SVG
		log.debug("\nWorking on", file);
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
					var group: string | undefined = undefined;
					for (const gp in config.groups)
						if (config.groups[gp].includes(name)) {
							group = gp;
							break;
						}
					log.debug(name, "is in group", group);
					// If no groups found, skip recoloring
					if (!group) {
						if (!options.individualFallback || !config.individual[name]) skip = true;
						else color = tinycolor(config.individual[name]);
					} else color = groupColors[group];
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
				log.debug("Filling main with color", color!.toHexString());
				main?.css("fill", color!.toHexString());
				// Copy the color to stroke and change the stroke style
				var strokeColor = color!.clone();
				if (options.lightStroke) strokeColor.lighten(25);
				else strokeColor.darken(25);
				log.debug("Stroking main with color", strokeColor!.toHexString());
				main?.css("stroke", strokeColor.toHexString());
			
				// Check if the images uses secondary color
				if (config.sub[name]) {
					var subcolor: Instance;
					if (mode == "group") {
						// Look for subgroup color
						group = undefined;
						for (const gp in config.subgroups)
							if (config.subgroups[gp].includes(name)) {
								group = gp;
								break;
							}
						log.debug(name, "is in subgroup", group);
						if (!group) {
							if (!options.individualFallback || !config.sub[name]) skip = true;
							else subcolor = tinycolor(config.sub[name]);
						} else subcolor = subgroupColors[group];
					} else if (!config.sub[name]) skip = true;
					else subcolor = tinycolor(config.sub[name]);
					if (!skip) {
						// Find sub object
						const sub = draw.findOne("#sub");
						// Change fill and stroke style of sub object
						log.debug("Filling sub with color", subcolor!.toHexString());
						sub?.css("fill", subcolor!.toHexString());
						strokeColor = subcolor!.clone();
						if (options.b) strokeColor.brighten(25);
						else strokeColor.darken(25);
						log.debug("Stroking sub with color", strokeColor!.toHexString());
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
			log.debug("Exporting to", `${size}x${size}/${name}.png`);
			fs.writeFileSync(path.join("tmp/images", `${size}x${size}`, name + ".png"), resvg.render().asPng());
		}
		bar.increment();
	}
	bar.stop();

	// Generate all of the loading animations
	/// Copied from loading_animator
	log.info("Generating loading animation...");
	if (!fs.existsSync("tmp/frames")) fs.mkdirSync("tmp/frames");
	for (const res of SIZES)
		if (!fs.existsSync(`tmp/frames/${res}x${res}`)) fs.mkdirSync(`tmp/frames/${res}x${res}`);

	var colors: string[] = Array(3).fill(config.loading[0]).concat(Array(15).fill(config.loading[1]), Array(16).fill(config.loading[0]), Array(16).fill(config.loading[1]), Array(14).fill(config.loading[0]));
	var count = 0;
	const img = new Image();
	img.onload = () => {
		bar.start(64, 0);
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
				bar.increment();
			}
		}
		bar.stop();

		for (const size of SIZES)
			fs.renameSync(`tmp/frames/${size}x${size}`, `tmp/images/${size}x${size}/wait`);
		next();
	}
	img.src = "tmp/loading.png";
}

async function convert() {
	log.info("Starting conversion process...");
	if (fs.existsSync("tmp/cursors")) fs.rmSync("tmp/cursors", { recursive: true });
	fs.mkdirSync("tmp/cursors");
	// Setup multi bar
	const cursorFiles = fs.readdirSync("tmp/cursor_files");
	const bar = new SingleBar({ clearOnComplete: false, hideCursor: true, format: " {bar} {percentage}% | ETA: {eta}s | {value}/{total}" }, Presets.shades_classic);
	bar.start(cursorFiles.length, 0);
	for (const f of cursorFiles) {
		log.debug("Reading cursor file", f);
		const content = fs.readFileSync(path.join("tmp/cursor_files", f), { encoding: "utf8" });
		const name = f.split(".").slice(0, -1).join(".");
		const images = [];
		for (const line of content.split("\n")) {
			const [type, xhot, yhot, file, delay] = line.split(" ");
			if (!file) continue;
			log.debug("Trying to open", `tmp/images/${file}`);
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
		
		const buf = Buffer.from(new Encoder(images).pack());
		// Pretend to be a version x2wincur supports
		buf[8] = 0;
		buf[10] = 1;
		log.debug("Writing to", path.join("tmp/cursors", name));
		fs.writeFileSync(path.join("tmp/cursors", name), buf);

		bar.increment();
	}
	bar.stop();

	fs.cpSync("tmp/cursors", "tmp/cursors_nosym", { recursive: true });

	// Make links
	for (const file in config.symlinks)
		for (const link of config.symlinks[file])
			fs.cpSync(path.join("tmp/cursors", file), path.join("tmp/cursors", link));

	next();
}

async function x2win() {
	log.info("Converting Xcursors to Windows cursors...");
	log.debug("Looking for Python");
	var command = "python";
	if (!commandExists.sync(command)) {
		command = "py";
		if (!commandExists.sync(command)) {
			log.info("Python is not installed on this computer. It is required for converting Xcursors to Windows cursors.");
			log.info("Install Python here: https://www.python.org/")
			process.exit(3);
		}
	}
	log.debug("Ensuring pip can be used");
	await execute(command, ["-m", "ensurepip"], options.verbose);
	log.debug("Ensuring win2xcur is installed");
	await execute("pip", ["install", "win2xcur"], options.verbose);
	if (!fs.existsSync("tmp/wincur")) fs.mkdirSync("tmp/wincur");
	log.debug("Converting Xcursors to Windows cursors");
	await execute("x2wincur", fs.readdirSync("tmp/cursors_nosym").map(f => `tmp/cursors_nosym/${f}`).concat(["-o", "tmp/wincur"]), options.verbose);

	next();
}

function pack() {
	log.info("Putting everything into ZIP files...");
	const linuxZip = new AdmZip();
	linuxZip.addLocalFile("tmp/index.theme", ".");
	linuxZip.addLocalFolder("tmp/cursors", "cursors");
	linuxZip.writeZip("splatoon3-cursors-linux.zip");

	// Check if wincur exists
	if (fs.existsSync("tmp/wincur")) {
		log.debug("Zipping for Windows cursors");
		const winZip = new AdmZip();
		for (const file of fs.readdirSync("tmp/wincur")) {
			winZip.addLocalFile(path.join("tmp/wincur", file), ".");
			log.debug("Added", file, "to Windows ZIP");
		}
		winZip.writeZip("splatoon3-cursors-windows.zip");
	}

	next();
}

function clean() {
	if (fs.existsSync("tmp")) fs.rmSync("tmp", { recursive: true });
}