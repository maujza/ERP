# ERP Monitoring

Independent monitoring stack for the ERP:

- Prometheus stores metrics for 15 days.
- Grafana provides a provisioned ERP overview dashboard.
- Grafana dashboards, data sources, and alert rules are provisioned from Git.
- Node Exporter exposes VPS CPU, memory, filesystem, and network metrics.
- Telegraf exposes Docker container metrics.
- Blackbox Exporter checks the public ERP endpoints and the internal backend health endpoint.
- Portainer CE provides Docker administration.

## Access

The administration ports are bound to localhost only:

| Service | URL | Credentials |
|---|---|---|
| Grafana | `http://127.0.0.1:3001` | `infra/.env` monitoring credentials |
| Prometheus | `http://127.0.0.1:9090` | none |
| Portainer | `https://127.0.0.1:9443` | `infra/.env` monitoring credentials |

Use an SSH tunnel from a local machine:

```bash
ssh \
  -L 3001:127.0.0.1:3001 \
  -L 9090:127.0.0.1:9090 \
  -L 9443:127.0.0.1:9443 \
  <user>@<server>
```

The complete stack starts through:

```bash
./scripts/compose-up.sh
```

Validate all infrastructure endpoints, Grafana resources, Prometheus targets,
and blackbox probes:

```bash
./scripts/infra-healthcheck.sh
```

`compose-up.sh` reloads Grafana provisioning after the monitoring stack starts,
so changes to dashboards, data sources, and alert rules are applied on every
deployment without deleting Grafana data.

To manage monitoring directly:

```bash
docker compose \
  --project-name erp-monitoring \
  --env-file infra/.env \
  --file infra/monitoring/compose.yml \
  up -d
```
