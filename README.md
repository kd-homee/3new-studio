# 3NEW STUDIO

Browser-based utility studio — [studio.3new.eu](https://studio.3new.eu)

## Tools

**Text Tools**
- Markdown Editor — Monaco editor with live react-markdown preview
- YAML Config — Validation and tree preview
- JSON Data — Pretty print, minify, collapsible tree
- HTML Editor — Sandboxed iframe live preview
- Password Generator — Web Crypto API with strength meter

**Image Tools**
- Image Resize — Presets (25–200%), manual size, aspect ratio lock
- Format Converter — PNG/JPG/WebP conversion with quality control

## Development

```bash
npm install
npm run dev        # http://localhost:3000 (needs .env.local, see .env.example)
npm test           # Jest tests
npm run build      # Standalone server build to .next/standalone
```

## Docker

The app runs as a Next.js standalone server (API routes + Supabase Auth proxy), not as static files.

```bash
cp .env.example .env               # fill in values, including STUDIO_HOST_PORT
docker compose up --build -d       # http://127.0.0.1:$STUDIO_HOST_PORT
docker compose down
```

## Deploy to XServer VPS

Phase 1 migration (Vercel → XServer VPS, Supabase Auth unchanged) is documented in
[deploy/xserver-vps/HANDOFF.md](deploy/xserver-vps/HANDOFF.md), including the Nginx vhost template
and the staging checklist. Repository: `https://github.com/kd-homee/3new-studio`.

## Stack

Next.js 16 · TypeScript · TailwindCSS · Supabase Auth · Monaco Editor · Zustand · react-markdown · js-yaml · Web Crypto API
