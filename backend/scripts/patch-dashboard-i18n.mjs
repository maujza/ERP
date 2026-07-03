import fs from "node:fs"
import path from "node:path"

const root = process.cwd()

const replacements = [
  ["Welcome to Medusa", "Bienvenido a Aurora Backoffice"],
  ["Bienvenido a Medusa", "Bienvenido a Aurora Backoffice"],
  ["Create Draft Order", "Crear Pedido Borrador"],
  ["Choose region", "Elige región"],
  ["Select region", "Seleccionar región"],
  ["Select sales channel", "Seleccionar canal de venta"],
  ["Choose sales channel", "Elige canal de venta"],
  ["Select customer", "Seleccionar cliente"],
  ["Choose an existing customer", "Elige un cliente existente"],
  ["Input a email to associate with the order", "Ingresa un correo electrónico para asociarlo al pedido"],
  ["Shipping address", "Dirección de envío"],
  ["Address used for shipping", "Dirección usada para el envío"],
  ["Select country", "Seleccionar país"],
  ["First name", "Nombre"],
  ["Last name", "Apellido"],
  ["Company (Optional)", "Empresa (Opcional)"],
  ["Checkout", "Finalizar compra"],
]

const translationFiles = [
  "node_modules/@medusajs/dashboard/src/i18n/translations/en.json",
  "node_modules/@medusajs/dashboard/src/i18n/translations/es.json",
]

const replaceAll = (content) =>
  replacements.reduce(
    (acc, [from, to]) => acc.split(from).join(to),
    content
  )

for (const relPath of translationFiles) {
  const filePath = path.join(root, relPath)
  if (!fs.existsSync(filePath)) {
    continue
  }

  const previous = fs.readFileSync(filePath, "utf8")
  const next = replaceAll(previous)

  if (next !== previous) {
    fs.writeFileSync(filePath, next, "utf8")
    console.log(`patched ${relPath}`)
  }
}

// Patch compiled dashboard dist to default the UI language to Spanish (es).
// Wrapped in try/catch so a read-only node_modules (Docker prod builds) doesn't
// crash the install step — the fallback is the browser language setting.
const distDir = path.join(root, "node_modules/@medusajs/dashboard/dist")
if (fs.existsSync(distDir)) {
  try {
    const distFiles = fs.readdirSync(distDir).filter((f) => f.endsWith(".mjs") || f.endsWith(".js"))
    let patched = 0
    for (const file of distFiles) {
      const filePath = path.join(distDir, file)
      const previous = fs.readFileSync(filePath, "utf8")
      const next = previous
        .replaceAll('fallbackLng:"en"', 'fallbackLng:"es"')
        .replaceAll('fallbackLng: "en"', 'fallbackLng: "es"')
      if (next !== previous) {
        fs.writeFileSync(filePath, next, "utf8")
        console.log(`patched fallbackLng → es in ${file}`)
        patched++
      }
    }
    if (patched === 0) {
      console.warn("patch-dashboard-i18n: fallbackLng not found in dist — dashboard may have been updated. Admin UI may default to English.")
    }
  } catch (err) {
    console.warn(`patch-dashboard-i18n: could not patch dist (${err.message}) — admin UI may default to English.`)
  }
}
