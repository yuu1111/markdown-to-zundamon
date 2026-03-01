# markdown-to-zundamon 実装計画

## Context
MarkdownからRemotionを使ってずんだもん解説動画を生成するプロジェクト。引用(blockquote)はスライド表示、それ以外のテキストはVOICEVOXで音声生成してずんだもんが喋る動画を作る。

## アーキテクチャ

2フェーズ構成:
1. **前処理スクリプト** (`scripts/preprocess.ts`): Markdown解析 → VOICEVOX音声生成 → JSONマニフェスト出力
2. **Remotion動画生成** (`src/`): マニフェストを読み込み、音声・字幕・スライド・キャラ画像を合成

## ファイル構成

```
├── character/default.png          # ずんだもんキャラ画像
├── exmaple/example.md             # サンプルMarkdown
├── public/
│   ├── audio/                     # 生成されたWAVファイル
│   ├── images/                    # スライド用画像（前処理でコピー）
│   ├── character/default.png      # 前処理でコピー
│   └── manifest.json              # 前処理出力
├── src/
│   ├── index.ts                   # registerRoot
│   ├── Root.tsx                   # Composition登録
│   ├── Composition.tsx            # メイン合成コンポーネント
│   ├── components/
│   │   ├── ZundamonCharacter.tsx  # キャラ画像表示（位置・サイズ設定可能）
│   │   ├── Subtitle.tsx           # 字幕表示（袋文字、ずんだもんカラー）
│   │   └── SlideContent.tsx       # スライド表示（Markdownレンダリング、画像対応）
│   └── types.ts                   # 型定義
├── scripts/
│   └── preprocess.ts              # Markdown解析 + VOICEVOX呼び出し
├── package.json
├── tsconfig.json
└── remotion.config.ts
```

## 実装ステップ

### 0. CLAUDE.md 生成 ✅
プロジェクトルートに `CLAUDE.md` を作成。

### 1. プロジェクトセットアップ ✅
- `bun init -y`
- Remotion, TypeScript, remark系, gray-matter, react-markdown 等インストール
- `tsconfig.json` (JSX: react-jsx, target: ES2022)
- `remotion.config.ts`

### 2. 型定義 (`src/types.ts`) ✅
- `SegmentType`: "speech" | "slide" | "pause"
- `Segment`: type, text, audioFile?, durationInFrames, markdown?
- `ManifestConfig`: fps, width, height, speakerId, slideTransitionSec, speechGapMs, characterOverflow*, characterHeight
- `Manifest`: config, totalDurationInFrames, segments

### 3. 前処理スクリプト (`scripts/preprocess.ts`) ✅
- **Frontmatter解析**: `gray-matter` でYAML frontmatterから設定読み込み
- **Markdown解析**: `unified` + `remark-parse` でAST取得
  - `blockquote` → slide セグメント（Markdownとして保持、画像パス解決）
  - 通常テキスト → 1行ごとにspeechセグメント
  - `[pause: 500ms]` → pauseセグメント
- **VOICEVOX API呼び出し**: 各speechセグメントに対して音声合成
  - ファイル名はテキストのハッシュ + テキスト先頭のサニタイズ版
  - 同一テキストはキャッシュ再利用
- **画像処理**: blockquote内の画像を `public/images/` にコピー、パス書き換え
- **音声長測定**: WAVヘッダー直接パース
- **スライド間ポーズ**: `slideTransitionSec` に基づくpauseセグメント挿入
- **セリフ間ポーズ**: `speechGapMs` に基づくpauseセグメント挿入
- **マニフェスト出力**: `public/manifest.json`
- **アセットコピー**: `character/default.png` → `public/character/default.png`

### 4. Remotionコンポーネント群 ✅
- **`src/index.ts`**: `registerRoot(RemotionRoot)`
- **`src/Root.tsx`**: マニフェストを読み込んで `<Composition>` 登録
- **`src/Composition.tsx`**: セグメントを走査し、タイムライン構築。slide/pause/speechそれぞれ処理。フォントは "M PLUS Rounded 1c"
- **`src/components/ZundamonCharacter.tsx`**: 画面右下にキャラ画像表示。overflowY/X/heightが設定可能。発話時バウンスアニメーション
- **`src/components/Subtitle.tsx`**: 袋文字（text-stroke）で字幕表示。ずんだもんカラー（#4a8a2a）
- **`src/components/SlideContent.tsx`**: react-markdown + remark-gfm でMarkdownレンダリング。h1/h2/h3/リスト/太字/code/画像に対応。minHeight: 75%で高さ確保

### 5. package.json scripts ✅
```json
{
  "preprocess": "bun run scripts/preprocess.ts",
  "studio": "bunx remotion studio",
  "render": "bunx remotion render ZundamonVideo out/video.mp4",
  "build": "bun run preprocess -- exmaple/example.md && bun run render"
}
```

### 6. README.md ✅

## Frontmatter設定一覧

| キー | 型 | デフォルト | 説明 |
|------|-----|-----------|------|
| `fps` | number | 30 | フレームレート |
| `width` | number | 1920 | 動画の幅 |
| `height` | number | 1080 | 動画の高さ |
| `speakerId` | number | 3 | VOICEVOX話者ID |
| `slideTransitionSec` | number | 0.6 | スライド切替前の間（秒） |
| `speechGapMs` | number | 200 | セリフ間の間隔（ミリ秒） |
| `characterOverflowBottom` | number | 0.4 | キャラ下方向はみ出し（0-1） |
| `characterOverflowRight` | number | 0.1 | キャラ右方向はみ出し（0-1） |
| `characterHeight` | number | 800 | キャラ画像高さ（px） |

## レイアウト

```
┌──────────────────────────────────────────────┐
│  ┌─────────────────────┐                     │
│  │                     │                     │
│  │   スライド内容       │                     │
│  │   (Markdown)        │                     │
│  │                     │                     │
│  └─────────────────────┘           ┌────────┐│
│                                    │ずんだもん││
│  ┌──────────────────────┐          │        ││
│  │ 字幕テキスト（袋文字） │          └────────┘│
│  └──────────────────────┘                     │
└──────────────────────────────────────────────┘
```

## 検証方法
1. VOICEVOXを起動 (`localhost:50021`)
2. `bun run preprocess -- exmaple/example.md` → `public/audio/` にWAV、`public/manifest.json` が生成されることを確認
3. `bun run studio` → Remotion Studioでプレビュー確認
4. `bun run render` → `out/video.mp4` が生成されることを確認
