# Guía de despliegue a producción

## Arquitectura de producción

El stack corre en una **Raspberry Pi** (`pione`) con Docker Compose. El deploy es automático via GitHub Actions con un runner self-hosted.

| Servicio | Dominio |
|---|---|
| Storefront | https://aurelia.gleeze.com |
| Backoffice / Admin | https://backoffice.aurelia.gleeze.com |
| POS web | https://pos.aurelia.gleeze.com |
| API Medusa (backend) | https://backoffice.aurelia.gleeze.com (mismo servidor) |

---

## Deploy automático

Todo push a `main` dispara el workflow `.github/workflows/deploy-to-rpi.yml`:

1. El runner self-hosted en la RPI hace `git pull`
2. Ejecuta `./scripts/compose-up.sh`
3. El script reconstruye solo las imágenes que cambiaron (fingerprint en `.deploy-state/`)

**Para desplegar**: hacer merge de PR a `main` o push directo a `main`.

---

## Configuración del servidor (primera vez)

### 1. Clonar el repositorio

```bash
cd /home/akwiek/code
git clone <repo-url> ERP
cd ERP
```

### 2. Configurar `backend/.env`

```bash
cp backend/.env.example backend/.env
```

| Variable | Valor en producción |
|---|---|
| `DATABASE_URL` | `postgres://medusa:medusa@db:5432/medusa?sslmode=disable` (interno Docker) |
| `JWT_SECRET` | String secreto |
| `COOKIE_SECRET` | String secreto |
| `MEDUSA_ADMIN_PASSWORD` | Contraseña del admin |
| `MEDUSA_ADMIN_URL` | `https://backoffice.aurelia.gleeze.com` |
| `MEDUSA_FORCE_INSECURE_COOKIES` | Omitir o `false` en producción con HTTPS |
| `STORE_CORS` | Dominios de producción + localhost si se necesita |
| `ADMIN_CORS` | `https://backoffice.aurelia.gleeze.com`, etc. |
| `AUTH_CORS` | Todos los dominios de producción |
| `R2_BUCKET` | `aurelia` |
| `R2_ACCOUNT_ID` | ID de cuenta Cloudflare |
| `R2_ACCESS_KEY_ID` | Clave de acceso R2 |
| `R2_SECRET_ACCESS_KEY` | Secret R2 |
| `R2_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` |
| `R2_PUBLIC_URL` | `https://pub-xxxx.r2.dev` |
| `RESEND_API_KEY` | API key de Resend |
| `RESEND_FROM` | `Aurelia <invitaciones@mail.aurelia.gleeze.com>` |
| `SEED_DEMO_DATA` | `false` |

### 3. Configurar `storefront/.env`

```bash
cp storefront/.env.example storefront/.env
```

```bash
NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://backoffice.aurelia.gleeze.com
NEXT_PUBLIC_MEDUSA_COUNTRY_CODE=ar
NEXT_PUBLIC_WHATSAPP_NUMBER=<número>
NEXT_PUBLIC_SHIPPING_STANDARD_ARS=3900
NEXT_PUBLIC_SHIPPING_EXPRESS_ARS=7200
```

`NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` y `NEXT_PUBLIC_MEDUSA_REGION_ID` se sincronizan automáticamente al correr `compose-up.sh`.

> `MEDUSA_INTERNAL_BACKEND_URL` ya es sobreescrito por `docker-compose.yml` a `http://backend:9000` — no es crítico en este archivo.

### 4. Primer levante

```bash
./scripts/compose-up.sh
```

En el primer levante: migraciones, bootstrap, creación del admin, sincronización de claves y build de todas las imágenes.

### 5. Registrar el runner de GitHub Actions

En la RPI, instalar el runner self-hosted siguiendo la guía oficial de GitHub:
**Settings → Actions → Runners → New self-hosted runner** (elegir Linux ARM64).

El runner necesita acceso al directorio del repo y permisos para ejecutar Docker.

---

## Flujo de deploy típico

```
feature/xxx  →  PR a main  →  merge  →  GitHub Actions  →  git pull + compose-up.sh en RPI
```

Solo se reconstruyen las imágenes cuyo fingerprint cambió.

---

## Actualizar credenciales en producción

Los archivos `.env` son gitignoreados — no se sobreescriben con `git pull`. Para actualizar:

```bash
# En la RPI
nano /home/akwiek/code/ERP/backend/.env

# Si cambió una variable de backend
docker compose up -d backend

# Si cambió una NEXT_PUBLIC_* del storefront
docker compose up --build web -d
```

---

## Después de destruir el volumen de base de datos

```bash
cd /home/akwiek/code/ERP
./scripts/compose-up.sh   # migraciones + bootstrap + sincroniza claves
# Cargar catálogo manualmente desde https://backoffice.aurelia.gleeze.com/app
```

---

## Monitoreo básico

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f web
curl https://backoffice.aurelia.gleeze.com/health
```

---

## Rollback manual

GitHub Actions no hace rollback automático. Si un deploy rompe producción:

```bash
cd /home/akwiek/code/ERP
git log --oneline -5
git reset --hard <hash-bueno>
./scripts/compose-up.sh
```
