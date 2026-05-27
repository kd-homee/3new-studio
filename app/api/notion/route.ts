import { createClient } from '@/lib/supabase/server'
import { Client as NotionClient } from '@notionhq/client'
import { NextResponse } from 'next/server'

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
    children: [
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: { content },
            },
          ],
        },
      },
    ],
  })

  return NextResponse.json({ url: (page as any).url })
}
