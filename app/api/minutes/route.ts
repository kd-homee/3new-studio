import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const SYSTEM_PROMPT = `あなたはプロの議事録作成者です。提供された文字起こしテキストから、日本語で正式な議事録を作成してください。

必ず以下の5セクション形式で出力してください：

## 1. 会議の目的
定例ミーティング／特定テーマの協議を簡潔に記述。

## 2. 主な議論ポイント
- トピック／背景・状況
- 認識共有・方向性のすり合わせ

## 3. 結果・合意事項
- 合意・確認された内容
- 特記事項がない限り、正式な意思決定はなし

## 4. エスカレーション／フォローアップ
以下のチェックリスト形式で記述（該当するもののみ）：
- [ ] PLレポートの更新が必要
- [ ] 変更履歴（Change Log）の作成開始が必要
- [ ] 追加対応不要

## 5. アクションアイテム（必要に応じて）
| 対応内容 | 担当者 | 期限 |
|---------|--------|------|

文字起こしから明確に読み取れる内容のみ記述し、不明な点は省略してください。`

const TRANSLATION_PROMPT = `You are a professional translator. Translate the following Japanese meeting minutes to English. Maintain the exact same 5-section structure and format. Keep the checkbox list format for escalation items and the table format for action items.`

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { transcript, model, includeEnglish, title } = (await request.json()) as {
    transcript: string
    model: 'haiku' | 'sonnet'
    includeEnglish: boolean
    title: string
  }

  if (!transcript?.trim()) {
    return NextResponse.json({ error: 'transcript is required' }, { status: 400 })
  }

  const claudeModel = model === 'sonnet' ? 'claude-sonnet-4-6' : 'claude-haiku-4-5'
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const userContent = title
    ? `会議タイトル: ${title}\n\n文字起こし:\n${transcript}`
    : `文字起こし:\n${transcript}`

  try {
    const jaResponse = await client.messages.create({
      model: claudeModel,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    })

    const japanese =
      jaResponse.content[0].type === 'text' ? jaResponse.content[0].text : ''

    let english: string | null = null
    if (includeEnglish) {
      const enResponse = await client.messages.create({
        model: claudeModel,
        max_tokens: 4096,
        system: TRANSLATION_PROMPT,
        messages: [{ role: 'user', content: japanese }],
      })
      english =
        enResponse.content[0].type === 'text' ? enResponse.content[0].text : null
    }

    return NextResponse.json({ japanese, english })
  } catch (err) {
    console.error('[/api/minutes]', err)
    return NextResponse.json({ error: 'AI生成に失敗しました' }, { status: 500 })
  }
}
