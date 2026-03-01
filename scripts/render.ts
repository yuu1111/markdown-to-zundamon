import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

const projectName = process.argv[2];
if (!projectName) {
	console.error("Usage: npm run render -- <project-name>");
	console.error("Example: npm run render -- example");
	process.exit(1);
}

const manifestPath = path.resolve(
	__dirname,
	`../public/projects/${projectName}/manifest.json`,
);
if (!fs.existsSync(manifestPath)) {
	console.error(`Error: manifest not found at ${manifestPath}`);
	console.error(`Run first: npm run preprocess -- <your-markdown-file.md>`);
	process.exit(1);
}

const outDir = path.resolve(__dirname, "../out");
fs.mkdirSync(outDir, { recursive: true });

const outFile = `out/${projectName}.mp4`;
const props = JSON.stringify({ projectName });

console.log(`Rendering "${projectName}" → ${outFile}`);

const result = spawnSync(
	"npx",
	["remotion", "render", "ZundamonVideo", "--props", props, outFile],
	{
		stdio: "inherit",
		cwd: path.resolve(__dirname, ".."),
	},
);

process.exit(result.status ?? 1);
