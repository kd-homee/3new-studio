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
npm run dev        # http://localhost:3000
npm test           # Jest tests
npm run build      # Static export to out/
```

## Docker

```bash
docker compose up --build -d   # http://localhost:3000
docker compose down
```

## Deploy to Xserver VPS

1. SSH into VPS
2. Install Docker: `curl -fsSL https://get.docker.com | sh`
3. Clone repo: `git clone https://github.com/3new-srl/3new-studio`
4. `cd 3new-studio && docker compose up -d`
5. Configure Nginx reverse proxy for `studio.3new.eu`
6. SSL: `certbot --nginx -d studio.3new.eu`

## Stack

Next.js 15 · TypeScript · TailwindCSS · Monaco Editor · Zustand · react-markdown · js-yaml · Web Crypto API
