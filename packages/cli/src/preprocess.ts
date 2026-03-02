import * as fs from "node:fs";
import * as path from "node:path";
import matter from "@11ty/gray-matter";
import {
	copyLocalImage,
	downloadRemoteImage,
	sanitizeForFilename,
	shortHash,
} from "@markdown-to-zundamon/core/assets";
import {
	CHARACTERS_DIR,
	VIDEO_PUBLIC_DIR,
} from "@markdown-to-zundamon/core/paths";
import type {
	Character,
	Manifest,
	Segment,
} from "@markdown-to-zundamon/core/types";
import { ManifestConfigSchema } from "@markdown-to-zundamon/core/types";
import type { Blockquote, Nodes } from "mdast";
import { toString as mdastToString } from "mdast-util-to-string";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { unified } from "unified";
import { createTtsEngine, type TtsEngine } from "./tts/engine";

/**
 * @description preprocess の出力先ディレクトリ(video パッケージの public/projects)
 */
const BASE_PUBLIC_DIR = path.join(VIDEO_PUBLIC_DIR, "projects");

/**
 * @description ミリ秒をフレーム数に変換する
 * @param ms - ミリ秒
 * @param fps - フレームレート
 * @returns フレーム数(切り上げ)
 */
function msToFrames(ms: number, fps: number): number {
	return Math.ceil((ms / 1000) * fps);
}

/**
 * @description WAV ヘッダのみを読み取って再生時間(秒)を返す
 * @param filePath - WAV ファイルのパス
 * @returns 再生時間(秒)
 */
function getWavDurationSec(filePath: string): number {
	const fd = fs.openSync(filePath, "r");
	const buf = Buffer.alloc(512);
	fs.readSync(fd, buf, 0, 512, 0);
	fs.closeSync(fd);
	const byteRate = buf.readUInt32LE(28);
	let dataOffset = 12;
	while (dataOffset < buf.length - 8) {
		const chunkId = buf.toString("ascii", dataOffset, dataOffset + 4);
		const chunkSize = buf.readUInt32LE(dataOffset + 4);
		if (chunkId === "data") {
			return chunkSize / byteRate;
		}
		dataOffset += 8 + chunkSize;
	}
	throw new Error(`Could not find data chunk in WAV: ${filePath}`);
}

/**
 * @description テキストを音声合成して WAV ファイルを生成する(キャッシュ対応)
 * @param text - 合成するテキスト
 * @param character - キャラクター設定
 * @param ttsEngine - TTS エンジンインスタンス
 * @param audioDir - 音声ファイルの出力ディレクトリ
 * @param projectName - プロジェクト名
 * @returns 音声ファイルのパスと再生時間
 */
async function synthesize(
	text: string,
	character: Character,
	ttsEngine: TtsEngine,
	audioDir: string,
	projectName: string,
): Promise<{ audioPath: string; durationSec: number }> {
	const speakerKey =
		ttsEngine.name === "coeiroink"
			? `${character.speakerUuid}:${character.styleId}`
			: `${character.speakerId}`;
	const hash = shortHash(`${ttsEngine.name}:${speakerKey}:${text}`);
	const sanitized = sanitizeForFilename(text);
	const filename = `${hash}-${sanitized}.wav`;
	const audioPath = path.join(audioDir, filename);

	if (await Bun.file(audioPath).exists()) {
		console.log(`  [cache] ${filename}`);
		const durationSec = getWavDurationSec(audioPath);
		return {
			audioPath: `projects/${projectName}/audio/${filename}`,
			durationSec,
		};
	}

	const wavBuffer = await ttsEngine.synthesize(text, character);

	await Bun.write(audioPath, wavBuffer);
	console.log(`  [synth] ${filename}`);

	const durationSec = getWavDurationSec(audioPath);
	return {
		audioPath: `projects/${projectName}/audio/${filename}`,
		durationSec,
	};
}

/**
 * @description AST を走査して画像ノードを処理し、URL を書き換える
 * @param node - 走査対象の AST ノード
 * @param mdDir - Markdown ファイルのディレクトリ
 * @param imagesDir - 画像保存先ディレクトリ
 * @param projectName - プロジェクト名
 */
async function processImages(
	node: Nodes,
	mdDir: string,
	imagesDir: string,
	projectName: string,
): Promise<void> {
	if (node.type === "image" && node.url) {
		const url: string = node.url;

		if (url.startsWith("http://") || url.startsWith("https://")) {
			const destName = await downloadRemoteImage(url, imagesDir);
			if (destName) {
				console.log(
					`  [image] ${url} → projects/${projectName}/images/${destName}`,
				);
				node.url = `projects/${projectName}/images/${destName}`;
			}
		} else {
			// Local image: resolve from MD directory, then fallback to public/
			let srcPath = path.resolve(mdDir, url);
			if (!(await Bun.file(srcPath).exists())) {
				const publicPath = path.resolve(VIDEO_PUBLIC_DIR, url);
				if (await Bun.file(publicPath).exists()) {
					srcPath = publicPath;
				} else {
					console.warn(`  [warn] Image not found: ${srcPath}`);
					return;
				}
			}

			const destName = await copyLocalImage(srcPath, imagesDir);
			console.log(
				`  [image] ${path.basename(srcPath)} → ${projectName}/images/${destName}`,
			);

			node.url = `projects/${projectName}/images/${destName}`;
		}
	}

	if ("children" in node) {
		await Promise.all(
			node.children.map((child) =>
				processImages(child as Nodes, mdDir, imagesDir, projectName),
			),
		);
	}
}

/**
 * @description blockquote AST ノードを Markdown 文字列に変換する
 * @param node - blockquote ノード
 * @param mdDir - Markdown ファイルのディレクトリ
 * @param imagesDir - 画像保存先ディレクトリ
 * @param projectName - プロジェクト名
 * @returns Markdown 文字列
 */
async function blockquoteToMarkdown(
	node: Blockquote,
	mdDir: string,
	imagesDir: string,
	projectName: string,
): Promise<string> {
	await processImages(node, mdDir, imagesDir, projectName);
	const processor = unified().use(remarkStringify);
	const virtualRoot = { type: "root" as const, children: node.children };
	return processor.stringify(virtualRoot).trim();
}

/**
 * @description <ruby> タグを処理して表示テキストと読みテキストを分離する
 * @param text - 処理対象のテキスト
 * @returns 表示テキストと読みテキスト
 */
function processRubyTags(text: string): {
	displayText: string;
	speechText: string;
} {
	const rubyRe = /<ruby>(.*?)<rt>(.*?)<\/rt><\/ruby>/g;
	let displayText = "";
	let speechText = "";
	let lastIndex = 0;
	for (const match of text.matchAll(rubyRe)) {
		const before = text.slice(lastIndex, match.index);
		displayText += before + match[1];
		speechText += before + match[2];
		lastIndex = match.index + match[0].length;
	}
	const tail = text.slice(lastIndex);
	displayText += tail;
	speechText += tail;
	return { displayText, speechText };
}

/**
 * @description [pause: 500ms] ディレクティブのパターン
 */
const PAUSE_RE = /^\[pause:\s*(\d+)(ms|s)\]$/;

/**
 * @description テキスト行から pause ディレクティブをパースする
 * @param line - 対象行
 * @returns パース結果。pause でなければ null
 */
function parsePauseDirective(
	line: string,
): { type: "pause"; ms: number } | null {
	const m = line.trim().match(PAUSE_RE);
	if (!m?.[1] || !m[2]) return null;
	const value = parseInt(m[1], 10);
	const ms = m[2] === "s" ? value * 1000 : value;
	return { type: "pause", ms };
}

/**
 * @description [キャラ名] 形式の話者タグのパターン
 */
const SPEAKER_TAG_RE = /^\[(.+?)\]\s*/;

/**
 * @description 行頭の話者タグをパースする
 * @param line - 対象行
 * @returns キャラクター名とテキスト。話者タグでなければ null
 */
function parseSpeakerTag(
	line: string,
): { character: string; text: string } | null {
	const m = line.match(SPEAKER_TAG_RE);
	if (!m?.[1]) return null;
	if (PAUSE_RE.test(line.trim())) return null;
	return { character: m[1], text: line.slice(m[0].length) };
}

/**
 * @description キャラクター配列から名前引き用の Map を構築する
 * @param characters - キャラクター配列
 * @returns 名前 → Character の Map
 */
function buildCharacterMap(characters: Character[]): Map<string, Character> {
	const map = new Map<string, Character>();
	for (const c of characters) {
		map.set(c.name, c);
	}
	return map;
}

/**
 * @description キャラクター画像を video パッケージの public/ にコピーする
 * @param characters - キャラクター配列
 */
async function copyCharacterImages(characters: Character[]): Promise<void> {
	await Promise.all(
		characters.map(async (char) => {
			const charSrc = path.join(CHARACTERS_DIR, char.name, "default.png");
			const charDst = path.join(
				VIDEO_PUBLIC_DIR,
				"characters",
				char.name,
				"default.png",
			);
			if (await Bun.file(charSrc).exists()) {
				fs.mkdirSync(path.dirname(charDst), { recursive: true });
				await Bun.write(charDst, Bun.file(charSrc));
				console.log(
					`  [char] ${char.name} → characters/${char.name}/default.png`,
				);
			} else {
				console.warn(`  [warn] Character image not found: ${charSrc}`);
				char.hasImage = false;
			}

			const charDir = path.join(CHARACTERS_DIR, char.name);
			let activeFiles: string[] = [];
			try {
				activeFiles = fs
					.readdirSync(charDir)
					.filter((f) => /^default_active\d+\.png$/.test(f))
					.sort();
			} catch {
				// charDir が存在しない場合は空配列のまま
			}
			if (activeFiles.length > 0) {
				char.activeImages = [];
				for (const file of activeFiles) {
					const activeSrc = path.join(charDir, file);
					const activeDst = path.join(
						VIDEO_PUBLIC_DIR,
						"characters",
						char.name,
						file,
					);
					await Bun.write(activeDst, Bun.file(activeSrc));
					char.activeImages.push(file);
					console.log(
						`  [char] ${char.name} → characters/${char.name}/${file}`,
					);
				}
			}
		}),
	);
}

async function main() {
	const mdPath = process.argv[2];
	if (!mdPath) {
		console.error("Usage: bun run preprocess -- <markdown-file>");
		process.exit(1);
	}

	const resolvedMdPath = path.resolve(mdPath);
	const mdDir = path.dirname(resolvedMdPath);

	const projectName = path.basename(
		resolvedMdPath,
		path.extname(resolvedMdPath),
	);
	const projectDir = path.join(BASE_PUBLIC_DIR, projectName);
	const audioDir = path.join(projectDir, "audio");
	const imagesDir = path.join(projectDir, "images");

	console.log(`Project: "${projectName}" → public/projects/${projectName}/`);

	const raw = await Bun.file(resolvedMdPath).text();
	const { data: frontmatter, content: mdContent } = matter(raw);

	const config = ManifestConfigSchema.parse(frontmatter);

	// エンジン別のキャラクター設定バリデーション
	const ttsEngine = createTtsEngine(config.engine);
	for (const char of config.characters) {
		ttsEngine.validateCharacter(char);
	}

	// Default position for characters[1] is "left" (if not explicitly set)
	if (config.characters.length > 1) {
		const second = config.characters[1];
		const raw1 = (frontmatter.characters as Record<string, unknown>[])?.[1];
		if (second && raw1 && !raw1.position) {
			second.position = "left";
		}
	}

	const tree = unified().use(remarkParse).parse(mdContent);

	fs.mkdirSync(audioDir, { recursive: true });

	const segments: Segment[] = [];

	const characterMap = buildCharacterMap(config.characters);
	const defaultCharacter =
		config.characters.length === 1 ? config.characters[0] : undefined;

	let prevNodeHadSpeech = false;

	for (const node of tree.children) {
		if (node.type === "blockquote") {
			const text = mdastToString(node);
			const markdown = await blockquoteToMarkdown(
				node,
				mdDir,
				imagesDir,
				projectName,
			);
			console.log(`[slide] ${text.slice(0, 40)}...`);
			const slideTransitionFrames = msToFrames(
				config.slideTransitionMs,
				config.fps,
			);
			if (segments.length > 0 && slideTransitionFrames > 0) {
				segments.push({
					type: "pause",
					text: "",
					durationInFrames: slideTransitionFrames,
				});
			}
			segments.push({
				type: "slide",
				text,
				markdown,
				durationInFrames: 0,
			});
			prevNodeHadSpeech = false;
		} else {
			const fullText = mdastToString(node).trim();
			if (!fullText) continue;

			if (prevNodeHadSpeech) {
				const paragraphGapFrames = msToFrames(
					config.paragraphGapMs,
					config.fps,
				);
				if (paragraphGapFrames > 0) {
					segments.push({
						type: "pause",
						text: "",
						durationInFrames: paragraphGapFrames,
					});
				}
			}

			const lines = fullText.split("\n");
			const speechGapFrames = msToFrames(config.speechGapMs, config.fps);
			let speechCount = 0;

			let currentCharacter: Character | undefined = defaultCharacter;

			for (const line of lines) {
				const trimmed = line.trim();
				if (!trimmed) continue;

				const pause = parsePauseDirective(trimmed);
				if (pause) {
					const durationInFrames = msToFrames(pause.ms, config.fps);
					console.log(`[pause] ${pause.ms}ms (${durationInFrames} frames)`);
					segments.push({
						type: "pause",
						text: "",
						durationInFrames,
					});
					speechCount = 0;
				} else {
					let speechText = trimmed;

					const speakerTag = parseSpeakerTag(trimmed);
					if (speakerTag) {
						const char = characterMap.get(speakerTag.character);
						if (char) {
							speechText = speakerTag.text;
							currentCharacter = char;
						} else {
							console.warn(
								`  [warn] Unknown character "${speakerTag.character}", using default`,
							);
							speechText = speakerTag.text;
							currentCharacter = defaultCharacter;
						}
					}

					if (!speechText.trim()) continue;

					const { displayText, speechText: ttsText } =
						processRubyTags(speechText);

					if (speechCount > 0 && speechGapFrames > 0) {
						segments.push({
							type: "pause",
							text: "",
							durationInFrames: speechGapFrames,
						});
					}

					// characters は .min(1) で最低1つ保証されている
					const fallback = config.characters[0] as Character;
					const synthCharacter = currentCharacter ?? fallback;

					console.log(`[speech] ${displayText.slice(0, 40)}...`);
					const { audioPath, durationSec } = await synthesize(
						ttsText,
						synthCharacter,
						ttsEngine,
						audioDir,
						projectName,
					);
					const durationInFrames = Math.ceil(durationSec * config.fps);
					segments.push({
						type: "speech",
						text: displayText,
						audioFile: audioPath,
						durationInFrames,
						...(currentCharacter ? { character: currentCharacter.name } : {}),
					});
					speechCount++;
				}
			}
			prevNodeHadSpeech = speechCount > 0;
		}
	}

	await copyCharacterImages(config.characters);

	const totalDurationInFrames = segments.reduce(
		(sum, s) => sum + s.durationInFrames,
		0,
	);

	const manifest: Manifest = {
		config,
		totalDurationInFrames,
		segments,
	};

	const manifestPath = path.join(projectDir, "manifest.json");
	await Bun.write(manifestPath, JSON.stringify(manifest, null, 2));
	console.log(`\nManifest written to ${manifestPath}`);
	console.log(
		`Total duration: ${totalDurationInFrames} frames (${(totalDurationInFrames / config.fps).toFixed(1)}s)`,
	);

	console.log(`\nNext steps:`);
	console.log(`  Preview: bun run studio -- ${projectName}`);
	console.log(`  Render:  bun run render -- ${projectName}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
