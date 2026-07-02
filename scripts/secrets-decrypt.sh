#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Keep in sync with scripts/secrets-encrypt.sh.
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

IDENTITY_FILE="${AGE_IDENTITY_FILE:-$HOME/.config/age/key.txt}"

if [ ! -f "$IDENTITY_FILE" ]; then
  echo "age identity file not found at $IDENTITY_FILE (set AGE_IDENTITY_FILE to override)" >&2
  exit 1
fi

decrypted_any=false

for pair in "${ENV_FILE_PAIRS[@]}"; do
  plaintext="${pair%%:*}"
  encrypted="${pair##*:}"

  if [ ! -f "$ROOT_DIR/$encrypted" ]; then
    continue
  fi

  mkdir -p "$ROOT_DIR/$(dirname "$plaintext")"
  age -d -i "$IDENTITY_FILE" -o "$ROOT_DIR/$plaintext" "$ROOT_DIR/$encrypted"
  chmod 600 "$ROOT_DIR/$plaintext"
  echo "Decrypted $encrypted -> $plaintext"
  decrypted_any=true
done

if [ "$decrypted_any" = false ]; then
  echo "No .env.age files found to decrypt." >&2
  exit 1
fi
