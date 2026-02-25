# ERP Commerce Stack

Este repositorio combina dos piezas principales:

- **Web B2B**: front en Next.js 16 (carpeta raíz) que sirve el catálogo mayorista.
- **Medusa POS**: app mobile (Expo + React Native) ubicada en `pos/` que permite operar tiendas físicas contra tu backend de Medusa v2.

Ambos servicios se orquestan con Docker Compose para que puedas levantarlos con un solo comando y sin preocuparte por versiones de Node.js o dependencias globales.

## Requisitos

- Docker y Docker Compose.
- Dispositivo iOS/Android con la app Expo Go instalada para probar el POS (o un emulador configurado).
- Un backend de Medusa v2 accesible vía HTTPS + usuario admin para autenticarte desde el POS.

## Puesta en marcha con Docker

```bash
# Construir imágenes después de clonar o actualizar dependencias
docker compose build web pos

# Levantar el storefront
docker compose up web
# La web queda disponible en http://localhost:7358

# Levantar el POS (levanta Metro + DevTools + túnel Expo)
docker compose up pos
# Metro:      http://localhost:8081
# DevTools:   http://localhost:19002 (muestra el QR que consume Expo Go)
```

Los contenedores montan el código fuente local, así que cualquier cambio en `src/` o `pos/` se refleja automáticamente sin reinstalar dependencias. Los módulos de cada servicio viven dentro del contenedor (volumen `pos_node_modules`) para mantener tu host limpio.

## Cómo probar el Medusa POS

1. **Arrancá el servicio** con `docker compose up pos` (ver logs con `-f`). Esperá a ver el QR en DevTools (http://localhost:19002).
2. **Conectá tu dispositivo** a la misma red que la máquina que corre Docker.
3. **Abrí Expo Go** y escaneá el QR desde DevTools. Si preferís emulador, usá los botones "Run on iOS" / "Run on Android" de la misma pantalla.
4. **Login**: ingresá la URL pública HTTPS de tu backend Medusa (ej. `erp-demo.medusajs.com`), el email y la contraseña del usuario admin. El POS valida `https://<url>/health`, así que si trabajás contra un backend local necesitás exponerlo con un túnel HTTPS (ngrok, Cloudflare Tunnel, etc.).
5. **Setup wizard**: elegí o creá Region, Sales Channel y Stock Location. Quedan persistidas vía la Admin API.
6. **Flujo de pruebas**:
   - Leé productos (search o scan barcode si el dispositivo tiene cámara).
   - Creá un carrito, sumá variantes y cliente.
   - Confirmá el pedido (crea draft order en Medusa) y revisá el historial en la pestaña Orders.
7. **Salida limpia**: `docker compose down pos` detiene Metro y libera los puertos 8081/19000-19002.

## Cómo testear sin dispositivo

- Usá `docker compose run --rm pos npm run lint` para asegurarte de que la app compile y pase ESLint.
- Ejecutá `docker compose up pos` y accedé a http://localhost:19002 desde el navegador; desde ahí podés disparar simuladores si tenés Xcode/Android Studio instalado localmente.

## Web B2B (Next.js)

El flujo no cambió respecto al template de Next.js:

```bash
# Desarrollo local (hot reload) fuera de Docker
npm install
npm run dev
```

Para producción continuá usando `docker compose up web` o el pipeline que ya tengas (el `Dockerfile` expone la app en `3000`).

## Troubleshooting rápido

- **El POS no puede resolver tu backend**: asegurate de que la URL sea HTTPS y accesible desde el teléfono/emulador.
- **No ves el QR**: confirmá que los puertos 19000-19002 estén libres y que el container no haya salido (revisá logs: `docker compose logs pos`).
- **Reload lento**: Expo corre en modo `--tunnel` por defecto para simplificar la conexión desde dispositivos externos; si estás en la misma LAN podés editar `docker-compose.yml` y quitar `--tunnel` para usar `--lan` y ganar velocidad.

Con esto tenés el POS de Medusa corriendo junto al storefront dentro del mismo repo y stack de Docker.
