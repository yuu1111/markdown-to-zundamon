import * as fs from "node:fs";
import * as path from "node:path";

const rawArg = process.argv[2];
if (!rawArg) {
	console.error("Usage: bun run render -- <project-name>");
	console.error("Example: bun run render -- example");
	process.exit(1);
}
const projectName = path.basename(rawArg, path.extname(rawArg));

const manifestPath = path.resolve(
	import.meta.dir,
	`../public/projects/${projectName}/manifest.json`,
);
if (!(await Bun.file(manifestPath).exists())) {
	console.error(`Error: manifest not found at ${manifestPath}`);
	console.error(`Run first: bun run preprocess -- <your-markdown-file.md>`);
	process.exit(1);
}

const outDir = path.resolve(import.meta.dir, "../out");
fs.mkdirSync(outDir, { recursive: true });

const outFile = `out/${projectName}.mp4`;
const props = JSON.stringify({ projectName });

console.log(`Rendering "${projectName}" → ${outFile}`);

const result = Bun.spawnSync(
	["bunx", "remotion", "render", "ZundamonVideo", "--props", props, outFile],
	{
		stdout: "inherit",
		stderr: "inherit",
		cwd: path.resolve(import.meta.dir, ".."),
	},
);

process.exit(result.exitCode);
