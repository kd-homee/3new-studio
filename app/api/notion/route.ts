import { createClient } from '@/lib/supabase/server'
import { Client as NotionClient } from '@notionhq/client'
import { NextResponse } from 'next/server'

function splitIntoBlocks(text: string): Array<{
  object: 'block'
  type: 'paragraph'
  paragraph: { rich_text: Array<{ type: 'text'; text: { content: string } }> }
}> {
  const CHUNK_SIZE = 1900
  const chunks: string[] = []
  let remaining = text
  while (remaining.length > 0) {
    chunks.push(remaining.slice(0, CHUNK_SIZE))
    remaining = remaining.slice(CHUNK_SIZE)
  }
  return chunks.map((chunk) => ({
    object: 'block' as const,
    type: 'paragraph' as const,
    paragraph: {
      rich_text: [{ type: 'text' as const, text: { content: chunk } }],
    },
  }))
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { title, content, date } = (await request.json()) as {
    title: string
    content: string
    date: string
  }

  try {
    const notion = new NotionClient({ auth: process.env.NOTION_API_KEY })
    const databaseId = process.env.NOTION_DATABASE_ID!

    const pageTitle = title
      ? `${date} ${title}`
      : `議事録 ${date}`

    const page = await notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        title: {
          title: [{ text: { content: pageTitle } }],
        },
      },
      children: splitIntoBlocks(content),
    })

    const url = 'url' in page ? page.url : null
    return NextResponse.json({ url })
  } catch (err) {
    console.error('[/api/notion]', err)
    return NextResponse.json({ error: 'Notionへの保存に失敗しました' }, { status: 500 })
  }
}
