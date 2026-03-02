import * as fs from "node:fs";
import * as path from "node:path";
import {
	OUT_DIR,
	VIDEO_PACKAGE_DIR,
	VIDEO_PUBLIC_DIR,
} from "@markdown-to-zundamon/core/paths";
import { parseProjectName } from "./lib/args";

const projectName = parseProjectName("render");

const manifestPath = path.join(
	VIDEO_PUBLIC_DIR,
	`projects/${projectName}/manifest.json`,
);
if (!(await Bun.file(manifestPath).exists())) {
	console.error(`Error: manifest not found at ${manifestPath}`);
	console.error(`Run first: bun run preprocess -- <your-markdown-file.md>`);
	process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const outFile = path.join(OUT_DIR, `${projectName}.mp4`);
const props = JSON.stringify({ projectName });

console.log(`Rendering "${projectName}" → ${outFile}`);

const result = Bun.spawnSync(
	["bunx", "remotion", "render", "ZundamonVideo", "--props", props, outFile],
	{
		stdout: "inherit",
		stderr: "inherit",
		cwd: VIDEO_PACKAGE_DIR,
	},
);

process.exit(result.exitCode);
