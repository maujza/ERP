# DESIGN.md — Aurelia Frontend Guide

Documento vivo del frontend real de Aurelia. Describe la dirección visual actual, los componentes principales y las decisiones que hoy sí están implementadas.

**Audiencia:** desarrollo y futuras sesiones sobre UI.  
**Última actualización:** 2026-04-06

## Producto

Aurelia no es solo una tienda. El frontend hoy cubre cuatro superficies distintas:

- storefront B2B/mobile-first
- catálogo y producto para venta mayorista
- checkout
- backoffice visual para operación comercial

El stack visual busca que todas esas piezas se sientan parte del mismo producto, sin convertirse en una interfaz corporativa pesada.

## Dirección visual actual

La app hoy se apoya en estas ideas:

1. **Base neutra y cálida.** Fondo crema muy claro, superficies blancas y bordes suaves.
2. **Acento fuerte y comercial.** El color de marca visible es rojo/fucsia, usado para CTA, badges y highlights.
3. **Tipografía única y limpia.** Toda la app usa Plus Jakarta Sans; no hay hoy una familia display separada.
4. **Cards primero.** Gran parte de la experiencia vive en tarjetas: producto, filtros, quick actions, módulos de backoffice.
5. **Header liviano, UI densa abajo.** La navegación es discreta; el contenido importante está en el cuerpo.

## Tokens reales

Definidos en [`src/app/globals.css`](/home/akwiek/code/ERP/src/app/globals.css).

```css
:root {
  --background: #f6f5f2;
  --foreground: #111111;
  --surface: #ffffff;
  --muted: #deddd8;
  --brand-red: #ff174f;
  --brand-red-dark: #e3043c;
  --brand-red-soft: #ff6b8f;
  --brand-red-tint: #ffd9e3;
  --card-btn-add: rgba(17, 17, 17, 0.72);
  --card-btn-add-icon: #ffffff;
  --card-btn-qv: rgba(105, 105, 105, 0.72);
  --card-btn-qv-icon: #ffffff;
}
```

## Tipografía real

La app usa [`Plus_Jakarta_Sans`](https://fonts.google.com/specimen/Plus+Jakarta+Sans) en [`src/app/layout.tsx`](/home/akwiek/code/ERP/src/app/layout.tsx).

Reglas actuales:

- títulos: mismo sans, mayor peso/tamaño
- cuerpo: mismo sans
- precios y CTA: mismo sans, mayor contraste y peso

No hay hoy una segunda familia serif ni una jerarquía editorial compleja. Si se cambia eso, este documento hay que actualizarlo.

## Superficies principales

### 1. App shell

Implementada en [`src/components/app-chrome.tsx`](/home/akwiek/code/ERP/src/components/app-chrome.tsx).

Incluye:

- `SiteHeader`
- `SiteFooter`
- botón flotante de WhatsApp
- sistema de toasts
- sticky checkout mobile si hay carrito

El backoffice convive dentro del mismo shell, pero con menos separación superior.

### 2. Header

Características actuales:

- fijo arriba
- fondo blanco translúcido con blur
- navegación simple
- acceso a búsqueda, cuenta y carrito
- drawer mobile

La intención correcta es que no robe protagonismo al catálogo.

### 3. Fondo global

El `body` no usa color plano. Tiene:

- gradiente radial rojo suave
- un radial oscuro casi imperceptible
- gradiente vertical crema → blanco → crema

Eso da atmósfera sin volverse decorativo de más.

## Componentes clave

### Product Card

Implementada en [`src/components/product-card.tsx`](/home/akwiek/code/ERP/src/components/product-card.tsx).

Comportamiento actual:

- imagen como superficie principal
- corazón de favoritos arriba a la derecha
- badge de descuento si aplica
- hover actions en desktop
- quick view modal
- `Seleccionar opciones` en vez de “comprar ya”
- badge `AGOTADO` si no hay stock

Decisiones de diseño actuales:

- cards blancas con borde negro muy suave
- radios grandes (`rounded-2xl`)
- acciones flotantes sobre fondo blanco
- imagen con leve zoom en hover

### Quick View

Se usa para inspección rápida sin salir del contexto.

Se dispara desde:

- hover button de producto
- otros puntos interactivos donde corresponda

La regla correcta es: si el usuario todavía está explorando, evitar sacarlo del flujo con navegación innecesaria.

### Sticky checkout mobile

Hoy existe y está bien alineado con el producto:

- solo aparece si hay ítems
- se oculta en checkout y backoffice
- muestra cantidad + subtotal + CTA

Es una pieza importante porque la app tiene uso fuerte en mobile.

## Páginas y tono visual

### Home

La home hoy combina:

- hero rotativo
- productos destacados
- quick actions
- bloques de colecciones
- shop-the-look

Tono visual:

- editorial liviano
- comercial
- directo

No está diseñada como homepage corporativa sino como arranque de compra.

### Catalog

Implementado en [`src/app/catalog/page.tsx`](/home/akwiek/code/ERP/src/app/catalog/page.tsx).

Patrones actuales:

- rail de subcategorías horizontal
- panel de filtros lateral en desktop
- modal de filtros en mobile
- orden y paginación local
- productos cargados desde Medusa

Observación importante:

- hoy la carga de productos es client-side
- eso hace que el render inicial salga vacío y luego hidrate
- funcionalmente sirve, pero la UX no es ideal

Mejora recomendada a futuro:

- carga inicial server-side para home, catálogo y búsqueda

### Product page

La product page es más utilitaria que expresiva:

- foco en foto, precio, opciones y compra
- tiene que seguir sintiéndose consistente con la card

### Checkout

Debe sentirse más transaccional y menos editorial:

- claridad
- validaciones visibles
- poco ruido visual
- jerarquía clara entre formulario y resumen

### Backoffice

El backoffice actual no es el admin técnico de Medusa. Es una capa visual propia para operación comercial.

Debe comunicar:

- control
- lectura rápida
- módulos
- datos accionables

No debería parecer una pantalla heredada del storefront con dos tablas encima. Si se lo siga expandiendo, necesita identidad propia pero manteniendo tokens compartidos.

## Idioma y contenido

La app ya contempla español y coreano en varias superficies.

Reglas:

- español es el idioma base
- coreano es traducción funcional, no una reinterpretación visual
- labels cortos y comerciales
- evitar microcopy burocrático

## Responsive

La app tiene que funcionar bien en:

- mobile pequeño
- tablet vertical
- desktop ancho

Patrones actuales acertados:

- grillas que colapsan a 1 o 2 columnas
- filtros en drawer mobile
- sticky checkout mobile
- hover actions ocultas en touch cuando corresponde

## Qué no refleja bien el frontend hoy

Estos son gaps reales, no bugs de styling:

1. **Carga de productos demasiado client-side**
   La home y el catálogo pueden verse vacíos al inicio.

2. **Dependencia de `NEXT_PUBLIC_MEDUSA_BACKEND_URL`**
   Si la URL pública del backend está mal, el storefront parece vacío aunque Medusa tenga productos.

3. **Documentación visual vieja**
   La versión anterior de este documento describía otro sistema de color, otra tipografía y otra intención visual.

## Próximas mejoras razonables

Orden recomendado:

1. mover carga inicial de productos a server-side
2. usar proxy interno `/api/medusa` para no depender del host público en cliente
3. consolidar visualmente storefront y backoffice sin mezclarlos
4. revisar estados vacíos y de loading para que no parezcan errores

## Regla para cambios futuros

Cuando se cambie alguno de estos elementos, este archivo debe actualizarse:

- tokens en `globals.css`
- tipografía global
- comportamiento de `ProductCard`
- estructura del shell
- estrategia de carga de productos
- relación visual entre storefront y backoffice
