# 設計仕様書：議事録生成ツール（3New Studio）

**作成日:** 2026-05-27  
**対象プロジェクト:** 3New Studio（`studio.3new.eu`）  
**フェーズ:** フェーズ1（テキスト整形）→ フェーズ2（音声文字起こし）

---

## 1. 概要

3New Studio に議事録生成ツールを追加する。文字起こし済みテキストを貼り付けると、指定フォーマットの日本語議事録を生成し、オプションで英訳・Notionへの自動保存ができる。ログイン済みの `member` ロール以上のユーザーのみ利用可能。

---

## 2. 全体アーキテクチャ

```
3New Studio（Next.js 15、Vercel）
│
├── 公開ツール（認証不要）
│   └── Markdown / YAML / JSON / HTML / パスワード / 画像系（変更なし）
│
├── ログイン必須ツール（member ロール以上）
│   └── /tools/minutes（議事録生成）← 今回追加
│       将来の有料ツールもここに追加
│
├── 認証レイヤー（Supabase Auth）
│   ├── ログイン: メール+パスワード / Googleアカウント
│   └── ロール: public / member / pro（将来のStripe連携用）
│
└── API Routes（Next.js Server）
    ├── POST /api/minutes    → Claude API（議事録生成・英訳）
    ├── POST /api/notion     → Notion API（ページ作成）
    └── POST /api/transcribe → OpenAI API（音声文字起こし・フェーズ2）
```

### 重要な変更点
- `next.config.ts` の `output: 'export'` を削除し、Next.js API Routes を有効化する
- Vercelへのデプロイ方法・ドメイン設定に変更なし

---

## 3. 認証設計（Supabase Auth）

### ロール定義

| ロール | 対象 | アクセスできるツール |
|--------|------|---------------------|
| `public` | 未ログイン / ロールなし | 既存の全公開ツール |
| `member` | 無料登録ユーザー（社内含む） | 公開ツール + 議事録ツール |
| `pro` | 有料会員（将来Stripe連携） | 全ツール + 将来の高機能ツール |

### ToolConfig への追加

```typescript
export interface ToolConfig {
  id: ToolId
  label: string
  group: 'text' | 'image'
  defaultExtension: string
  defaultContent: string
  requiresAuth?: boolean   // true = member ロール以上が必要
  requiredRole?: 'member' | 'pro'  // 省略時は 'member'
}
```

Sidebar は `requiresAuth: true` のツールに鍵アイコンを表示。未ログイン状態でアクセスするとログイン画面にリダイレクト。

### ログイン画面
- `/login` ページを新規作成
- メール+パスワード / Googleアカウントでサインイン
- ログイン後は元のURLに戻る

---

## 4. 議事録ツール UI（/tools/minutes）

### フェーズ1レイアウト

```
┌──────────────────────────────────────────────────┐
│  📝 議事録生成                                    │
│                                                  │
│  会議タイトル（任意）: [________________]         │
│  日付: [2026-05-27]                              │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │ 文字起こしテキストを貼り付けてください    │   │
│  │                                          │   │
│  │                                          │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  AIモデル: [⚡ Haiku（高速）] [✨ Sonnet（高精度）]│
│  言語:     [🇯🇵 日本語のみ]  [🔄 英語も生成]     │
│                                                  │
│  [✨ 議事録を生成]                               │
└──────────────────────────────────────────────────┘

↓ 生成後

┌──────────────────────────────────────────────────┐
│  📋 生成された議事録                              │
│                                                  │
│  1. 会議の目的 ...                               │
│  2. 主な議論ポイント ...                         │
│  3. 結果・合意事項 ...                           │
│  4. エスカレーション／フォローアップ ...          │
│  5. アクションアイテム ...                       │
│                                                  │
│  [📋 コピー]  [📨 Notionに保存]  [🔄 再生成]    │
└──────────────────────────────────────────────────┘
```

### フェーズ2追加（音声ファイル対応）

テキスト入力エリアの上に音声アップロードエリアを追加：

```
┌──────────────────────────────────────────────────┐
│  🎤 音声ファイル（任意）                          │
│  [ファイルをドロップ or クリックして選択]          │
│  対応形式: m4a / mp3 / wav / mp4                 │
│                                                  │
│  文字起こしモデル:                               │
│  [⚡ mini（高速・$0.003/分）]                    │
│  [🎤 4o（高精度・話者識別・$0.006/分）]           │
└──────────────────────────────────────────────────┘
```

音声ファイルをアップロードすると自動で文字起こし → テキストエリアに流し込まれる。その後、通常の議事録生成フローへ。

---

## 5. 議事録フォーマット

以下の5セクション固定（Claude APIへのシステムプロンプトに埋め込む）：

```
1. 会議の目的
   定例ミーティング／特定テーマの協議

2. 主な議論ポイント
   トピック／背景・状況
   認識共有・方向性のすり合わせ

3. 結果・合意事項
   合意・確認された内容
   特記事項がない限り、正式な意思決定はなし

4. エスカレーション／フォローアップ
   □ PLレポートの更新が必要
   □ 変更履歴（Change Log）の作成開始が必要
   □ 追加対応不要

5. アクションアイテム（必要に応じて）
   対応内容／担当者／期限
```

---

## 6. データフロー

### 議事録生成（フェーズ1）

```
1. ユーザーがテキスト入力 → POST /api/minutes
2. APIルートがSupabase JWTを検証（未認証→401、権限不足→403）
3. Claude API呼び出し（サーバー側 → APIキー非公開）
   - モデル: haiku or sonnet（リクエストで指定）
   - 日本語議事録生成
   - 英訳フラグが true の場合は続けて英訳も生成
4. 整形済み議事録をレスポンスとして返す
```

### Notion保存

```
1. 「Notionに保存」押下 → POST /api/notion
2. JWTを再検証
3. Notion APIで指定DBに新規ページ作成
4. 作成されたNotionページのURLをレスポンスとして返す
5. UIにNotionリンクを表示
```

### 音声文字起こし（フェーズ2）

```
1. 音声ファイルアップロード → POST /api/transcribe
2. JWTを検証
3. OpenAI Transcription API呼び出し
   - モデル: gpt-4o-mini-transcribe or gpt-4o-transcribe（指定）
   - 4oモデル時は話者識別（diarization）も取得
4. 文字起こしテキストをレスポンスとして返す → テキストエリアに自動入力
```

### セキュリティ
- Claude API・OpenAI API・Notion APIキーはすべてVercel環境変数に保存（ブラウザ非公開）
- 全APIルートでSupabase JWT検証を実施
- `member` 未満は403を返す

---

## 7. 使用モデルと料金

### 議事録生成（Claude）

| モデル | API ID | 入力 | 出力 | 議事録1件※ |
|--------|--------|------|------|-----------|
| Haiku 4.5（デフォルト） | `claude-haiku-4-5` | $1/MTok | $5/MTok | ~$0.008 |
| Sonnet 4.6 | `claude-sonnet-4-6` | $3/MTok | $15/MTok | ~$0.024 |

※3,000トークン入力 + 1,000トークン出力の想定

### 音声文字起こし（OpenAI・フェーズ2）

| モデル | API ID | 料金 | 60分会議 | 話者識別 |
|--------|--------|------|----------|---------|
| mini（デフォルト） | `gpt-4o-mini-transcribe` | $0.003/分 | $0.18 | なし |
| 高精度 | `gpt-4o-transcribe` | $0.006/分 | $0.36 | あり |

---

## 8. API Key 管理

本プロジェクトで使用するAPIキーは用途ごとに別キーを発行し、以下の台帳に末尾文字とメモを記録する。

**台帳:** [🔑 API Key 管理台帳](https://www.notion.so/36d09405541d8147ad85c434e3c1686c)

| サービス | 用途 | Vercel環境変数名 |
|----------|------|----------------|
| Anthropic (Claude) | 議事録生成・英訳 | `ANTHROPIC_API_KEY` |
| OpenAI | 音声文字起こし（フェーズ2） | `OPENAI_API_KEY` |
| Supabase | 認証・ユーザー管理 | `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` |
| Notion | 議事録ページ自動作成 | `NOTION_API_KEY` / `NOTION_DATABASE_ID` |

**キー発行後は必ず台帳に末尾文字とメモを記録すること。**

> `NOTION_DATABASE_ID` には、議事録を保存したいNotionデータベースのIDを設定する。  
> 既存DBを使う場合はURLから取得。新規作成する場合はNotionで「議事録」DBを作成してIDを控える。

---

## 9. フォルダ構成（追加・変更分のみ）

```
3new-studio/
├── app/
│   ├── login/
│   │   └── page.tsx                    # ログイン画面（新規）
│   ├── tools/
│   │   └── minutes/
│   │       └── page.tsx                # 議事録ツールページ（新規）
│   └── api/
│       ├── minutes/
│       │   └── route.ts                # Claude API呼び出し（新規）
│       ├── notion/
│       │   └── route.ts                # Notion API呼び出し（新規）
│       └── transcribe/
│           └── route.ts                # OpenAI Transcription（フェーズ2）
├── components/
│   └── tools/
│       └── MinutesTool.tsx             # 議事録ツールUIコンポーネント（新規）
├── lib/
│   ├── supabase.ts                     # Supabaseクライアント（新規）
│   └── auth.ts                         # JWT検証ユーティリティ（新規）
└── types/
    └── index.ts                        # ToolId に 'minutes' 追加・ToolConfig に requiresAuth / requiredRole 追加（変更）
```

---

## 10. 実装フェーズ

### フェーズ1（今回の実装対象）
1. `output: 'export'` 削除・API Routes有効化
2. Supabase Auth セットアップ（メール+Google）
3. ログイン画面・認証ミドルウェア実装
4. `requiresAuth` フラグをToolConfigに追加・Sidebarに鍵アイコン表示
5. `/api/minutes` ルート実装（Claude API）
6. `/api/notion` ルート実装（Notion API）
7. `MinutesTool.tsx` コンポーネント実装
8. `/tools/minutes` ページ追加・TOOLS登録

### フェーズ2（後続実装）
9. `/api/transcribe` ルート実装（OpenAI Transcription API）
10. `MinutesTool.tsx` に音声アップロードUI追加
