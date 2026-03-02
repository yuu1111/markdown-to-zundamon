# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Markdownファイルからずんだもん風の解説動画を自動生成するCLIツール。VOICEVOXで音声合成し、Remotionで動画をレンダリングする。Bun workspacesによるmonorepo構成。

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

# 型チェック (tsc --build, 3パッケージ)
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

### Monorepo 構成 (Bun workspaces)

- `packages/core` (`@markdown-to-zundamon/core`) — 共有型定義、パス定数、環境変数バリデーション、画像DLユーティリティ
- `packages/cli` (`@markdown-to-zundamon/cli`) — CLIスクリプト群(preprocess, fetch, render, studio)、TTSエンジン抽象化
- `packages/video` (`@markdown-to-zundamon/video`) — Remotionコンポジション、Reactコンポーネント

### 2フェーズパイプライン

**Phase 1: 前処理** (`packages/cli/src/preprocess.ts`)
```
Markdown → gray-matter(frontmatter) → remark(AST)
  → blockquote → スライドセグメント
  → paragraph → 話者タグ[キャラ名]解析 → speech/pauseセグメント
  → TtsEngine(VOICEVOX/Coeiroink) → WAV生成(sha256ハッシュでキャッシュ)
  → manifest.json + 音声/画像を packages/video/public/projects/<name>/ へ出力
```

**Phase 2: Remotion動画合成** (`packages/video/src/`)
```
Root.tsx → manifest.json読込 → Composition.tsx
  → タイムライン構築 → Audio/SlideContent/CharacterDisplay/Subtitle描画
```

**LLM台本生成** (`packages/cli/src/fetch.ts`、オプション)
```
URL → readability(記事抽出) → turndown(HTML→MD) → AI SDK(LLM) → projects/<name>.md
```

### 主要モジュール

- `packages/core/src/types.ts` — Zodスキーマによるデータ型定義(Manifest, Segment, Character等)。全データ構造の単一真実源
- `packages/core/src/paths.ts` — ワークスペースルートからの絶対パス定数
- `packages/core/src/config.ts` — 環境変数のZodバリデーション
- `packages/core/src/assets.ts` — 画像DL/コピーの共通ユーティリティ
- `packages/cli/src/preprocess.ts` — Markdown AST走査、TTS呼出、manifest生成。話者は段落内で継承される
- `packages/cli/src/tts/engine.ts` — TtsEngineインターフェース + ファクトリ関数(Strategyパターン)
- `packages/cli/src/tts/voicevox.ts` — VOICEVOX TTS実装
- `packages/cli/src/tts/coeiroink.ts` — Coeiroink TTS実装
- `packages/cli/src/lib/llm.ts` — AI SDK統合。`provider:model`形式で動的にプロバイダーをimport
- `packages/video/src/Composition.tsx` — タイムライン駆動のRemotionコンポジション。フォントの非同期ロード + delayRender
- `packages/video/src/components/CharacterDisplay.tsx` — リップシンク(4フレームごと画像切替) + バウンスアニメーション
- `packages/video/src/components/SlideContent.tsx` — react-markdown + react-syntax-highlighter でスライド描画
- `packages/video/src/components/Subtitle.tsx` — BudouXで日本語分かち書き + ストロークテキスト

### ファイル構成規約

- `characters/<キャラ名>/` — 元画像(default.png必須、default_active1/2.pngはリップシンク用)
- `manuscripts/` — 台本Markdownのテンプレート/サンプル
- `projects/` — LLM生成台本の出力先(gitignored)
- `packages/video/public/projects/<name>/` — 前処理の生成物(manifest.json, audio/, images/)
- `out/<name>.mp4` — レンダリング出力

## 環境変数

`.env.example`を`.env`にコピーして設定する。`packages/core/src/config.ts`でZodバリデーション済み。

- `VOICEVOX_BASE` — VOICEVOX APIのベースURL(デフォルト: `http://localhost:50021`)
- `COEIROINK_BASE` — Coeiroink APIのベースURL(デフォルト: `http://localhost:50032`)
- `GOOGLE_GENERATIVE_AI_API_KEY` — fetchコマンドに必要
- `LLM_MODEL` — LLMモデル指定(デフォルト: `google:gemini-2.5-flash`)

## コード規約

- Biome v2: タブインデント、ダブルクォート
- Zodでの外部データバリデーション(manifest, frontmatter, composition props, 環境変数)
- 音声ファイル名: `sha256(text)[0:8]-sanitized(text)[0:20].wav` でキャッシュキーとして機能
- Remotion staticFile()は`packages/video/public/`相対パス
- パッケージ間のimportは `@markdown-to-zundamon/core/types` 形式のサブパスエクスポートを使用
- TypeScript project references (`tsc --build`) で型チェック
