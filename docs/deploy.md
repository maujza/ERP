# Guía de despliegue a producción

## Arquitectura de producción

La aplicación y la infraestructura corren como proyectos Docker Compose
separados. Nginx Proxy Manager vive en
`infra/networking/nginx-proxy-manager/compose.yml` y publica los servicios del
ERP por HTTP/HTTPS mediante la red externa compartida `erp_platform`.
El monitoreo vive en `infra/monitoring/compose.yml` y se levanta como el
proyecto `erp-monitoring`.

| Servicio | Dominio |
|---|---|
| Storefront | https://aurelia.gleeze.com |
| Backoffice / Admin | https://backoffice.aurelia.gleeze.com |
| POS web | https://pos.aurelia.gleeze.com |
| API Medusa (backend) | https://backoffice.aurelia.gleeze.com (mismo servidor) |

---

## Deploy automático

Todo push a `main` (o `workflow_dispatch` manual) dispara
`.github/workflows/deploy.yml`, que corre en el runner self-hosted (la misma
VPS que sirve prod) con build-once-promote:

1. **Build**: `backend`/`backend-init`/`pos` se buildean una sola vez (sin
   env baked-in) y se suben al registry local (`scripts/ci-build-and-push.sh`).
2. **Validación en staging efímero**: se levanta un stack aparte
   (`docker-compose.staging.yml`, su propia red/puertos/DB) y se corren
   contra él las migraciones, los tests de integración del backend, y los
   e2e de Playwright (admin + storefront). `web` se buildea con el
   `storefront/.env` *staging-flavored* (`NEXT_PUBLIC_*` se hornea en build
   time, por eso es la única imagen que se buildea dos veces).
3. **Promote**: solo si todo lo de arriba pasó, `scripts/promote-to-prod.sh`
   toma un backup de la DB de prod, corre las migraciones contra la base
   real, y swapea los containers a las imágenes ya validadas.
4. **Validación post-deploy**: `scripts/infra-healthcheck.sh` (Nginx,
   Grafana, Prometheus, Portainer, dashboards, alertas, targets, probes) y
   `scripts/production-smoke.sh` (Playwright contra prod real).
5. Si el smoke test post-deploy falla, `scripts/rollback-prod.sh` se dispara
   **automáticamente** y revierte los containers a las imágenes
   previamente-promovidas (no a la base de datos — ver "Rollback manual"
   más abajo y `docs/db-restore-runbook.md`).

**Para desplegar**: hacer merge de PR a `main` o push directo a `main`.

---

## Configuración del servidor (primera vez)

El provisioning de una VPS nueva (o migración a otra) está automatizado con
Ansible — ver **`deploy/ansible/README.md`**: clona el repo, renderiza
`backend/.env`/`.env` raíz/`storefront/.env` desde el vault, bootstrapea la
DB, crea el admin, sincroniza claves, y levanta el stack vía
`scripts/compose-up.sh`. Corré `ansible-playbook site.yml --ask-vault-pass`
desde tu laptop apuntando a la IP del servidor en `inventory.ini`.

Lo que Ansible **no** automatiza todavía (pasos manuales, una sola vez):

### 1. Configurar Nginx Proxy Manager

El panel de administración escucha solamente en localhost. Abrir un túnel desde
la máquina local:

```bash
ssh -L 8181:127.0.0.1:81 <usuario>@<vps>
```

Luego entrar a `http://localhost:8181` y crear estos Proxy Hosts:

| Dominio | Forward hostname | Forward port |
|---|---|---|
| `aurelia.gleeze.com` | `web` | `3000` |
| `backoffice.aurelia.gleeze.com` | `backend` | `9000` |
| `pos.aurelia.gleeze.com` | `pos` | `3000` |

Para cada host, solicitar el certificado SSL desde el panel y habilitar
`Force SSL`. Los puertos públicos de la VPS son `80` y `443`; los servicios
internos quedan ligados a localhost.

### 2. Registrar el runner de GitHub Actions

En la VPS, instalar el runner self-hosted siguiendo la guía oficial de GitHub:
**Settings → Actions → Runners → New self-hosted runner** y elegir la
arquitectura correspondiente al servidor. Una vez instalado y registrado,
`ansible-playbook site.yml` (role `runner`) le otorga los permisos que
necesita para correr los deploys (ACLs sobre el checkout, acceso a la deploy
key, caches de npm/Playwright).

El runner necesita acceso al directorio del repo y permisos para ejecutar Docker.

---

## Flujo de deploy típico

```
feature/xxx  →  PR a main  →  merge  →  GitHub Actions (deploy.yml)
  →  build + staging efímero + tests  →  promote-to-prod.sh  →  healthcheck + smoke
  →  (rollback-prod.sh automático si el smoke falla)
```

Solo `web` se buildea dos veces (staging y prod tienen `NEXT_PUBLIC_*`
distintos horneados en build time); el resto se buildea una sola vez y se
promueve sin reconstruir.

---

## Actualizar credenciales en producción

Los archivos `.env` son gitignoreados — no se sobreescriben con `git pull`.
El checkout de prod en la VPS vive en `/root/ERP` (`DEPLOY_DIR` en
`deploy.yml`), no en el path de una laptop de desarrollo. Para actualizar:

```bash
# En la VPS
nano /root/ERP/backend/.env

# Si cambió una variable de backend
docker compose up -d backend

# Si cambió una NEXT_PUBLIC_* del storefront
docker compose up --build web -d
```

---

## Después de destruir el volumen de base de datos

`scripts/promote-to-prod.sh` guarda un backup (`.deploy-state/db-backups/`)
antes de cada migración — ese directorio vive en el filesystem del host, no
en el volumen Docker (`postgres_data`), así que **sobrevive** si el volumen
se destruye por error. Antes de reseedear desde cero, revisar si hay un
backup reciente: ver `docs/db-restore-runbook.md`.

Si de verdad no hay backup usable (o se trata de un ambiente nuevo sin datos
que recuperar):

```bash
cd /root/ERP
./scripts/compose-up.sh   # migraciones + bootstrap + sincroniza claves
# Cargar catálogo manualmente desde https://backoffice.aurelia.gleeze.com/app
```

---

## Monitoreo básico

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f web
docker compose --project-name erp-infra --env-file infra/.env \
  --file infra/networking/nginx-proxy-manager/compose.yml ps
curl https://backoffice.aurelia.gleeze.com/health
```

---

## Rollback manual

`deploy.yml` ya dispara `scripts/rollback-prod.sh` **automáticamente** si el
smoke test post-deploy falla — esta sección es para el caso en que el
problema aparece más tarde (CI ya dio verde, pero algo se rompe horas
después) y hay que revertir a mano.

`rollback-prod.sh` solo vuelve a las imágenes previamente-promovidas
(`erp-*:rollback`, dejadas por la última corrida de `promote-to-prod.sh`) —
no hace `git reset`, no reconstruye nada, y **deliberadamente no toca la
base de datos** (las migraciones son forward-only; el código viejo no está
garantizado a entender un schema que la versión nueva ya migró):

```bash
cd /root/ERP
./scripts/rollback-prod.sh
```

Si el problema viene de una migración que corrompió datos (no solo del
código de la app), el rollback de imágenes no alcanza — ver
**`docs/db-restore-runbook.md`** para el procedimiento de restore manual de
la base, deliberadamente separado de este paso porque puede implicar perder
datos reales escritos después del backup.
