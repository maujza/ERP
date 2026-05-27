/**
 * jest.config.js — Jest test runner configuration for the Medusa backend
 *
 * Selects which test suite to run via the TEST_TYPE environment variable:
 *   TEST_TYPE=unit                → src/**\/__tests__\/**\/*.unit.spec.ts (fast, no DB)
 *   TEST_TYPE=integration:http    → integration-tests/http/*.spec.ts (hits real HTTP routes)
 *   TEST_TYPE=integration:modules → src/modules/*\/__tests__\/**\/* (tests module services)
 *
 * TypeScript is transpiled on-the-fly by @swc/jest, which is significantly faster
 * than ts-jest because it uses Rust under the hood (no TypeScript compiler overhead).
 *
 * Medusa's loadEnv injects .env.test into process.env before tests start,
 * so test code can read DATABASE_URL and other config without a separate setup.
 */

// loadEnv — Medusa helper that reads the .env.test file and injects vars into process.env
const { loadEnv } = require("@medusajs/utils");
loadEnv("test", process.cwd());

module.exports = {
  transform: {
    // "^.+\\.[jt]s$" matches any .js or .ts file
    // @swc/jest — SWC-based Jest transformer; replaces ts-jest for faster TypeScript compilation
    "^.+\\.[jt]s$": [
      "@swc/jest",
      {
        jsc: {
          // Tell SWC to parse TypeScript syntax and support decorators
          // (decorators are used by Medusa's data model definitions)
          parser: { syntax: "typescript", decorators: true },
        },
      },
    ],
  },
  // Run tests in a real Node.js environment (not a browser simulation like jsdom)
  testEnvironment: "node",
  // Allow Jest to import .js, .ts, and .json files without explicit extensions
  moduleFileExtensions: ["js", "ts", "json"],
  // Ignore compiled output — only test source files
  modulePathIgnorePatterns: ["dist/", "<rootDir>/.medusa/"],
  // Runs before each test file; sets up DB connection and other test infrastructure
  setupFiles: ["./integration-tests/setup.js"],
};

// Dynamically set which test files to include based on TEST_TYPE
// This keeps all three suites in one config file instead of three separate files
if (process.env.TEST_TYPE === "integration:http") {
  // HTTP integration tests: spin up the full Medusa server and test API routes
  module.exports.testMatch = ["**/integration-tests/http/*.spec.[jt]s"];
} else if (process.env.TEST_TYPE === "integration:modules") {
  // Module integration tests: test module services directly (no HTTP layer)
  module.exports.testMatch = ["**/src/modules/*/__tests__/**/*.[jt]s"];
} else if (process.env.TEST_TYPE === "unit") {
  // Unit tests: fast, isolated tests with no real DB or HTTP
  module.exports.testMatch = ["**/tests/unit/**/*.unit.spec.[jt]s"];
}
