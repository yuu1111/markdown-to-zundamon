# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Markdownファイルからずんだもん風の解説動画を自動生成するCLIツール。VOICEVOXで音声合成し、Remotionで動画をレンダリングする。

## コマンド

```bash
# 前処理: Markdown → VOICEVOX音声合成 → manifest.json生成
bun run preprocess -- <name>.md

# URL記事取得 → LLMで台本生成 → projects/<name>.md
bun run fetch -- <url>

# Remotion Studioでプレビュー
bun run studio -- <name>

# MP4レンダリング
bun run render -- <name>

# 型チェック
bun run typecheck

# Lint (Biome)
bun run lint

# フォーマット (Biome, auto-fix)
bun run format

# 未使用コード/依存検出
bun run knip
```

ランタイムはBun。`npm`や`node`は使わない。Remotion CLIは`bunx`経由で実行される。テストフレームワークは未導入。

## アーキテクチャ

### 2フェーズパイプライン

**Phase 1: 前処理** (`scripts/preprocess.ts`)
```
Markdown → gray-matter(frontmatter) → remark(AST)
  → blockquote → スライドセグメント
  → paragraph → 話者タグ[キャラ名]解析 → speech/pauseセグメント
  → VOICEVOX API → WAV生成(sha256ハッシュでキャッシュ)
  → manifest.json + 音声/画像を public/projects/<name>/ へ出力
```

**Phase 2: Remotion動画合成** (`src/`)
```
Root.tsx → manifest.json読込 → Composition.tsx
  → タイムライン構築 → Audio/SlideContent/CharacterDisplay/Subtitle描画
```

**LLM台本生成** (`scripts/fetch.ts`、オプション)
```
URL → readability(記事抽出) → turndown(HTML→MD) → AI SDK(LLM) → projects/<name>.md
```

### 主要モジュール

- `src/types.ts` — Zodスキーマによるデータ型定義(Manifest, Segment, Character等)。全データ構造の単一真実源
- `scripts/preprocess.ts` — Markdown AST走査、VOICEVOX呼出、manifest生成。話者は段落内で継承される
- `scripts/lib/llm.ts` — AI SDK統合。`provider:model`形式(例: `google:gemini-2.5-flash`)で動的にプロバイダーをimport
- `src/Composition.tsx` — タイムライン駆動のRemotionコンポジション。フォントの非同期ロード + delayRender
- `src/components/CharacterDisplay.tsx` — リップシンク(4フレームごと画像切替) + バウンスアニメーション
- `src/components/SlideContent.tsx` — react-markdown + react-syntax-highlighter でスライド描画
- `src/components/Subtitle.tsx` — BudouXで日本語分かち書き + ストロークテキスト

### ファイル構成規約

- `characters/<キャラ名>/` — 元画像(default.png必須、default_active1/2.pngはリップシンク用)
- `manuscripts/` — 台本Markdownのテンプレート/サンプル
- `projects/` — LLM生成台本の出力先(gitignored)
- `public/projects/<name>/` — 前処理の生成物(manifest.json, audio/, images/)
- `out/<name>.mp4` — レンダリング出力

## 環境変数

`.env.example`を`.env`にコピーして設定する。

- `VOICEVOX_BASE` — VOICEVOX APIのベースURL(デフォルト: `http://localhost:50021`)
- `GOOGLE_GENERATIVE_AI_API_KEY` — fetchコマンドに必要
- `LLM_MODEL` — LLMモデル指定(デフォルト: `google:gemini-2.5-flash`)

## コード規約

- Biome v2: タブインデント、ダブルクォート
- Zodでの外部データバリデーション(manifest, frontmatter, composition props)
- 音声ファイル名: `sha256(text)[0:8]-sanitized(text)[0:20].wav` でキャッシュキーとして機能
- Remotion staticFile()は`public/`相対パス
