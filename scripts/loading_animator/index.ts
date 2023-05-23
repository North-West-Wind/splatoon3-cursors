import { Canvas, Image } from "canvas";
import * as fs from "fs";

const resolutions = [128, 64, 48, 32, 24];
if (!fs.existsSync("frames")) fs.mkdirSync("frames");
if (!fs.existsSync("frames/original")) fs.mkdirSync("frames/original");
for (const res of resolutions)
	if (!fs.existsSync(`frames/${res}x${res}`))
		fs.mkdirSync(`frames/${res}x${res}`);

//var colors: number[] = Array(10).fill(0xffbe00).concat(gradient(0xffbe00, 0x3a0ccd, 4), Array(12).fill(0x3a0ccd), gradient(0x3a0ccd, 0xffbe00, 4), Array(12).fill(0xffbe00), gradient(0xffbe00, 0x3a0ccd, 4), Array(12).fill(0x3a0ccd), gradient(0x3a0ccd, 0xffbe00, 4), Array(2).fill(0xffbe00));
var colors: number[] = Array(3).fill(0x5330d2).concat(Array(15).fill(0xc4ec2f), Array(16).fill(0x5330d2), Array(16).fill(0xc4ec2f), Array(14).fill(0x5330d2));
var count = 0;
const img = new Image();
img.onload = () => {
	for (let ii = 0; ii < 8; ii++) {
		for (let jj = 0; jj < 8; jj++) {
			const canvas = new Canvas(128, 128, "image");
			const ctx = canvas.getContext("2d");
			//ctx.imageSmoothingEnabled = false;
			ctx.drawImage(img, -jj*130 - 1, -ii*130 - 1);
			ctx.globalCompositeOperation = "source-in";
			ctx.fillStyle = numToColor(colors[count]);
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			fs.writeFileSync(`frames/original/${twoDigits(count)}.png`, canvas.toBuffer());

			for (const res of resolutions) {
				const smallCanvas = new Canvas(res * 2, res * 2, "image");
				const smallCtx = smallCanvas.getContext("2d");
				//smallCtx.imageSmoothingEnabled = false;
				smallCtx.drawImage(canvas, 0, 0, smallCanvas.width, smallCanvas.height);
				fs.writeFileSync(`frames/${res}x${res}/${twoDigits(count)}.png`, smallCanvas.toBuffer());
			}
			console.log(`Progress: ${++count}/64`);
		}
	}
}
img.src = "loading.png";

function twoDigits(num: number) {
	if (num < 10) return "0" + num.toString();
	return num.toString();
}

function numToColor(num: number, hasAlpha = false) {
	var str = num.toString(16);
	if (!hasAlpha && str.length < 6)
		for (let ii = 0; ii < 6 - str.length; ii++)
			str = "0" + str;
	else if (hasAlpha && str.length < 8)
		for (let ii = 0; ii < 8 - str.length; ii++)
			str = "0" + str;
	return "#" + str;
}

function gradient(start: number, end: number, steps: number) {
	steps += 2;

	const canvas = new Canvas(steps, 1);
	const ctx = canvas.getContext("2d");
	const gradient = ctx.createLinearGradient(0, 0, steps, 0);
	gradient.addColorStop(0, numToColor(start));
	gradient.addColorStop(1, numToColor(end));
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
	const colors: number[] = [];
	for (let ii = 0, n = data.length; ii < n; ii += 4) {
    const red = data[ii];
    const green = data[ii+1];
    const blue = data[ii+2];
		colors.push((red << 16) + (green << 8) + blue);
	}
	return colors.slice(1, -1);
}