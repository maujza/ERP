import fs from "node:fs"
import path from "node:path"

const root = process.cwd()

const replacements = [
  ["Welcome to Medusa", "Bienvenido a Aurelia Backoffice"],
  ["Bienvenido a Medusa", "Bienvenido a Aurelia Backoffice"],
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

const files = [
  "node_modules/@medusajs/dashboard/src/i18n/translations/en.json",
  "node_modules/@medusajs/dashboard/src/i18n/translations/es.json",
]

const replaceAll = (content) =>
  replacements.reduce(
    (acc, [from, to]) => acc.split(from).join(to),
    content
  )

for (const relPath of files) {
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
