import * as path from "node:path";

/**
 * @description CLI引数からプロジェクト名を取得する
 * @param command - コマンド名(Usage表示用)
 * @returns プロジェクト名(拡張子なし)
 */
export function parseProjectName(command: string): string {
	const rawArg = process.argv[2];
	if (!rawArg) {
		console.error(`Usage: bun run ${command} -- <project-name>`);
		console.error(`Example: bun run ${command} -- example`);
		process.exit(1);
	}
	return path.basename(rawArg, path.extname(rawArg));
}
