/**
 * @description LLM プロバイダー解決と台本生成
 */

import { generateText } from "ai";
import { buildPrompt, cleanGeneratedScript } from "./prompt";

/**
 * @description パース済みのモデル指定
 * @property provider - プロバイダー名 (google, anthropic, openai)
 * @property model - モデルID (gemini-2.5-flash など)
 */
interface ModelSpec {
	provider: string;
	model: string;
}

/**
 * @description "provider:model" 形式の文字列をパースする
 * @param spec - "google:gemini-2.5-flash" のような文字列
 * @returns パース済みのプロバイダーとモデル
 */
function parseModelSpec(spec: string): ModelSpec {
	const colonIdx = spec.indexOf(":");
	if (colonIdx === -1) {
		throw new Error(
			`モデル指定が不正です: "${spec}"\n` +
				'  "provider:model" の形式で指定してください (例: google:gemini-2.5-flash)',
		);
	}
	return {
		provider: spec.slice(0, colonIdx),
		model: spec.slice(colonIdx + 1),
	};
}

/**
 * @description プロバイダーパッケージを動的に読み込み、モデルインスタンスを返す
 * @param spec - パース済みのモデル指定
 * @returns AI SDK の LanguageModel インスタンス
 */
async function resolveModel(spec: ModelSpec) {
	const packageMap: Record<string, string> = {
		google: "@ai-sdk/google",
		anthropic: "@ai-sdk/anthropic",
		openai: "@ai-sdk/openai",
	};

	const packageName = packageMap[spec.provider];
	if (!packageName) {
		throw new Error(
			`未対応のプロバイダー: "${spec.provider}"\n` +
				`  対応プロバイダー: ${Object.keys(packageMap).join(", ")}`,
		);
	}

	let mod: Record<string, unknown>;
	try {
		mod = (await import(packageName)) as Record<string, unknown>;
	} catch {
		throw new Error(
			`プロバイダーパッケージ "${packageName}" が見つかりません。\n` +
				`  インストールしてください: bun add ${packageName}`,
		);
	}

	const createModel = mod[spec.provider];
	if (typeof createModel !== "function") {
		throw new Error(
			`プロバイダーパッケージ "${packageName}" から "${spec.provider}" 関数をエクスポートできません。`,
		);
	}

	return createModel(spec.model) as Parameters<typeof generateText>[0]["model"];
}

/**
 * @description LLM を呼び出して台本を生成する
 * @param markdown - Turndown で変換した記事の Markdown
 * @param title - 記事タイトル
 * @param modelSpec - "provider:model" 形式のモデル指定
 * @returns クリーニング済みの台本テキスト
 */
export async function generateScript(
	markdown: string,
	title: string,
	modelSpec: string,
): Promise<string> {
	const spec = parseModelSpec(modelSpec);
	const model = await resolveModel(spec);
	const { systemPrompt, userPrompt } = buildPrompt(markdown, title);

	console.log(`  Model: ${modelSpec}`);

	const { text, usage } = await generateText({
		model,
		system: systemPrompt,
		prompt: userPrompt,
	});

	console.log(
		`  Tokens: ${usage.inputTokens ?? "?"} input, ${usage.outputTokens ?? "?"} output, ${usage.totalTokens ?? "?"} total`,
	);

	return cleanGeneratedScript(text);
}
