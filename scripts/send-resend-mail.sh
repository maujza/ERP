#!/usr/bin/env bash
# send-resend-mail.sh <to_csv> <subject> <html> — sends one mail via the
# Resend HTTP API. Reads RESEND_API_KEY/RESEND_FROM from the environment
# (not a file) so each caller stays free to read its own .env — backend/.env
# for scripts/backup-db.sh, infra/.env for the CI drift-check.
#
# Same call shape as backend/src/subscribers/invite-created.ts's direct
# fetch to https://api.resend.com/emails — extracted here once both
# backup-db.sh and the drift-check step needed an identical bash version.
set -euo pipefail

TO_CSV="${1:?usage: send-resend-mail.sh <to_csv> <subject> <html>}"
SUBJECT="${2:?usage: send-resend-mail.sh <to_csv> <subject> <html>}"
HTML="${3:?usage: send-resend-mail.sh <to_csv> <subject> <html>}"
: "${RESEND_API_KEY:?RESEND_API_KEY must be exported}"
: "${RESEND_FROM:?RESEND_FROM must be exported}"

# Resend's API wants a JSON array for "to"; callers pass comma-separated.
to_json="$(printf '%s' "$TO_CSV" | tr ',' '\n' | jq -R . | jq -s .)"

curl --fail --silent --show-error --max-time 10 -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg from "$RESEND_FROM" --argjson to "$to_json" --arg subject "$SUBJECT" --arg html "$HTML" \
    '{from: $from, to: $to, subject: $subject, html: $html}')" \
  >/dev/null
