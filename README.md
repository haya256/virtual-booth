# Virtual Booth

イベントブースをWebで再現するAIアシスタント付きのオープンソースプラットフォームです。

AIアシスタントが来場者の質問にリアルタイムで対応し、スライドを切り替えながらプロダクト紹介を行います。
`content/` ディレクトリのファイルを書き換えるだけで、自分のブースとして使えます。

**デモ**: https://virtual-booth-nine.vercel.app

---

## 特徴

- **AIリアルタイム対応** — OpenAI互換APIであれば何でも利用可能（Ollama、LM Studio、OpenAI等）
- **資料検索** — `content/knowledge/` に置いた資料から、質問に関連する部分だけを探して回答。Embedding やツール呼び出しは不要で、どのモデルでも動作
- **最新情報の参照** — `guide.md` にURLを書くだけで、更新履歴やお知らせ（HTML / Atom・RSS / JSON）も回答に利用
- **スライド連携** — AIがスライドを切り替えながら説明するRPGダイアログ風UI。文字送り・ページ送り・キーボード操作対応。スライドは枚数無制限で画像も表示可能
- **スキンシステム** — `content/skin.css` のCSS変数を書き換えるだけでカラーテーマを変更可能
- **カスタムキャラクター** — `content/attendant.svg` を置くだけでAI担当者の見た目を差し替え可能
- **パンフレット** — `content/pamphlet.html` を編集するとサムネイルにも自動反映
- **レスポンシブ対応** — 16:9 設計基準で画面サイズに合わせて自動スケーリング
- **デプロイ簡単** — Vercelへのワンクリックデプロイに対応

---

## セットアップ

### 1. リポジトリのクローン

```bash
git clone https://github.com/haya256/virtual-booth.git
cd virtual-booth
npm install
```

### 2. 環境変数の設定

`.env.example` をコピーして `.env.local` を作成し、AIバックエンドの情報を入力します。

```bash
cp .env.example .env.local
```

`.env.local` を編集：

```env
AI_BASE_URL=http://localhost:11434/v1   # AIのAPIエンドポイント
AI_API_KEY=your_api_key_here            # APIキー
AI_MODEL=llama3.2                       # 使用するモデル名
```

#### 対応AIバックエンドの例

| サービス | AI_BASE_URL | AI_MODEL |
|---|---|---|
| [Ollama](https://ollama.com)（ローカル） | `http://localhost:11434/v1` | `llama3.2` 等 |
| [LM Studio](https://lmstudio.ai)（ローカル） | `http://localhost:1234/v1` | モデルに応じて |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o` 等 |

### 3. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 をブラウザで開くとブースが表示されます。

---

## カスタマイズ

カスタマイズはすべて `content/` ディレクトリのファイルを編集するだけです。

```
content/
├── guide.md         ← AIへの指示・ブース設定・スライド
├── knowledge/       ← AIが検索して参照する詳細資料（何ファイルでも可）
├── images/          ← スライドに表示する画像
├── skin.css         ← カラーテーマ（CSS変数）
├── pamphlet.html    ← パンフレットの内容（HTML）
└── attendant.svg    ← AI担当者のキャラクター画像（省略時はデフォルトキャラ）
```

### guide.md — AIの知識とブース設定

ファイル冒頭の「ブース設定」セクションでタイトル・サブタイトル・担当者名を変更できます。

```markdown
## ブース設定
- タイトル: 自社ブース
- サブタイトル: ようこそ！
- 担当者名: AI担当者
```

それ以外の本文（役割・製品紹介・よくある質問・トーンなど）がAIへのプロンプトになり、毎回AIに渡されます。
必ず守らせたいルールや基本情報は `guide.md` に、細かい情報や量の多い資料は次の `knowledge/` に置くのがおすすめです。

`guide.md` には、アプリが読み取る次のセクションも書けます。

| セクション | 内容 |
|---|---|
| `## 参照ファイル` | 資料検索の対象に加えるファイル（`content/` からの相対パス） |
| `## 外部ソース` | 資料検索の対象に加えるURL（`- 表示名: URL` 形式） |
| `## おすすめの質問` | 会話ウィンドウに表示する質問ボタン（1つ40文字以内、4つまで表示） |
| `## ディスプレイスライド` | スライドの定義 |

### knowledge/ — 詳しい資料（資料検索）

`content/knowledge/` に Markdown（`.md`）・テキスト（`.txt`）・HTML（`.html`）を置くだけで、AIが質問に応じて検索するようになります。設定は不要で、サブフォルダに分けても構いません。

資料は見出しごとに小さく分割され、質問に関連する部分だけ（合計およそ3000文字まで）がAIに渡されます。そのため資料を増やしてもプロンプトが膨らみません。回答の際は、参照した資料名が会話ウィンドウに表示されます。

- 検索はキーワード方式（BM25）です。見出しに、来場者が質問で使いそうな言葉を入れると見つかりやすくなります
- PDF や Word の資料は、テキストか Markdown に変換して置いてください

### 外部ソース — 最新情報

頻繁に変わる情報は、`guide.md` にURLを書いておくと自動で取得されます（1時間キャッシュ・5秒でタイムアウト・失敗しても通常の回答は継続）。

```markdown
## 外部ソース
- 最近の更新履歴: https://github.com/ユーザー名/リポジトリ名/commits/main.atom
```

HTML ページ、Atom / RSS フィード、JSON を返す API、テキストに対応しています。
取得するのは `guide.md` に書かれたURLだけで、来場者の入力やAIの出力からURLを取得することはありません。

### スライド

`## ディスプレイスライド` の下に `### SLIDE:番号` で1枚ずつ定義します。枚数に上限はありません。

```markdown
### SLIDE:6
label: PRICING
items:
  - 🆓 フリー: 0円
  - 💼 プロ: 月額980円
note: 料金・プラン・無料かどうかを聞かれた時に使う。
```

| 項目 | 内容 |
|---|---|
| `label` / `title` / `body` | 見出し / 大タイトル（`\|` で改行）/ 本文 |
| `items` / `steps` / `code` | 絵文字つき箇条書き / 番号つき手順 / コード1行 |
| `image` | `content/images/` に置いた画像のファイル名（png・jpg・gif・webp・svg） |
| `note` | AI向けメモ（説明ポイントと、どんな質問の時に使うか）。画面には表示されません |

スライドの一覧と `note` は自動でAIに伝えられ、AIは話題に合わせて `[SLIDE:N]` マーカーでディスプレイを切り替えます。

### skin.css — カラーテーマ

CSS変数を書き換えるだけでデザインを変更できます。グリーン系テーマのサンプルもコメントで収録済みです。

```css
:root {
  --vb-accent: #ff6ef7;       /* ネオンアクセント色 */
  --vb-wall-start: #3d2b79;   /* 壁の上部色 */
  --vb-chat-bg: rgba(6,6,20,0.65); /* チャット背景 */
  /* ... */
}
```

また、`attendant.svg` 内のIDを使ったアニメーション（目パチなど）のサンプルもコメントで収録しています。
看板と会話ウィンドウのフォント（既定はドット文字の DotGothic16）は `--vb-font-dialog` で変更できます。

### pamphlet.html — パンフレット

`content/pamphlet.html` を編集するとブース上のサムネイルにも自動反映されます（iframe縮小表示）。
`/pamphlet` にアクセスすると全画面で確認でき、ブラウザの印刷機能でPDF保存も可能です。

### attendant.svg — カスタムキャラクター

`content/attendant.svg` を置くとデフォルトのCSSキャラクターの代わりに表示されます。
SVG内のIDに対して `skin.css` からアニメーションを適用することもできます。

担当者には会話の状況に応じて `data-state`（`idle` 待機中 / `thinking` 考え中 / `talking` 回答中）が付きます。
SVG 内の口のパーツに `id="attendant-mouth"` を付けておくと、回答中に自動で口パクします。
`skin.css` から `.vb-attendant[data-state="talking"]` のようなセレクタで、状態ごとの演出を自作することもできます。

---

## Vercel へのデプロイ

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/haya256/virtual-booth)

Vercelにデプロイする際は、ダッシュボードの **Settings → Environment Variables** で以下を設定してください。

| 変数名 | 説明 |
|---|---|
| `AI_BASE_URL` | AIのAPIエンドポイントURL |
| `AI_API_KEY` | APIキー |
| `AI_MODEL` | 使用するモデル名 |

---

## 技術スタック

- [Next.js](https://nextjs.org) (App Router / TypeScript)
- [Tailwind CSS v4](https://tailwindcss.com)
- [openai](https://www.npmjs.com/package/openai) パッケージ（OpenAI互換APIクライアント・SSEストリーミング）
- 資料検索は依存ライブラリなしの自前実装（`src/lib/knowledge.ts`）。ベクトルDBなどの追加サービスは不要

## ライセンス

MIT
