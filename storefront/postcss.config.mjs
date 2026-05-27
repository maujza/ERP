/**
 * postcss.config.mjs — PostCSS build configuration
 *
 * PostCSS is a CSS post-processor that runs at build time. Next.js automatically
 * picks up this file and runs PostCSS on every CSS import.
 *
 * The single plugin here, @tailwindcss/postcss, is Tailwind CSS v4's new engine
 * running directly as a PostCSS plugin. It:
 *   1. Scans all source files for Tailwind class names (e.g., "flex", "text-sm")
 *   2. Generates only the CSS needed for those classes (no unused styles in the bundle)
 *
 * With Tailwind v4 there is no separate tailwind.config.js — configuration is
 * done in CSS via @theme directives in your global stylesheet instead.
 */
const config = {
  plugins: {
    // @tailwindcss/postcss — Tailwind CSS v4 PostCSS plugin
    //   Reads class names from source files and generates the corresponding CSS at build time
    "@tailwindcss/postcss": {},
  },
};

export default config;
