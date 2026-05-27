import sharp from 'sharp'
import { readFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const src = join(root, 'public/logo/robot-bird.png')
const out = join(root, 'app/icon.png')

const BORDER = 18       // オレンジ縁の太さ
const SHADOW = 6        // 影のオフセット
const ORANGE     = { r: 243, g: 130, b: 30, alpha: 1 }   // メインオレンジ
const ORANGE_LT  = { r: 255, g: 175, b: 80, alpha: 1 }   // 明るい面（左上）
const ORANGE_DK  = { r: 180, g: 80,  b: 10, alpha: 1 }   // 暗い面（右下）
const SHADOW_CLR = { r: 0,   g: 0,   b: 0,  alpha: 0.35 }

const meta = await sharp(src).metadata()
const W = meta.width
const H = meta.height

// 1. 影レイヤー（右下にオフセット、角丸矩形）
const shadowW = W + BORDER * 2
const shadowH = H + BORDER * 2
const shadowSvg = `<svg width="${shadowW}" height="${shadowH}">
  <rect x="${SHADOW}" y="${SHADOW}" width="${shadowW}" height="${shadowH}"
    rx="40" ry="40"
    fill="rgba(0,0,0,0.30)" />
</svg>`

// 2. 暗い面（右下） — 3D感
const darkSvg = `<svg width="${shadowW}" height="${shadowH}">
  <rect x="0" y="0" width="${shadowW}" height="${shadowH}"
    rx="36" ry="36" fill="rgb(${ORANGE_DK.r},${ORANGE_DK.g},${ORANGE_DK.b})" />
</svg>`

// 3. メインオレンジ縁（少し上に）
const mainSvg = `<svg width="${shadowW}" height="${shadowH}">
  <rect x="0" y="0" width="${shadowW - 3}" height="${shadowH - 3}"
    rx="34" ry="34" fill="rgb(${ORANGE.r},${ORANGE.g},${ORANGE.b})" />
</svg>`

// 4. 明るい面（左上ハイライト）
const lightSvg = `<svg width="${shadowW}" height="${shadowH}">
  <rect x="0" y="0" width="${shadowW - 6}" height="${shadowH - 6}"
    rx="32" ry="32" fill="rgb(${ORANGE_LT.r},${ORANGE_LT.g},${ORANGE_LT.b})" />
</svg>`

// 5. 元画像を縁取りの中央に配置
const totalW = shadowW + SHADOW
const totalH = shadowH + SHADOW

const result = await sharp({
  create: { width: totalW, height: totalH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
})
  .composite([
    { input: Buffer.from(shadowSvg), top: 0, left: 0 },
    { input: Buffer.from(darkSvg),   top: 2, left: 2 },
    { input: Buffer.from(mainSvg),   top: 1, left: 1 },
    { input: Buffer.from(lightSvg),  top: 0, left: 0 },
    { input: src, top: BORDER, left: BORDER },
  ])
  .png()
  .toFile(out)

console.log(`favicon生成完了: ${out}  (${result.width}×${result.height})`)
