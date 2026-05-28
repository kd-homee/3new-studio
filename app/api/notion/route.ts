import { createClient } from '@/lib/supabase/server'
import { Client as NotionClient } from '@notionhq/client'
import { NextResponse } from 'next/server'

type RT = { type: 'text'; text: { content: string } }

function rt(content: string): RT[] {
  return [{ type: 'text', text: { content } }]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function markdownToBlocks(markdown: string): any[] {
  const lines = markdown.split('\n')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blocks: any[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i].trim()

    if (line.startsWith('## ')) {
      blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: rt(line.slice(3)) } })
    } else if (line.startsWith('### ')) {
      blocks.push({ object: 'block', type: 'heading_3', heading_3: { rich_text: rt(line.slice(4)) } })
    } else if (/^- \[ \] /.test(line)) {
      blocks.push({ object: 'block', type: 'to_do', to_do: { rich_text: rt(line.slice(6)), checked: false } })
    } else if (/^- \[x\] /i.test(line)) {
      blocks.push({ object: 'block', type: 'to_do', to_do: { rich_text: rt(line.slice(6)), checked: true } })
    } else if (line.startsWith('- ')) {
      blocks.push({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: rt(line.slice(2)) } })
    } else if (line === '---') {
      blocks.push({ object: 'block', type: 'divider', divider: {} })
    } else if (line.startsWith('|') && line.endsWith('|')) {
      // テーブルブロック
      const tableLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim())
        i++
      }
      const rows = tableLines
        .filter(l => !/^\|[\s\-:|]+\|$/.test(l))
        .map(l => l.slice(1, -1).split('|').map(c => c.trim()))
      if (rows.length > 0) {
        const w = Math.max(...rows.map(r => r.length))
        blocks.push({
          object: 'block',
          type: 'table',
          table: { table_width: w, has_column_header: true, has_row_header: false },
          children: rows.map(row => ({
            object: 'block',
            type: 'table_row',
            table_row: { cells: Array.from({ length: w }, (_, j) => rt(row[j] ?? '')) },
          })),
        })
      }
      continue
    } else if (line !== '') {
      const CHUNK = 1900
      for (let j = 0; j < line.length; j += CHUNK) {
        blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: rt(line.slice(j, j + CHUNK)) } })
      }
    }
    i++
  }

  return blocks
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

    const pageTitle = title ? `${date} ${title}` : `議事録 ${date}`

    const page = await notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        title: {
          title: [{ text: { content: pageTitle } }],
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      children: markdownToBlocks(content) as any,
    })

    const url = 'url' in page ? page.url : null
    return NextResponse.json({ url })
  } catch (err) {
    console.error('[/api/notion]', err)
    return NextResponse.json({ error: 'Notionへの保存に失敗しました' }, { status: 500 })
  }
}
