import * as fs from "node:fs";
import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import TurndownService from "turndown";
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
 * @description LLM モデルのデフォルト指定
 */
const DEFAULT_MODEL = "google:gemini-2.5-flash";

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
 * @description HTMLからReadabilityで本文を抽出する
 */
function extractArticle(
	html: string,
	url: string,
): { title: string; content: string } {
	const { document } = parseHTML(html);
	// ReadabilityはbaseURIを参照するため設定
	Object.defineProperty(document, "baseURI", { value: url });

	const reader = new Readability(document);
	const article = reader.parse();
	if (!article) {
		throw new Error(
			"記事本文を抽出できませんでした。Readabilityが解析に失敗しました。",
		);
	}
	return { title: article.title ?? "", content: article.content ?? "" };
}

/**
 * @description HTML→Markdown変換用のTurndownServiceを生成する
 */
function createTurndown(): TurndownService {
	const td = new TurndownService({
		headingStyle: "atx",
		codeBlockStyle: "fenced",
		bulletListMarker: "-",
	});
	return td;
}

/**
 * @description CLI引数を解析する
 */
function parseArgs(argv: string[]): {
	url: string;
	outputPath: string | null;
	model: string;
} {
	const args = argv.slice(2);
	let url: string | undefined;
	let outputPath: string | null = null;
	let model: string = process.env.LLM_MODEL ?? DEFAULT_MODEL;

	for (let i = 0; i < args.length; i++) {
		const arg = args[i] ?? "";
		if ((arg === "-o" || arg === "--output") && i + 1 < args.length) {
			outputPath = args[i + 1] ?? null;
			i++;
		} else if ((arg === "-m" || arg === "--model") && i + 1 < args.length) {
			model = args[i + 1] ?? model;
			i++;
		} else if (!url) {
			url = arg;
		}
	}

	if (!url) {
		console.error(
			"Usage: bun run fetch -- <url> [-o output.md] [-m provider:model]",
		);
		process.exit(1);
	}

	return { url, outputPath, model };
}

/**
 * @description メイン処理
 */
async function main(): Promise<void> {
	const { url: urlArg, outputPath: outputArg, model } = parseArgs(process.argv);

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
	const { title, content } = extractArticle(html, url.href);
	console.log(`  Title: ${title}`);
	console.log(`  Content: ${content.length.toLocaleString()} chars`);

	console.log("Converting HTML to Markdown...");
	const td = createTurndown();
	const rawMarkdown = td.turndown(content);
	console.log(`  Markdown: ${rawMarkdown.split("\n").length} lines`);

	console.log("Generating script with LLM...");
	const body = await generateScript(rawMarkdown, title, model);
	console.log(`  Output: ${body.split("\n").length} lines`);

	const fullMarkdown = `${DEFAULT_FRONTMATTER}\n\n${body}\n`;

	const filename = deriveFilename(url, title);
	const outputPath = outputArg ?? `${filename}.md`;
	fs.writeFileSync(outputPath, fullMarkdown, "utf-8");

	console.log(`\nOutput: ${outputPath}`);
	console.log(`\nNext steps:`);
	console.log(`  Preprocess: bun run preprocess -- ${outputPath}`);
	console.log(`  Studio:     bun run studio -- ${filename}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
