import * as fs from "node:fs";
import * as path from "node:path";
import { downloadRemoteImage } from "@markdown-to-zundamon/core/assets";
import { env } from "@markdown-to-zundamon/core/config";
import {
	PROJECTS_DIR,
	VIDEO_PUBLIC_DIR,
} from "@markdown-to-zundamon/core/paths";
import { Defuddle } from "defuddle/node";
import { generateScript } from "./lib/llm";

/**
 * @description frontmatterのデフォルトテンプレート
 */
const DEFAULT_FRONTMATTER = `---
characters:
  - name: ずんだもん
    speakerId: 3
---`;

/**
 * @description URLをバリデーションしてURLオブジェクトを返す
 */
function parseUrl(input: string): URL {
	try {
		return new URL(input);
	} catch {
		throw new Error(`無効なURLです: ${input}`);
	}
}

/**
 * @description URLパスの末尾からファイル名を導出する
 */
function deriveFilename(url: URL, articleTitle: string | null): string {
	const segments = url.pathname.split("/").filter(Boolean);
	const lastSegment = segments.at(-1);

	if (
		lastSegment &&
		lastSegment !== "index.html" &&
		!lastSegment.includes(".")
	) {
		return sanitize(lastSegment);
	}

	if (articleTitle) {
		return sanitize(articleTitle);
	}

	return sanitize(url.hostname);
}

/**
 * @description ファイル名として安全な文字列に変換する
 */
function sanitize(text: string): string {
	return text
		.toLowerCase()
		.replace(/[/\\:*?"<>|.\s　]+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 60);
}

/**
 * @description CLI引数を解析する
 */
function parseArgs(argv: string[]): {
	url: string;
	model: string;
} {
	const args = argv.slice(2);
	let url: string | undefined;
	let model: string = env.LLM_MODEL;

	for (let i = 0; i < args.length; i++) {
		const arg = args[i] ?? "";
		if ((arg === "-m" || arg === "--model") && i + 1 < args.length) {
			model = args[i + 1] ?? model;
			i++;
		} else if (!url) {
			url = arg;
		}
	}

	if (!url) {
		console.error("Usage: bun run fetch -- <url> [-m provider:model]");
		process.exit(1);
	}

	return { url, model };
}

/**
 * @description Markdown内のリモート画像URLをダウンロードしてローカルパスに書き換える
 * @param markdown - 処理対象のMarkdown文字列
 * @param imagesDir - 画像保存先ディレクトリの絶対パス
 * @param publicRelDir - publicからの相対パス(例: "projects/foo/images")
 * @returns 画像URLが書き換えられたMarkdown文字列
 */
async function downloadImages(
	markdown: string,
	imagesDir: string,
	publicRelDir: string,
): Promise<string> {
	const imagePattern = /!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g;
	const matches = [...markdown.matchAll(imagePattern)];
	if (matches.length === 0) return markdown;

	let result = markdown;

	for (const match of matches) {
		const fullMatch = match[0];
		const alt = match[1];
		const url = match[2];
		if (!url) continue;

		const destName = await downloadRemoteImage(url, imagesDir);
		if (!destName) continue;

		console.log(`  [image] ${url} → ${publicRelDir}/${destName}`);
		const localRef = `${publicRelDir}/${destName}`;
		result = result.replace(fullMatch, `![${alt}](${localRef})`);
	}

	return result;
}

/**
 * @description メイン処理
 */
async function main(): Promise<void> {
	const { url: urlArg, model } = parseArgs(process.argv);

	const url = parseUrl(urlArg);
	console.log(`Fetching: ${url.href}`);

	const res = await fetch(url.href);
	if (!res.ok) {
		throw new Error(
			`ページの取得に失敗しました: ${res.status} ${res.statusText}`,
		);
	}
	const html = await res.text();
	console.log(`  HTML: ${html.length.toLocaleString()} chars`);

	console.log("Extracting article...");
	const result = await Defuddle(html, url.href, { markdown: true });
	const title = result.title ?? "";
	const rawMarkdown = result.content;
	console.log(`  Title: ${title}`);
	console.log(`  Markdown: ${rawMarkdown.split("\n").length} lines`);

	console.log("Generating script with LLM...");
	const body = await generateScript(rawMarkdown, title, model);
	console.log(`  Output: ${body.split("\n").length} lines`);

	const filename = deriveFilename(url, title);

	console.log("Downloading images...");
	const imagesDir = path.join(VIDEO_PUBLIC_DIR, `projects/${filename}/images`);
	const publicRelDir = `projects/${filename}/images`;
	const processedBody = await downloadImages(body, imagesDir, publicRelDir);

	const fullMarkdown = `${DEFAULT_FRONTMATTER}\n\n${processedBody}\n`;

	fs.mkdirSync(PROJECTS_DIR, { recursive: true });
	const outputPath = path.join(PROJECTS_DIR, `${filename}.md`);
	await Bun.write(outputPath, fullMarkdown);

	console.log(`\nOutput: ${outputPath}`);
	console.log(`\nNext steps:`);
	console.log(`  Preprocess: bun run preprocess -- projects/${filename}.md`);
	console.log(`  Studio:     bun run studio -- ${filename}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
