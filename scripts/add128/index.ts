import * as fs from "fs";

for (const file of fs.readdirSync("../../cursor_files")) {
	if (!file.endsWith(".cursor")) continue;
	console.log(file)
	var content = fs.readFileSync(`../../cursor_files/${file}`, { encoding: "utf8" });
	const lines = content.split("\n");
	const sixtyFour = lines.filter(s => s.startsWith("64"));
	for (const line of sixtyFour.reverse()) {
		const split = line.split(/ +/);
		for (let ii = 0; ii < 3; ii++)
			split[ii] = (parseInt(split[ii]) * 2).toString();
		split[3] = split[3].replace("64x64", "128x128");
		const newline = split.join(" ");
		lines.unshift(newline);
	}
	fs.writeFileSync(`../../cursor_files/${file}`, lines.join("\n"));
}