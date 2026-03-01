import * as path from "node:path";

/**
 * @description ワークスペースのルートディレクトリ
 */
export const WORKSPACE_ROOT = path.resolve(import.meta.dir, "../../..");

/**
 * @description video パッケージの public ディレクトリ
 */
export const VIDEO_PUBLIC_DIR = path.join(
	WORKSPACE_ROOT,
	"packages/video/public",
);

/**
 * @description LLM 生成台本の出力先ディレクトリ
 */
export const PROJECTS_DIR = path.join(WORKSPACE_ROOT, "projects");

/**
 * @description キャラクター画像のソースディレクトリ
 */
export const CHARACTERS_DIR = path.join(WORKSPACE_ROOT, "characters");

/**
 * @description レンダリング出力ディレクトリ
 */
export const OUT_DIR = path.join(WORKSPACE_ROOT, "out");

/**
 * @description video パッケージのルートディレクトリ
 */
export const VIDEO_PACKAGE_DIR = path.join(WORKSPACE_ROOT, "packages/video");
