# Virtual Booth

イベントブースをWebで再現するAIアシスタント付きのオープンソースプラットフォームです。

AIアシスタントが来場者の質問にリアルタイムで対応し、スライドを切り替えながらプロダクト紹介を行います。
`content/` ディレクトリのファイルを書き換えるだけで、自分のブースとして使えます。

**デモ**: https://virtual-booth-nine.vercel.app

---

## 特徴

- **AIリアルタイム対応** — OpenAI互換APIであれば何でも利用可能（Ollama、LM Studio、OpenAI等）
- **スライド連携** — AIがスライドを切り替えながら説明するRPGダイアログ風UI。ページネーション・キーボード操作対応
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
├── guide.md         ← AIへの指示・ブース設定・スライド説明
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
- 担当者名: 田中
```

以降の本文がAIへのプロンプトになります。AIが答える内容・口調・スライドの説明をここに記述してください。

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

### pamphlet.html — パンフレット

`content/pamphlet.html` を編集するとブース上のサムネイルにも自動反映されます（iframe縮小表示）。
`/pamphlet` にアクセスすると全画面で確認でき、ブラウザの印刷機能でPDF保存も可能です。

### attendant.svg — カスタムキャラクター

`content/attendant.svg` を置くとデフォルトのCSSキャラクターの代わりに表示されます。
SVG内のIDに対して `skin.css` からアニメーションを適用することもできます。

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

## ライセンス

MIT
