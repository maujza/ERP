"use client";

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
import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const content = {
  es: {
    hero: {
      badge: "Biyuterie boutique mayorista",
      title: "Colecciones curadas listas para vender con margen de mayorista.",
      description:
        "Diseñamos y producimos Biyuterie moderna con calidad boutique, packs inteligentes y entregas rápidas. Recibí la selección lista para exhibir y enfocáte en vender.",
      catalogCta: "Ir al catálogo mayorista",
      chatCta: "Hablar ahora",
      stats: [
        { label: "Entregas", value: "24/48h", detail: "Packing protegido" },
        { label: "Margen", value: "3-4x", detail: "Precio sugerido en label" },
        { label: "Mix inicial", value: "50 uds", detail: "Sin mínimos por modelo" },
      ],
    },
    kit: {
      badge: "Kit de vitrina premium",
      title: "Lanzá una isla de Biyuterie en 72 horas.",
      description:
        "Exhibidor en base madera + 80 piezas de alta rotación + visuales A5 + etiquetas con QR para reponer.",
      highlights: [
        { label: "Incluye", value: "Exhibidores + identidad de marca" },
        { label: "Garantía", value: "90 días anti-oxidación" },
        { label: "Soporte", value: "Asesor asignado" },
      ],
      cta: "Descargar ficha del kit",
      imageAlt: "Kit de vitrina Aurelia",
    },
    collectionsSection: {
      badge: "Colecciones listas",
      meta: "Rotación mensual · Stock controlado",
      items: [
        {
          title: "Líneas esenciales",
          icon: Store,
          desc: "Argollas minimal, cadenas de acero y básicos de volumen alto.",
          chips: ["Stock permanente", "Márgenes x3"],
          image:
            "https://images.unsplash.com/photo-1741071520895-47d81779c11e?auto=format&fit=crop&w=1200&q=80",
          imageClass: "object-center",
        },
        {
          title: "Statement & fiesta",
          icon: Sparkles,
          desc: "Piezas bold con cristales premium y acabados perlados.",
          chips: ["Series cortas", "Color editorial"],
          image:
            "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80",
          imageClass: "",
        },
        {
          title: "Materias nobles",
          icon: Gem,
          desc: "Baños en oro 18K, zamak hipoalergénico y resinas italianas.",
          chips: ["Garantía anti-oxidación", "Test de calidad"],
          image:
            "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80",
          imageClass: "",
        },
        {
          title: "Paleta cápsula",
          icon: Palette,
          desc: "Pack curado por temporada listo para exhibir en tienda.",
          chips: ["Conjunto por talles", "Rotación 30 días"],
          image:
            "https://images.unsplash.com/photo-1765852550345-ddb23c794d01?auto=format&fit=crop&w=1200&q=80",
          imageClass: "object-top",
        },
      ],
    },
    moodboard: {
      badge: "Moodboard real",
      title: "Producto fotografiado tal como llega a tu tienda.",
      description:
        "Shots reales en estudio de la línea vigente, listos para inspirar tu vitrina y compartir con tus clientes mayoristas.",
      pieces: [
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
          badge: "Conjunto curado",
          src: "https://images.unsplash.com/photo-1652865866859-3913fe2d2406?auto=format&fit=crop&w=1200&q=80",
          tall: false,
        },
        {
          title: "Pulseras Capri",
          detail: "Acero 316L pulido + detalles esmaltados en pasteles suaves.",
          badge: "Más vendido",
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
      ],
    },
    supportCard: {
      badge: "Asesoramiento 24/7",
      title: "Tenés un equipo senior disponible todos los días para ayudarte a vender más.",
      description:
        "Resolvemos dudas de stock, surtido y visual en minutos. Coordinamos reposiciones rápidas y compartimos datos de rotación por canal online o tienda física.",
      tags: ["WhatsApp 24/7", "Merchandising a distancia"],
      primaryCta: "Chatear con asesor",
      secondaryCta: "Agendar videollamada",
    },
    bestSellers: {
      badge: "Más vendidos en foto",
      title: "Packs que más se reponen por nuestros clientes.",
      description:
        "Cada pack viene con precios sugeridos, etiquetas y empaque reutilizable.",
      stockBadge: "En stock",
      reserveCta: "Reservar pack",
      items: [
        {
          name: "Pack Argollas Siena",
          description: "Tres diámetros, micro circonias y baño oro 18K.",
          src: "https://images.unsplash.com/photo-1590166223826-12dee1677420?auto=format&fit=crop&w=1200&q=80",
          pack: "Pack x12 · $18.900 + IVA",
          benefit: "Incluye tarjeta de respaldo + QR de reposición.",
        },
        {
          name: "Layering Aura",
          description: "Stack de 5 collares con largos escalonados y cierres magnéticos.",
          src: "https://images.unsplash.com/photo-1601821765780-754fa98637c1?auto=format&fit=crop&w=1200&q=80",
          pack: "Pack x8 · $24.500 + IVA",
          benefit: "Listo para exhibir con tarjetas guía.",
        },
        {
          name: "Mix Pulseras Capri",
          description: "Texturas esmaltadas + detalle strass, ajustable y libre de níquel.",
          src: "https://images.unsplash.com/photo-1765852550345-ddb23c794d01?auto=format&fit=crop&w=1200&q=80",
          pack: "Pack x18 · $21.700 + IVA",
          benefit: "Incluye displays acrílicos compactos.",
        },
      ],
    },
    partner: {
      badge: "Somos tu aliado",
      title: "Operamos como tu equipo de categoría: desde la selección hasta la reposición.",
      description:
        "El foco es que vendas más con menos gestión. Integramos control de calidad, etiqueta con precio sugerido y reportes de rotación para que tu surtido siempre esté vivo.",
      reasons: [
        {
          title: "Logística mayorista ágil",
          desc: "Pedidos preparados en 24/48h con control de calidad y seguimiento en vivo.",
          icon: Truck,
        },
        {
          title: "Presentación lista para exhibir",
          desc: "Tarjetas listas para marca, blisters reutilizables y QR con relato de producto.",
          icon: ShieldCheck,
        },
        {
          title: "Acompañamiento comercial",
          desc: "Forecast de ventas, planogramas y reposición inteligente según rotación.",
          icon: HandHeart,
        },
      ],
    },
    workflow: {
      badge: "Proceso",
      title: "Cómo se ve tu primer pedido",
      description: "Todo el proceso en menos de una semana.",
      steps: [
        {
          title: "Curamos tu mix",
          desc: "Elegimos 40-80 SKUs según tu ticket promedio.",
          icon: Star,
        },
        {
          title: "Empacamos y etiquetamos",
          desc: "SKU + precio sugerido listo para colgar.",
          icon: Timer,
        },
        {
          title: "Salida asegurada",
          desc: "Despacho diario a todo el país con seguro de envío.",
          icon: ArrowRight,
        },
      ],
    },
    contact: {
      badge: "Pedido mínimo accesible",
      title: "Abrí cuenta mayorista hoy mismo.",
      description:
        "Enviamos catálogo actualizado, precios por volumen y disponibilidad real. También armamos un mix de prueba si es tu primera compra.",
      catalogCta: "Pedir catálogo",
      whatsappCta: "WhatsApp inmediato",
      stockLabel: "Stock vivo",
      stockStatus: "Actualizado",
      leadTimeLabel: "Lead time producción",
      leadTimeValue: "12-15 días",
      moqLabel: "MOQ por orden",
      moqValue: "50 unidades",
      certLabel: "Certificaciones",
      certValue: "Níquel free",
    },
  },
  ko: {
    hero: {
      badge: "도매 부티크 주얼리",
      title: "도매 마진으로 바로 판매 가능한 큐레이션 컬렉션.",
      description:
        "우리는 부티크급 품질의 모던 주얼리를 설계/생산하며, 스마트 패키지와 빠른 배송을 제공합니다. 진열 가능한 구성을 받아 판매에 집중하세요.",
      catalogCta: "도매 카탈로그 보기",
      chatCta: "지금 상담하기",
      stats: [
        { label: "배송", value: "24/48시간", detail: "보호 포장" },
        { label: "마진", value: "3-4배", detail: "권장 소비자가 라벨 제공" },
        { label: "초기 구성", value: "50개", detail: "모델별 최소 수량 없음" },
      ],
    },
    kit: {
      badge: "프리미엄 쇼케이스 키트",
      title: "72시간 안에 주얼리 디스플레이 존을 오픈하세요.",
      description:
        "원목 베이스 디스플레이 + 고회전 상품 80개 + A5 비주얼 + QR 재주문 태그.",
      highlights: [
        { label: "포함", value: "디스플레이 + 브랜딩" },
        { label: "보증", value: "90일 산화 방지" },
        { label: "지원", value: "전담 어드바이저" },
      ],
      cta: "키트 소개서 다운로드",
      imageAlt: "Aurelia 쇼케이스 키트",
    },
    collectionsSection: {
      badge: "즉시 판매 컬렉션",
      meta: "월간 로테이션 · 재고 관리",
      items: [
        {
          title: "핵심 에센셜",
          icon: Store,
          desc: "미니멀 후프, 스틸 체인, 고회전 베이식 아이템.",
          chips: ["상시 재고", "3배 마진"],
          image:
            "https://images.unsplash.com/photo-1741071520895-47d81779c11e?auto=format&fit=crop&w=1200&q=80",
          imageClass: "object-center",
        },
        {
          title: "스테이트먼트 & 파티",
          icon: Sparkles,
          desc: "프리미엄 크리스털과 펄 마감의 볼드한 디자인.",
          chips: ["한정 수량", "에디토리얼 컬러"],
          image:
            "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80",
          imageClass: "",
        },
        {
          title: "프리미엄 소재",
          icon: Gem,
          desc: "18K 골드 도금, 저자극 자막, 이탈리아 레진.",
          chips: ["산화 방지 보증", "품질 테스트 완료"],
          image:
            "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80",
          imageClass: "",
        },
        {
          title: "캡슐 팔레트",
          icon: Palette,
          desc: "시즌 큐레이션으로 매장 진열이 바로 가능한 패키지.",
          chips: ["사이즈별 세트", "30일 로테이션"],
          image:
            "https://images.unsplash.com/photo-1765852550345-ddb23c794d01?auto=format&fit=crop&w=1200&q=80",
          imageClass: "object-top",
        },
      ],
    },
    moodboard: {
      badge: "실제 무드보드",
      title: "매장에 도착하는 그대로 촬영된 제품 이미지.",
      description:
        "현재 라인의 실제 스튜디오 컷으로 쇼케이스 연출과 도매 고객 공유에 바로 활용할 수 있습니다.",
      pieces: [
        {
          title: "새틴 골드 무드",
          detail: "쇼케이스 진열용 구뜨 후프 + 담수 진주.",
          badge: "에디토리얼 AW25",
          src: "https://images.unsplash.com/photo-1704957205218-d436eac4c607?auto=format&fit=crop&w=1200&q=80",
          tall: true,
        },
        {
          title: "아우라 레이어링",
          detail: "자석 잠금과 이탈리아 텍스처 믹스의 XL 네크리스.",
          badge: "큐레이션 세트",
          src: "https://images.unsplash.com/photo-1652865866859-3913fe2d2406?auto=format&fit=crop&w=1200&q=80",
          tall: false,
        },
        {
          title: "카프리 브레이슬릿",
          detail: "폴리시드 316L 스틸 + 소프트 파스텔 에나멜 디테일.",
          badge: "베스트셀러",
          src: "https://images.unsplash.com/photo-1765852550345-ddb23c794d01?auto=format&fit=crop&w=1200&q=80",
          tall: true,
        },
        {
          title: "시에나 스틸",
          detail: "마이크로 크리스털 파베의 저자극 후프.",
          badge: "30일 로테이션",
          src: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80",
          tall: false,
        },
      ],
    },
    supportCard: {
      badge: "24/7 상담",
      title: "매일 판매 성장을 돕는 시니어 팀이 대기합니다.",
      description:
        "재고, 구성, 비주얼 관련 문의를 빠르게 해결합니다. 긴급 재입고를 조율하고 마켓플레이스/오프라인 회전 인사이트를 공유합니다.",
      tags: ["WhatsApp 24/7", "원격 머천다이징"],
      primaryCta: "상담원과 채팅",
      secondaryCta: "화상 상담 예약",
    },
    bestSellers: {
      badge: "베스트셀러 실사",
      title: "고객들이 가장 많이 재주문하는 패키지.",
      description: "모든 패키지에 권장가, 라벨, 재사용 가능한 포장이 포함됩니다.",
      stockBadge: "재고 있음",
      reserveCta: "패키지 예약",
      items: [
        {
          name: "시에나 후프 팩",
          description: "세 가지 지름, 마이크로 지르코니아, 18K 골드 도금.",
          src: "https://images.unsplash.com/photo-1590166223826-12dee1677420?auto=format&fit=crop&w=1200&q=80",
          pack: "팩 x12 · $18,900 + VAT",
          benefit: "백킹 카드 + 재주문 QR 포함.",
        },
        {
          name: "아우라 레이어링",
          description: "5개 네크리스 스택, 단계별 길이와 자석 클라스프.",
          src: "https://images.unsplash.com/photo-1601821765780-754fa98637c1?auto=format&fit=crop&w=1200&q=80",
          pack: "팩 x8 · $24,500 + VAT",
          benefit: "팁 카드와 함께 바로 진열 가능.",
        },
        {
          name: "카프리 브레이슬릿 믹스",
          description: "에나멜 텍스처 + 스트라스 디테일, 조절 가능, 니켈 프리.",
          src: "https://images.unsplash.com/photo-1765852550345-ddb23c794d01?auto=format&fit=crop&w=1200&q=80",
          pack: "팩 x18 · $21,700 + VAT",
          benefit: "컴팩트 아크릴 디스플레이 포함.",
        },
      ],
    },
    partner: {
      badge: "당신의 파트너",
      title: "선정부터 재입고까지, 카테고리 팀처럼 운영합니다.",
      description:
        "적은 운영으로 더 많이 판매할 수 있도록 돕는 것이 목표입니다. 품질 관리, 권장가 라벨, 회전 리포트를 통합해 진열 구성을 항상 살아 있게 유지합니다.",
      reasons: [
        {
          title: "민첩한 도매 물류",
          desc: "24/48시간 내 품질 검수와 실시간 트래킹으로 출고 준비.",
          icon: Truck,
        },
        {
          title: "진열 준비 완료 패키징",
          desc: "브랜드용 백킹 카드, 재사용 블리스터, 스토리텔링 QR 제공.",
          icon: ShieldCheck,
        },
        {
          title: "세일즈 운영 지원",
          desc: "판매 예측, 플래노그램, 회전 기반 스마트 재입고.",
          icon: HandHeart,
        },
      ],
    },
    workflow: {
      badge: "워크플로우",
      title: "첫 주문 진행 방식",
      description: "모든 과정을 1주 이내로 완료합니다.",
      steps: [
        {
          title: "구성을 큐레이션",
          desc: "평균 객단가에 맞춰 40-80 SKU를 선정합니다.",
          icon: Star,
        },
        {
          title: "포장 및 라벨링",
          desc: "SKU + 권장가 라벨까지, 바로 걸 수 있게 준비.",
          icon: Timer,
        },
        {
          title: "안전한 출고",
          desc: "보험 포함 전국 일일 배송.",
          icon: ArrowRight,
        },
      ],
    },
    contact: {
      badge: "부담 없는 최소 주문",
      title: "오늘 바로 도매 계정을 여세요.",
      description:
        "최신 카탈로그, 수량별 가격, 실시간 재고를 보내드립니다. 첫 구매를 위한 테스트 구성도 가능합니다.",
      catalogCta: "카탈로그 요청",
      whatsappCta: "WhatsApp 바로가기",
      stockLabel: "실시간 재고",
      stockStatus: "업데이트됨",
      leadTimeLabel: "생산 리드타임",
      leadTimeValue: "12-15일",
      moqLabel: "주문당 MOQ",
      moqValue: "50개",
      certLabel: "인증",
      certValue: "니켈 프리",
    },
  },
} as const;

export default function Home() {
  const { language } = useLanguage();
  const t = content[language];

  return (
    <div lang={language} className="relative isolate overflow-hidden bg-[#f7f7f7]">
      <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#f0f0f0] blur-3xl" />
      <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-[#ffd2dc] blur-3xl" />
      <main className="relative mx-auto flex w-full max-w-[1500px] flex-col gap-12 px-4 py-10 sm:px-6 sm:py-12 md:px-8 lg:gap-16 lg:py-20 xl:px-6">
        <section className="grid items-center gap-8 md:grid-cols-[1.1fr_0.9fr] lg:gap-10">
          <div className="space-y-6">
            <Badge variant="glow">{t.hero.badge}</Badge>
            <div className="space-y-4">
              <h1 className="text-3xl font-semibold leading-tight text-[#111111] sm:text-4xl lg:text-5xl">
                {t.hero.title}
              </h1>
              <p className="text-base leading-relaxed text-[#444444] sm:text-lg">{t.hero.description}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="w-full sm:w-auto" size="lg">
                <Link href="/catalog">
                  {t.hero.catalogCta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full sm:w-auto" size="lg">
                <Link href="#contacto">
                  {t.hero.chatCta}
                  <PhoneCall className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid max-w-xl grid-cols-2 gap-3 text-sm text-[#444444] sm:grid-cols-3 sm:gap-4">
              {t.hero.stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-black/10 bg-white/90 px-3 py-3 shadow-sm sm:px-4"
                >
                  <p className="text-xs uppercase tracking-[0.18em] text-[#6b6b6b]">{stat.label}</p>
                  <p className="text-xl font-semibold text-[#111111] sm:text-2xl">{stat.value}</p>
                  <p className="text-xs text-[#6b6b6b]">{stat.detail}</p>
                </div>
              ))}
            </div>
          </div>
          <Card className="relative min-h-[360px] overflow-hidden border-0 bg-[#111111] text-white sm:min-h-[420px]">
            <Image
              src="https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&w=1200&q=80"
              alt={t.kit.imageAlt}
              fill
              sizes="(min-width: 1024px) 32vw, 90vw"
              priority
              className="object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-[#111111]/90 via-[#1f1f1f]/80 to-[#111111]/95" />
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[#ff2d55]/35 blur-2xl" />
            <CardHeader className="relative z-10">
              <Badge variant="outline" className="bg-white/10 text-white">
                {t.kit.badge}
              </Badge>
              <CardTitle className="text-xl font-semibold text-white sm:text-2xl">{t.kit.title}</CardTitle>
              <CardDescription className="text-white/80">{t.kit.description}</CardDescription>
            </CardHeader>
            <CardContent className="relative z-10 grid gap-4">
              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                {t.kit.highlights.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3"
                  >
                    <p className="text-[11px] uppercase tracking-[0.2em] text-white/70">{item.label}</p>
                    <p className="text-sm font-semibold text-white">{item.value}</p>
                  </div>
                ))}
              </div>
              <Button variant="muted" size="lg" className="justify-between">
                {t.kit.cta}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </section>

        <section id="colecciones" className="space-y-6">
          <div className="flex items-center gap-3">
            <Badge variant="outline">{t.collectionsSection.badge}</Badge>
            <span className="text-sm uppercase tracking-[0.22em] text-[#6b6b6b]">
              {t.collectionsSection.meta}
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
            {t.collectionsSection.items.map((item) => (
              <Card key={item.title} className="overflow-hidden p-0">
                <div className="relative h-36 w-full sm:h-44">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    sizes="(min-width: 1024px) 30vw, 92vw"
                    className={`object-cover ${item.imageClass}`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                  <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#111111]">
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </div>
                </div>
                <div className="space-y-4 p-4 sm:p-6">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-lg font-semibold text-[#111111] sm:text-xl">{item.title}</h3>
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

        <section className="grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-start">
          <div className="rounded-[30px] border border-black/10 bg-white/90 p-4 shadow-[0_32px_80px_rgba(0,0,0,0.08)] backdrop-blur sm:rounded-[38px] sm:p-6">
            <div className="space-y-3">
              <Badge variant="outline">{t.moodboard.badge}</Badge>
              <h2 className="text-2xl font-semibold text-[#111111] sm:text-3xl">{t.moodboard.title}</h2>
              <p className="text-base text-[#444444]">{t.moodboard.description}</p>
            </div>
            <div className="mt-6 grid gap-4 sm:auto-rows-[220px] sm:grid-cols-2">
              {t.moodboard.pieces.map((piece, idx) => (
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
              <div className="relative z-10 space-y-4 p-5 sm:p-6">
                <Badge variant="outline" className="bg-white/10 text-white">
                  {t.supportCard.badge}
                </Badge>
                <CardTitle className="text-xl sm:text-2xl">{t.supportCard.title}</CardTitle>
                <CardDescription className="text-white/80">{t.supportCard.description}</CardDescription>
                <div className="flex flex-wrap gap-3 text-sm">
                  {t.supportCard.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-white/15 px-3 py-1 uppercase tracking-[0.2em] text-white/90"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button variant="muted">{t.supportCard.primaryCta}</Button>
                  <Button
                    variant="outline"
                    className="border-white/40 bg-white/10 text-white hover:bg-white/20"
                  >
                    {t.supportCard.secondaryCta}
                  </Button>
                </div>
              </div>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,210,0,0.18),transparent_45%),radial-gradient(circle_at_80%_-10%,rgba(255,210,0,0.12),transparent_45%)] opacity-60" />
            </Card>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Badge variant="outline">{t.bestSellers.badge}</Badge>
              <p className="text-xl font-semibold text-[#111111] sm:text-2xl">{t.bestSellers.title}</p>
              <p className="text-sm text-[#444444]">{t.bestSellers.description}</p>
            </div>
            <div className="space-y-5">
              {t.bestSellers.items.map((item) => (
                <Card key={item.name} className="overflow-hidden border-black/10">
                  <div className="relative h-40 w-full sm:h-48">
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
                        {t.bestSellers.stockBadge}
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
                      {t.bestSellers.reserveCta}
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div className="space-y-4">
            <Badge variant="outline">{t.partner.badge}</Badge>
            <h2 className="text-2xl font-semibold text-[#111111] sm:text-3xl">{t.partner.title}</h2>
            <p className="text-base text-[#444444]">{t.partner.description}</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {t.partner.reasons.map((reason) => (
                <Card key={reason.title} className="border-black/10">
                  <CardHeader className="space-y-3">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ffe1e8] text-[#111111]">
                      <reason.icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-base">{reason.title}</CardTitle>
                    <CardDescription>{reason.desc}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
          <Card className="relative overflow-hidden border-0 bg-white">
            <CardHeader>
              <Badge variant="outline">{t.workflow.badge}</Badge>
              <CardTitle className="text-xl text-[#111111]">{t.workflow.title}</CardTitle>
              <CardDescription>{t.workflow.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {t.workflow.steps.map((step, idx) => (
                <div
                  key={step.title}
                  className="flex items-start gap-4 rounded-2xl border border-black/10 bg-[#f7f7f7] p-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#ffe1e8] text-[#111111]">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[#111111]">
                      {idx + 1}. {step.title}
                    </p>
                    <p className="text-sm text-[#444444]">{step.desc}</p>
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
          <div className="relative isolate flex max-w-full flex-col gap-8 p-5 sm:p-8 md:flex-row md:items-center md:justify-between md:p-10">
            <div className="max-w-xl space-y-4">
              <Badge variant="glow" className="bg-white/10 text-white">
                {t.contact.badge}
              </Badge>
              <h3 className="text-2xl font-semibold sm:text-3xl">{t.contact.title}</h3>
              <p className="text-white/80">{t.contact.description}</p>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  asChild
                  size="lg"
                  className="border-white/40 bg-white/10 text-white hover:bg-white/20"
                >
                  <Link href="mailto:hola@aurelia.com">{t.contact.catalogCta}</Link>
                </Button>
                <Button asChild size="lg" variant="muted">
                  <Link href="https://wa.me/5491112345678">
                    {t.contact.whatsappCta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
            <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80 backdrop-blur">
              <div className="flex items-center justify-between gap-6">
                <span className="text-white/70">{t.contact.stockLabel}</span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
                  {t.contact.stockStatus}
                </span>
              </div>
              <div className="flex items-center justify-between gap-6">
                <span>{t.contact.leadTimeLabel}</span>
                <span className="font-semibold text-white">{t.contact.leadTimeValue}</span>
              </div>
              <div className="flex items-center justify-between gap-6">
                <span>{t.contact.moqLabel}</span>
                <span className="font-semibold text-white">{t.contact.moqValue}</span>
              </div>
              <div className="flex items-center justify-between gap-6">
                <span>{t.contact.certLabel}</span>
                <span className="font-semibold text-white">{t.contact.certValue}</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
