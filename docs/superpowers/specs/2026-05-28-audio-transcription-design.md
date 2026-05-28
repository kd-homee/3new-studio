# 音声文字起こし機能 設計書

**日付:** 2026-05-28  
**対象プロジェクト:** 3NEW STUDIO - 議事録生成ツール  
**フェーズ:** Phase 2

---

## 概要

iPhoneのボイスメモアプリで録音した音声ファイル、またはブラウザ内で直接録音した音声を、OpenAI Whisper APIで文字起こしし、議事録生成ツールのテキストエリアに自動入力する機能を追加する。

---

## ユーザーの利用シーン

- **メイン:** iPhoneのボイスメモで会議を録音 → 後からファイルをアップロードして文字起こし
- **サブ:** ブラウザ内でその場で録音（短時間の打ち合わせ向け）
- **デバイス:** iPhone Safari + PC ブラウザの両方で使用

---

## UI設計

### レイアウト（MinutesTool.tsx に追加）

既存のテキストエリアの上に音声入力エリアを追加する。

```
[会議タイトル]                    [日付]
─────────────────────────────────────────
┌───────────────────────────────────────┐
│                                       │
│   🎵 音声ファイルをここにドロップ        │  ← 主役（大きめ）
│   または タップして選択                 │
│   対応形式: m4a / mp3 / wav / webm    │
│   上限: 25MB（超える場合は自動分割）    │
│                                       │
└───────────────────────────────────────┘

  その場で録音する 🎤                      ← 補助（小さめリンク）

─────────────────────────────────────────
▼ ファイル選択 or 録音停止後の状態

voice_memo_0528.m4a (3分24秒)  [✕ 削除]
[ 🔤 文字起こし開始 ]

─────────────────────────────────────────
[テキストエリア]  ← 文字起こし結果が入る（既存）
```

### 状態遷移

1. **初期状態** — アップロードゾーン + 「録音する」リンク表示
2. **ファイル選択済み / 録音完了** — ファイル名・時間・「文字起こし開始」ボタン表示
3. **文字起こし中** — プログレス表示（分割時は「処理中... 2/4」）
4. **完了** — テキストエリアに自動入力、成功メッセージ表示
5. **エラー** — エラーメッセージ表示、ファイルは保持

---

## アーキテクチャ

### 新規追加ファイル

```
3new-studio/
├── app/api/transcribe/route.ts   ← 新規APIエンドポイント
└── components/tools/
    └── MinutesTool.tsx            ← 音声入力UIを追加
```

### データフロー

```
[ブラウザ]
  ファイル選択 or 録音停止
    ↓
  25MB超？ → Web Audio API で約10分ごとに自動分割（16kHz モノラル WAV に再エンコード）
    ↓
  「文字起こし開始」ボタンを押す（手動トリガー）
    ↓
  FormData で /api/transcribe に POST（チャンクごとに順番に送信）
    ↓
[サーバー: /api/transcribe/route.ts]
  OpenAI Whisper API (whisper-1, language: 'ja') に転送
    ↓
  テキストを返す
    ↓
[ブラウザ]
  全チャンクのテキストを結合 → テキストエリアに自動入力
```

### 新規APIエンドポイント: POST /api/transcribe

- **受け取り:** `multipart/form-data` — `audio` フィールドにファイル
- **処理:** OpenAI Whisper API `whisper-1` モデルに転送、`language: 'ja'` 指定
- **返却:** `{ text: string }`
- **エラー:** 400（非対応形式）、500（API失敗）

---

## フロントエンド実装詳細

### 追加するReact状態

```typescript
const [audioFile, setAudioFile] = useState<File | null>(null)
const [isRecording, setIsRecording] = useState(false)
const [isTranscribing, setIsTranscribing] = useState(false)
const [transcribeProgress, setTranscribeProgress] = useState<string | null>(null)
```

### 音声分割ロジック（クライアントサイド）

- `File` を `AudioContext.decodeAudioData()` でデコード
- 総サンプル数から約10分ずつのチャンクに分割
- 各チャンクを 16kHz モノラル WAV にエンコードして `Blob` 化（10分チャンク ≈ 19MB、Whisper上限25MB以内に収まる）
- チャンクを順番に `/api/transcribe` に送信し、テキストを結合

### ブラウザ録音

- `navigator.mediaDevices.getUserMedia({ audio: true })` でマイク取得
- `MediaRecorder` で録音（webm/opus形式）
- 停止時に `Blob` → `File` に変換して `audioFile` に格納
- iPhoneのSafariではアプリ切り替え・画面ロックで録音が停止するため、その旨を録音開始時に注意表示する

---

## エラーハンドリング

| ケース | ユーザーへの表示 |
|---|---|
| 非対応ファイル形式 | 「m4a / mp3 / wav / webm のみ対応しています」 |
| 分割・変換中 | 「音声を処理中... (2/4)」 |
| Whisper API エラー | 「文字起こしに失敗しました。もう一度お試しください」 |
| マイク許可拒否 | 「マイクへのアクセスを許可してください」 |
| APIキー未設定 | サーバーログのみ（ユーザーには汎用エラーメッセージ） |

---

## 必要な環境変数・パッケージ

### 追加パッケージ

```bash
npm install openai
```

（`openai` パッケージは Whisper API 呼び出しに使用。Claude API には `@anthropic-ai/sdk` を引き続き使用）

### 環境変数

```env
OPENAI_API_KEY=sk-...
```

`.env.local` に追加。API Key管理台帳（Notion）への記録も行うこと。

---

## 対象外（スコープ外）

- リアルタイム文字起こし（録音しながら同時にテキスト化）
- 話者分離（誰が話しているかの識別）
- 日本語以外の言語対応
- 音声ファイルのサーバー保存

---

## 実装順序（概要）

1. `/api/transcribe/route.ts` を作成（Whisper API呼び出し）
2. `MinutesTool.tsx` にファイルアップロードUIを追加
3. 音声分割ロジックを実装
4. ブラウザ録音UIを追加
5. 結合テスト
