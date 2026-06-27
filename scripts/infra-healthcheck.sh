#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

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

wait_for_url() {
  local name="$1"
  local url="$2"
  shift 2

  for attempt in $(seq 1 60); do
    if curl --fail --silent --show-error --max-time 5 "$@" "$url" >/dev/null 2>&1; then
      echo "  OK: $name"
      return
    fi
    sleep 2
  done

  echo "  FAILED: $name ($url)" >&2
  return 1
}

echo "Checking infrastructure endpoints..."
wait_for_url "Nginx Proxy Manager" "http://127.0.0.1:81/" --location
wait_for_url "Grafana" "http://127.0.0.1:3001/api/health"
wait_for_url "Prometheus" "http://127.0.0.1:9090/-/ready"
wait_for_url "Portainer" "https://127.0.0.1:9443/api/system/status" --insecure

echo "Checking Nginx configuration..."
docker exec erp-infra-nginx-1 nginx -t >/dev/null
echo "  OK: Nginx configuration"

grafana_auth="${MONITORING_ADMIN_USER}:${MONITORING_ADMIN_PASSWORD}"

echo "Checking Grafana provisioning..."
datasource_status="$(
  curl --fail --silent --show-error \
    --user "$grafana_auth" \
    http://127.0.0.1:3001/api/datasources/uid/prometheus/health \
    | jq -r '.status'
)"
if [ "$datasource_status" != "OK" ]; then
  echo "  FAILED: Prometheus datasource status is $datasource_status" >&2
  exit 1
fi
echo "  OK: Prometheus datasource"

expected_dashboards=(
  erp-overview
  pickles-containers-v2
  rYdddlPWk
)
for dashboard_uid in "${expected_dashboards[@]}"; do
  curl --fail --silent --show-error \
    --user "$grafana_auth" \
    "http://127.0.0.1:3001/api/dashboards/uid/$dashboard_uid" \
    >/dev/null
  echo "  OK: Grafana dashboard $dashboard_uid"
done

expected_alerts=(
  erp-infrastructure-target-down
  erp-host-memory-high
  erp-root-disk-high
  erp-host-cpu-high
)
provisioned_alerts="$(
  curl --fail --silent --show-error \
    --user "$grafana_auth" \
    http://127.0.0.1:3001/api/v1/provisioning/alert-rules
)"
for alert_uid in "${expected_alerts[@]}"; do
  if ! jq -e --arg uid "$alert_uid" 'any(.[]; .uid == $uid)' \
    <<<"$provisioned_alerts" >/dev/null; then
    echo "  FAILED: Grafana alert rule $alert_uid is missing" >&2
    exit 1
  fi
  echo "  OK: Grafana alert rule $alert_uid"
done

for attempt in $(seq 1 30); do
  rule_states="$(
    curl --fail --silent --show-error \
      --user "$grafana_auth" \
      http://127.0.0.1:3001/api/prometheus/grafana/api/v1/rules
  )"
  unhealthy_rules="$(
    jq -r '
      .data.groups[].rules[]
      | select(.health != "ok")
      | "\(.name): \(.lastError // .health)"
    ' <<<"$rule_states"
  )"
  evaluated_rules="$(
    jq '[.data.groups[].rules[] | select(.health == "ok")] | length' \
      <<<"$rule_states"
  )"

  if [ -z "$unhealthy_rules" ] \
    && [ "$evaluated_rules" -ge "${#expected_alerts[@]}" ]; then
    break
  fi

  if [ "$attempt" -eq 30 ]; then
    echo "  FAILED: Grafana alert evaluation errors:" >&2
    printf '%s\n' "$unhealthy_rules" >&2
    exit 1
  fi
  sleep 2
done
echo "  OK: Grafana alert evaluation"

echo "Checking Prometheus targets..."
targets="$(
  curl --fail --silent --show-error \
    "http://127.0.0.1:9090/api/v1/targets?state=active"
)"
unhealthy_targets="$(
  jq -r '
    .data.activeTargets[]
    | select(.health != "up")
    | "\(.labels.job) \(.labels.instance): \(.lastError)"
  ' <<<"$targets"
)"
if [ -n "$unhealthy_targets" ]; then
  echo "  FAILED: unhealthy Prometheus targets:" >&2
  printf '%s\n' "$unhealthy_targets" >&2
  exit 1
fi

expected_jobs=(
  blackbox-http
  node-exporter
  prometheus
  telegraf
)
for job in "${expected_jobs[@]}"; do
  if ! jq -e --arg job "$job" \
    'any(.data.activeTargets[]; .labels.job == $job and .health == "up")' \
    <<<"$targets" >/dev/null; then
    echo "  FAILED: Prometheus job $job has no healthy target" >&2
    exit 1
  fi
  echo "  OK: Prometheus job $job"
done

expected_probes=(
  "https://aurorapormayor.com/"
  "https://backoffice.aurorapormayor.com/health"
  "https://pos.aurorapormayor.com/"
  "http://backend:9000/health"
)

# promote-to-prod.sh briefly restarts backend/web/pos when swapping containers
# (see promote-to-prod.sh). Prometheus's blackbox_exporter only re-probes
# these targets every scrape_interval (15s, see
# infra/monitoring/configs/prometheus/prometheus.yml) — querying probe_success
# immediately after a promote can read the stale pre-restart (down) sample.
# Retry like every other check in this script instead of failing on a
# momentary snapshot.
for attempt in $(seq 1 20); do
  probe_results="$(
    curl --get --fail --silent --show-error \
      --data-urlencode 'query=probe_success' \
      http://127.0.0.1:9090/api/v1/query
  )"
  failed_probes="$(
    jq -r '
      .data.result[]
      | select(.value[1] != "1")
      | .metric.instance
    ' <<<"$probe_results"
  )"
  missing_probes=()
  for probe in "${expected_probes[@]}"; do
    if ! jq -e --arg probe "$probe" '
      any(
        .data.result[];
        .metric.instance == $probe and .value[1] == "1"
      )
    ' <<<"$probe_results" >/dev/null; then
      missing_probes+=("$probe")
    fi
  done

  if [ -z "$failed_probes" ] && [ "${#missing_probes[@]}" -eq 0 ]; then
    break
  fi

  if [ "$attempt" -eq 20 ]; then
    if [ -n "$failed_probes" ]; then
      echo "  FAILED: blackbox probes:" >&2
      printf '%s\n' "$failed_probes" >&2
    fi
    for probe in "${missing_probes[@]:-}"; do
      [ -n "$probe" ] && echo "  FAILED: expected blackbox probe $probe is missing or down" >&2
    done
    exit 1
  fi
  sleep 3
done

for probe in "${expected_probes[@]}"; do
  echo "  OK: Blackbox probe $probe"
done

echo "Infrastructure healthcheck passed."
