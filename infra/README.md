# Infrastructure

Infrastructure services are split into independent Docker Compose projects.
They communicate with the application stack through the external
`erp_platform` network.

Available stacks:

- `networking/nginx-proxy-manager/compose.yml`
- `monitoring/compose.yml`

## Nginx Proxy Manager

Compose file:

```text
infra/networking/nginx-proxy-manager/compose.yml
```

The stack uses persistent Docker volumes with stable names:

```text
erp_nginx_data
erp_nginx_letsencrypt
erp_nginx_db_data
```

Start the complete application and infrastructure:

```bash
./scripts/compose-up.sh
```

Manage only Nginx Proxy Manager:

```bash
docker network inspect erp_platform >/dev/null 2>&1 \
  || docker network create erp_platform

for volume in erp_nginx_data erp_nginx_letsencrypt erp_nginx_db_data; do
  docker volume inspect "$volume" >/dev/null 2>&1 || docker volume create "$volume"
done

docker compose \
  --project-name erp-infra \
  --env-file .env \
  --file infra/networking/nginx-proxy-manager/compose.yml \
  up -d
```

View logs:

```bash
docker compose \
  --project-name erp-infra \
  --env-file .env \
  --file infra/networking/nginx-proxy-manager/compose.yml \
  logs -f
```

The admin UI remains bound to `127.0.0.1:81` and should be accessed through
an SSH tunnel.
