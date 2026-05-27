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
