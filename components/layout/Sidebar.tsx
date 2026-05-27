// components/layout/Sidebar.tsx
'use client'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { TOOLS, type ToolConfig } from '@/types'

export function Sidebar() {
  const pathname = usePathname()

  const textTools = TOOLS.filter((t) => t.group === 'text')
  const imageTools = TOOLS.filter((t) => t.group === 'image')

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
        <ToolGroup label="テキストツール" tools={textTools} pathname={pathname} />
        <ToolGroup label="画像ツール" tools={imageTools} pathname={pathname} />
      </nav>

      {/* Footer */}
      <div className="flex items-center gap-2 px-4 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-light))', boxShadow: '0 0 5px rgba(244,180,0,0.6)' }}
        />
        <span className="text-[9px] font-bold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
          CLOUD READY
        </span>
      </div>
    </aside>
  )
}

function ToolGroup({ label, tools, pathname }: { label: string; tools: ToolConfig[]; pathname: string }) {
  return (
    <div className="mb-2">
      <p className="px-4 py-1 text-[9px] font-bold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
      {tools.map((tool) => {
        const isActive = pathname === `/tools/${tool.id}` || pathname === `/tools/${tool.id}/`
        return (
          <Link
            key={tool.id}
            href={`/tools/${tool.id}`}
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
                : { color: 'var(--text-secondary)' }
            }
          >
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: isActive ? 'rgba(34,34,34,0.4)' : 'var(--border)' }}
            />
            {tool.label}
          </Link>
        )
      })}
    </div>
  )
}
