'use client'
import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

function LoginForm() {
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
  )
}

export default function LoginPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--bg-main)' }}
    >
      <Suspense fallback={<div className="text-sm" style={{ color: 'var(--text-muted)' }}>読み込み中...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
