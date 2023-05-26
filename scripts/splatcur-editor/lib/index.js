#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const svg_js_1 = require("@svgdotjs/svg.js");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const resvg_js_1 = require("@resvg/resvg-js");
const helper_1 = require("./helper");
const simple_git_1 = require("simple-git");
const tinycolor2_1 = __importDefault(require("tinycolor2"));
const canvas_1 = require("canvas");
const image_size_1 = __importDefault(require("image-size"));
const command_exists_1 = __importDefault(require("command-exists"));
const loglevel_1 = __importDefault(require("loglevel"));
const commander_1 = require("commander");
const { Encoder } = require("xcursor");
// Config
const SIZES = [128, 64, 48, 32, 24];
const { createSVGWindow } = require('svgdom');
const window = createSVGWindow();
(0, svg_js_1.registerWindow)(window, window.document);
const MODES = [
    "all",
    "group",
    "individual"
];
// Get command line options
commander_1.program.name("splatcur-editor").description("A script to generate NorthWestWind's Splatoon cursor pack with different colors.");
commander_1.program
    .addOption(new commander_1.Option("-m, --mode <mode>", "specifies a color replacement mode").choices(MODES).default(MODES[0]))
    .option("-i, --individual-fallback", "fallback to individual color if cursor is not in group")
    .option("-l, --light-stroke", "make strokes lighter instead of darker")
    .option("-d, --no-download", "skip the process of downloading files")
    .option("-e, --no-export", "skip the process of exporting images")
    .option("-c, --no-convert", "skip the process of converting images to usable cursor files")
    .option("-w, --no-windows", "skip the process of converting Xcursors to Windows cursors")
    .option("-v, --verbose", "output debug info as well");
const options = commander_1.program.parse().opts();
// Check if config exists
var config;
var copyConfig = false;
if (!fs.existsSync("s3cconfig.json")) {
    if (!options.download) {
        console.log("s3cconfig.json is not found with no-download option enabled. Nothing can be done. Bye.");
        process.exit(1);
    }
    copyConfig = true;
}
else
    config = JSON.parse(fs.readFileSync("s3cconfig.json", { encoding: "utf8" }));
// Set logging level according to verbose
if (options.verbose)
    loglevel_1.default.setDefaultLevel("debug");
else
    loglevel_1.default.setDefaultLevel("info");
if (!options.download && !options.export && !options.convert && !options.windows) {
    loglevel_1.default.info("There's nothing to do.");
    process.exit(0);
}
// Read mode from options
const mode = options.mode;
// Create tmp directory if it doesn't exist
if (!fs.existsSync("tmp"))
    fs.mkdirSync("tmp");
else if (options.download) {
    // Clean up tmp
    for (const file of fs.readdirSync("tmp"))
        fs.rmSync(path.join("tmp", file), { recursive: true });
}
// git clone the repo
const git = (0, simple_git_1.simpleGit)("tmp");
if (!options.download && !options.export && !options.convert)
    x2win();
else if (!options.download && !options.export)
    convert();
else if (!options.download)
    exportFiles();
else {
    loglevel_1.default.info("Cloning repository...");
    git.clone("https://github.com/North-West-Wind/splatoon3-cursors", undefined, () => {
        // Move cursor files and images to tmp
        fs.renameSync("tmp/splatoon3-cursors/cursor_files", "tmp/cursor_files");
        fs.renameSync("tmp/splatoon3-cursors/images", "tmp/images");
        fs.renameSync("tmp/splatoon3-cursors/html/BlitzBold.otf", "tmp/BlitzBold.otf");
        fs.renameSync("tmp/splatoon3-cursors/scripts/loading_animator/loading.png", "tmp/loading.png");
        // If there's no config, also take it from repo
        if (copyConfig) {
            fs.renameSync("tmp/splatoon3-cursors/scripts/change-color/s3cconfig.json", "s3cconfig.json");
            config = JSON.parse(fs.readFileSync("s3cconfig.json", { encoding: "utf8" }));
            loglevel_1.default.info("Only git clone is run this time in order to pull in s3cconfig.json. Next run will generate everything.");
        }
        // Removed the clone
        fs.rmSync("tmp/splatoon3-cursors", { recursive: true });
        if (copyConfig)
            process.exit(0);
        if (!options.export && !options.convert && options.windows)
            x2win();
        else if (!options.export && options.convert)
            convert();
        else if (options.export)
            exportFiles();
    });
}
function exportFiles() {
    loglevel_1.default.info("Exporting image files to various sizes...");
    // Prepping directories
    for (const file of fs.readdirSync("tmp/images"))
        if (!file.endsWith(".svg"))
            fs.rmSync(path.join("tmp/images", file), { recursive: true });
    for (const size of SIZES)
        fs.mkdirSync(path.join("tmp/images", `${size}x${size}`));
    // Start processing
    var color;
    // Ask for all colors
    if (mode == "all")
        color = (0, tinycolor2_1.default)(config.all);
    // Ask for group colors
    var groupColors = {};
    var subgroupColors = {};
    if (mode == "group") {
        for (const group in config.groups)
            groupColors[group] = (0, tinycolor2_1.default)(config.group[group]);
        for (const group in config.subgroups)
            subgroupColors[group] = (0, tinycolor2_1.default)(config.subgroup[group]);
    }
    var draw;
    for (const file of fs.readdirSync("tmp/images")) {
        if (!file.endsWith(".svg"))
            continue;
        // Read SVG
        loglevel_1.default.debug("\nWorking on", file);
        const name = file.split(".").slice(0, -1).join(".");
        const content = fs.readFileSync(path.join("tmp/images", file), { encoding: "utf8" });
        draw = (0, svg_js_1.SVG)(window.document.documentElement);
        draw.svg(content, true);
        draw = (0, svg_js_1.SVG)(window.document.documentElement);
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
                    var group = undefined;
                    for (const gp in config.groups)
                        if (config.groups[gp].includes(name)) {
                            group = gp;
                            break;
                        }
                    loglevel_1.default.debug(name, "is in group", group);
                    // If no groups found, skip recoloring
                    if (!group) {
                        if (!options.individualFallback || !config.individual[name])
                            skip = true;
                        else
                            color = (0, tinycolor2_1.default)(config.individual[name]);
                    }
                    else
                        color = groupColors[group];
                    break;
                }
                case "individual": {
                    // Ask for color individually
                    if (!config.individual[name])
                        skip = true;
                    else
                        color = (0, tinycolor2_1.default)(config.individual[name]);
                    break;
                }
            }
            if (!skip) {
                // Change the fill style
                loglevel_1.default.debug("Filling main with color", color.toHexString());
                main === null || main === void 0 ? void 0 : main.css("fill", color.toHexString());
                // Copy the color to stroke and change the stroke style
                var strokeColor = color.clone();
                if (options.lightStroke)
                    strokeColor.lighten(25);
                else
                    strokeColor.darken(25);
                loglevel_1.default.debug("Stroking main with color", strokeColor.toHexString());
                main === null || main === void 0 ? void 0 : main.css("stroke", strokeColor.toHexString());
                // Check if the images uses secondary color
                if (config.sub[name]) {
                    var subcolor;
                    if (mode == "group") {
                        // Look for subgroup color
                        group = undefined;
                        for (const gp in config.subgroups)
                            if (config.subgroups[gp].includes(name)) {
                                group = gp;
                                break;
                            }
                        loglevel_1.default.debug(name, "is in subgroup", group);
                        if (!group) {
                            if (!options.individualFallback || !config.sub[name])
                                skip = true;
                            else
                                subcolor = (0, tinycolor2_1.default)(config.sub[name]);
                        }
                        else
                            subcolor = subgroupColors[group];
                    }
                    else if (!config.sub[name])
                        skip = true;
                    else
                        subcolor = (0, tinycolor2_1.default)(config.sub[name]);
                    if (!skip) {
                        // Find sub object
                        const sub = draw.findOne("#sub");
                        // Change fill and stroke style of sub object
                        loglevel_1.default.debug("Filling sub with color", subcolor.toHexString());
                        sub === null || sub === void 0 ? void 0 : sub.css("fill", subcolor.toHexString());
                        strokeColor = subcolor.clone();
                        if (options.b)
                            strokeColor.brighten(25);
                        else
                            strokeColor.darken(25);
                        loglevel_1.default.debug("Stroking sub with color", strokeColor.toHexString());
                        sub === null || sub === void 0 ? void 0 : sub.css("stroke", strokeColor.toHexString());
                    }
                }
            }
        }
        // Export SVG
        for (const size of SIZES) {
            // Load in SVG string
            const resvg = new resvg_js_1.Resvg(draw.svg(), {
                fitTo: { mode: "width", value: size },
                font: { fontFiles: ["tmp/BlitzBold.otf"], defaultFontFamily: "Splatoon1" }
            });
            // Render to PNG
            loglevel_1.default.debug("Exporting to", `${size}x${size}/${name}.png`);
            fs.writeFileSync(path.join("tmp/images", `${size}x${size}`, name + ".png"), resvg.render().asPng());
        }
    }
    // Generate all of the loading animations
    /// Copied from loading_animator
    loglevel_1.default.info("Generating loading animation...");
    if (!fs.existsSync("tmp/frames"))
        fs.mkdirSync("tmp/frames");
    for (const res of SIZES)
        if (!fs.existsSync(`tmp/frames/${res}x${res}`))
            fs.mkdirSync(`tmp/frames/${res}x${res}`);
    var colors = Array(3).fill(config.loading[0]).concat(Array(15).fill(config.loading[1]), Array(16).fill(config.loading[0]), Array(16).fill(config.loading[1]), Array(14).fill(config.loading[0]));
    var count = 0;
    const img = new canvas_1.Image();
    img.onload = () => {
        for (let ii = 0; ii < 8; ii++) {
            for (let jj = 0; jj < 8; jj++) {
                const canvas = new canvas_1.Canvas(128, 128, "image");
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, -jj * 130 - 1, -ii * 130 - 1);
                ctx.globalCompositeOperation = "source-in";
                ctx.fillStyle = (0, tinycolor2_1.default)(colors[count]).toHexString();
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                for (const res of SIZES) {
                    const smallCanvas = new canvas_1.Canvas(res * 2, res * 2, "image");
                    const smallCtx = smallCanvas.getContext("2d");
                    smallCtx.drawImage(canvas, 0, 0, smallCanvas.width, smallCanvas.height);
                    fs.writeFileSync(`tmp/frames/${res}x${res}/${(0, helper_1.twoDigits)(count)}.png`, smallCanvas.toBuffer());
                }
                loglevel_1.default.debug("Generated frame", ++count);
            }
        }
        for (const size of SIZES)
            fs.renameSync(`tmp/frames/${size}x${size}`, `tmp/images/${size}x${size}/wait`);
        if (options.convert)
            convert();
    };
    img.src = "tmp/loading.png";
}
function convert() {
    return __awaiter(this, void 0, void 0, function* () {
        loglevel_1.default.info("Starting conversion process...");
        if (fs.existsSync("tmp/cursors"))
            fs.rmSync("tmp/cursors", { recursive: true });
        fs.mkdirSync("tmp/cursors");
        for (const f of fs.readdirSync("tmp/cursor_files")) {
            loglevel_1.default.debug("Reading cursor file", f);
            const content = fs.readFileSync(path.join("tmp/cursor_files", f), { encoding: "utf8" });
            const name = f.split(".").slice(0, -1).join(".");
            const images = [];
            for (const line of content.split("\n")) {
                const [type, xhot, yhot, file, delay] = line.split(" ");
                if (!file)
                    continue;
                const dimension = (0, image_size_1.default)(`tmp/images/${file}`);
                const pixels = yield (0, helper_1.decode)(`tmp/images/${file}`);
                for (let ii = 0, n = pixels.length; ii < n; ii += 4) {
                    const tmp = pixels[ii + 2];
                    pixels[ii + 2] = pixels[ii];
                    pixels[ii] = tmp;
                }
                const obj = {
                    type: parseInt(type),
                    width: dimension.width,
                    height: dimension.height,
                    xhot: parseInt(xhot),
                    yhot: parseInt(yhot),
                    data: pixels
                };
                if (delay)
                    obj.delay = parseInt(delay);
                images.push(obj);
            }
            const buf = Buffer.from(new Encoder(images).pack());
            // Pretend to be a version x2wincur supports
            buf[8] = 0;
            buf[10] = 1;
            loglevel_1.default.debug("Writing to", path.join("tmp/cursors", name));
            fs.writeFileSync(path.join("tmp/cursors", name), buf);
        }
        fs.cpSync("tmp/cursors", "tmp/cursors_nosym", { recursive: true });
        // Make links
        for (const file in config.symlinks)
            for (const link of config.symlinks[file])
                try {
                    fs.symlinkSync(path.join("tmp/cursors", file), path.join("tmp/cursors", link));
                }
                catch (err) {
                    // If we can't use symlink, fallback to copy
                    fs.cpSync(path.join("tmp/cursors", file), path.join("tmp/cursors", link));
                }
        if (options.windows)
            x2win();
    });
}
function x2win() {
    return __awaiter(this, void 0, void 0, function* () {
        loglevel_1.default.info("Converting Xcursors to Windows cursors...");
        loglevel_1.default.debug("Looking for Python");
        var command = "python";
        if (!command_exists_1.default.sync(command)) {
            command = "py";
            if (!command_exists_1.default.sync(command)) {
                loglevel_1.default.info("Python is not installed on this computer. It is required for converting Xcursors to Windows cursors.");
                loglevel_1.default.info("Install Python here: https://www.python.org/");
                process.exit(3);
            }
        }
        loglevel_1.default.debug("Ensuring pip can be used");
        yield (0, helper_1.execute)(command, ["-m", "ensurepip"], options.verbose);
        loglevel_1.default.debug("Ensuring win2xcur is installed");
        yield (0, helper_1.execute)("pip", ["install", "win2xcur"], options.verbose);
        if (!fs.existsSync("tmp/wincur"))
            fs.mkdirSync("tmp/wincur");
        loglevel_1.default.debug("Converting Xcursors to Windows cursors");
        yield (0, helper_1.execute)("x2wincur", fs.readdirSync("tmp/cursors_nosym").map(f => `tmp/cursors_nosym/${f}`).concat(["-o", "tmp/wincur"]), options.verbose);
    });
}
//# sourceMappingURL=index.js.map