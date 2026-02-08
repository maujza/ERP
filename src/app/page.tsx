import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Gem,
  HandHeart,
  Palette,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Timer,
  Truck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const colecciones = [
  {
    title: "Líneas esenciales",
    icon: Store,
    desc: "Argollas minimal, cadenas de acero y básicos de volumen alto.",
    chips: ["Stock permanente", "Márgenes x3"],
    image:
      "https://images.unsplash.com/photo-1741071520895-47d81779c11e?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Statement & fiesta",
    icon: Sparkles,
    desc: "Piezas bold con cristales premium y acabados perlados.",
    chips: ["Series cortas", "Color editorial"],
    image:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Materias nobles",
    icon: Gem,
    desc: "Baños en oro 18K, zamak hipoalergénico y resinas italianas.",
    chips: ["Garantía anti-oxidación", "Test de calidad"],
    image:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Paleta cápsula",
    icon: Palette,
    desc: "Pack curado por temporada listo para exhibir en tienda.",
    chips: ["Set por talles", "Rotación 30 días"],
    image:
      "https://images.unsplash.com/photo-1765852550345-ddb23c794d01?auto=format&fit=crop&w=1200&q=80",
  },
];

const razones = [
  {
    title: "Logística mayorista ágil",
    desc: "Pedidos preparados en 24/48h con control de calidad y tracking en vivo.",
    icon: Truck,
  },
  {
    title: "Presentación lista para exhibir",
    desc: "Backing cards brand-ready, blisters reutilizables y QR con story-telling.",
    icon: ShieldCheck,
  },
  {
    title: "Acompañamiento comercial",
    desc: "Forecast de ventas, planogramas y reposición inteligente según rotación.",
    icon: HandHeart,
  },
];

const galleryPieces = [
  {
    title: "Mood oro satinado",
    detail: "Argollas goute + perlas freshwater listas para vitrina.",
    badge: "Editorial AW25",
    src: "https://images.unsplash.com/photo-1704957205218-d436eac4c607?auto=format&fit=crop&w=1200&q=80",
    tall: true,
  },
  {
    title: "Layering Aura",
    detail: "Collares XL con cierres imantados y mix de texturas italianas.",
    badge: "Set curado",
    src: "https://images.unsplash.com/photo-1652865866859-3913fe2d2406?auto=format&fit=crop&w=1200&q=80",
    tall: false,
  },
  {
    title: "Pulseras Capri",
    detail: "Acero 316L pulido + detalles esmaltados en pasteles suaves.",
    badge: "Hot seller",
    src: "https://images.unsplash.com/photo-1765852550345-ddb23c794d01?auto=format&fit=crop&w=1200&q=80",
    tall: true,
  },
  {
    title: "Acero Siena",
    detail: "Argollas hipoalergénicas con micro pavé cristal.",
    badge: "Rotación 30d",
    src: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80",
    tall: false,
  },
];

const bestSellers = [
  {
    name: "Pack Argollas Siena",
    description: "Tres diámetros, micro circonias y baño oro 18K.",
    src: "https://images.unsplash.com/photo-1590166223826-12dee1677420?auto=format&fit=crop&w=1200&q=80",
    pack: "Pack x12 · $18.900 + IVA",
    benefit: "Incluye backing card + QR reposición.",
  },
  {
    name: "Layering Aura",
    description: "Stack de 5 collares con largos escalonados y cierres magnéticos.",
    src: "https://images.unsplash.com/photo-1601821765780-754fa98637c1?auto=format&fit=crop&w=1200&q=80",
    pack: "Pack x8 · $24.500 + IVA",
    benefit: "Listo para exhibir con tip cards.",
  },
  {
    name: "Mix Pulseras Capri",
    description: "Texturas esmaltadas + detalle strass, ajustable y libre de níquel.",
    src: "https://images.unsplash.com/photo-1765852550345-ddb23c794d01?auto=format&fit=crop&w=1200&q=80",
    pack: "Pack x18 · $21.700 + IVA",
    benefit: "Incluye displays acrílicos compactos.",
  },
];

const pasos = [
  { title: "Curamos tu mix", desc: "Elegimos 40-80 SKUs según tu ticket promedio.", icon: Star },
  { title: "Empacamos y etiquetamos", desc: "SKU + precio sugerido listo para colgar.", icon: Timer },
  { title: "Salida asegurada", desc: "Despacho diario a todo el país con seguro de envío.", icon: ArrowRight },
];

export default function Home() {
  return (
    <div className="relative isolate overflow-hidden bg-[#f7f7f7]">
      <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#f0f0f0] blur-3xl" />
      <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-[#ffd2dc] blur-3xl" />
      <main className="relative mx-auto flex max-w-6xl flex-col gap-16 px-6 py-16 md:px-10 lg:py-20">
        <section className="grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-6">
            <Badge variant="glow">Biyuterie boutique mayorista</Badge>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold leading-tight text-[#111111] sm:text-5xl">
                Colecciones curadas listas para vender con margen de mayorista.
              </h1>
              <p className="text-lg leading-relaxed text-[#444444]">
                Diseñamos y producimos Biyuterie moderna con calidad boutique,
                packs inteligentes y entregas rápidas. Recibí el mix listo para
                exhibir y enfocate en vender.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/catalog">
                  Ir al catálogo mayorista
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="#contacto">
                  Hablar ahora
                  <PhoneCall className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid max-w-xl grid-cols-3 gap-4 text-sm text-[#444444]">
              <div className="rounded-2xl border border-black/10 bg-white/90 px-4 py-3 shadow-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-[#6b6b6b]">
                  Entregas
                </p>
                <p className="text-2xl font-semibold text-[#111111]">24/48h</p>
                <p className="text-xs text-[#6b6b6b]">Packing protegido</p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-white/90 px-4 py-3 shadow-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-[#6b6b6b]">
                  Margen
                </p>
                <p className="text-2xl font-semibold text-[#111111]">3-4x</p>
                <p className="text-xs text-[#6b6b6b]">Precio sugerido en label</p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-white/90 px-4 py-3 shadow-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-[#6b6b6b]">
                  Mix inicial
                </p>
                <p className="text-2xl font-semibold text-[#111111]">50 uds</p>
                <p className="text-xs text-[#6b6b6b]">Sin mínimos por modelo</p>
              </div>
            </div>
          </div>
          <Card className="relative min-h-[420px] overflow-hidden border-0 bg-[#111111] text-white">
            <Image
              src="https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&w=1200&q=80"
              alt="Kit de vitrina Aurelia"
              fill
              sizes="(min-width: 1024px) 32vw, 90vw"
              priority
              className="object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-[#111111]/90 via-[#1f1f1f]/80 to-[#111111]/95" />
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[#ff2d55]/35 blur-2xl" />
            <CardHeader className="relative z-10">
              <Badge variant="outline" className="bg-white/10 text-white">
                Kit de vitrina premium
              </Badge>
              <CardTitle className="text-2xl font-semibold text-white">
                Lanza una isla de Biyuterie en 72 horas.
              </CardTitle>
              <CardDescription className="text-white/80">
                Display en base madera + 80 piezas high-rotation + visuales A5 +
                etiquetas con QR para reponer.
              </CardDescription>
            </CardHeader>
            <CardContent className="relative z-10 grid gap-4">
              <div className="grid grid-cols-3 gap-3 text-sm">
                {[
                  { label: "Incluye", value: "Exhibidores + branding" },
                  { label: "Garantía", value: "90 días anti-oxidación" },
                  { label: "Soporte", value: "Asesor asignado" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3"
                  >
                    <p className="text-[11px] uppercase tracking-[0.2em] text-white/70">
                      {item.label}
                    </p>
                    <p className="text-sm font-semibold text-white">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
              <Button variant="muted" size="lg" className="justify-between">
                Descargar ficha del kit
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </section>

        <section id="colecciones" className="space-y-6">
          <div className="flex items-center gap-3">
            <Badge variant="outline">Colecciones listas</Badge>
            <span className="text-sm uppercase tracking-[0.22em] text-[#6b6b6b]">
              Rotación mensual · Stock controlado
            </span>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {colecciones.map((item) => (
              <Card key={item.title} className="overflow-hidden p-0">
                <div className="relative h-44 w-full">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    sizes="(min-width: 1024px) 30vw, 92vw"
                    className={`object-cover ${
                      item.title === "Líneas esenciales"
                        ? "object-center"
                        : item.title === "Paleta cápsula"
                          ? "object-top"
                          : ""
                    }`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                  <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#111111]">
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </div>
                </div>
                <div className="space-y-4 p-6">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-xl font-semibold text-[#111111]">{item.title}</h3>
                    <p className="text-sm text-[#444444]">{item.desc}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.chips.map((chip) => (
                      <span
                        key={chip}
                        className="rounded-full border border-black/10 bg-[#f0f0f0] px-3 py-1 text-xs font-medium text-[#444444]"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div className="rounded-[38px] border border-black/10 bg-white/90 p-6 shadow-[0_32px_80px_rgba(0,0,0,0.08)] backdrop-blur">
            <div className="space-y-3">
              <Badge variant="outline">Moodboard real</Badge>
              <h2 className="text-3xl font-semibold text-[#111111]">
                Producto fotografiado tal como llega a tu tienda.
              </h2>
              <p className="text-base text-[#444444]">
                Shots reales en estudio de la línea vigente, listos para inspirar tu vitrina y
                compartir con tus clientes mayoristas.
              </p>
            </div>
            <div className="mt-6 grid gap-4 sm:auto-rows-[220px] sm:grid-cols-2">
              {galleryPieces.map((piece, idx) => (
                <div
                  key={piece.title}
                  className={`group relative overflow-hidden rounded-[28px] border border-black/10 shadow-[0_18px_60px_rgba(0,0,0,0.12)] ${piece.tall ? "sm:row-span-2" : ""}`}
                >
                  <Image
                    src={piece.src}
                    alt={piece.title}
                    fill
                    priority={idx === 0}
                    sizes="(min-width: 1024px) 40vw, 94vw"
                    className="object-cover transition duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/10 to-black/80" />
                  <div className="relative z-10 flex h-full flex-col justify-between p-5 text-white">
                    <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-white">
                      {piece.badge}
                    </span>
                    <div>
                      <p className="text-lg font-semibold">{piece.title}</p>
                      <p className="text-sm text-white/80">{piece.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Card className="mt-6 overflow-hidden border-0 bg-[#111111] text-white shadow-[0_30px_90px_rgba(0,0,0,0.5)]">
              <div className="relative z-10 space-y-4 p-6">
                <Badge variant="outline" className="bg-white/10 text-white">
                  Asesoramiento 24/7
                </Badge>
                <CardTitle className="text-2xl">
                  Tenés un equipo senior disponible todos los días para ayudarte a vender más.
                </CardTitle>
                <CardDescription className="text-white/80">
                  Resolvemos dudas de stock, mix y visual en minutos. Coordinamos reposiciones
                  express y te compartimos insights de rotación por marketplace o tienda física.
                </CardDescription>
                <div className="flex flex-wrap gap-3 text-sm">
                  <span className="rounded-full bg-white/15 px-3 py-1 uppercase tracking-[0.2em] text-white/90">
                    WhatsApp 24/7
                  </span>
                  <span className="rounded-full bg-white/15 px-3 py-1 uppercase tracking-[0.2em] text-white/90">
                    Merchandising remoto
                  </span>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button variant="muted">
                    Chatear con asesor
                  </Button>
                  <Button variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20">
                    Agendar video call
                  </Button>
                </div>
              </div>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,210,0,0.18),transparent_45%),radial-gradient(circle_at_80%_-10%,rgba(255,210,0,0.12),transparent_45%)] opacity-60" />
            </Card>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Badge variant="outline">Best sellers en foto</Badge>
              <p className="text-2xl font-semibold text-[#111111]">
                Packs que más se reponen por nuestros clientes.
              </p>
              <p className="text-sm text-[#444444]">
                Cada pack viene con precios sugeridos, etiquetas y empaque reutilizable.
              </p>
            </div>
            <div className="space-y-5">
              {bestSellers.map((item) => (
                <Card key={item.name} className="overflow-hidden border-black/10">
                  <div className="relative h-48 w-full">
                    <Image
                      src={item.src}
                      alt={item.name}
                      fill
                      sizes="(min-width: 1024px) 26vw, 92vw"
                      className="object-cover"
                    />
                  </div>
                  <CardHeader className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] uppercase tracking-[0.25em] text-[#6b6b6b]">
                      <span>{item.pack}</span>
                      <span className="rounded-full bg-black/85 px-3 py-1 text-[10px] font-semibold text-white">
                        En stock
                      </span>
                    </div>
                    <CardTitle>{item.name}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-0 text-sm text-[#444444]">
                    <span>{item.benefit}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-[#111111] hover:bg-[#f0f0f0]"
                    >
                      Reservar pack
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div className="space-y-4">
            <Badge variant="outline">Somos tu partner</Badge>
            <h2 className="text-3xl font-semibold text-[#111111]">
              Operamos como tu equipo de categoría: desde la selección hasta el
              re-stock.
            </h2>
            <p className="text-base text-[#444444]">
              El foco es que vendas más con menos gestión. Integramos control de
              calidad, etiqueta con precio sugerido y reportes de rotación para
              que tu surtido siempre esté vivo.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {razones.map((razon) => (
                <Card key={razon.title} className="border-black/10">
                  <CardHeader className="space-y-3">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ffe1e8] text-[#111111]">
                      <razon.icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-base">{razon.title}</CardTitle>
                    <CardDescription>{razon.desc}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
          <Card className="relative overflow-hidden border-0 bg-white">
            <CardHeader>
              <Badge variant="outline">Workflow</Badge>
              <CardTitle className="text-xl text-[#111111]">
                Cómo se ve tu primer pedido
              </CardTitle>
              <CardDescription>
                Todo el proceso en menos de una semana.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pasos.map((paso, idx) => (
                <div
                  key={paso.title}
                  className="flex items-start gap-4 rounded-2xl border border-black/10 bg-[#f7f7f7] p-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#ffe1e8] text-[#111111]">
                    <paso.icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[#111111]">
                      {idx + 1}. {paso.title}
                    </p>
                    <p className="text-sm text-[#444444]">{paso.desc}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section
          id="contacto"
          className="overflow-hidden rounded-3xl bg-[#111111] text-white shadow-[0_32px_80px_rgba(0,0,0,0.35)]"
        >
          <div className="relative isolate flex flex-col gap-8 p-10 md:flex-row md:items-center md:justify-between">
            <div className="space-y-4 max-w-xl">
              <Badge variant="glow" className="bg-white/10 text-white">
                Pedido mínimo accesible
              </Badge>
              <h3 className="text-3xl font-semibold">
                Abrí cuenta mayorista hoy mismo.
              </h3>
              <p className="text-white/80">
                Enviamos catálogo actualizado, precios por volumen y
                disponibilidad real. También armamos un mix de prueba si es tu
                primera compra.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" asChild size="lg" className="border-white/40 bg-white/10 text-white hover:bg-white/20">
                  <Link href="mailto:hola@aurelia.com">Pedir catálogo</Link>
                </Button>
                <Button asChild size="lg" variant="muted">
                  <Link href="https://wa.me/5491112345678">
                    WhatsApp inmediato
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
            <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80 backdrop-blur">
              <div className="flex items-center justify-between">
                <span className="text-white/70">Stock vivo</span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
                  Actualizado
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Lead time producción</span>
                <span className="font-semibold text-white">12-15 días</span>
              </div>
              <div className="flex items-center justify-between">
                <span>MOQ por orden</span>
                <span className="font-semibold text-white">50 unidades</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Certificaciones</span>
                <span className="font-semibold text-white">Níquel free</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
