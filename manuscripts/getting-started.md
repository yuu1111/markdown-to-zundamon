---
characters:
  - name: ずんだもん
    speakerId: 3
    color: "#4a8a2a"
    overflowY: 0.6
    overflowX: 0.1
  - name: 四国めたん
    speakerId: 2
    flip: true
    color: "#b4456e"
    overflowY: 0.6
    overflowX: 0.1
---

> # markdown-to-zundamon
>
> はじめかた

[ずんだもん] こんにちは！ ずんだもんなのだ。
[四国めたん] 四国めたんよ。
[ずんだもん] 今日は <ruby>markdown-to-zundamon<rt>マークダウントゥーずんだもん</rt></ruby> の始め方を紹介するのだ！

> ## markdown-to-zundamon とは？
>
> Markdownを書くだけで
> ずんだもんの解説動画を自動生成するツール

[四国めたん] Markdownを書くだけで、こういう動画が作れるツールよ。
[ずんだもん] まさに今見ているこの動画も、Markdownから作られているのだ！

> ## 用意するもの
>
> - **Node.js** (v18以上)
> - **VOICEVOX** (音声合成エンジン)

[四国めたん] まず必要なものはこの2つね。
[ずんだもん] VOICEVOXはぼくたちの声を作ってくれるソフトなのだ！
[四国めたん] VOICEVOXを起動した状態で作業を進めてね。

> ## セットアップ
>
> ```bash
> git clone https://github.com/motemen/markdown-to-zundamon
> cd markdown-to-zundamon
> bun install
> ```

[ずんだもん] セットアップはとっても簡単なのだ！
[四国めたん] リポジトリをクローンして、<ruby>bun install<rt>バン インストール</rt></ruby>するだけね。

> ## 原稿を書く
>
> Markdownファイルに原稿を書くだけ！

[ずんだもん] 次は原稿を書くのだ！
[四国めたん] 書き方はシンプルよ。まずはキャラクター設定からね。

> ### キャラクター設定（frontmatter）
>
> ```yaml
> ---
> characters:
>   - name: ずんだもん
>     speakerId: 3
>     color: "#4a8a2a"
>   - name: 四国めたん
>     speakerId: 2
>     flip: true
>     color: "#b4456e"
> ---
> ```

[四国めたん] ファイルの先頭に、登場するキャラクターを設定するの。
[ずんだもん] <ruby>speakerId<rt>スピーカーID</rt></ruby>はVOICEVOXの話者IDなのだ！ ぼくは3番！
[四国めたん] 私は2番よ。colorはセリフの字幕の色ね。

> ### キャラクター画像
>
> `characters/<キャラ名>/` に画像を配置
>
> - `default.png` - 基本画像（必須）
> - `default_active1.png` - 口パク用（任意）
> - `default_active2.png` - 口パク用（任意）

[ずんだもん] キャラクターの画像も用意するのだ！
[四国めたん] <ruby>characters<rt>キャラクターズ</rt></ruby>フォルダにキャラ名のフォルダを作って、画像を入れてね。
[ずんだもん] 口パク用の画像も追加すると、喋ってるときに口が動くのだ！

> ### 原稿の書き方
>
> ```markdown
> > # タイトルスライド
>
> [ずんだもん] こんにちは！ ずんだもんなのだ。
> [四国めたん] 四国めたんよ。
>
> > - ポイント1
> > - ポイント2
>
> [ずんだもん] ここを説明するのだ！
> ```

[ずんだもん] 引用がスライド、地の文がセリフなのだ！
[四国めたん] ふたり以上で喋るときは、名前のタグをつけてね。
[ずんだもん] たったこれだけで動画の構成ができるなんて、すごいのだ！

> ## 動画を作る3ステップ
>
> 1. **前処理** - 音声を生成
> 2. **プレビュー** - ブラウザで確認
> 3. **レンダリング** - MP4に出力

[四国めたん] 動画を作るには3つのステップがあるわ。

> ### ステップ1: 前処理
>
> ```bash
> bun run preprocess -- manuscripts/my-video.md
> ```
>
> Markdownを解析してVOICEVOXで音声を生成

[ずんだもん] まずは<ruby>前処理<rt>まえしょり</rt></ruby>なのだ！
[四国めたん] このコマンドでMarkdownを解析して、VOICEVOXで音声ファイルを作るのよ。

> ### ステップ2: プレビュー
>
> ```bash
> bun run studio -- my-video
> ```
>
> ブラウザでリアルタイムプレビュー

[ずんだもん] 次はプレビューで確認するのだ！
[四国めたん] Remotion Studioがブラウザで開いて、動画の仕上がりをすぐに確認できるわ。

> ### ステップ3: レンダリング
>
> ```bash
> bun run render -- my-video
> ```
>
> `out/my-video.mp4` に出力！

[ずんだもん] 最後にレンダリングすれば、<ruby>MP4<rt>エムピーフォー</rt></ruby>の動画ファイルが完成なのだ！
[四国めたん] outフォルダに動画が出力されるわ。

> ## まとめ
>
> 1. `git clone` してセットアップ
> 2. キャラクター画像を `characters/` に配置
> 3. Markdownで原稿を書く
> 4. `preprocess` → `studio` → `render`
>
> **Markdownを書くだけで動画が作れる！**

[ずんだもん] というわけで、<ruby>markdown-to-zundamon<rt>マークダウントゥーずんだもん</rt></ruby>の始め方を紹介したのだ！
[四国めたん] Markdownが書ければ誰でも動画が作れるから、ぜひ試してみてね。
[ずんだもん] みんなもずんだもん動画を作ってほしいのだ！

> **github.com/motemen/markdown-to-zundamon**

[ずんだもん] よかったら、チャンネル登録と高評価もよろしくなのだ！ またね！
[四国めたん] バイバイ！
[pause: 3000ms]
