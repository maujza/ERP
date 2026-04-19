# Aurelia ERP Commerce Stack

Repositorio monorepo para la operación comercial de Aurelia. El stack combina storefront B2B, backoffice visual, backend Medusa, POS y base de datos PostgreSQL.

## Qué incluye

- `./`: storefront y backoffice en Next.js 16.
- `backend/`: backend Medusa v2 con seeds, migraciones y módulo custom `purchaseDepartment`.
- `pos/`: POS web/mobile basado en Expo.
- `docker-compose.yml`: stack local con `db`, `backend-init`, `backend`, `web` y `pos`.

## Servicios locales

Cuando el stack está levantado:

- Storefront: `http://localhost:7358`
- Backoffice Medusa: `http://localhost:9000/app`
- API Medusa: `http://localhost:9000`
- POS web: `http://localhost:8081`
- PostgreSQL: `localhost:5433`

## Levante recomendado

El flujo correcto no es `docker compose up` a mano sino:

```bash
./scripts/compose-up.sh
```

Ese script hace lo siguiente:

1. levanta PostgreSQL
2. construye solo las imágenes que cambiaron
3. corre `backend-init` para migraciones y bootstrap
4. resincroniza `.env.local` con publishable key + región actual
5. recompila `web` solo si cambió su fingerprint
6. levanta `backend`, `web` y `pos`

## Rebuild selectivo

`./scripts/compose-up.sh` usa fingerprints guardados en `.deploy-state/` para decidir si hay que reconstruir:

- `backend`
- `web`
- `pos`

Eso evita rebuilds innecesarios incluso si el árbol de trabajo tiene cambios locales sin commit.

## Variables importantes del storefront

El storefront depende de estas variables en `.env.local`:

- `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_MEDUSA_REGION_ID`
- `NEXT_PUBLIC_MEDUSA_COUNTRY_CODE`
- `NEXT_PUBLIC_WHATSAPP_NUMBER`
- `NEXT_PUBLIC_SHIPPING_STANDARD_ARS`
- `NEXT_PUBLIC_SHIPPING_EXPRESS_ARS`

La API de Medusa ya no se configura con una URL pública del lado cliente.
El storefront usa siempre el proxy interno `/api/medusa`, y Next lo reescribe
hacia `MEDUSA_INTERNAL_BACKEND_URL` del lado servidor.

`scripts/sync-medusa-env.sh` actualiza automáticamente:

- `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_MEDUSA_REGION_ID`
- `NEXT_PUBLIC_MEDUSA_COUNTRY_CODE`

Después de cambiar una variable `NEXT_PUBLIC_*`, hay que reconstruir `web` para que Next la hornee en el bundle.

## Docker y build

El repo ya no compila storefront ni backend al arrancar contenedores:

- `web` usa Docker multi-stage + `Next standalone`
- `backend` usa Docker multi-stage con imagen final reducida
- `backend-init` usa el target `builder` para correr migraciones y bootstrap

Tamaños observados luego del ajuste:

- `erp-web:local`: ~`296MB`
- `erp-backend:local`: ~`673MB`
- `erp-backend-init:local`: ~`895MB`
- `erp-pos:local`: ~`241MB`

## Seeds y bootstrap

El bootstrap corre en `backend/src/scripts/bootstrap.ts`.

Hace dos chequeos idempotentes:

- si falta la seed base de Medusa, la corre
- si falta la región de Argentina, corre la seed de Aurelia

Eso evita reseedear todo en cada restart del backend.

## Desarrollo del frontend

El storefront está en `src/` y mezcla:

- home editorial
- catálogo con filtros
- producto
- checkout
- búsqueda
- backoffice visual en `/backoffice`

Hoy catálogo, búsqueda y destacados cargan productos desde cliente. Eso funciona, pero puede mostrar estado vacío inicial hasta que hidrata. Una mejora pendiente es mover la carga inicial de productos a server-side rendering.

## Despliegue

El workflow de GitHub vive en `.github/workflows/deploy-to-rpi.yml` y delega el levante al mismo `./scripts/compose-up.sh`.

Eso mantiene alineado el flujo local y el de deploy.

## Problemas comunes

- Storefront sin productos:
  suele ser una publishable key/región desactualizada o un bundle de `web` viejo.

- Cambié `.env.local` y no impactó:
  si tocaste una variable `NEXT_PUBLIC_*`, rebuild de `web`.

- El backend tarda mucho en frío:
  la primera corrida de `backend-init` puede tardar porque ejecuta migraciones y bootstrap completo.

- El HDD se dispara durante builds:
  el costo grande sigue estando en la primera compilación del backend; las corridas posteriores deberían reutilizar caché y evitar rebuild si no hubo cambios.

## Comandos útiles

```bash
./scripts/compose-up.sh
docker compose ps
docker compose logs -f backend
docker compose logs -f web
docker compose logs -f pos
./scripts/sync-medusa-env.sh
```
