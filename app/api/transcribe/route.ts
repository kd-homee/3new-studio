import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'

const openai = new OpenAI({ apiKey: (process.env.OPENAI_API_KEY ?? '').trim() })

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const audio = formData.get('audio')
  const language = (formData.get('language') as string | null) ?? 'ja'

  if (!audio || !(audio instanceof Blob)) {
    return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
  }

  const filename = audio instanceof File ? audio.name : 'audio.m4a'
  const file = new File([audio], filename, { type: audio.type })

  const result = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    language,
  })

  return NextResponse.json({ text: result.text })
}
