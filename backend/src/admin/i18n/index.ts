import en from "./json/en.json" with { type: "json" }
import es from "./json/es.json" with { type: "json" }
import dashboardEs from "../../../node_modules/@medusajs/dashboard/src/i18n/translations/es.json" with { type: "json" }

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const mergeDeep = (
  base: Record<string, unknown>,
  overrides: Record<string, unknown>
): Record<string, unknown> => {
  const result: Record<string, unknown> = { ...base }

  Object.entries(overrides).forEach(([key, value]) => {
    const current = result[key]

    if (isObject(current) && isObject(value)) {
      result[key] = mergeDeep(current, value)
      return
    }

    result[key] = value
  })

  return result
}

const spanishTranslation = mergeDeep(
  dashboardEs as unknown as Record<string, unknown>,
  es as unknown as Record<string, unknown>
)

export default {
  en: {
    translation: en,
  },
  es: {
    translation: spanishTranslation,
  },
  "es-AR": {
    translation: spanishTranslation,
  },
  es_AR: {
    translation: spanishTranslation,
  },
  "es-ES": {
    translation: spanishTranslation,
  },
  "es-MX": {
    translation: spanishTranslation,
  },
  "es-419": {
    translation: spanishTranslation,
  },
  "es-LA": {
    translation: spanishTranslation,
  },
}
