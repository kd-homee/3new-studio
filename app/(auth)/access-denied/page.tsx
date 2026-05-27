export default function AccessDeniedPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--bg-main)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8 text-center"
        style={{
          background: 'var(--bg-content)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        }}
      >
        <div className="text-3xl mb-4">🔒</div>
        <h1
          className="text-sm font-black mb-2"
          style={{ color: 'var(--text-primary)' }}
        >
          アクセスが許可されていません
        </h1>
        <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
          このアプリを使用するにはアクセス権が必要です。
          <br />
          管理者にお問い合わせください。
        </p>
        <a
          href="/login"
          className="text-xs font-medium underline"
          style={{ color: 'var(--accent)' }}
        >
          ログインページに戻る
        </a>
      </div>
    </div>
  )
}