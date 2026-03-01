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

const result = Bun.spawnSync(["bunx", "remotion", "studio", "--props", props], {
	stdout: "inherit",
	stderr: "inherit",
	cwd: path.resolve(import.meta.dir, ".."),
});

process.exit(result.exitCode);
