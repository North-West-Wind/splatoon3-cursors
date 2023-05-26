import * as fs from "fs";

const GROUPS: { [key: string]: string[] } = {
	ptr: ["alias", "center_ptr", "context-menu", "copy", "help", "left_ptr", "no-drop", "right_ptr"],
	hand: ["dnd-move", "dnd-no-drop", "openhand", "pointer"],
	resize: ["all-scroll", "col-resize", "row-resize", "size_bdiag", "size_fdiag", "size_hor", "size_ver"],
	arrow: ["bottom_left_corner", "bottom_right_corner", "bottom_side", "down-arrow", "left_side", "left-arrow", "right_side", "right-arrow", "top_left_corner", "top_right_corner", "top_side", "up-arrow"],
	zoom: ["zoom-in", "zoom-out"]
};

for (let ii = 1; ii < 16; ii++) {
	if (ii == 2 || ii == 4) continue;
	GROUPS.ptr.push("progress_"+ii);
}

const SUB = ["alias", "copy", "help", "col-resize", "row-resize", "bottom_left_corner", "bottom_right_corner", "bottom_side", "left_side", "right_side", "top_left_corner", "top_right_corner", "top_side"];
const SUB_GROUPS: { [key: string]: string[] } = {
	resize: ["col-resize", "row-resize"],
	arrow: ["bottom_left_corner", "bottom_right_corner", "bottom_side", "left_side", "right_side", "top_left_corner", "top_right_corner", "top_side"]
};

const color: { [key: string]: string } = {
	"ptr": "f4eb68",
	"hand": "aef4f0",
	"resize": "f2a7a7",
	"arrow": "b3f198",
	"zoom": "efb876"
}

const subcolor: { [key: string]: string } = {
	"resize": "fd8c0d",
	"arrow": "50c719"
}

const config = JSON.parse(fs.readFileSync("s3cconfig.json", { encoding: "utf8" }));
for (const group in GROUPS) {
	for (const cur of GROUPS[group]) {
		config.individual[cur] = color[group];
	}
}
for (const group in SUB_GROUPS) {
	for (const cur of SUB_GROUPS[group]) {
		config.sub[cur] = subcolor[group];
	}
}

fs.writeFileSync("s3cconfig.json", JSON.stringify(config, null, 2));

const names = fs.readdirSync("tmp/images").filter(f => f.endsWith(".svg")).map(f => f.split(".").slice(0, -1).join("."));
for (const cur in config.individual) {
	if (names.indexOf(cur) >= 0) names.splice(names.indexOf(cur), 1);
}
console.log(names);
for (const cur in config.sub) {
	if (SUB.indexOf(cur) >= 0) SUB.splice(SUB.indexOf(cur), 1);
}
console.log(SUB);