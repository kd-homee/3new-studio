'use client'
import { useState } from 'react'
import { generatePassword, getStrength, type PasswordOptions, type StrengthLabel } from '@/lib/password'

const STRENGTH_COLORS: Record<StrengthLabel, string> = {
  'Weak': '#ef4444',
  'Medium': '#f97316',
  'Strong': '#22c55e',
  'Very Strong': '#16a34a',
}

const STRENGTH_WIDTH: Record<StrengthLabel, string> = {
  'Weak': '25%', 'Medium': '50%', 'Strong': '75%', 'Very Strong': '100%',
}

export function PasswordTool() {
  const [length, setLength] = useState(16)
  const [opts, setOpts] = useState<PasswordOptions>({ upper: true, lower: true, numbers: true, symbols: false })
  const [password, setPassword] = useState('')
  const [copied, setCopied] = useState(false)

  const strength = password ? getStrength(password) : null

  const handleGenerate = () => setPassword(generatePassword(length, opts))
  const handleCopy = () => {
    if (!password) return
    navigator.clipboard.writeText(password)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  const toggleOpt = (key: keyof PasswordOptions) =>
    setOpts((o) => ({ ...o, [key]: !o[key] }))

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center px-4 h-11 border-b flex-shrink-0"
        style={{ background: 'var(--bg-content)', borderColor: 'var(--border)' }}>
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>パスワード生成</span>
      </div>
      <div className="flex-1 flex items-center justify-center p-8" style={{ background: 'var(--bg-main)' }}>
        <div className="w-full max-w-md rounded-2xl p-8 shadow-md" style={{ background: 'var(--bg-content)' }}>
          {/* Password display */}
          <div className="relative mb-6">
            <div
              className="w-full px-4 py-4 rounded-xl text-lg font-mono break-all min-h-16 text-center"
              style={{ background: '#f5f5f5', border: '1px solid var(--border)', color: 'var(--text-primary)', letterSpacing: '0.05em' }}
            >
              {password || <span style={{ color: 'var(--text-muted)' }}>ここにパスワードが表示されます</span>}
            </div>
          </div>

          {/* Strength meter */}
          {strength && (
            <div className="mb-6">
              <div className="flex justify-between mb-1">
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>強度</span>
                <span className="text-xs font-bold" style={{ color: STRENGTH_COLORS[strength] }}>{strength}</span>
              </div>
              <div className="h-2 rounded-full" style={{ background: 'var(--border)' }}>
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{ width: STRENGTH_WIDTH[strength], background: STRENGTH_COLORS[strength] }}
                />
              </div>
            </div>
          )}

          {/* Length slider */}
          <div className="mb-5">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>長さ</span>
              <span className="text-sm font-bold" style={{ color: 'var(--accent-dark)' }}>{length}</span>
            </div>
            <input
              type="range" min={4} max={128} value={length}
              onChange={(e) => setLength(Number(e.target.value))}
              className="w-full accent-yellow-400"
            />
            <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              <span>4</span><span>128</span>
            </div>
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            {([['upper', '大文字 (A-Z)'], ['lower', '小文字 (a-z)'], ['numbers', '数字 (0-9)'], ['symbols', '記号 (!@#…)']] as const).map(
              ([key, label]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={opts[key]}
                    onChange={() => toggleOpt(key)}
                    className="accent-yellow-400 w-4 h-4 rounded"
                  />
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                </label>
              )
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleGenerate}
              className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
              style={{ backgroundImage: 'linear-gradient(135deg, var(--accent), var(--accent-light))', color: 'var(--text-primary)', boxShadow: 'var(--shadow-accent)' }}
            >
              生成
            </button>
            <button
              onClick={handleCopy}
              disabled={!password}
              className="flex-1 py-3 rounded-xl text-sm font-bold border transition-all disabled:opacity-40"
              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', background: copied ? '#f0fdf4' : '#fff' }}
            >
              {copied ? 'コピー済み ✓' : 'コピー'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
