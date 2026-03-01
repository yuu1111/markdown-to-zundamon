import { spawnSync } from "node:child_process";
import * as path from "node:path";

const projectName = process.argv[2];
if (!projectName) {
	console.error("Usage: npm run studio -- <project-name>");
	console.error("Example: npm run studio -- example");
	process.exit(1);
}
const props = JSON.stringify({ projectName });

console.log(`Starting studio for project: "${projectName}"`);

const result = spawnSync("npx", ["remotion", "studio", "--props", props], {
	stdio: "inherit",
	cwd: path.resolve(__dirname, ".."),
});

process.exit(result.status ?? 1);
