#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Plaintext env file -> committed age-encrypted companion. Keep in sync with
# scripts/secrets-decrypt.sh and the equivalent table in the age plan doc.
ENV_FILE_PAIRS=(
  "backend/.env:backend/.env.age"
  "backend/.env.dev:backend/.env.dev.age"
  "storefront/.env:storefront/.env.age"
  "storefront/.env.development:storefront/.env.development.age"
  "infra/.env:infra/.env.age"
)

if ! command -v age >/dev/null 2>&1; then
  echo "age is required (brew install age / apt install age)" >&2
  exit 1
fi

if [ ! -f "$ROOT_DIR/.age-recipients" ]; then
  echo ".age-recipients not found at repo root" >&2
  exit 1
fi

encrypted_any=false

for pair in "${ENV_FILE_PAIRS[@]}"; do
  plaintext="${pair%%:*}"
  encrypted="${pair##*:}"

  if [ ! -f "$ROOT_DIR/$plaintext" ]; then
    continue
  fi

  age -R "$ROOT_DIR/.age-recipients" -a -o "$ROOT_DIR/$encrypted" "$ROOT_DIR/$plaintext"
  echo "Encrypted $plaintext -> $encrypted"
  encrypted_any=true
done

if [ "$encrypted_any" = false ]; then
  echo "No plaintext env files found to encrypt." >&2
  exit 1
fi

echo
echo "Review and commit the updated .env.age file(s) above."
