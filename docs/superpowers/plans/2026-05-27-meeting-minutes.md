# 議事録生成ツール 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 3New Studio に認証付き議事録生成ツールを追加する（テキスト入力 → Claude API → 5セクション議事録生成 → Notionへ自動保存）

**Architecture:** 静的エクスポート（`output: 'export'`）を廃止してNext.js API Routesを有効化。Supabase Authで `member` ロール以上のユーザーのみ `/tools/minutes` にアクセスを許可。サーバーサイドのAPI RouteからClaude API・Notion APIを呼び出す。APIキーはVercel環境変数で管理。

**Tech Stack:** Next.js 16 (App Router, API Routes), Supabase Auth (`@supabase/ssr`), Claude API (`@anthropic-ai/sdk`), Notion API (`@notionhq/client`), TypeScript strict, TailwindCSS v4, Jest + @testing-library/react

**API Key 台帳:** https://www.notion.so/36d09405541d8147ad85c434e3c1686c  
キー発行後は台帳に末尾文字とメモを必ず記録すること。

---

## ファイルマップ

| ファイル | 操作 | 責務 |
|---------|------|------|
| `next.config.ts` | 変更 | `output: 'export'` 削除・API Routes有効化 |
| `package.json` | 変更 | `start` スクリプト修正・依存追加 |
| `types/index.ts` | 変更 | `ToolId` に `'minutes'` 追加・`ToolConfig` に `requiresAuth` 追加 |
| `lib/supabase/client.ts` | 新規 | ブラウザ用Supabaseクライアント |
| `lib/supabase/server.ts` | 新規 | サーバー用Supabaseクライアント（API Route内で使用） |
| `middleware.ts` | 新規 | セッション更新・保護ルートへの未認証アクセスをリダイレクト |
| `app/login/page.tsx` | 新規 | ログイン画面（メール+パスワード / Google） |
| `app/auth/callback/route.ts` | 新規 | Google OAuth コールバック処理 |
| `components/layout/Sidebar.tsx` | 変更 | `requiresAuth` ツールに鍵アイコン表示・ログアウトボタン追加 |
| `app/api/minutes/route.ts` | 新規 | Claude API呼び出し・JWT検証 |
| `app/api/notion/route.ts` | 新規 | Notion API呼び出し・JWT検証 |
| `components/tools/MinutesTool.tsx` | 新規 | 議事録ツールUIコンポーネント |
| `app/tools/minutes/page.tsx` | 新規 | 議事録ページ（MinutesToolをレンダリング） |
| `.env.example` | 新規 | 必要な環境変数の一覧 |
| `__tests__/api/minutes.test.ts` | 新規 | /api/minutes のユニットテスト |
| `__tests__/api/notion.test.ts` | 新規 | /api/notion のユニットテスト |
| `__tests__/components/MinutesTool.test.tsx` | 新規 | MinutesTool のコンポーネントテスト |

---

## Task 1: Next.jsドキュメント確認・静的エクスポート廃止

**Files:**
- Modify: `next.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Next.js 16のRoute Handlerドキュメントを読む**

```bash
cat "node_modules/next/dist/docs/02-app/01-getting-started/route-handlers.md" 2>/dev/null | head -100 || echo "path not found, try:"
ls node_modules/next/dist/docs/
```

出力からRoute HandlerとMiddlewareの現在のAPIを確認する。特に `cookies()` の非同期API・`NextResponse` の使い方を確認。

- [ ] **Step 2: `next.config.ts` を更新して静的エクスポートを廃止する**

`next.config.ts` を以下に置き換える：

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  trailingSlash: true,
  images: { unoptimized: true },
}

export default nextConfig
```

- [ ] **Step 3: `package.json` の `start` スクリプトを修正する**

`"start": "npx serve out"` を以下に変更：

```json
"start": "next start"
```

- [ ] **Step 4: ビルドが通ることを確認する**

```bash
npm run build
```

期待出力: `✓ Compiled successfully` または `Route (app)` のリストが表示される。エラーなし。

- [ ] **Step 5: コミットする**

```bash
git add next.config.ts package.json
git commit -m "chore: remove static export to enable API routes"
```

---

## Task 2: 依存パッケージのインストール

**Files:**
- Modify: `package.json`（npm install により自動更新）

- [ ] **Step 1: 必要パッケージをインストールする**

```bash
npm install @supabase/supabase-js @supabase/ssr @anthropic-ai/sdk @notionhq/client
```

期待出力: `added N packages` の表示。エラーなし。

- [ ] **Step 2: インストール確認**

```bash
node -e "require('@supabase/ssr'); require('@anthropic-ai/sdk'); require('@notionhq/client'); console.log('OK')"
```

期待出力: `OK`

- [ ] **Step 3: コミットする**

```bash
git add package.json package-lock.json
git commit -m "chore: install supabase, anthropic, notion dependencies"
```

---

## Task 3: 型定義の更新

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: `types/index.ts` を更新する**

`ToolId` に `'minutes'` を追加し、`ToolConfig` に `requiresAuth` と `requiredRole` を追加し、TOOLS配列に `minutes` エントリを追加する：

```typescript
export type ToolId =
  | 'markdown'
  | 'yaml'
  | 'json'
  | 'html'
  | 'password'
  | 'image-resize'
  | 'format-converter'
  | 'minutes'

export type Mode = 'edit' | 'split' | 'preview'

export interface ToolConfig {
  id: ToolId
  label: string
  group: 'text' | 'image' | 'ai'
  defaultExtension: string
  defaultContent: string
  requiresAuth?: boolean
  requiredRole?: 'member' | 'pro'
}

export const TOOLS: ToolConfig[] = [
  {
    id: 'markdown',
    label: 'Markdown',
    group: 'text',
    defaultExtension: 'md',
    defaultContent: '# Hello World\n\nStart writing...',
  },
  {
    id: 'yaml',
    label: 'YAML Config',
    group: 'text',
    defaultExtension: 'yaml',
    defaultContent: 'name: my-project\nversion: 1.0.0\n',
  },
  {
    id: 'json',
    label: 'JSON Data',
    group: 'text',
    defaultExtension: 'json',
    defaultContent: '{\n  "hello": "world"\n}\n',
  },
  {
    id: 'html',
    label: 'HTML Editor',
    group: 'text',
    defaultExtension: 'html',
    defaultContent:
      '<!DOCTYPE html>\n<html>\n<head>\n  <style>\n    body { font-family: sans-serif; padding: 20px; }\n  </style>\n</head>\n<body>\n  <h1>Hello World</h1>\n</body>\n</html>',
  },
  {
    id: 'password',
    label: 'パスワード生成',
    group: 'text',
    defaultExtension: 'txt',
    defaultContent: '',
  },
  {
    id: 'image-resize',
    label: '画像リサイズ',
    group: 'image',
    defaultExtension: 'png',
    defaultContent: '',
  },
  {
    id: 'format-converter',
    label: 'フォーマット変換',
    group: 'image',
    defaultExtension: 'png',
    defaultContent: '',
  },
  {
    id: 'minutes',
    label: '議事録生成',
    group: 'ai',
    defaultExtension: 'md',
    defaultContent: '',
    requiresAuth: true,
    requiredRole: 'member',
  },
]
```

- [ ] **Step 2: TypeScriptの型チェックを通す**

```bash
npx tsc --noEmit
```

期待出力: エラーなし（何も表示されない）

- [ ] **Step 3: コミットする**

```bash
git add types/index.ts
git commit -m "feat: add minutes tool type and requiresAuth flag to ToolConfig"
```

---

## Task 4: Supabase クライアントユーティリティ

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`

- [ ] **Step 1: ブラウザ用クライアントを作成する**

`lib/supabase/client.ts` を作成：

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 2: サーバー用クライアントを作成する**

`lib/supabase/server.ts` を作成：

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Componentから呼ばれた場合は無視
          }
        },
      },
    }
  )
}
```

- [ ] **Step 3: 型チェックを通す**

```bash
npx tsc --noEmit
```

期待出力: エラーなし

- [ ] **Step 4: コミットする**

```bash
git add lib/supabase/
git commit -m "feat: add supabase browser and server clients"
```

---

## Task 5: 認証ミドルウェア

**Files:**
- Create: `middleware.ts`

- [ ] **Step 1: ミドルウェアを作成する**

プロジェクトルートに `middleware.ts` を作成：

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_PATHS = ['/tools/minutes']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isProtected = PROTECTED_PATHS.some((p) =>
    request.nextUrl.pathname.startsWith(p)
  )

  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 2: 開発サーバーを起動してミドルウェアが動くか確認する**

```bash
npm run dev
```

ブラウザで `http://localhost:3000/tools/minutes` にアクセスし、`/login?redirectTo=/tools/minutes` にリダイレクトされることを確認（ログインページは次のタスクで作成するので、404が返るが `redirectTo` パラメータが付いていればOK）。

- [ ] **Step 3: コミットする**

```bash
git add middleware.ts
git commit -m "feat: add auth middleware for protected routes"
```

---

## Task 6: ログインページ

**Files:**
- Create: `app/login/page.tsx`
- Create: `app/auth/callback/route.ts`

- [ ] **Step 1: OAuth コールバックルートを作成する**

`app/auth/callback/route.ts` を作成：

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/tools/minutes'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
```

- [ ] **Step 2: ログインページを作成する**

`app/login/page.tsx` を作成：

```tsx
'use client'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

export default function LoginPage() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') ?? '/tools/minutes'
  const authError = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(
    authError === 'auth_failed' ? '認証に失敗しました。もう一度お試しください。' : null
  )

  const supabase = createClient()

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('メールアドレスまたはパスワードが正しくありません。')
    } else {
      window.location.href = redirectTo
    }
    setIsLoading(false)
  }

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${redirectTo}`,
      },
    })
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--bg-main)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{
          background: 'var(--bg-content)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0"
            style={{
              background: '#ffffff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 4px 10px rgba(0,0,0,0.14)',
            }}
          >
            <Image src="/logo/robot-bird.png" alt="3NEW logo" width={36} height={36} className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="font-black text-sm tracking-wide" style={{ color: 'var(--text-primary)' }}>
              3NEW STUDIO
            </div>
            <div className="text-[9px] font-semibold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
              メンバーログイン
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm text-red-700 bg-red-50 border border-red-200">
            {error}
          </div>
        )}

        {/* Google Login */}
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border text-sm font-medium mb-4 hover:bg-gray-50 transition-colors"
          style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
          </svg>
          Googleでログイン
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>または</span>
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        </div>

        {/* Email Login */}
        <form onSubmit={handleEmailLogin} className="space-y-3">
          <input
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2"
            style={{
              borderColor: 'var(--border)',
              background: 'var(--bg-editor)',
              color: 'var(--text-primary)',
              focusRingColor: 'var(--accent)',
            }}
          />
          <input
            type="password"
            placeholder="パスワード"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2"
            style={{
              borderColor: 'var(--border)',
              background: 'var(--bg-editor)',
              color: 'var(--text-primary)',
            }}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-gray-900 transition-opacity disabled:opacity-60"
            style={{
              backgroundImage: 'linear-gradient(135deg, var(--accent), var(--accent-light))',
              boxShadow: 'var(--shadow-accent)',
            }}
          >
            {isLoading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 開発サーバーで `/login` にアクセスして表示確認**

```bash
npm run dev
```

`http://localhost:3000/login` にアクセスし、ロゴ・Googleボタン・メールフォームが表示されることを確認。

- [ ] **Step 4: コミットする**

```bash
git add app/login/ app/auth/
git commit -m "feat: add login page with email and Google auth"
```

---

## Task 7: Sidebar の更新（鍵アイコン・ログアウト）

**Files:**
- Modify: `components/layout/Sidebar.tsx`

- [ ] **Step 1: Sidebar.tsx を更新する**

`components/layout/Sidebar.tsx` を以下に置き換える：

```tsx
'use client'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Lock, LogOut } from 'lucide-react'
import { TOOLS, type ToolConfig } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const textTools = TOOLS.filter((t) => t.group === 'text')
  const imageTools = TOOLS.filter((t) => t.group === 'image')
  const aiTools = TOOLS.filter((t) => t.group === 'ai')

  return (
    <aside
      className="w-[220px] min-w-[220px] flex flex-col border-r overflow-hidden"
      style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border)', boxShadow: '2px 0 8px rgba(0,0,0,0.04)' }}
    >
      {/* Logo Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div
          className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0"
          style={{
            background: '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 4px 10px rgba(0,0,0,0.14), 0 8px 20px rgba(0,0,0,0.08)',
          }}
        >
          <Image src="/logo/robot-bird.png" alt="3NEW logo" width={36} height={36} className="w-full h-full object-cover" />
        </div>
        <div>
          <div className="font-black text-sm tracking-wide" style={{ color: 'var(--text-primary)' }}>
            3NEW STUDIO
          </div>
          <div className="text-[9px] font-semibold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
            v1.0
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3">
        <ToolGroup label="テキストツール" tools={textTools} pathname={pathname} user={user} />
        <ToolGroup label="画像ツール" tools={imageTools} pathname={pathname} user={user} />
        <ToolGroup label="AI ツール" tools={aiTools} pathname={pathname} user={user} />
      </nav>

      {/* Footer: user info or login link */}
      <div className="flex items-center gap-2 px-4 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
        {user ? (
          <>
            <span className="flex-1 text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
              {user.email}
            </span>
            <button onClick={handleLogout} title="ログアウト" className="p-1 rounded hover:bg-gray-100">
              <LogOut size={13} style={{ color: 'var(--text-muted)' }} />
            </button>
          </>
        ) : (
          <Link href="/login" className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>
            ログイン
          </Link>
        )}
      </div>
    </aside>
  )
}

function ToolGroup({
  label,
  tools,
  pathname,
  user,
}: {
  label: string
  tools: ToolConfig[]
  pathname: string
  user: User | null
}) {
  if (tools.length === 0) return null
  return (
    <div className="mb-2">
      <p className="px-4 py-1 text-[9px] font-bold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
      {tools.map((tool) => {
        const isActive = pathname === `/tools/${tool.id}` || pathname === `/tools/${tool.id}/`
        const isLocked = tool.requiresAuth && !user
        return (
          <Link
            key={tool.id}
            href={isLocked ? `/login?redirectTo=/tools/${tool.id}` : `/tools/${tool.id}`}
            className={`flex items-center gap-2 mx-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              isActive
                ? 'bg-gradient-to-r text-gray-900 shadow-sm'
                : 'hover:bg-gray-50'
            }`}
            style={
              isActive
                ? {
                    backgroundImage: 'linear-gradient(135deg, var(--accent), var(--accent-light))',
                    boxShadow: 'var(--shadow-accent)',
                    color: 'var(--text-primary)',
                  }
                : { color: isLocked ? 'var(--text-muted)' : 'var(--text-secondary)' }
            }
          >
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: isActive ? 'rgba(34,34,34,0.4)' : 'var(--border)' }}
            />
            <span className="flex-1">{tool.label}</span>
            {isLocked && <Lock size={11} style={{ color: 'var(--text-muted)' }} />}
          </Link>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: 開発サーバーで表示を確認する**

```bash
npm run dev
```

- サイドバーに「AI ツール」グループが表示される
- 「議事録生成」の右側に鍵アイコン🔒が表示される（未ログイン時）
- ログイン後は鍵アイコンが消える（SupabaseのURLを `.env.local` に設定してから確認）

- [ ] **Step 3: コミットする**

```bash
git add components/layout/Sidebar.tsx
git commit -m "feat: add lock icons for protected tools and logout button to sidebar"
```

---

## Task 8: /api/minutes ルート（Claude API）

**Files:**
- Create: `app/api/minutes/route.ts`
- Create: `__tests__/api/minutes.test.ts`

- [ ] **Step 1: テストファイルを作成する（TDD）**

`__tests__/api/minutes.test.ts` を作成：

```typescript
import { POST } from '@/app/api/minutes/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))
jest.mock('@anthropic-ai/sdk')

import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const MockAnthropic = Anthropic as jest.MockedClass<typeof Anthropic>

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/minutes', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/minutes', () => {
  beforeEach(() => jest.clearAllMocks())

  it('未認証の場合は401を返す', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null }, error: null }) },
    } as any)

    const res = await POST(makeRequest({ transcript: 'test', model: 'haiku', includeEnglish: false, title: '' }))
    expect(res.status).toBe(401)
  })

  it('Haiku モデルで議事録を生成して返す', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null }) },
    } as any)

    const mockCreate = jest.fn().mockResolvedValue({
      content: [{ type: 'text', text: '## 1. 会議の目的\n定例ミーティング' }],
    })
    MockAnthropic.prototype.messages = { create: mockCreate } as any

    const res = await POST(
      makeRequest({ transcript: '今日の会議です', model: 'haiku', includeEnglish: false, title: 'テスト会議' })
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ model: 'claude-haiku-4-5' }))
    expect(json.japanese).toContain('会議の目的')
    expect(json.english).toBeNull()
  })

  it('Sonnet モデルを指定したときは sonnet-4-6 が使われる', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null }) },
    } as any)

    const mockCreate = jest.fn().mockResolvedValue({
      content: [{ type: 'text', text: '議事録' }],
    })
    MockAnthropic.prototype.messages = { create: mockCreate } as any

    await POST(makeRequest({ transcript: 'test', model: 'sonnet', includeEnglish: false, title: '' }))
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ model: 'claude-sonnet-4-6' }))
  })

  it('includeEnglish=true のとき英訳も返す', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null }) },
    } as any)

    const mockCreate = jest.fn()
      .mockResolvedValueOnce({ content: [{ type: 'text', text: '日本語議事録' }] })
      .mockResolvedValueOnce({ content: [{ type: 'text', text: 'English minutes' }] })
    MockAnthropic.prototype.messages = { create: mockCreate } as any

    const res = await POST(makeRequest({ transcript: 'test', model: 'haiku', includeEnglish: true, title: '' }))
    const json = await res.json()

    expect(json.japanese).toBe('日本語議事録')
    expect(json.english).toBe('English minutes')
    expect(mockCreate).toHaveBeenCalledTimes(2)
  })
})
```

- [ ] **Step 2: テストが失敗することを確認する**

```bash
npm test -- --testPathPattern="minutes" --no-coverage
```

期待出力: `FAIL __tests__/api/minutes.test.ts` — `Cannot find module '@/app/api/minutes/route'`

- [ ] **Step 3: `/api/minutes` ルートを実装する**

`app/api/minutes/route.ts` を作成：

```typescript
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

  const jaResponse = await client.messages.create({
    model: claudeModel,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  })

  const japanese =
    jaResponse.content[0].type === 'text' ? jaResponse.content[0].text : ''

  let english: string | null = null
  if (includeEnglish) {
    const enResponse = await client.messages.create({
      model: claudeModel,
      max_tokens: 2048,
      system: TRANSLATION_PROMPT,
      messages: [{ role: 'user', content: japanese }],
    })
    english =
      enResponse.content[0].type === 'text' ? enResponse.content[0].text : null
  }

  return NextResponse.json({ japanese, english })
}
```

- [ ] **Step 4: テストを実行してすべてパスすることを確認する**

```bash
npm test -- --testPathPattern="minutes" --no-coverage
```

期待出力: `PASS __tests__/api/minutes.test.ts` — 4 tests passed

- [ ] **Step 5: コミットする**

```bash
git add app/api/minutes/ __tests__/api/minutes.test.ts
git commit -m "feat: add /api/minutes route with Claude API integration"
```

---

## Task 9: /api/notion ルート

**Files:**
- Create: `app/api/notion/route.ts`
- Create: `__tests__/api/notion.test.ts`

- [ ] **Step 1: テストファイルを作成する（TDD）**

`__tests__/api/notion.test.ts` を作成：

```typescript
import { POST } from '@/app/api/notion/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))
jest.mock('@notionhq/client')

import { createClient } from '@/lib/supabase/server'
import { Client as NotionClient } from '@notionhq/client'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const MockNotionClient = NotionClient as jest.MockedClass<typeof NotionClient>

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/notion', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/notion', () => {
  beforeEach(() => jest.clearAllMocks())

  it('未認証の場合は401を返す', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null }, error: null }) },
    } as any)

    const res = await POST(makeRequest({ title: 'test', content: 'content', date: '2026-05-27' }))
    expect(res.status).toBe(401)
  })

  it('Notionページを作成してURLを返す', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null }) },
    } as any)

    const mockPagesCreate = jest.fn().mockResolvedValue({
      url: 'https://notion.so/test-page-123',
    })
    MockNotionClient.prototype.pages = { create: mockPagesCreate } as any

    const res = await POST(
      makeRequest({ title: 'テスト会議', content: '## 1. 会議の目的\n定例', date: '2026-05-27' })
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(mockPagesCreate).toHaveBeenCalledTimes(1)
    expect(json.url).toBe('https://notion.so/test-page-123')
  })
})
```

- [ ] **Step 2: テストが失敗することを確認する**

```bash
npm test -- --testPathPattern="notion" --no-coverage
```

期待出力: `FAIL __tests__/api/notion.test.ts` — `Cannot find module '@/app/api/notion/route'`

- [ ] **Step 3: `/api/notion` ルートを実装する**

`app/api/notion/route.ts` を作成：

```typescript
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
```

- [ ] **Step 4: テストを実行してすべてパスすることを確認する**

```bash
npm test -- --testPathPattern="notion" --no-coverage
```

期待出力: `PASS __tests__/api/notion.test.ts` — 2 tests passed

- [ ] **Step 5: コミットする**

```bash
git add app/api/notion/ __tests__/api/notion.test.ts
git commit -m "feat: add /api/notion route for creating meeting minutes pages"
```

---

## Task 10: MinutesTool コンポーネント

**Files:**
- Create: `components/tools/MinutesTool.tsx`
- Create: `__tests__/components/MinutesTool.test.tsx`

- [ ] **Step 1: テストファイルを作成する（TDD）**

`__tests__/components/MinutesTool.test.tsx` を作成：

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MinutesTool } from '@/components/tools/MinutesTool'

global.fetch = jest.fn()
Object.assign(navigator, { clipboard: { writeText: jest.fn() } })

const mockFetch = fetch as jest.MockedFunction<typeof fetch>

describe('MinutesTool', () => {
  beforeEach(() => jest.clearAllMocks())

  it('テキストエリア・タイトル・日付フィールドが表示される', () => {
    render(<MinutesTool />)
    expect(screen.getByPlaceholderText(/文字起こし/)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/会議タイトル/)).toBeInTheDocument()
  })

  it('テキストが空のとき生成ボタンは無効', () => {
    render(<MinutesTool />)
    const btn = screen.getByRole('button', { name: /議事録を生成/ })
    expect(btn).toBeDisabled()
  })

  it('テキスト入力後に生成ボタンが有効になる', () => {
    render(<MinutesTool />)
    fireEvent.change(screen.getByPlaceholderText(/文字起こし/), {
      target: { value: '会議の内容' },
    })
    const btn = screen.getByRole('button', { name: /議事録を生成/ })
    expect(btn).not.toBeDisabled()
  })

  it('生成ボタンを押すと /api/minutes に POST する', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ japanese: '## 1. 会議の目的\nテスト', english: null }),
    } as Response)

    render(<MinutesTool />)
    fireEvent.change(screen.getByPlaceholderText(/文字起こし/), {
      target: { value: '会議の内容' },
    })
    fireEvent.click(screen.getByRole('button', { name: /議事録を生成/ }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/minutes', expect.objectContaining({ method: 'POST' }))
    })
  })

  it('生成結果が表示される', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ japanese: '## 1. 会議の目的\n定例ミーティング', english: null }),
    } as Response)

    render(<MinutesTool />)
    fireEvent.change(screen.getByPlaceholderText(/文字起こし/), {
      target: { value: '会議の内容' },
    })
    fireEvent.click(screen.getByRole('button', { name: /議事録を生成/ }))

    await waitFor(() => {
      expect(screen.getByText(/定例ミーティング/)).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: テストが失敗することを確認する**

```bash
npm test -- --testPathPattern="MinutesTool" --no-coverage
```

期待出力: `FAIL __tests__/components/MinutesTool.test.tsx`

- [ ] **Step 3: MinutesTool コンポーネントを実装する**

`components/tools/MinutesTool.tsx` を作成：

```tsx
'use client'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type ClaudeModel = 'haiku' | 'sonnet'

interface MinutesResult {
  japanese: string
  english: string | null
}

export function MinutesTool() {
  const [transcript, setTranscript] = useState('')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [model, setModel] = useState<ClaudeModel>('haiku')
  const [includeEnglish, setIncludeEnglish] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [result, setResult] = useState<MinutesResult | null>(null)
  const [notionUrl, setNotionUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)
    setResult(null)
    setNotionUrl(null)

    try {
      const res = await fetch('/api/minutes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, model, includeEnglish, title }),
      })
      if (!res.ok) throw new Error('生成に失敗しました')
      const data = await res.json()
      setResult(data)
    } catch {
      setError('議事録の生成に失敗しました。もう一度お試しください。')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = () => {
    if (!result) return
    const text = includeEnglish && result.english
      ? `${result.japanese}\n\n---\n\n${result.english}`
      : result.japanese
    navigator.clipboard.writeText(text)
  }

  const handleSaveToNotion = async () => {
    if (!result) return
    setIsSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content: result.japanese, date }),
      })
      if (!res.ok) throw new Error('Notion保存に失敗しました')
      const data = await res.json()
      setNotionUrl(data.url)
    } catch {
      setError('Notionへの保存に失敗しました。もう一度お試しください。')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-auto" style={{ background: 'var(--bg-main)' }}>
      <div className="max-w-3xl w-full mx-auto p-6 space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>
            📝 議事録生成
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            文字起こしテキストから議事録を自動生成します
          </p>
        </div>

        {/* Meta fields */}
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="会議タイトル（任意）"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl border text-sm outline-none"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-content)', color: 'var(--text-primary)' }}
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-4 py-2.5 rounded-xl border text-sm outline-none"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-content)', color: 'var(--text-primary)' }}
          />
        </div>

        {/* Transcript input */}
        <textarea
          placeholder="文字起こしテキストをここに貼り付けてください"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          rows={10}
          className="w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none font-mono"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-content)', color: 'var(--text-primary)' }}
        />

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Model toggle */}
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium mr-1" style={{ color: 'var(--text-muted)' }}>モデル:</span>
            {(['haiku', 'sonnet'] as ClaudeModel[]).map((m) => (
              <button
                key={m}
                onClick={() => setModel(m)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={
                  model === m
                    ? {
                        backgroundImage: 'linear-gradient(135deg, var(--accent), var(--accent-light))',
                        color: 'var(--text-primary)',
                        boxShadow: 'var(--shadow-accent)',
                      }
                    : { background: 'var(--bg-content)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
                }
              >
                {m === 'haiku' ? '⚡ Haiku（高速）' : '✨ Sonnet（高精度）'}
              </button>
            ))}
          </div>

          {/* English toggle */}
          <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
            <input
              type="checkbox"
              checked={includeEnglish}
              onChange={(e) => setIncludeEnglish(e.target.checked)}
              className="rounded"
            />
            🔄 英語も生成
          </label>
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={!transcript.trim() || isGenerating}
          className="w-full py-3 rounded-xl text-sm font-bold text-gray-900 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            backgroundImage: 'linear-gradient(135deg, var(--accent), var(--accent-light))',
            boxShadow: 'var(--shadow-accent)',
          }}
        >
          {isGenerating ? '生成中...' : '✨ 議事録を生成'}
        </button>

        {/* Error */}
        {error && (
          <div className="p-3 rounded-lg text-sm text-red-700 bg-red-50 border border-red-200">
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-4">
            <div
              className="rounded-xl p-6"
              style={{ background: 'var(--bg-content)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
                  📋 生成された議事録（日本語）
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border hover:bg-gray-50 transition-colors"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                  >
                    📋 コピー
                  </button>
                  <button
                    onClick={handleSaveToNotion}
                    disabled={isSaving}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border hover:bg-gray-50 transition-colors disabled:opacity-50"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                  >
                    {isSaving ? '保存中...' : '📨 Notionに保存'}
                  </button>
                </div>
              </div>

              <article className="prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.japanese}</ReactMarkdown>
              </article>

              {notionUrl && (
                <a
                  href={notionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium underline"
                  style={{ color: 'var(--accent)' }}
                >
                  ✅ Notionページを開く →
                </a>
              )}
            </div>

            {includeEnglish && result.english && (
              <div
                className="rounded-xl p-6"
                style={{ background: 'var(--bg-content)', border: '1px solid var(--border)' }}
              >
                <h2 className="text-sm font-black mb-4" style={{ color: 'var(--text-primary)' }}>
                  📋 English Version
                </h2>
                <article className="prose prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.english}</ReactMarkdown>
                </article>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: テストを実行してすべてパスすることを確認する**

```bash
npm test -- --testPathPattern="MinutesTool" --no-coverage
```

期待出力: `PASS __tests__/components/MinutesTool.test.tsx` — 5 tests passed

- [ ] **Step 5: コミットする**

```bash
git add components/tools/MinutesTool.tsx __tests__/components/MinutesTool.test.tsx
git commit -m "feat: add MinutesTool component with model/language toggles and Notion save"
```

---

## Task 11: 議事録ページの登録

**Files:**
- Create: `app/tools/minutes/page.tsx`

- [ ] **Step 1: ページファイルを作成する**

`app/tools/minutes/page.tsx` を作成：

```tsx
import { MinutesTool } from '@/components/tools/MinutesTool'

export default function MinutesPage() {
  return <MinutesTool />
}
```

- [ ] **Step 2: 開発サーバーで動作確認する**

Supabase・Anthropic APIキーの準備ができている場合は実際にログインして議事録を生成する。環境変数がない場合は次のTask 12で設定する。

```bash
npm run dev
```

`http://localhost:3000/tools/minutes` にアクセスし：
- 未ログイン → `/login?redirectTo=/tools/minutes` にリダイレクトされる ✓
- ログイン後 → 議事録フォームが表示される ✓

- [ ] **Step 3: 全テストを実行する**

```bash
npm test --no-coverage
```

期待出力: 全テストPASS

- [ ] **Step 4: コミットする**

```bash
git add app/tools/minutes/
git commit -m "feat: add minutes page route"
```

---

## Task 12: 環境変数の設定

**Files:**
- Create: `.env.example`

- [ ] **Step 1: `.env.example` を作成する**

```bash
# Supabase（https://supabase.com でプロジェクト作成後に取得）
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Anthropic Claude API（https://console.anthropic.com でキー発行）
# ⚠️ キー発行後にNotion API Key台帳に末尾文字とメモを記録すること
# 台帳: https://www.notion.so/36d09405541d8147ad85c434e3c1686c
ANTHROPIC_API_KEY=sk-ant-...

# Notion Integration（https://www.notion.so/my-integrations でキー発行）
# ⚠️ キー発行後にAPI Key台帳に記録すること
NOTION_API_KEY=secret_...
# 議事録を保存するNotionデータベースのID（DBページURLの末尾32文字）
NOTION_DATABASE_ID=your-database-id
```

- [ ] **Step 2: `.env.local` を実際の値で作成する（gitignore済み）**

```bash
cp .env.example .env.local
# .env.local を開いて実際のキーを入力する
```

各サービスでキーを発行したら、[API Key台帳](https://www.notion.so/36d09405541d8147ad85c434e3c1686c) の対応する行に末尾文字とメモを記録すること。

- [ ] **Step 3: Supabase で認証を設定する**

1. [supabase.com](https://supabase.com) でプロジェクト作成
2. Authentication → Providers → Google を有効化（Google Cloud ConsoleでOAuth Client IDを取得）
3. Authentication → URL Configuration → Site URL を `https://studio.3new.eu` に設定
4. Redirect URLs に `https://studio.3new.eu/auth/callback` を追加

- [ ] **Step 4: Notion でインテグレーションを設定する**

1. [notion.so/my-integrations](https://www.notion.so/my-integrations) で新規インテグレーション作成（名前: 3New Studio）
2. 議事録を保存するNotionデータベースページを開く
3. ページ右上「...」→「コネクト」→ 3New Studio を追加
4. データベースURLから `NOTION_DATABASE_ID` を取得（`notion.so/` の後の32文字）

- [ ] **Step 5: ローカルで実際に議事録を生成してテストする**

```bash
npm run dev
```

1. `http://localhost:3000/login` でログイン
2. `http://localhost:3000/tools/minutes` にアクセス
3. サンプルテキストを貼り付けて「議事録を生成」
4. 5セクション形式の議事録が表示されることを確認
5. 「Notionに保存」でNotionページが作成されることを確認

- [ ] **Step 6: Vercel環境変数を設定する**

Vercel ダッシュボード → プロジェクト → Settings → Environment Variables に `.env.local` の全キーを追加する。

- [ ] **Step 7: コミットしてデプロイする**

```bash
git add .env.example
git commit -m "chore: add .env.example with all required environment variables"
git push origin main
```

Vercel が自動デプロイ（1〜2分）。`https://studio.3new.eu/tools/minutes` で本番確認。

---

## 完了チェックリスト

- [ ] `output: 'export'` が削除されてAPI Routesが動く
- [ ] 未ログインで `/tools/minutes` にアクセスするとログイン画面にリダイレクトされる
- [ ] メール+パスワードでログインできる
- [ ] Googleアカウントでログインできる
- [ ] サイドバーの「議事録生成」に鍵アイコンが表示される（未ログイン時）
- [ ] ログイン後に鍵アイコンが消える
- [ ] 文字起こしテキストを貼り付けて議事録が生成される
- [ ] Haiku / Sonnet の切り替えが動く
- [ ] 「英語も生成」チェックで英訳が出る
- [ ] 「コピー」ボタンでクリップボードにコピーできる
- [ ] 「Notionに保存」でNotionページが作成されリンクが表示される
- [ ] 全テストがPASS
- [ ] 本番（studio.3new.eu）で動作する
