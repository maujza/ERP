import { readFile, writeFile } from "node:fs/promises"

const TITLE = "Aurelia Backoffice"
const THEME_COLOR = "#101114"
const faviconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="16" fill="#101114"/>
  <path d="M32 12L50 52H41.5L37.5 42.5H26.5L22.5 52H14L32 12ZM34.6 35.5L32 29.2L29.4 35.5H34.6Z" fill="#F6E4B8"/>
</svg>
`.trim()

const faviconHref = `data:image/svg+xml,${encodeURIComponent(faviconSvg)}`

const targets = [
  "./.medusa/server/public/admin/index.html",
  "./public/admin/index.html",
]

async function patchFile(path) {
  let html

  try {
    html = await readFile(path, "utf8")
  } catch {
    return
  }

  let next = html

  if (!next.includes("<title>")) {
    next = next.replace(
      "</head>",
      `        <title>${TITLE}</title>\n        <meta name="theme-color" content="${THEME_COLOR}" />\n</head>`
    )
  }

  next = next.replace(
    /<link rel="icon" href="data:," data-placeholder-favicon \/>/,
    `<link rel="icon" type="image/svg+xml" href="${faviconHref}" />`
  )

  if (next === html) {
    return
  }

  await writeFile(path, next)
  console.log(`patched ${path}`)
}

await Promise.all(targets.map(patchFile))

