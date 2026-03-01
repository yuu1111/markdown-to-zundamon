import { spawnSync } from "node:child_process";
import * as path from "node:path";

const rawArg = process.argv[2];
if (!rawArg) {
	console.error("Usage: bun run studio -- <project-name>");
	console.error("Example: bun run studio -- example");
	process.exit(1);
}
const projectName = path.basename(rawArg, path.extname(rawArg));
const props = JSON.stringify({ projectName });

console.log(`Starting studio for project: "${projectName}"`);

const result = spawnSync("bunx", ["remotion", "studio", "--props", props], {
	stdio: "inherit",
	cwd: path.resolve(__dirname, ".."),
});

process.exit(result.status ?? 1);
