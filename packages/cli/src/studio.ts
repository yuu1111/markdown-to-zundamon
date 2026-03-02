import { VIDEO_PACKAGE_DIR } from "@markdown-to-zundamon/core/paths";
import { parseProjectName } from "./lib/args";

const projectName = parseProjectName("studio");
const props = JSON.stringify({ projectName });

console.log(`Starting studio for project: "${projectName}"`);

const result = Bun.spawnSync(["bunx", "remotion", "studio", "--props", props], {
	stdout: "inherit",
	stderr: "inherit",
	cwd: VIDEO_PACKAGE_DIR,
});

process.exit(result.exitCode);
