/**
 * @description LLM台本生成用のプロンプト構築とクリーニング
 */

/**
 * @description LLM に渡すコンテキストの文字数上限
 */
const CONTEXT_LIMIT = 60_000;

/**
 * @description ずんだもん解説動画の台本生成システムプロンプト
 */
const SYSTEM_PROMPT = `あなたは「ずんだもん」というキャラクターとして、技術記事をもとに解説動画の台本を書くアシスタントです。

## 出力フォーマット

台本は Markdown 形式で、以下の2種類の要素で構成されます:

### 1. スライド行 (blockquote)
\`>\` で始まる行はスライドとして画面に表示されます。

- \`> # タイトル\` — タイトルスライド(台本の最初に1つ)
- \`> ## セクション見出し\` — セクション区切りスライド
- \`> - 箇条書き\` — 箇条書きスライド
- \`> ![alt](url)\` — 画像スライド
- \`> \\\`\\\`\\\`lang ... \\\`\\\`\\\`\` — コードブロックスライド

### 2. セリフ行 (平文)
\`>\` で始まらない通常の行は、ずんだもんが読み上げるセリフです。

- 1行が1つの音声セグメントになります
- 自然な文単位で改行してください(1文が長すぎないように)
- ずんだもん口調で書いてください(「〜なのだ」「〜のだ」「〜だよ」など)

### 3. 特殊ディレクティブ
- \`[pause: 500ms]\` — 指定時間の無音を挿入
- \`<ruby>表示テキスト<rt>読み</rt></ruby>\` — ルビ(読み方指定)

## ずんだもん口調のルール

- 一人称は「ボク」
- 語尾は「〜なのだ」「〜のだ」「〜だよ」「〜だね」などを自然に使い分ける
- 丁寧すぎず、フレンドリーな口調
- 難しい概念はかみ砕いて説明する

## 構成ルール

1. 最初に \`> # タイトル\` のタイトルスライドを置く
2. 記事の主要セクションごとに \`> ## 見出し\` のスライドを入れる
3. スライドの直後に、そのスライドの内容を解説するセリフ行を書く
4. コードブロックや箇条書きは blockquote スライドとして含める
5. 元記事の画像URLはそのまま \`> ![alt](url)\` で保持する
6. 冗長な前置き・まとめは省略し、本題に集中する
7. frontmatter は出力しない(呼び出し側で付与する)`;

/**
 * @description システムプロンプトとユーザープロンプトを構築する
 * @param markdown - Turndown で変換した記事の Markdown
 * @param title - 記事タイトル
 * @returns LLM に渡すプロンプトのペア
 */
export function buildPrompt(
	markdown: string,
	title: string,
): { systemPrompt: string; userPrompt: string } {
	const truncated = truncateForContext(markdown);
	const userPrompt = `以下の記事を、ずんだもん解説動画の台本に変換してください。

## 記事タイトル
${title}

## 記事本文
${truncated}`;

	return { systemPrompt: SYSTEM_PROMPT, userPrompt };
}

/**
 * @description LLM 出力からコードフェンスや意図しない frontmatter を除去する
 * @param raw - LLM の生出力テキスト
 * @returns クリーニング済みの台本テキスト
 */
export function cleanGeneratedScript(raw: string): string {
	let text = raw.trim();

	// コードフェンスで囲まれている場合は除去
	const fenceMatch = text.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```\s*$/);
	if (fenceMatch?.[1]) {
		text = fenceMatch[1];
	}

	// 先頭の frontmatter (---...---) を除去
	const frontmatterMatch = text.match(/^---\s*\n[\s\S]*?\n---\s*\n([\s\S]*)$/);
	if (frontmatterMatch?.[1]) {
		text = frontmatterMatch[1];
	}

	// 末尾の余計な空行を除去
	text = text.trimEnd();

	return text;
}

/**
 * @description 長文記事をコンテキスト上限に切り詰める
 * @param markdown - 元の Markdown テキスト
 * @returns 切り詰め後のテキスト
 */
function truncateForContext(markdown: string): string {
	if (markdown.length <= CONTEXT_LIMIT) {
		return markdown;
	}
	const truncated = markdown.slice(0, CONTEXT_LIMIT);
	// 最後の完全な行で切る
	const lastNewline = truncated.lastIndexOf("\n");
	const result = lastNewline > 0 ? truncated.slice(0, lastNewline) : truncated;
	return `${result}\n\n[... 記事が長いため以降は省略されています ...]`;
}
