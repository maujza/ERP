"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
  BadgeCheck,
  Boxes,
  ClipboardList,
  DollarSign,
  LayoutDashboard,
  MessageCircle,
  PackageSearch,
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

const navSections = [
  { id: "overview", label: "Tablero", icon: LayoutDashboard },
  { id: "catalog", label: "Catálogo", icon: PackageSearch },
  { id: "stock", label: "Stock", icon: Boxes },
  { id: "tracking", label: "Seguimiento", icon: Truck },
  { id: "pendings", label: "Pendientes", icon: MessageCircle },
];

const kpis = [
  { label: "Pedidos activos", value: "124", delta: "+18%", icon: ClipboardList },
  { label: "Ticket promedio", value: "$ 82.300", delta: "+12%", icon: DollarSign },
  { label: "Reposiciones listas", value: "37", delta: "+8%", icon: Boxes },
  { label: "Alertas críticas", value: "9", delta: "+3", icon: Truck },
];

const revenueTrend = [
  { month: "Ene", amount: 78 },
  { month: "Feb", amount: 80 },
  { month: "Mar", amount: 82 },
  { month: "Abr", amount: 79 },
  { month: "May", amount: 81 },
  { month: "Jun", amount: 84 },
  { month: "Jul", amount: 80 },
  { month: "Ago", amount: 83 },
];

const salesByCategory = [
  { category: "Aros", units: 480 },
  { category: "Collares", units: 360 },
  { category: "Pulseras", units: 325 },
  { category: "Kits", units: 140 },
  { category: "Perlas", units: 220 },
];

const orderStatusData = [
  { label: "Pendiente pago", percent: 24, total: 18 },
  { label: "Preparando", percent: 26, total: 20 },
  { label: "En tránsito", percent: 30, total: 22 },
  { label: "Entregado", percent: 20, total: 15 },
];

const lowStockAlerts = [
  { sku: "AUR-LAY-08", product: "Layering Aura", depot: "CABA", remaining: 24 },
  { sku: "SET-PER-06", product: "Set Perlas Boreal", depot: "ZONA SUR", remaining: 18 },
  { sku: "KIT-VIT-80", product: "Kit Vitrina Premium", depot: "CABA", remaining: 12 },
];

const stuckOrders = [
  { id: "PED-802", retailer: "Galería Norte", status: "Aprobación", time: "36h" },
  { id: "PED-799", retailer: "Showroom Caballito", status: "Despacho", time: "30h" },
  { id: "PED-780", retailer: "Concept Palermo", status: "Pago", time: "42h" },
];

const initialCatalogProducts = [
  {
    id: "SIE-AR-12",
    name: "Pack Argollas Siena",
    category: "Aros",
    wholesalePrice: 18900,
    retailPrice: 28900,
    quantity: 120,
    status: true,
    images: ["https://images.unsplash.com/photo-1590166223826-12dee1677420?auto=format&fit=crop&w=600&q=80"],
  },
  {
    id: "AUR-LAY-08",
    name: "Layering Aura",
    category: "Collares",
    wholesalePrice: 24500,
    retailPrice: 35500,
    quantity: 86,
    status: true,
    images: ["https://images.unsplash.com/photo-1601821765780-754fa98637c1?auto=format&fit=crop&w=600&q=80"],
  },
  {
    id: "CAP-PUL-18",
    name: "Mix Pulseras Capri",
    category: "Pulseras",
    wholesalePrice: 21700,
    retailPrice: 32000,
    quantity: 140,
    status: true,
    images: ["https://images.unsplash.com/photo-1765852550345-ddb23c794d01?auto=format&fit=crop&w=600&q=80"],
  },
  {
    id: "KIT-VIT-80",
    name: "Kit Vitrina Premium",
    category: "Kits",
    wholesalePrice: 98500,
    retailPrice: 142000,
    quantity: 22,
    status: false,
    images: ["https://images.unsplash.com/photo-1767210338407-54b9264c326b?auto=format&fit=crop&w=600&q=80"],
  },
];

const forecastShortages = [
  { product: "Perlas Boreal", shortage: 60, week: "Semana 2" },
  { product: "Layering Aura", shortage: 48, week: "Semana 3" },
  { product: "Pulseras Capri", shortage: 42, week: "Semana 4" },
];

const nearOutOfStock = [
  { product: "Argollas Siena", remaining: 18, coverage: "1.4 semanas" },
  { product: "Set Perlas Boreal", remaining: 22, coverage: "1.7 semanas" },
  { product: "Collar Materia Prima", remaining: 34, coverage: "2.0 semanas" },
];

const warehouses = [
  { id: "CABA", location: "Depósito Parque Patricios", available: 420, reserved: 120 },
  { id: "ZS", location: "Depósito Zona Sur (Lanús)", available: 280, reserved: 64 },
];

const shipmentsSeed = [
  {
    id: "PED-981",
    retailer: "Alma Mayorista",
    status: "En tránsito",
    carrier: "Andreani",
    eta: "Entrega mañana 10hs",
    hasClaim: false,
    history: [
      { type: "status", value: "Preparando", timestamp: "2024-02-01 10:00" },
      { type: "status", value: "Despachado", timestamp: "2024-02-02 08:30" },
      { type: "note", value: "Coordinar entrega flexible", timestamp: "2024-02-02 10:00" },
      { type: "status", value: "En tránsito", timestamp: "2024-02-03 09:00" },
    ],
  },
  {
    id: "PED-982",
    retailer: "Galería Cumbre",
    status: "Demora operador",
    carrier: "Correo Argentino",
    eta: "Revisión",
    hasClaim: true,
    history: [
      { type: "status", value: "Pendiente pago", timestamp: "2024-02-01 09:00" },
      { type: "status", value: "Preparando", timestamp: "2024-02-01 13:00" },
      { type: "status", value: "Despachado", timestamp: "2024-02-02 07:00" },
      { type: "note", value: "Cliente reporta demora en planta de reparto", timestamp: "2024-02-04 11:20" },
      { type: "status", value: "Demora operador", timestamp: "2024-02-04 11:21" },
    ],
  },
  {
    id: "PED-983",
    retailer: "Showroom Caballito",
    status: "Despachado",
    carrier: "Andreani",
    eta: "Entrega hoy 18hs",
    hasClaim: false,
    history: [
      { type: "status", value: "Preparando", timestamp: "2024-02-02 08:00" },
      { type: "status", value: "Despachado", timestamp: "2024-02-03 06:45" },
    ],
  },
  {
    id: "PED-984",
    retailer: "Concept Palermo",
    status: "Pendiente pago",
    carrier: "Andreani",
    eta: "Esperando confirmación",
    hasClaim: true,
    history: [
      { type: "status", value: "Pendiente pago", timestamp: "2024-02-01 15:00" },
      { type: "note", value: "Ticket 554: factura recibida con error", timestamp: "2024-02-02 09:10" },
    ],
  },
];

const shipmentStatuses = [
  "Pendiente pago",
  "Preparando",
  "Despachado",
  "En tránsito",
  "Demora operador",
  "Entregado",
];

const kanbanColumns = [
  { id: "inbox", title: "Pendientes", color: "bg-slate-100" },
  { id: "in_progress", title: "En curso", color: "bg-amber-100" },
  { id: "done", title: "Listo", color: "bg-slate-50" },
];

const initialKanbanCards = [
  {
    id: "task-1",
    column: "inbox",
    title: "Actualizar catálogo mayorista",
    assignee: "Belén",
    detail: "Sumar nuevos packs 2024 y fotos reales.",
    due: "Mar 05",
  },
  {
    id: "task-2",
    column: "in_progress",
    title: "Armar reposición Capri",
    assignee: "Aura",
    detail: "Pulseras + displays, enviar cotización a Zona Sur.",
    due: "Mar 02",
  },
  {
    id: "task-3",
    column: "in_progress",
    title: "Revisar kit Live Shopping",
    assignee: "Maru",
    detail: "Confirmar stock y apuntar insights para call.",
    due: "Hoy",
  },
  {
    id: "task-4",
    column: "done",
    title: "Enviar pack bienvenida La Plata",
    assignee: "Equipo Ops",
    detail: "Check-list firmado y logística agendada.",
    due: "Feb 28",
  },
];

const topClients = [
  { label: "Luna Concept Store", contribution: 28, growth: "+18%" },
  { label: "Showroom Caballito", contribution: 23, growth: "+12%" },
  { label: "Galería Cumbre", contribution: 16, growth: "-5%" },
  { label: "Concept Palermo", contribution: 11, growth: "+9%" },
];

const inventoryProducts = [
  {
    id: "SIE-AR-12",
    name: "Pack Argollas Siena",
    category: "Aros",
    totalStock: 260,
    available: 180,
    reserved: 80,
  },
  {
    id: "AUR-LAY-08",
    name: "Layering Aura",
    category: "Collares",
    totalStock: 190,
    available: 120,
    reserved: 70,
  },
  {
    id: "CAP-PUL-18",
    name: "Mix Pulseras Capri",
    category: "Pulseras",
    totalStock: 240,
    available: 150,
    reserved: 90,
  },
  {
    id: "SET-PER-06",
    name: "Set Perlas Boreal",
    category: "Perlas",
    totalStock: 110,
    available: 68,
    reserved: 42,
  },
  {
    id: "KIT-VIT-80",
    name: "Kit Vitrina Premium",
    category: "Kits",
    totalStock: 60,
    available: 34,
    reserved: 26,
  },
];

const categoryStock = [
  { category: "Aros", total: 820 },
  { category: "Collares", total: 610 },
  { category: "Pulseras", total: 540 },
  { category: "Perlas", total: 320 },
  { category: "Kits", total: 240 },
];

const upcomingShortages = [
  { week: "Semana 1", product: "Argollas Siena", expected: -42 },
  { week: "Semana 2", product: "Layering Aura", expected: -36 },
  { week: "Semana 3", product: "Pulseras Capri", expected: -28 },
  { week: "Semana 4", product: "Set Perlas Boreal", expected: -24 },
];

const supplierOrders = [
  { supplier: "Taller Siena", products: "Argollas + Layering", eta: "12 días", qty: 320 },
  { supplier: "Capri Italia", products: "Pulseras esmaltadas", eta: "9 días", qty: 210 },
  { supplier: "Aurora Kits", products: "Kits vitrinas", eta: "14 días", qty: 90 },
];

export default function BackofficePage() {
  const { language } = useLanguage();
  const isKorean = language === "ko";
  const ui = isKorean
    ? {
        backofficeTitle: "백오피스",
        needHelp: "도움이 필요하신가요?",
        contactSupport: "지원팀 문의",
        panelTitle: "운영 패널",
        panelDesc: "상세 작업을 위해 모듈을 선택하세요.",
        downloadReport: "리포트 다운로드",
        confirmOrders: "주문 확정",
        navLabels: {
          overview: "대시보드",
          catalog: "카탈로그",
          stock: "재고",
          tracking: "추적",
          pendings: "대기 업무",
        } as Record<string, string>,
      }
    : {
        backofficeTitle: "Backoffice",
        needHelp: "¿Necesitás ayuda?",
        contactSupport: "Contactar soporte",
        panelTitle: "Panel Operativo",
        panelDesc: "Seleccioná un módulo para trabajar en detalle.",
        downloadReport: "Descargar reporte",
        confirmOrders: "Confirmar pedidos",
        navLabels: {
          overview: "Tablero",
          catalog: "Catálogo",
          stock: "Stock",
          tracking: "Seguimiento",
          pendings: "Pendientes",
        } as Record<string, string>,
      };
  const navItems = navSections.map((section) => ({
    ...section,
    label: ui.navLabels[section.id] ?? section.label,
  }));

  const [activeSection, setActiveSection] = useState<string>("overview");
  const [catalogData, setCatalogData] = useState(initialCatalogProducts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const emptyForm = {
    id: "",
    name: "",
    category: "Aros",
    wholesalePrice: "",
    retailPrice: "",
    quantity: "",
    images: "",
    file: null as File | null,
    status: true,
  };
  const [productForm, setProductForm] = useState(emptyForm);
  const [bulkPricing, setBulkPricing] = useState({ target: "wholesale", mode: "markup", value: 5 });
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [shipmentsData, setShipmentsData] = useState(shipmentsSeed);
  const [shipmentSearch, setShipmentSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [noteForm, setNoteForm] = useState({ orderId: shipmentsSeed[0].id, text: "" });
  const [timelineOrder, setTimelineOrder] = useState<string | null>(null);
  const [kanbanCards, setKanbanCards] = useState(initialKanbanCards);
  const [newTask, setNewTask] = useState({
    title: "",
    assignee: "",
    detail: "",
    due: "",
    column: "inbox",
  });
  const overviewText = isKorean
    ? {
        period: "기간",
        periodOptions: ["최근 90일", "이번 달", "이번 주"],
        exportCsv: "CSV 내보내기",
        refresh: "업데이트",
        avgRevenueTitle: "월 평균 매출",
        avgRevenueDesc: "아르헨티나 · ARS 백만",
        orderStatusTitle: "주문 상태",
        orderStatusDesc: "상태별 분포",
        orders: "주문",
        soldByCategoryTitle: "카테고리별 판매 제품",
        soldByCategoryDesc: "최근 30일 총 수량",
        unitsShort: "개",
        topClientsTitle: "매출 상위 고객",
        topClientsDesc: "총 매출 기여도",
        vsLastMonth: "전월 대비",
        stockAlertsTitle: "재고 알림",
        stockAlertsDesc: "주의 필요 상품",
        warehouse: "창고",
        stuckOrdersTitle: "지연 주문",
        stuckOrdersDesc: "24시간 이상 상태 변경 없음",
      }
    : {
        period: "Periodo",
        periodOptions: ["Últimos 90 días", "Este mes", "Semana actual"],
        exportCsv: "Exportar CSV",
        refresh: "Actualizar",
        avgRevenueTitle: "Facturación mensual promedio",
        avgRevenueDesc: "Argentina · ARS millones",
        orderStatusTitle: "Estado de pedidos",
        orderStatusDesc: "Distribución por status",
        orders: "Pedidos",
        soldByCategoryTitle: "Productos vendidos por categoría",
        soldByCategoryDesc: "Unidades totales últimos 30 días",
        unitsShort: "uds",
        topClientsTitle: "Clientes top por revenue",
        topClientsDesc: "Participación sobre el total",
        vsLastMonth: "vs mes anterior",
        stockAlertsTitle: "Alertas de stock",
        stockAlertsDesc: "Productos críticos",
        warehouse: "Depósito",
        stuckOrdersTitle: "Pedidos detenidos",
        stuckOrdersDesc: "Status sin cambios > 24h",
      };
  const kpisView = isKorean
    ? kpis.map((item) => ({
        ...item,
        label:
          item.label === "Pedidos activos"
            ? "활성 주문"
            : item.label === "Ticket promedio"
              ? "평균 객단가"
              : item.label === "Reposiciones listas"
                ? "준비된 재입고"
                : "중요 알림",
      }))
    : kpis;
  const revenueTrendView = isKorean
    ? revenueTrend.map((point) => ({
        ...point,
        month:
          point.month === "Ene"
            ? "1월"
            : point.month === "Feb"
              ? "2월"
              : point.month === "Mar"
                ? "3월"
                : point.month === "Abr"
                  ? "4월"
                  : point.month === "May"
                    ? "5월"
                    : point.month === "Jun"
                      ? "6월"
                      : point.month === "Jul"
                        ? "7월"
                        : "8월",
      }))
    : revenueTrend;
  const orderStatusDataView = isKorean
    ? orderStatusData.map((status) => ({
        ...status,
        label:
          status.label === "Pendiente pago"
            ? "결제 대기"
            : status.label === "Preparando"
              ? "준비 중"
              : status.label === "En tránsito"
                ? "배송 중"
                : "배송 완료",
      }))
    : orderStatusData;
  const salesByCategoryView = isKorean
    ? salesByCategory.map((item) => ({
        ...item,
        category:
          item.category === "Aros"
            ? "귀걸이"
            : item.category === "Collares"
              ? "목걸이"
              : item.category === "Pulseras"
                ? "팔찌"
                : item.category === "Kits"
                  ? "키트"
                  : "진주",
      }))
    : salesByCategory;
  const lowStockAlertsView = isKorean
    ? lowStockAlerts.map((item) => ({
        ...item,
        depot: item.depot === "ZONA SUR" ? "남부 권역" : "CABA",
      }))
    : lowStockAlerts;
  const stuckOrdersView = isKorean
    ? stuckOrders.map((item) => ({
        ...item,
        status:
          item.status === "Aprobación"
            ? "승인 대기"
            : item.status === "Despacho"
              ? "출고"
              : "결제",
      }))
    : stuckOrders;
  const catalogText = isKorean
    ? {
        projectedShortages: "예상 부족 수량",
        projectedShortagesDesc: "다음 달 · 전체 카테고리",
        includesPreorders: "확정된 선주문 포함.",
        productsAtRisk: "위험 제품",
        productsAtRiskDesc: "재고 커버리지 2주 미만",
        reviewFactory: "공장 발주 검토 필요.",
        availableStock: "가용 재고",
        availableStockDesc: "활성 카탈로그 기준",
        wholesaleSum: "도매 합계.",
        unit: "개",
        loadEditProduct: "상품 등록/수정",
        loadEditProductDesc: "사진, 가격, 상태를 관리하세요.",
        name: "이름",
        sku: "SKU",
        category: "카테고리",
        wholesalePrice: "도매가",
        retailPrice: "소매가",
        availableQty: "가용 재고",
        status: "상태",
        active: "활성",
        paused: "일시중지",
        imageUrls: "이미지 URL",
        imagePlaceholder: "https://...jpg, https://...jpg",
        uploadPhoto: "사진 업로드 (선택)",
        preview: "미리보기",
        cancel: "취소",
        update: "업데이트",
        addProduct: "상품 추가",
        projectionAlerts: "예측 및 알림",
        projectionAlertsDesc: "재입고 계획을 정리하세요.",
        shortagesByWeek: "주차별 부족 수량",
        almostOut: "재고 임박",
        coverage: "커버리지",
        bulkPricing: "일괄 가격 조정",
        bulkPricingDesc: "도매/소매 가격에 마크업/마크다운을 적용합니다.",
        target: "대상",
        action: "작업",
        applyAdjustments: "일괄 적용",
        both: "모두",
        wholesale: "도매",
        retail: "소매",
        markup: "마크업 (+)",
        markdown: "마크다운 (-)",
        categoryFilter: "카테고리",
        actions: "작업",
        search: "검색",
        root: "루트",
        bulkActions: "일괄 작업",
        activate: "활성화",
        deactivate: "비활성화",
        searchPlaceholder: "SKU 또는 이름",
        table: {
          name: "이름",
          category: "카테고리",
          wholesale: "도매가",
          retail: "소매가",
          stock: "재고",
          photos: "사진",
          status: "상태",
          actions: "작업",
          photo: "사진",
          edit: "수정",
        },
      }
    : {
        projectedShortages: "Faltantes proyectados",
        projectedShortagesDesc: "Próximo mes · todas las categorías",
        includesPreorders: "Incluye preventas confirmadas.",
        productsAtRisk: "Productos en riesgo",
        productsAtRiskDesc: "Cobertura < 2 semanas",
        reviewFactory: "Revisar pedidos a fábrica.",
        availableStock: "Stock disponible",
        availableStockDesc: "Catálogo activo",
        wholesaleSum: "Sumatoria mayorista.",
        unit: "uds",
        loadEditProduct: "Cargar/editar producto",
        loadEditProductDesc: "Gestioná fotos, precios y estado.",
        name: "Nombre",
        sku: "SKU",
        category: "Categoría",
        wholesalePrice: "Precio mayorista",
        retailPrice: "Precio minorista",
        availableQty: "Stock disponible",
        status: "Estado",
        active: "Activo",
        paused: "Pausado",
        imageUrls: "URLs de imagen",
        imagePlaceholder: "https://...jpg, https://...jpg",
        uploadPhoto: "Subir foto (opcional)",
        preview: "Previsualización",
        cancel: "Cancelar",
        update: "Actualizar",
        addProduct: "Agregar producto",
        projectionAlerts: "Proyección & alertas",
        projectionAlertsDesc: "Organizá la reposición.",
        shortagesByWeek: "Faltantes por semana",
        almostOut: "Casi sin stock",
        coverage: "Cobertura",
        bulkPricing: "Precios masivos",
        bulkPricingDesc: "Aplicá aumento/rebaja a precios mayoristas o minoristas.",
        target: "Objetivo",
        action: "Acción",
        applyAdjustments: "Aplicar ajustes",
        both: "Ambos",
        wholesale: "Mayorista",
        retail: "Minorista",
        markup: "Markup (+)",
        markdown: "Markdown (-)",
        categoryFilter: "Categoría",
        actions: "Acciones",
        search: "Buscar",
        root: "Raíz",
        bulkActions: "Acciones masivas",
        activate: "Activar",
        deactivate: "Desactivar",
        searchPlaceholder: "SKU o nombre",
        table: {
          name: "Nombre",
          category: "Categoría",
          wholesale: "Mayorista",
          retail: "Minorista",
          stock: "Stock",
          photos: "Fotos",
          status: "Estado",
          actions: "Acciones",
          photo: "Foto",
          edit: "Editar",
        },
      };
  const stockText = isKorean
    ? {
        totalStock: "총 재고",
        totalStockDesc: "전체 카탈로그",
        includesSuspended: "중단 상품 포함.",
        available: "가용",
        availableDesc: "판매 가능 수량",
        reserved: "예약",
        reservedDesc: "확정 주문",
        availableRate: "가용",
        preparingRate: "준비 중",
        inventoryByProduct: "상품별 재고",
        inventoryByProductDesc: "총/가용/예약",
        total: "총계",
        categoryStock: "카테고리별 재고",
        categoryStockDesc: "재고 비중",
        projectedShortages: "예상 부족 수량",
        projectedShortagesDesc: "판매/재입고 기반",
        supplierOrders: "공급사 발주",
        supplierOrdersDesc: "준비 중인 오더",
        qty: "수량",
        warehouseStock: "창고별 재고",
        warehouseStockDesc: "가용 및 활성 예약",
        warehouse: "창고",
        location: "위치",
      }
    : {
        totalStock: "Stock total",
        totalStockDesc: "Todo el catálogo",
        includesSuspended: "Incluye productos suspendidos.",
        available: "Disponible",
        availableDesc: "Liberado para venta",
        reserved: "Reservado",
        reservedDesc: "Pedidos confirmados",
        availableRate: "disponible",
        preparingRate: "en preparación",
        inventoryByProduct: "Inventario por producto",
        inventoryByProductDesc: "Total, disponible y reservado",
        total: "Total",
        categoryStock: "Stock por categoría",
        categoryStockDesc: "Proporción del inventario",
        projectedShortages: "Faltantes proyectados",
        projectedShortagesDesc: "En base a ventas y reposiciones",
        supplierOrders: "Pedidos a proveedores",
        supplierOrdersDesc: "Órdenes en preparación",
        qty: "Qty",
        warehouseStock: "Stock por depósito",
        warehouseStockDesc: "Disponibilidad y reservas activas.",
        warehouse: "Depósito",
        location: "Ubicación",
      };
  const trackingText = isKorean
    ? {
        newClaims: "신규 클레임",
        newClaimsDesc: "최근 48시간",
        reviewTickets: "열린 티켓 확인 필요.",
        activeOrders: "활성 주문",
        activeOrdersDesc: "배송 중 또는 준비 중",
        liveTracking: "실시간 추적",
        deliveredOrders: "배송 완료 주문",
        deliveredOrdersDesc: "최근 1주",
        noClaims: "클레임 없음.",
        statusDashboard: "상태 대시보드",
        statusDashboardDesc: "주문 분포",
        totalOrders: "총 주문",
        quickActions: "빠른 작업",
        ordersWithClaims: "클레임 주문",
        recentNotes: "최근 메모",
        searchPlaceholder: "주문 또는 고객 검색",
        allClients: "전체 고객",
        table: {
          order: "주문",
          retailer: "리테일러",
          carrier: "택배사",
          eta: "도착 예정",
          status: "상태",
          notes: "메모",
          claim: "클레임",
          history: "이력",
          noNotes: "메모 없음",
          activeClaim: "클레임 진행중",
          notesButton: "메모",
        },
        timelineTitle: "주문 타임라인",
        timelineDesc: "상태 및 메모 이력",
        close: "닫기",
        addNote: "메모 추가",
        notePlaceholder: "재고 업데이트, 클레임 등",
        saveNote: "메모 저장",
        notesHistoryTitle: "메모 이력",
        notesHistoryDesc: "최근 항목",
        statusPrefix: "상태",
        ordersWord: "주문",
      }
    : {
        newClaims: "Reclamos nuevos",
        newClaimsDesc: "Últimas 48hs",
        reviewTickets: "Revisar tickets abiertos.",
        activeOrders: "Pedidos activos",
        activeOrdersDesc: "En tránsito o preparando",
        liveTracking: "Seguimiento en vivo",
        deliveredOrders: "Pedidos entregados",
        deliveredOrdersDesc: "Última semana",
        noClaims: "Sin reclamos.",
        statusDashboard: "Panel de estados",
        statusDashboardDesc: "Distribución de pedidos",
        totalOrders: "Pedidos totales",
        quickActions: "Acciones rápidas",
        ordersWithClaims: "Pedidos con reclamos",
        recentNotes: "Notas recientes",
        searchPlaceholder: "Buscar por pedido o cliente",
        allClients: "Todos los clientes",
        table: {
          order: "Pedido",
          retailer: "Retailer",
          carrier: "Transporte",
          eta: "ETA",
          status: "Estado",
          notes: "Notas",
          claim: "Reclamo",
          history: "Historial",
          noNotes: "Sin notas",
          activeClaim: "Reclamo activo",
          notesButton: "Notas",
        },
        timelineTitle: "Timeline del pedido",
        timelineDesc: "Evolución de status y notas",
        close: "Cerrar",
        addNote: "Agregar nota",
        notePlaceholder: "Actualización de inventario, reclamo, etc.",
        saveNote: "Guardar nota",
        notesHistoryTitle: "Historial de notas",
        notesHistoryDesc: "Últimas entradas",
        statusPrefix: "Status",
        ordersWord: "pedidos",
      };
  const pendingsText = isKorean
    ? {
        title: "팀 대기 업무",
        desc: "칸반 추적: 작업을 배정하고 상태를 변경하세요.",
        addTaskTitle: "작업 추가",
        addTaskDesc: "어떤 컬럼이든 새 대기 업무를 생성합니다.",
        task: "작업",
        assignee: "담당자",
        detail: "상세",
        due: "기한",
        column: "컬럼",
        addToBoard: "보드에 추가",
        pendingCount: "개 대기",
        unassigned: "미지정",
        noDue: "기한 없음",
        noTasks: "배정된 작업이 없습니다.",
      }
    : {
        title: "Pendientes del equipo",
        desc: "Seguimiento Kanban: asigná tareas y cambiá status.",
        addTaskTitle: "Agregar tarea",
        addTaskDesc: "Crear un nuevo pendiente en cualquier columna.",
        task: "Tarea",
        assignee: "Asignado",
        detail: "Detalle",
        due: "Fecha",
        column: "Columna",
        addToBoard: "Añadir a tablero",
        pendingCount: "pendientes",
        unassigned: "Sin asignar",
        noDue: "Sin fecha",
        noTasks: "Sin tareas asignadas.",
      };
  const categoryLabel = (value: string) => {
    if (!isKorean) return value;
    const labels: Record<string, string> = {
      Aros: "귀걸이",
      Collares: "목걸이",
      Pulseras: "팔찌",
      Kits: "키트",
      Perlas: "진주",
      Sets: "세트",
    };
    return labels[value] ?? value;
  };
  const shipmentStatusLabel = (value: string) => {
    if (!isKorean) return value;
    const labels: Record<string, string> = {
      "Pendiente pago": "결제 대기",
      Preparando: "준비 중",
      Despachado: "출고 완료",
      "En tránsito": "배송 중",
      "Demora operador": "운송 지연",
      Entregado: "배송 완료",
    };
    return labels[value] ?? value;
  };
  const weekLabel = (value: string) => {
    if (!isKorean) return value;
    const labels: Record<string, string> = {
      "Semana 1": "1주차",
      "Semana 2": "2주차",
      "Semana 3": "3주차",
      "Semana 4": "4주차",
    };
    return labels[value] ?? value;
  };
  const etaLabel = (value: string) => {
    if (!isKorean) return value;
    const labels: Record<string, string> = {
      "Entrega mañana 10hs": "내일 오전 10시 도착",
      Revisión: "검토 중",
      "Entrega hoy 18hs": "오늘 18시 도착",
      "Esperando confirmación": "확인 대기",
    };
    return labels[value] ?? value;
  };
  const kanbanColumnTitle = (id: string, fallback: string) => {
    if (!isKorean) return fallback;
    const labels: Record<string, string> = {
      inbox: "대기",
      in_progress: "진행 중",
      done: "완료",
    };
    return labels[id] ?? fallback;
  };

  function handleProductSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedWholesale = Number(productForm.wholesalePrice);
    const parsedRetail = Number(productForm.retailPrice);
    const parsedQuantity = Number(productForm.quantity);
    if (Number.isNaN(parsedWholesale) || Number.isNaN(parsedRetail) || Number.isNaN(parsedQuantity)) {
      return;
    }

    const uploadedImageUrls: string[] = previewImages.filter((url) => url.startsWith("blob:"));
    const typedUrls = productForm.images
      .split(",")
      .map((url) => url.trim())
      .filter(Boolean);
    const imagesArray = [...typedUrls, ...previewImages.filter((url) => !url.startsWith("blob:"))];
    const finalImages = imagesArray.length > 0 ? imagesArray : uploadedImageUrls;
    if (finalImages.length === 0) {
      finalImages.push("https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&w=600&q=80");
    }

    const payload = {
      id: productForm.id ? productForm.id.toUpperCase() : `SKU-${Date.now()}`,
      name: productForm.name,
      category: productForm.category,
      wholesalePrice: parsedWholesale,
      retailPrice: parsedRetail,
      quantity: parsedQuantity,
      status: productForm.status,
      images: finalImages,
    };

    if (editingId) {
      setCatalogData((prev) => prev.map((product) => (product.id === editingId ? payload : product)));
    } else {
      setCatalogData((prev) => [...prev, payload]);
    }
    setEditingId(null);
    setProductForm(emptyForm);
    setPreviewImages([]);
  }

  function handleEditProduct(productId: string) {
    const product = catalogData.find((item) => item.id === productId);
    if (!product) return;
    setEditingId(product.id);
    setProductForm({
      id: product.id,
      name: product.name,
      category: product.category,
      wholesalePrice: String(product.wholesalePrice),
      retailPrice: String(product.retailPrice),
      quantity: String(product.quantity),
      images: product.images.filter((url) => !url.startsWith("blob:")).join(", "),
      file: null,
      status: product.status,
    });
    setPreviewImages(product.images);
  }

  function handleToggleStatus(productId: string) {
    setCatalogData((prev) =>
      prev.map((product) => (product.id === productId ? { ...product, status: !product.status } : product)),
    );
  }

  function handleBulkPricing() {
    const adjustment = Number(bulkPricing.value);
    if (Number.isNaN(adjustment) || adjustment === 0) return;
    const factor = bulkPricing.mode === "markup" ? 1 + adjustment / 100 : 1 - adjustment / 100;

    setCatalogData((prev) =>
      prev.map((product) => ({
        ...product,
        wholesalePrice:
          bulkPricing.target === "wholesale" || bulkPricing.target === "both"
            ? Math.max(0, Math.round(product.wholesalePrice * factor))
            : product.wholesalePrice,
        retailPrice:
          bulkPricing.target === "retail" || bulkPricing.target === "both"
            ? Math.max(0, Math.round(product.retailPrice * factor))
            : product.retailPrice,
      })),
    );
  }

  function handleShipmentStatusChange(orderId: string, newStatus: string) {
    const timestamp = new Date().toISOString().slice(0, 16).replace("T", " ");
    setShipmentsData((prev) =>
      prev.map((shipment) =>
        shipment.id === orderId
          ? {
              ...shipment,
              status: newStatus,
              history: [...shipment.history, { type: "status", value: newStatus, timestamp }],
            }
          : shipment,
      ),
    );
  }

  function handleAddShipmentNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!timelineOrder || !noteForm.text.trim()) return;
    const timestamp = new Date().toISOString().slice(0, 16).replace("T", " ");
    setShipmentsData((prev) =>
      prev.map((shipment) =>
        shipment.id === timelineOrder
          ? { ...shipment, history: [...shipment.history, { type: "note", value: noteForm.text.trim(), timestamp }] }
          : shipment,
      ),
    );
    setNoteForm({ orderId: timelineOrder, text: "" });
  }

  function renderOverview() {
    const maxRevenue = Math.max(...revenueTrendView.map((point) => point.amount));
    const revenuePoints = revenueTrendView
      .map((point, index) => {
        const x = (index / (revenueTrendView.length - 1)) * 100;
        const y = 100 - (point.amount / maxRevenue) * 100;
        return `${x},${y}`;
      })
      .join(" ");

    let start = 0;
    const donutSegments = orderStatusDataView
      .map((status, index) => {
        const end = start + status.percent;
        const color = ["#f97316", "#fb923c", "#fdba74", "#fed7aa"][index % 4];
        const segment = `${color} ${start}% ${end}%`;
        start = end;
        return segment;
      })
      .join(", ");

    return (
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          {kpisView.map((item) => (
            <Card key={item.label} className="border border-slate-200 bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm text-slate-500">{item.label}</CardTitle>
                <item.icon className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-slate-900">{item.value}</div>
                <p className="text-xs text-emerald-600">{item.delta}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <span>{overviewText.period}</span>
            <select className="rounded-lg border border-slate-200 px-3 py-1">
              {overviewText.periodOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="border-slate-200 text-slate-700">
              {overviewText.exportCsv}
            </Button>
            <Button className="bg-slate-900 text-white">
              <BadgeCheck className="mr-2 h-4 w-4" /> {overviewText.refresh}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.8fr_1.1fr]">
          <Card className="border border-slate-200 bg-white">
            <CardHeader className="flex flex-wrap items-center justify-between gap-3">
              <div>
              <CardTitle>{overviewText.avgRevenueTitle}</CardTitle>
              <CardDescription>{overviewText.avgRevenueDesc}</CardDescription>
            </div>
            <div className="text-3xl font-semibold text-slate-900">
              ${" "}
              {Math.round(
                revenueTrendView.reduce((acc, point) => acc + point.amount, 0) / revenueTrendView.length,
              ).toLocaleString("es-AR")}
              M
            </div>
            </CardHeader>
            <CardContent>
              <div className="relative h-52 w-full">
                <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#0f172a" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <polygon fill="url(#revenueGradient)" points={`0,100 ${revenuePoints} 100,100`} />
                  <polyline fill="none" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" points={revenuePoints} />
                </svg>
                <div className="absolute inset-0 flex items-end justify-between px-1 text-xs text-slate-400">
                  {revenueTrendView.map((point) => (
                    <span key={point.month}>{point.month}</span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 bg-white">
            <CardHeader>
              <CardTitle>{overviewText.orderStatusTitle}</CardTitle>
              <CardDescription>{overviewText.orderStatusDesc}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-[1fr_1fr]">
              <div className="flex items-center justify-center">
                <div className="relative h-40 w-40 rounded-full" style={{ background: `conic-gradient(${donutSegments})` }}>
                  <div className="absolute inset-[18%] rounded-full bg-white/90 text-center">
                    <p className="pt-8 text-2xl font-semibold text-slate-900">
                      {orderStatusDataView.reduce((acc, data) => acc + data.total, 0)}
                    </p>
                    <p className="text-xs text-slate-500">{overviewText.orders}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                {orderStatusDataView.map((status, index) => (
                  <div key={status.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: ["#f97316", "#fb923c", "#fdba74", "#fed7aa"][index % 4] }}
                      />
                      <span className="font-medium text-slate-800">{status.label}</span>
                    </div>
                    <div className="text-right text-slate-500">
                      <p>{status.percent}%</p>
                      <p className="text-xs">
                        {status.total} {overviewText.orders}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border border-slate-200 bg-white">
            <CardHeader>
              <CardTitle>{overviewText.soldByCategoryTitle}</CardTitle>
              <CardDescription>{overviewText.soldByCategoryDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {salesByCategoryView.map((category) => {
                const percentage = Math.round((category.units / salesByCategoryView[0].units) * 100);
                return (
                  <div key={category.category}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-slate-800">{category.category}</span>
                      <span className="text-slate-500">
                        {category.units} {overviewText.unitsShort}
                      </span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-slate-900 to-slate-500" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border border-slate-200 bg-white">
            <CardHeader>
              <CardTitle>{overviewText.topClientsTitle}</CardTitle>
              <CardDescription>{overviewText.topClientsDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {topClients.map((client, index) => (
                <div key={client.label} className="space-y-2 rounded-2xl border border-slate-100 p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-900">
                      {index + 1}. {client.label}
                    </p>
                    <span className="text-xs text-slate-500">
                      {client.growth} {overviewText.vsLastMonth}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-8 flex-1 rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-200"
                        style={{ width: `${client.contribution}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-slate-800">{client.contribution}%</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border border-slate-200 bg-white">
            <CardHeader>
              <CardTitle>{overviewText.stockAlertsTitle}</CardTitle>
              <CardDescription>{overviewText.stockAlertsDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {lowStockAlertsView.map((alert) => (
                <div key={alert.sku} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
                  <div>
                    <p className="font-semibold text-slate-900">{alert.product}</p>
                    <p className="text-xs text-slate-500">
                      SKU {alert.sku} · {overviewText.warehouse} {alert.depot}
                    </p>
                  </div>
                  <Badge variant="outline" className="border-amber-300 text-amber-600">
                    {alert.remaining} {overviewText.unitsShort}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border border-slate-200 bg-white">
            <CardHeader>
              <CardTitle>{overviewText.stuckOrdersTitle}</CardTitle>
              <CardDescription>{overviewText.stuckOrdersDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {stuckOrdersView.map((order) => (
                <div key={order.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
                  <div>
                    <p className="font-semibold text-slate-900">{order.retailer}</p>
                    <p className="text-xs text-slate-500">
                      {order.id} · {order.status}
                    </p>
                  </div>
                  <Badge variant="glow" className="bg-rose-100 text-rose-700">
                    {order.time}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  function renderCatalog() {
    const monthlyShortage = forecastShortages.reduce((acc, item) => acc + item.shortage, 0);
    const filteredProducts = catalogData.filter(
      (product) =>
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.id.toLowerCase().includes(search.toLowerCase()) ||
        product.category.toLowerCase().includes(search.toLowerCase()),
    );
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border border-slate-200 bg-white">
            <CardHeader>
              <CardTitle>{catalogText.projectedShortages}</CardTitle>
              <CardDescription>{catalogText.projectedShortagesDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-slate-900">
                {monthlyShortage} {catalogText.unit}
              </p>
              <p className="text-xs text-slate-500">{catalogText.includesPreorders}</p>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 bg-white">
            <CardHeader>
              <CardTitle>{catalogText.productsAtRisk}</CardTitle>
              <CardDescription>{catalogText.productsAtRiskDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-slate-900">{nearOutOfStock.length}</p>
              <p className="text-xs text-slate-500">{catalogText.reviewFactory}</p>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 bg-white">
            <CardHeader>
              <CardTitle>{catalogText.availableStock}</CardTitle>
              <CardDescription>{catalogText.availableStockDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-slate-900">
                {catalogData.reduce((acc, product) => acc + product.quantity, 0)} {catalogText.unit}
              </p>
              <p className="text-xs text-slate-500">{catalogText.wholesaleSum}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-[1.5fr_1fr]">
          <Card className="border border-slate-200 bg-white">
            <CardHeader>
              <CardTitle>{catalogText.loadEditProduct}</CardTitle>
              <CardDescription>{catalogText.loadEditProductDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4" onSubmit={handleProductSubmit}>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-sm text-slate-600">
                    {catalogText.name}
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                      value={productForm.name}
                      onChange={(event) => setProductForm((prev) => ({ ...prev, name: event.target.value }))}
                      required
                    />
                  </label>
                  <label className="text-sm text-slate-600">
                    {catalogText.sku}
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 uppercase"
                      value={productForm.id}
                      onChange={(event) => setProductForm((prev) => ({ ...prev, id: event.target.value }))}
                    />
                  </label>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="text-sm text-slate-600">
                    {catalogText.category}
                    <select
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                      value={productForm.category}
                      onChange={(event) => setProductForm((prev) => ({ ...prev, category: event.target.value }))}
                    >
                      <option value="Aros">{categoryLabel("Aros")}</option>
                      <option value="Collares">{categoryLabel("Collares")}</option>
                      <option value="Pulseras">{categoryLabel("Pulseras")}</option>
                      <option value="Kits">{categoryLabel("Kits")}</option>
                      <option value="Perlas">{categoryLabel("Perlas")}</option>
                    </select>
                  </label>
                  <label className="text-sm text-slate-600">
                    {catalogText.wholesalePrice}
                    <input
                      type="number"
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                      value={productForm.wholesalePrice}
                      onChange={(event) => setProductForm((prev) => ({ ...prev, wholesalePrice: event.target.value }))}
                      required
                    />
                  </label>
                  <label className="text-sm text-slate-600">
                    {catalogText.retailPrice}
                    <input
                      type="number"
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                      value={productForm.retailPrice}
                      onChange={(event) => setProductForm((prev) => ({ ...prev, retailPrice: event.target.value }))}
                      required
                    />
                  </label>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="text-sm text-slate-600">
                    {catalogText.availableQty}
                    <input
                      type="number"
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                      value={productForm.quantity}
                      onChange={(event) => setProductForm((prev) => ({ ...prev, quantity: event.target.value }))}
                      required
                    />
                  </label>
                  <label className="text-sm text-slate-600">
                    {catalogText.status}
                    <select
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                      value={productForm.status ? "activo" : "pausado"}
                      onChange={(event) => setProductForm((prev) => ({ ...prev, status: event.target.value === "activo" }))}
                    >
                      <option value="activo">{catalogText.active}</option>
                      <option value="pausado">{catalogText.paused}</option>
                    </select>
                  </label>
                  <label className="text-sm text-slate-600">
                    {catalogText.imageUrls}
                    <textarea
                      className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                      placeholder={catalogText.imagePlaceholder}
                      value={productForm.images}
                      onChange={(event) => setProductForm((prev) => ({ ...prev, images: event.target.value }))}
                    />
                  </label>
                </div>
                <label className="text-sm text-slate-600">
                  {catalogText.uploadPhoto}
                  <input
                    type="file"
                    accept="image/*"
                    className="mt-1 w-full rounded-xl border border-dashed border-slate-200 px-3 py-2 text-sm"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        const previewUrl = URL.createObjectURL(file);
                        setPreviewImages((prev) => [...prev.filter((url) => !url.startsWith("blob:")), previewUrl]);
                        setProductForm((prev) => ({ ...prev, file }));
                      }
                    }}
                  />
                </label>
                {previewImages.length > 0 && (
                  <div className="grid gap-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{catalogText.preview}</p>
                    <div className="flex flex-wrap gap-3">
                      {previewImages.map((img) => (
                        <div key={img} className="relative h-20 w-24 overflow-hidden rounded-xl border border-slate-200">
                          <Image src={img} alt="preview" fill sizes="96px" className="object-cover" unoptimized />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  {editingId && (
                    <Button
                      type="button"
                      variant="outline"
                      className="border-slate-200 text-slate-700"
                      onClick={() => {
                        setEditingId(null);
                        setProductForm(emptyForm);
                        setPreviewImages([]);
                      }}
                    >
                      {catalogText.cancel}
                    </Button>
                  )}
                  <Button type="submit" className="bg-slate-900 text-white">
                    {editingId ? catalogText.update : catalogText.addProduct}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 bg-white">
            <CardHeader>
              <CardTitle>{catalogText.projectionAlerts}</CardTitle>
              <CardDescription>{catalogText.projectionAlertsDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{catalogText.shortagesByWeek}</p>
                <div className="mt-3 space-y-2">
                  {forecastShortages.map((item) => (
                    <div key={item.product} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
                      <div>
                        <p className="font-semibold text-slate-900">{item.product}</p>
                        <p className="text-xs text-slate-500">{weekLabel(item.week)}</p>
                      </div>
                      <Badge variant="outline" className="border-rose-200 text-rose-600">
                        -{item.shortage} {catalogText.unit}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{catalogText.almostOut}</p>
                <div className="mt-3 space-y-2">
                  {nearOutOfStock.map((item) => (
                    <div key={item.product} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
                      <div>
                        <p className="font-semibold text-slate-900">{item.product}</p>
                        <p className="text-xs text-slate-500">
                          {catalogText.coverage} {isKorean ? item.coverage.replace(" semanas", "주") : item.coverage}
                        </p>
                      </div>
                      <Badge variant="outline" className="border-amber-200 text-amber-600">
                        {item.remaining} {catalogText.unit}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mx-auto max-w-5xl border border-slate-200 bg-white">
          <CardHeader>
            <CardTitle>{catalogText.bulkPricing}</CardTitle>
            <CardDescription>{catalogText.bulkPricingDesc}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <label className="text-sm text-slate-600">
              {catalogText.target}
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                value={bulkPricing.target}
                onChange={(event) => setBulkPricing((prev) => ({ ...prev, target: event.target.value }))}
              >
                <option value="wholesale">{catalogText.wholesale}</option>
                <option value="retail">{catalogText.retail}</option>
                <option value="both">{catalogText.both}</option>
              </select>
            </label>
            <label className="text-sm text-slate-600">
              {catalogText.action}
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                value={bulkPricing.mode}
                onChange={(event) => setBulkPricing((prev) => ({ ...prev, mode: event.target.value }))}
              >
                <option value="markup">{catalogText.markup}</option>
                <option value="markdown">{catalogText.markdown}</option>
              </select>
            </label>
            <label className="text-sm text-slate-600">
              %
              <input
                type="number"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                value={bulkPricing.value}
                onChange={(event) => setBulkPricing((prev) => ({ ...prev, value: Number(event.target.value) }))}
              />
            </label>
            <div className="flex items-end">
              <Button className="w-full bg-slate-900 text-white" onClick={handleBulkPricing}>
                {catalogText.applyAdjustments}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">{catalogText.categoryFilter}</span>
            <select className="rounded-lg border border-slate-200 px-3 py-1">
              <option>{catalogText.root}</option>
              <option>{categoryLabel("Aros")}</option>
              <option>{categoryLabel("Collares")}</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">{catalogText.actions}</span>
            <select className="rounded-lg border border-slate-200 px-3 py-1">
              <option>{catalogText.bulkActions}</option>
              <option>{catalogText.activate}</option>
              <option>{catalogText.deactivate}</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">{catalogText.search}</span>
            <input
              type="text"
              className="rounded-lg border border-slate-200 px-3 py-1"
              placeholder={catalogText.searchPlaceholder}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        <Card className="border border-slate-200 bg-white">
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-[12px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">{catalogText.table.name}</th>
                  <th className="px-4 py-3">{catalogText.table.category}</th>
                  <th className="px-4 py-3">{catalogText.table.wholesale}</th>
                  <th className="px-4 py-3">{catalogText.table.retail}</th>
                  <th className="px-4 py-3">{catalogText.table.stock}</th>
                  <th className="px-4 py-3">{catalogText.table.photos}</th>
                  <th className="px-4 py-3">{catalogText.table.status}</th>
                  <th className="px-4 py-3">{catalogText.table.actions}</th>
                </tr>
              </thead>
              <tbody>
              {filteredProducts.map((product) => (
                  <tr key={product.id} className="border-b border-slate-100 text-slate-700">
                    <td className="px-4 py-3 text-slate-500">{product.id}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{product.name}</td>
                    <td className="px-4 py-3">{categoryLabel(product.category)}</td>
                    <td className="px-4 py-3">${product.wholesalePrice.toLocaleString("es-AR")}</td>
                    <td className="px-4 py-3">${product.retailPrice.toLocaleString("es-AR")}</td>
                    <td className="px-4 py-3">{product.quantity}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {product.images.slice(0, 2).map((img) => (
                          <span key={img} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                            {catalogText.table.photo}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${product.status ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}
                        onClick={() => handleToggleStatus(product.id)}
                      >
                        {product.status ? catalogText.active : catalogText.paused}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button className="text-slate-500 underline" onClick={() => handleEditProduct(product.id)}>
                        {catalogText.table.edit}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderStock() {
    const totalStock = inventoryProducts.reduce((acc, product) => acc + product.totalStock, 0);
    const totalAvailable = inventoryProducts.reduce((acc, product) => acc + product.available, 0);
    const totalReserved = inventoryProducts.reduce((acc, product) => acc + product.reserved, 0);
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border border-slate-200 bg-white">
            <CardHeader>
              <CardTitle>{stockText.totalStock}</CardTitle>
              <CardDescription>{stockText.totalStockDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-slate-900">{totalStock} {catalogText.unit}</p>
              <p className="text-xs text-slate-500">{stockText.includesSuspended}</p>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 bg-white">
            <CardHeader>
              <CardTitle>{stockText.available}</CardTitle>
              <CardDescription>{stockText.availableDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-slate-900">{totalAvailable} {catalogText.unit}</p>
              <p className="text-xs text-emerald-600">
                {(totalAvailable / totalStock * 100).toFixed(0)}% {stockText.availableRate}
              </p>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 bg-white">
            <CardHeader>
              <CardTitle>{stockText.reserved}</CardTitle>
              <CardDescription>{stockText.reservedDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-slate-900">{totalReserved} {catalogText.unit}</p>
              <p className="text-xs text-amber-600">
                {(totalReserved / totalStock * 100).toFixed(0)}% {stockText.preparingRate}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-[1.6fr_1fr]">
          <Card className="border border-slate-200 bg-white">
            <CardHeader>
              <CardTitle>{stockText.inventoryByProduct}</CardTitle>
              <CardDescription>{stockText.inventoryByProductDesc}</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">{catalogText.name}</th>
                    <th className="px-4 py-3">{catalogText.category}</th>
                    <th className="px-4 py-3">{stockText.total}</th>
                    <th className="px-4 py-3">{stockText.available}</th>
                    <th className="px-4 py-3">{stockText.reserved}</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryProducts.map((product) => (
                    <tr key={product.id} className="border-b border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-900">{product.id}</td>
                      <td className="px-4 py-3">{product.name}</td>
                      <td className="px-4 py-3">{categoryLabel(product.category)}</td>
                      <td className="px-4 py-3">{product.totalStock}</td>
                      <td className="px-4 py-3 text-emerald-700">{product.available}</td>
                      <td className="px-4 py-3 text-amber-600">{product.reserved}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 bg-white">
            <CardHeader>
              <CardTitle>{stockText.categoryStock}</CardTitle>
              <CardDescription>{stockText.categoryStockDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {categoryStock.map((category) => (
                <div key={category.category}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-800">{categoryLabel(category.category)}</span>
                    <span className="text-slate-500">{category.total} {catalogText.unit}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-slate-900 to-slate-500"
                      style={{ width: `${Math.round((category.total / categoryStock[0].total) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border border-slate-200 bg-white">
            <CardHeader>
              <CardTitle>{stockText.projectedShortages}</CardTitle>
              <CardDescription>{stockText.projectedShortagesDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {upcomingShortages.map((item) => (
                <div key={item.week} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
                  <div>
                    <p className="font-semibold text-slate-900">{item.product}</p>
                    <p className="text-xs text-slate-500">{weekLabel(item.week)}</p>
                  </div>
                  <Badge variant="outline" className="border-rose-200 text-rose-600">
                    {item.expected} {catalogText.unit}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border border-slate-200 bg-white">
            <CardHeader>
              <CardTitle>{stockText.supplierOrders}</CardTitle>
              <CardDescription>{stockText.supplierOrdersDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {supplierOrders.map((order) => (
                <div key={order.supplier} className="rounded-xl border border-slate-100 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-900">{order.supplier}</p>
                    <Badge variant="outline" className="border-slate-200 text-slate-600">
                      {isKorean ? order.eta.replace(" días", "일") : order.eta}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500">{order.products}</p>
                  <p className="text-xs text-slate-400">
                    {stockText.qty} {order.qty} {catalogText.unit}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="border border-slate-200 bg-white">
          <CardHeader>
            <CardTitle>{stockText.warehouseStock}</CardTitle>
            <CardDescription>{stockText.warehouseStockDesc}</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3">{stockText.warehouse}</th>
                  <th className="px-4 py-3">{stockText.location}</th>
                  <th className="px-4 py-3">{stockText.available}</th>
                  <th className="px-4 py-3">{stockText.reserved}</th>
                </tr>
              </thead>
              <tbody>
                {warehouses.map((warehouse) => (
                  <tr key={warehouse.id} className="border-b border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-900">{warehouse.id}</td>
                    <td className="px-4 py-3">
                      {isKorean
                        ? warehouse.location
                            .replace("Depósito Parque Patricios", "파르케 파트리시오스 창고")
                            .replace("Depósito Zona Sur (Lanús)", "남부권(라누스) 창고")
                        : warehouse.location}
                    </td>
                    <td className="px-4 py-3">{warehouse.available} {catalogText.unit}</td>
                    <td className="px-4 py-3 text-amber-600">{warehouse.reserved} {catalogText.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderTracking() {
    const complaints = shipmentsData.filter((shipment) => shipment.hasClaim);
    const filteredShipments = shipmentsData.filter((shipment) => {
      const matchesSearch =
        shipment.id.toLowerCase().includes(shipmentSearch.toLowerCase()) ||
        shipment.retailer.toLowerCase().includes(shipmentSearch.toLowerCase());
      const matchesClient = clientFilter === "all" || shipment.retailer === clientFilter;
      return matchesSearch && matchesClient;
    });
    const statusSummary = shipmentStatuses.map((status) => ({
      status,
      total: shipmentsData.filter((shipment) => shipment.status === status).length,
    }));
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border border-slate-200 bg-white">
            <CardHeader>
              <CardTitle>{trackingText.newClaims}</CardTitle>
              <CardDescription>{trackingText.newClaimsDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-slate-900">{complaints.length}</p>
              <p className="text-xs text-rose-600">{trackingText.reviewTickets}</p>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 bg-white">
            <CardHeader>
              <CardTitle>{trackingText.activeOrders}</CardTitle>
              <CardDescription>{trackingText.activeOrdersDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-slate-900">
                {
                  shipmentsData.filter((shipment) =>
                    ["Preparando", "Despachado", "En tránsito", "Demora operador"].includes(
                      shipment.status,
                    ),
                  ).length
                }
              </p>
              <p className="text-xs text-slate-500">{trackingText.liveTracking}</p>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 bg-white">
            <CardHeader>
              <CardTitle>{trackingText.deliveredOrders}</CardTitle>
              <CardDescription>{trackingText.deliveredOrdersDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-slate-900">
                {shipmentsData.filter((shipment) => shipment.status === "Entregado").length}
              </p>
              <p className="text-xs text-emerald-600">{trackingText.noClaims}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border border-slate-200 bg-white">
          <CardHeader>
            <CardTitle>{trackingText.statusDashboard}</CardTitle>
            <CardDescription>{trackingText.statusDashboardDesc}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
            <div className="flex items-center justify-center">
              <div
                className="relative h-52 w-52 rounded-full"
                style={{
                  background: `conic-gradient(${statusSummary
                    .map((status, index) => {
                      const start =
                        (statusSummary.slice(0, index).reduce((acc, curr) => acc + curr.total, 0) / shipmentsData.length) *
                        180;
                      const end = start + (status.total / shipmentsData.length) * 180;
                      const colors = ["#f97316", "#fb923c", "#fdba74", "#fed7aa", "#fecdd3", "#fca5a5"];
                      return `${colors[index % colors.length]} ${start}deg ${end}deg`;
                    })
                    .join(", ")})`,
                  transform: "rotate(180deg)",
                }}
              >
                <div className="absolute inset-[18%] rounded-full bg-white text-center" style={{ transform: "rotate(-180deg)" }}>
                  <p className="pt-10 text-3xl font-semibold text-slate-900">{shipmentsData.length}</p>
                  <p className="text-xs text-slate-500">{trackingText.totalOrders}</p>
                </div>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              {statusSummary.map((status, index) => (
                <div key={status.status} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: ["#f97316", "#fb923c", "#fdba74", "#fed7aa", "#fecdd3", "#fca5a5"][index % 6] }}
                    />
                    <span className="font-semibold text-slate-800">{shipmentStatusLabel(status.status)}</span>
                  </div>
                  <div className="text-right text-slate-500">
                    <p>{((status.total / shipmentsData.length) * 100).toFixed(0)}%</p>
                    <p className="text-xs">
                      {status.total} {trackingText.ordersWord}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <CardContent className="space-y-3 text-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{trackingText.quickActions}</p>
            <div className="rounded-xl border border-slate-100 px-3 py-2 text-slate-600">
              <p className="font-semibold text-slate-900">{trackingText.ordersWithClaims}</p>
              {complaints.map((shipment) => (
                <p key={shipment.id} className="text-sm">
                  {shipment.id} · {shipment.retailer}
                </p>
              ))}
            </div>
            <div className="rounded-xl border border-slate-100 px-3 py-2 text-slate-600">
              <p className="font-semibold text-slate-900">{trackingText.recentNotes}</p>
                {shipmentsData
                  .filter((shipment) => shipment.history.some((entry) => entry.type === "note"))
                  .slice(0, 3)
                  .map((shipment) => {
                    const notes = shipment.history.filter((entry) => entry.type === "note");
                    return (
                      <p key={shipment.id} className="text-xs text-slate-500">
                        {shipment.id}: {notes[notes.length - 1]?.value}
                      </p>
                    );
                  })}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
          <input
            type="text"
            placeholder={trackingText.searchPlaceholder}
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2"
            value={shipmentSearch}
            onChange={(event) => setShipmentSearch(event.target.value)}
          />
          <select
            className="rounded-xl border border-slate-200 px-3 py-2"
            value={clientFilter}
            onChange={(event) => setClientFilter(event.target.value)}
          >
            <option value="all">{trackingText.allClients}</option>
            {Array.from(new Set(shipmentsData.map((shipment) => shipment.retailer))).map((retailer) => (
              <option key={retailer} value={retailer}>
                {retailer}
              </option>
            ))}
          </select>
        </div>

        <Card className="border border-slate-200 bg-white">
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3">{trackingText.table.order}</th>
                  <th className="px-4 py-3">{trackingText.table.retailer}</th>
                  <th className="px-4 py-3">{trackingText.table.carrier}</th>
                  <th className="px-4 py-3">{trackingText.table.eta}</th>
                  <th className="px-4 py-3">{trackingText.table.status}</th>
                  <th className="px-4 py-3">{trackingText.table.notes}</th>
                  <th className="px-4 py-3">{trackingText.table.claim}</th>
                  <th className="px-4 py-3 text-center">{trackingText.table.history}</th>
                </tr>
              </thead>
              <tbody>
                {filteredShipments.map((shipment) => (
                  <tr key={shipment.id} className="border-b border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-900">{shipment.id}</td>
                    <td className="px-4 py-3">{shipment.retailer}</td>
                    <td className="px-4 py-3">{shipment.carrier}</td>
                    <td className="px-4 py-3">{etaLabel(shipment.eta)}</td>
                    <td className="px-4 py-3">
                      <select
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs"
                        value={shipment.status}
                        onChange={(event) => handleShipmentStatusChange(shipment.id, event.target.value)}
                      >
                        {shipmentStatuses.map((status) => (
                          <option key={status} value={status}>
                            {shipmentStatusLabel(status)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {shipment.history.filter((entry) => entry.type === "note").length === 0
                        ? trackingText.table.noNotes
                        : shipment.history.filter((entry) => entry.type === "note")[shipment.history.filter((entry) => entry.type === "note").length - 1].value}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {shipment.hasClaim ? (
                        <Badge variant="glow" className="bg-rose-100 px-4 text-rose-700">
                          {trackingText.table.activeClaim}
                        </Badge>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
                        onClick={() => {
                          setTimelineOrder((prev) => (prev === shipment.id ? null : shipment.id));
                          setNoteForm({ orderId: shipment.id, text: "" });
                        }}
                      >
                        {trackingText.table.notesButton}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {timelineOrder && (
          <Card className="border border-slate-200 bg-white">
            <CardHeader className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>
                  {trackingText.timelineTitle} {timelineOrder}
                </CardTitle>
                <CardDescription>{trackingText.timelineDesc}</CardDescription>
              </div>
              <Button variant="outline" className="border-slate-200 text-slate-600" onClick={() => setTimelineOrder(null)}>
                {trackingText.close}
              </Button>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-4">
                {shipmentsData
                  .find((shipment) => shipment.id === timelineOrder)
                  ?.history.map((entry, index) => (
                    <div key={`${entry.timestamp}-${index}`} className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                        {entry.type === "status" ? "ST" : "NT"}
                      </div>
                      <div className="flex-1 rounded-2xl border border-slate-100 px-4 py-2">
                        <p className="text-xs text-slate-400">{entry.timestamp}</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {entry.type === "status"
                            ? `${trackingText.statusPrefix}: ${shipmentStatusLabel(entry.value)}`
                            : entry.value}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
              <form className="grid gap-3" onSubmit={handleAddShipmentNote}>
                <p className="text-sm font-semibold text-slate-800">{trackingText.addNote}</p>
                <textarea
                  className="h-24 w-full rounded-xl border border-slate-200 px-3 py-2"
                  placeholder={trackingText.notePlaceholder}
                  value={noteForm.text}
                  onChange={(event) => setNoteForm((prev) => ({ ...prev, text: event.target.value }))}
                />
                <Button type="submit" className="bg-slate-900 text-white">
                  {trackingText.saveNote}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <Card className="border border-slate-200 bg-white">
          <CardHeader>
            <CardTitle>{trackingText.notesHistoryTitle}</CardTitle>
            <CardDescription>{trackingText.notesHistoryDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {shipmentsData
              .flatMap((shipment) =>
                shipment.history
                  .filter((entry) => entry.type === "note")
                  .map((note) => ({ id: shipment.id, retailer: shipment.retailer, note: note.value })),
              )
              .slice(-5)
              .reverse()
              .map((entry, index) => (
                <div key={`${entry.id}-${index}`} className="rounded-xl border border-slate-100 px-3 py-2">
                  <p className="text-xs text-slate-400">
                    {entry.id} · {entry.retailer}
                  </p>
                  <p className="text-slate-700">{entry.note}</p>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderPendings() {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-slate-900">{pendingsText.title}</h2>
          <p className="text-sm text-slate-500">{pendingsText.desc}</p>
        </div>
        <Card className="border border-slate-200 bg-white">
          <CardHeader>
            <CardTitle>{pendingsText.addTaskTitle}</CardTitle>
            <CardDescription>{pendingsText.addTaskDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-3 md:grid-cols-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (!newTask.title.trim()) {
                  return;
                }
                setKanbanCards((prev) => [
                  ...prev,
                  {
                    id: `task-${Date.now()}`,
                    column: newTask.column,
                    title: newTask.title,
                    assignee: newTask.assignee,
                    detail: newTask.detail,
                    due: newTask.due,
                  },
                ]);
                setNewTask({ title: "", assignee: "", detail: "", due: "", column: "inbox" });
              }}
            >
              <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                {pendingsText.task}
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={newTask.title}
                  onChange={(event) => setNewTask((prev) => ({ ...prev, title: event.target.value }))}
                  required
                />
              </label>
              <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                {pendingsText.assignee}
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={newTask.assignee}
                  onChange={(event) => setNewTask((prev) => ({ ...prev, assignee: event.target.value }))}
                />
              </label>
              <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                {pendingsText.detail}
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={newTask.detail}
                  onChange={(event) => setNewTask((prev) => ({ ...prev, detail: event.target.value }))}
                />
              </label>
              <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                {pendingsText.due}
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={newTask.due}
                  onChange={(event) => setNewTask((prev) => ({ ...prev, due: event.target.value }))}
                />
              </label>
              <label className="text-xs uppercase tracking-[0.2em] text-slate-400 md:col-span-2">
                {pendingsText.column}
                <select
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={newTask.column}
                  onChange={(event) => setNewTask((prev) => ({ ...prev, column: event.target.value }))}
                >
                  {kanbanColumns.map((column) => (
                    <option key={column.id} value={column.id}>
                      {kanbanColumnTitle(column.id, column.title)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="md:col-span-2 md:flex md:items-end">
                <Button type="submit" className="w-full bg-slate-900 text-white">
                  {pendingsText.addToBoard}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        <div className="mx-auto grid w-full max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {kanbanColumns.map((column) => (
            <Card key={column.id} className="border border-slate-200 bg-white">
              <CardHeader>
                <CardTitle>{kanbanColumnTitle(column.id, column.title)}</CardTitle>
                <CardDescription>
                  {kanbanCards.filter((card) => card.column === column.id).length} {pendingsText.pendingCount}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {kanbanCards
                  .filter((card) => card.column === column.id)
                  .map((card) => (
                    <div key={card.id} className="space-y-2 rounded-2xl border border-slate-100 px-3 py-2">
                      <p className="text-sm font-semibold text-slate-900">{card.title}</p>
                      {card.detail && <p className="text-xs text-slate-500">{card.detail}</p>}
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{card.assignee || pendingsText.unassigned}</span>
                        <span>{card.due || pendingsText.noDue}</span>
                      </div>
                      <select
                        className="w-full rounded-xl border border-slate-200 px-2 py-1 text-xs"
                        value={card.column}
                        onChange={(event) =>
                          setKanbanCards((prev) =>
                            prev.map((item) => (item.id === card.id ? { ...item, column: event.target.value } : item)),
                          )
                        }
                      >
                        {kanbanColumns.map((option) => (
                          <option key={option.id} value={option.id}>
                            {kanbanColumnTitle(option.id, option.title)}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                {kanbanCards.filter((card) => card.column === column.id).length === 0 && (
                  <p className="text-xs text-slate-400">{pendingsText.noTasks}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeSection) {
      case "overview":
        return renderOverview();
      case "catalog":
        return renderCatalog();
      case "stock":
        return renderStock();
      case "tracking":
        return renderTracking();
      case "pendings":
        return renderPendings();
      default:
        return renderCatalog();
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">
      <aside className="hidden w-64 flex-shrink-0 flex-col bg-slate-900 text-slate-100 lg:flex">
        <div className="border-b border-white/10 px-5 py-6">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-300">Aurelia</p>
          <p className="text-xl font-semibold">{ui.backofficeTitle}</p>
        </div>
        <nav className="flex-1 space-y-1 px-4 py-6">
          {navItems.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm transition ${
                  isActive ? "bg-slate-100 text-slate-900" : "text-slate-200 hover:bg-white/10"
                }`}
                onClick={() => setActiveSection(section.id)}
              >
                <Icon className="h-4 w-4" />
                {section.label}
              </button>
            );
          })}
        </nav>
        <div className="border-t border-white/10 px-4 py-4 text-xs text-slate-400">
          <p>{ui.needHelp}</p>
          <Button variant="outline" className="mt-2 w-full border-white/40 text-white hover:bg-white/10">
            <Link href="mailto:hola@aurelia.com">{ui.contactSupport}</Link>
          </Button>
        </div>
      </aside>

      <main className="flex-1 space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Breadcrumb active={activeSection} language={language} />
            <p className="text-xl font-semibold text-slate-900 sm:text-2xl">{ui.panelTitle}</p>
            <p className="text-sm text-slate-500">{ui.panelDesc}</p>
          </div>
          <div className="flex w-full flex-wrap gap-3 text-sm sm:w-auto">
            <Button variant="outline" className="border-slate-300 text-slate-700">
              {ui.downloadReport}
            </Button>
            <Button className="bg-slate-900 text-white">
              <BadgeCheck className="mr-2 h-4 w-4" /> {ui.confirmOrders}
            </Button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
          {navItems.map((section) => {
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  isActive
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-700"
                }`}
              >
                {section.label}
              </button>
            );
          })}
        </div>

        {renderContent()}
      </main>
    </div>
  );
}

function Breadcrumb({ active, language }: { active: string; language: "es" | "ko" }) {
  const labels: Record<"es" | "ko", Record<string, string>> = {
    es: {
      overview: "Tablero",
      catalog: "Catálogo",
      stock: "Stock",
      tracking: "Seguimiento",
      pendings: "Pendientes",
    },
    ko: {
      overview: "대시보드",
      catalog: "카탈로그",
      stock: "재고",
      tracking: "추적",
      pendings: "대기 업무",
    },
  };

  const safeLanguage = language === "ko" ? "ko" : "es";
  const activeLabel = labels[safeLanguage][active] ?? labels[safeLanguage].catalog;

  return (
    <div className="mb-1 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
      <span>{safeLanguage === "ko" ? "홈" : "Inicio"}</span>
      <span>/</span>
      <span>{activeLabel}</span>
    </div>
  );
}
