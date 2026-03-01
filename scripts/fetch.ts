import * as fs from "node:fs";
import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import TurndownService from "turndown";

/**
 * @description frontmatterのデフォルトテンプレート
 */
const DEFAULT_FRONTMATTER = `---
characters:
  - name: ずんだもん
    speakerId: 3
---`;

/**
 * @description セリフ化する際にスキップするナビゲーション定型文言
 */
const SKIP_PATTERNS = [
	"あわせて読みたい",
	"もくじ",
	"目次",
	"関連記事",
	"おすすめ記事",
];

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
 * @description 行がリスト項目またはリストの継続行かどうか判定する
 */
function isListLine(line: string): boolean {
	return (
		/^\s*[-*+]\s/.test(line) || /^\s*\d+\.\s/.test(line) || /^\s{2,}/.test(line)
	);
}

/**
 * @description 行が段落テキストの継続行かどうか判定する
 */
function isParagraphContinuation(line: string): boolean {
	if (line.trim() === "") return false;
	if (/^#{1,6}\s/.test(line)) return false;
	if (line.startsWith("```")) return false;
	if (/^\s*[-*+]\s/.test(line)) return false;
	if (/^\s*\d+\.\s/.test(line)) return false;
	if (/^!\[/.test(line)) return false;
	return true;
}

/**
 * @description Markdownを解析し、このツールの形式に構造変換する
 * @param markdown - Turndownが出力した生Markdown
 * @param title - 記事タイトル
 * @returns 変換後のMarkdown本文(frontmatterなし)
 */
function transformToScript(markdown: string, title: string): string {
	const lines = markdown.split("\n");
	const output: string[] = [];
	const stats = {
		headings: 0,
		codeBlocks: 0,
		images: 0,
		lists: 0,
		paragraphs: 0,
		skipped: 0,
	};

	// タイトルスライド
	output.push(`> # ${title}`);
	output.push("");

	let i = 0;
	while (i < lines.length) {
		const line = lines[i] ?? "";

		// 見出し (h1-h6)
		const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
		if (headingMatch?.[2]) {
			// h1はタイトルと重複するのでスキップ(既にタイトルスライドで出力済み)
			if (headingMatch[1] === "#") {
				stats.skipped++;
				i++;
				continue;
			}
			console.log(`  [heading] ${headingMatch[2].slice(0, 40)}`);
			stats.headings++;
			output.push(`> ## ${headingMatch[2]}`);
			output.push("");
			i++;
			continue;
		}

		// コードブロック
		if (line.startsWith("```")) {
			const codeLines: string[] = [line];
			i++;
			while (i < lines.length && !(lines[i] ?? "").startsWith("```")) {
				codeLines.push(lines[i] ?? "");
				i++;
			}
			if (i < lines.length) {
				codeLines.push(lines[i] ?? "");
				i++;
			}
			console.log(`  [code] ${codeLines.length} lines`);
			stats.codeBlocks++;
			for (const cl of codeLines) {
				output.push(`> ${cl}`);
			}
			output.push("");
			continue;
		}

		// リンク付き画像 [![alt](img)](link) → 画像部分のみスライド化
		const linkedImageMatch = line.match(
			/^\[!\[([^\]]*)\]\(([^)]+)\)\]\([^)]+\)/,
		);
		if (linkedImageMatch) {
			const alt = linkedImageMatch[1] ?? "";
			const imgUrl = linkedImageMatch[2] ?? "";
			const imageOnly = `![${alt}](${imgUrl})`;
			console.log(`  [image/linked] ${imageOnly.slice(0, 60)}`);
			stats.images++;
			output.push(`> ${imageOnly}`);
			output.push("");
			i++;
			continue;
		}

		// 画像
		if (/^!\[([^\]]*)\]\(([^)]+)\)/.test(line)) {
			console.log(`  [image] ${line.slice(0, 60)}`);
			stats.images++;
			output.push(`> ${line}`);
			output.push("");
			i++;
			continue;
		}

		// リスト (箇条書きまたは番号付き)
		if (/^\s*[-*+]\s/.test(line) || /^\s*\d+\.\s/.test(line)) {
			const listLines: string[] = [];
			while (i < lines.length && isListLine(lines[i] ?? "")) {
				listLines.push(lines[i] ?? "");
				i++;
			}
			console.log(`  [list] ${listLines.length} items`);
			stats.lists++;
			for (const ll of listLines) {
				const normalized = ll.replace(/^(\s*)\d+\.\s/, "$1- ");
				output.push(`> ${normalized}`);
			}
			output.push("");
			continue;
		}

		// 空行
		if (line.trim() === "") {
			i++;
			continue;
		}

		// 段落テキスト → セリフ行(文ごとに分割)
		const paragraphLines: string[] = [];
		while (i < lines.length && isParagraphContinuation(lines[i] ?? "")) {
			paragraphLines.push((lines[i] ?? "").trim());
			i++;
		}
		if (paragraphLines.length > 0) {
			const paragraph = paragraphLines.join(" ");
			const sentences = splitIntoSentences(paragraph);
			console.log(
				`  [speech] ${sentences.length} sentences: ${paragraph.slice(0, 50)}...`,
			);
			stats.paragraphs++;
			for (const s of sentences) {
				const cleaned = stripMarkdown(s.trim());
				if (!cleaned) continue;
				if (isPunctuationOnly(cleaned)) continue;
				if (SKIP_PATTERNS.includes(cleaned)) continue;
				output.push(cleaned);
			}
			output.push("");
		}
	}

	console.log(
		`  Stats: ${stats.headings} headings, ${stats.codeBlocks} code blocks, ${stats.images} images, ${stats.lists} lists, ${stats.paragraphs} paragraphs, ${stats.skipped} skipped`,
	);

	// 末尾の余計な空行を除去
	while (output.length > 0 && output[output.length - 1] === "") {
		output.pop();
	}

	return output.join("\n");
}

/**
 * @description テキストを文単位に分割する
 * @param text - 分割対象のテキスト
 * @returns 文の配列
 */
function splitIntoSentences(text: string): string[] {
	const result: string[] = [];
	// `.`はURLを破壊するため除外し、日本語句点・感嘆符・疑問符のみで分割
	const parts = text.split(/(?<=[。！？!?])\s*/);
	for (const part of parts) {
		const trimmed = part.trim();
		if (trimmed) {
			result.push(trimmed);
		}
	}
	if (result.length === 0 && text.trim()) {
		result.push(text.trim());
	}
	return result;
}

/**
 * @description Markdown記法を除去してプレーンテキストにする
 * @param text - Markdown記法を含むテキスト
 * @returns 記法除去後のテキスト
 */
function stripMarkdown(text: string): string {
	return (
		text
			// **bold** / *italic*
			.replace(/\*{1,2}(.+?)\*{1,2}/g, "$1")
			// [text](url)
			.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
			// バックスラッシュエスケープ
			.replace(/\\([_*`~])/g, "$1")
	);
}

/**
 * @description 句読点・記号のみで構成された行かどうか判定する
 * @param text - 判定対象のテキスト
 */
function isPunctuationOnly(text: string): boolean {
	return /^[。、！？!?,.\s]+$/.test(text);
}

/**
 * @description CLI引数を解析する
 */
function parseArgs(argv: string[]): { url: string; outputPath: string | null } {
	const args = argv.slice(2);
	let url: string | undefined;
	let outputPath: string | null = null;

	for (let i = 0; i < args.length; i++) {
		const arg = args[i] ?? "";
		if ((arg === "-o" || arg === "--output") && i + 1 < args.length) {
			outputPath = args[i + 1] ?? null;
			i++;
		} else if (!url) {
			url = arg;
		}
	}

	if (!url) {
		console.error("Usage: bun run fetch -- <url> [-o output.md]");
		process.exit(1);
	}

	return { url, outputPath };
}

/**
 * @description メイン処理
 */
async function main(): Promise<void> {
	const { url: urlArg, outputPath: outputArg } = parseArgs(process.argv);

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

	console.log("Transforming to script format...");
	const body = transformToScript(rawMarkdown, title);
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
