# Guía de desarrollo local

## Prerequisitos

- Docker Desktop (o Docker Engine + Compose v2)
- Node 20 (para correr servicios fuera de Docker)
- Git

## Modos de trabajo

### Modo A — stack completo en Docker (recomendado)

Todos los servicios corren en contenedores. No necesitás Node local para el backend ni el storefront.

```bash
./scripts/compose-up.sh
```

Servicios disponibles:

| Servicio | URL |
|---|---|
| Storefront | http://localhost:7358 |
| Backoffice / Admin | http://localhost:9000/app |
| API Medusa | http://localhost:9000 |
| POS web | http://localhost:8081 |
| PostgreSQL | localhost:5433 |

### Modo B — servicios locales con DB en Docker

Útil cuando estás desarrollando activamente en backend o storefront y querés hot-reload.

```bash
# 1. Levantar solo la base de datos
docker compose up db -d

# 2. Backend (en una terminal)
cd backend
npm run dev        # carga .env → luego .env.dev (overrides locales)

# 3. Storefront (en otra terminal)
cd storefront
npm run dev        # Next carga .env.development automáticamente
```

El storefront queda en `http://localhost:3000`, el backend en `http://localhost:9000`.

---

## Configuración inicial (primera vez)

### 1. Copiar archivos de entorno

```bash
cp backend/.env.example              backend/.env
cp backend/.env.dev.example          backend/.env.dev
cp storefront/.env.example           storefront/.env
cp storefront/.env.development.example  storefront/.env.development
```

### 2. Completar `backend/.env`

| Variable | Descripción |
|---|---|
| `JWT_SECRET` | Cualquier string secreto |
| `COOKIE_SECRET` | Cualquier string secreto |
| `MEDUSA_ADMIN_PASSWORD` | Contraseña para `admin@aurelia.com` |
| `R2_BUCKET`, `R2_*` | Credenciales de Cloudflare R2 (pedir a quien administra el bucket) |

Sin `R2_BUCKET`, el backend arranca igual usando el proveedor de archivos local de Medusa — las imágenes se guardan en disco en lugar de R2.

### 3. Levantar el stack

```bash
./scripts/compose-up.sh
```

Esto ejecuta migraciones, bootstrap y sincroniza automáticamente las claves de API en `storefront/.env.development`.

---

## Archivos de entorno

| Archivo | Cuándo se carga |
|---|---|
| `backend/.env` | Siempre (base) |
| `backend/.env.dev` | Solo con `npm run dev` — sobreescribe CORS y `MEDUSA_ADMIN_URL` |
| `storefront/.env` | Build de Docker |
| `storefront/.env.development` | `npm run dev` — Next.js lo carga automáticamente |

`backend/.env.dev` sobreescribe con valores locales:

```bash
STORE_CORS=http://localhost:3000,http://localhost:7358,...
ADMIN_CORS=http://localhost:9000
MEDUSA_ADMIN_URL=http://localhost:9000
```

> R2 y Resend no se sobreescriben en dev — las credenciales de producción se usan también localmente. Para aislar, agregar `R2_BUCKET=` y `RESEND_API_KEY=` a `backend/.env.dev`.

---

## Tests

```bash
# Backend — unitarios (no requiere DB ni red)
cd backend && npm run test:unit

# Storefront — todos (Vitest + jsdom, no requiere red)
cd storefront && npm run test:run

# Storefront — con cobertura
cd storefront && npm run test:coverage
```

Baseline: **346 unit tests** en backend, **743 tests** en storefront.

---

## Después de un rebuild de la base de datos

Cada vez que el volumen de Postgres se destruye se generan nuevas claves. El storefront las necesita en el bundle.

```bash
# Resincronizar (requiere stack corriendo)
./scripts/sync-medusa-env.sh

# Reconstruir el contenedor web
docker compose up --build web -d
```

Ver [`docs/medusa-auth-keys.md`](./medusa-auth-keys.md) para diagnóstico detallado.

---

## Rebuild selectivo

```bash
docker compose up --build web -d      # solo storefront
docker compose up --build backend -d  # solo backend
docker compose up --build -d          # todo
```

---

## Problemas comunes

| Síntoma | Causa probable | Solución |
|---|---|---|
| Storefront muestra 0 productos | Publishable key / región desactualizados | `sync-medusa-env.sh` + rebuild `web` |
| `R2 file provider: "bucket" option is required` | `R2_BUCKET` vacío | El backend arranca igual; completar si se necesita R2 |
| Cambié `NEXT_PUBLIC_*` y no impactó | Variable horneada en build time | Rebuild `web` |
| Backend tarda mucho al arrancar | `backend-init` corriendo migraciones | Esperar `Server is ready on port: 9000` |
| Warning `MEDUSA_ADMIN_PASSWORD` en compose | Docker CLI evalúa antes de leer `env_file` | Cosmético, ignorar |

---

## Referencia rápida

```bash
./scripts/compose-up.sh              # levantar stack
docker compose ps                    # estado de servicios
docker compose logs -f backend       # logs backend en vivo
docker compose logs -f web           # logs storefront en vivo
docker compose down                  # bajar (preserva DB)
docker compose down -v               # bajar y destruir DB
./scripts/sync-medusa-env.sh         # resincronizar claves
```
