# markdown-to-zundamon

Markdownからずんだもん解説動画を生成するプロジェクト。Remotionベース。

## 前提条件

- Bun
- VOICEVOX が `localhost:50021` で起動していること（前処理時）
- LLM API キー（fetch 時）: `.env` に `GOOGLE_GENERATIVE_AI_API_KEY` 等を設定

## ビルド・実行手順

```bash
# 0. 記事URLから台本を生成 → projects/<name>.md
bun run fetch -- https://example.com/article

# 1. 前処理: Markdown解析 + VOICEVOX音声生成 → public/<project>/manifest.json
bun run preprocess -- projects/my-video.md

# 2. プレビュー
bun run studio -- my-video

# 3. レンダリング → out/<project>.mp4
bun run render -- my-video
```

fetch でモデルを指定する場合:

```bash
bun run fetch -- https://example.com/article -m anthropic:claude-sonnet-4-20250514
```

## アーキテクチャ

2フェーズ構成:
1. **前処理** (`scripts/preprocess.ts`): Markdown → VOICEVOX音声生成 → JSONマニフェスト
2. **動画生成** (`src/`): マニフェストを読み込み、Remotionで音声・字幕・スライド・キャラ画像を合成

- blockquote → スライド表示
- それ以外のテキスト → ずんだもんが喋る（VOICEVOX）

## ファイル構成

- `scripts/fetch.ts` - 記事URL→LLM台本生成スクリプト
- `scripts/lib/llm.ts` - LLMプロバイダー解決・テキスト生成
- `scripts/lib/prompt.ts` - 台本生成用プロンプト構築
- `scripts/preprocess.ts` - 前処理スクリプト
- `scripts/studio.ts` - Remotion Studio 起動ヘルパースクリプト
- `scripts/render.ts` - レンダリングヘルパースクリプト
- `projects/` - fetch で生成した台本MD（生成物、gitignore）
- `src/index.ts` - Remotion registerRoot
- `src/Root.tsx` - Composition登録（calculateMetadata で動的マニフェスト読み込み）
- `src/Composition.tsx` - メイン合成コンポーネント
- `src/components/` - UI コンポーネント群
- `src/types.ts` - 型定義
- `public/<project>/manifest.json` - 前処理出力（生成物）
- `public/<project>/audio/` - 生成された音声ファイル（生成物）
- `public/<project>/images/` - スライド用画像（生成物）
- `public/characters/default.png` - ずんだもんキャラ画像（共有、生成物）
- `characters/` - キャラクター画像（ソース）
- `out/<project>.mp4` - レンダリング出力（生成物）

## コーディング規約

- TypeScript strict
- Remotion のコンポーネント規約に従う
