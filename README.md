# Virtual Booth

イベントブースをWebで再現するAIアシスタント付きのオープンソースプラットフォームです。

AIアシスタントが来場者の質問にリアルタイムで対応し、スライドを切り替えながらプロダクト紹介も行います。
このリポジトリ自体がデモサンプルとして動作します。

**デモ**: https://virtual-booth-nine.vercel.app

---

## 特徴

- **AIリアルタイム対応** — OpenAI互換APIであれば何でも利用可能（Ollama、さくらのAI Engine、LM Studio等）
- **スライド連携** — AIがスライドを切り替えながら説明するRPGダイアログ風のUI
- **カスタマイズ簡単** — `content/guide.md` を書き換えるだけでAIの知識・口調・対応内容を変更可能
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

### 3. AIの知識・対応内容のカスタマイズ

`content/guide.md` を編集することで、AIが答える内容を自由に変更できます。

```
content/
└── guide.md   ← ここを編集するだけ
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 をブラウザで開くとブースが表示されます。

---

## Vercel へのデプロイ

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/haya256/virtual-booth)

Vercelにデプロイする際は、ダッシュボードの **Settings → Environment Variables** で以下の環境変数を設定してください。

| 変数名 | 説明 |
|---|---|
| `AI_BASE_URL` | AIのAPIエンドポイントURL |
| `AI_API_KEY` | APIキー |
| `AI_MODEL` | 使用するモデル名 |

---

## 技術スタック

- [Next.js](https://nextjs.org) (App Router / TypeScript)
- [Tailwind CSS v4](https://tailwindcss.com)
- [openai](https://www.npmjs.com/package/openai) パッケージ（OpenAI互換APIクライアント）

## ライセンス

MIT
