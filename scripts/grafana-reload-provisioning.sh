#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ ! -f "$ROOT_DIR/infra/.env" ]; then
  echo "Missing infra/.env file" >&2
  exit 1
fi

MONITORING_ADMIN_USER="$(
  sed -n 's/^MONITORING_ADMIN_USER=//p' "$ROOT_DIR/infra/.env" | tail -1
)"
MONITORING_ADMIN_PASSWORD="$(
  sed -n 's/^MONITORING_ADMIN_PASSWORD=//p' "$ROOT_DIR/infra/.env" | tail -1
)"

: "${MONITORING_ADMIN_USER:?set MONITORING_ADMIN_USER in infra/.env}"
: "${MONITORING_ADMIN_PASSWORD:?set MONITORING_ADMIN_PASSWORD in infra/.env}"

grafana_url="http://127.0.0.1:3001"
grafana_auth="${MONITORING_ADMIN_USER}:${MONITORING_ADMIN_PASSWORD}"

for attempt in $(seq 1 60); do
  if curl --fail --silent --max-time 5 "$grafana_url/api/health" >/dev/null 2>&1; then
    break
  fi

  if [ "$attempt" -eq 60 ]; then
    echo "Grafana did not become ready for provisioning reload" >&2
    exit 1
  fi
  sleep 2
done

for resource in datasources dashboards alerting; do
  curl --fail --silent --show-error \
    --request POST \
    --user "$grafana_auth" \
    "$grafana_url/api/admin/provisioning/$resource/reload" \
    >/dev/null
  echo "Reloaded Grafana $resource provisioning."
done
