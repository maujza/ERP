"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BadgeCheck,
  Boxes,
  ClipboardList,
  DollarSign,
  Home,
  LayoutDashboard,
  MessageCircle,
  PackageSearch,
  PlusCircle,
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

const navSections = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
  { id: "catalog", label: "Catálogo", icon: PackageSearch },
  { id: "stock", label: "Stock", icon: Boxes },
  { id: "tracking", label: "Tracking", icon: Truck },
  { id: "pendings", label: "Pendings", icon: MessageCircle },
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

  const overviewContent = useMemo(() => renderOverview(), [catalogData]);

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
    const maxRevenue = Math.max(...revenueTrend.map((point) => point.amount));
    const revenuePoints = revenueTrend
      .map((point, index) => {
        const x = (index / (revenueTrend.length - 1)) * 100;
        const y = 100 - (point.amount / maxRevenue) * 100;
        return `${x},${y}`;
      })
      .join(" ");

    let start = 0;
    const donutSegments = orderStatusData
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((item) => (
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
            <span>Periodo</span>
            <select className="rounded-lg border border-slate-200 px-3 py-1">
              <option>Últimos 90 días</option>
              <option>Este mes</option>
              <option>Semana actual</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="border-slate-200 text-slate-700">
              Exportar CSV
            </Button>
            <Button className="bg-slate-900 text-white">
              <BadgeCheck className="mr-2 h-4 w-4" /> Actualizar
            </Button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.8fr_1.1fr]">
          <Card className="border border-slate-200 bg-white">
            <CardHeader className="flex flex-wrap items-center justify-between gap-3">
              <div>
              <CardTitle>Facturación mensual promedio</CardTitle>
              <CardDescription>Argentina · ARS millones</CardDescription>
            </div>
            <div className="text-3xl font-semibold text-slate-900">
              ${" "}
              {Math.round(
                revenueTrend.reduce((acc, point) => acc + point.amount, 0) / revenueTrend.length,
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
                  {revenueTrend.map((point) => (
                    <span key={point.month}>{point.month}</span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 bg-white">
            <CardHeader>
              <CardTitle>Estado de pedidos</CardTitle>
              <CardDescription>Distribución por status</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <div className="flex items-center justify-center">
                <div className="relative h-40 w-40 rounded-full" style={{ background: `conic-gradient(${donutSegments})` }}>
                  <div className="absolute inset-[18%] rounded-full bg-white/90 text-center">
                    <p className="pt-8 text-2xl font-semibold text-slate-900">
                      {orderStatusData.reduce((acc, data) => acc + data.total, 0)}
                    </p>
                    <p className="text-xs text-slate-500">Pedidos</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                {orderStatusData.map((status, index) => (
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
                      <p className="text-xs">{status.total} pedidos</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border border-slate-200 bg-white">
            <CardHeader>
              <CardTitle>Productos vendidos por categoría</CardTitle>
              <CardDescription>Unidades totales últimos 30 días</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {salesByCategory.map((category) => {
                const percentage = Math.round((category.units / salesByCategory[0].units) * 100);
                return (
                  <div key={category.category}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-slate-800">{category.category}</span>
                      <span className="text-slate-500">{category.units} uds</span>
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
              <CardTitle>Clientes top por revenue</CardTitle>
              <CardDescription>Participación sobre el total</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {topClients.map((client, index) => (
                <div key={client.label} className="space-y-2 rounded-2xl border border-slate-100 p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-900">
                      {index + 1}. {client.label}
                    </p>
                    <span className="text-xs text-slate-500">{client.growth} vs mes anterior</span>
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

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border border-slate-200 bg-white">
            <CardHeader>
              <CardTitle>Alertas de stock</CardTitle>
              <CardDescription>Productos críticos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {lowStockAlerts.map((alert) => (
                <div key={alert.sku} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
                  <div>
                    <p className="font-semibold text-slate-900">{alert.product}</p>
                    <p className="text-xs text-slate-500">SKU {alert.sku} · Depósito {alert.depot}</p>
                  </div>
                  <Badge variant="outline" className="border-amber-300 text-amber-600">
                    {alert.remaining} uds
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border border-slate-200 bg-white">
            <CardHeader>
              <CardTitle>Pedidos detenidos</CardTitle>
              <CardDescription>Status sin cambios &gt; 24h</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {stuckOrders.map((order) => (
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
              <CardTitle>Faltantes proyectados</CardTitle>
              <CardDescription>Próximo mes · todas las categorías</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-slate-900">{monthlyShortage} uds</p>
              <p className="text-xs text-slate-500">Incluye preventas confirmadas.</p>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 bg-white">
            <CardHeader>
              <CardTitle>Productos en riesgo</CardTitle>
              <CardDescription>Cobertura &lt; 2 semanas</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-slate-900">{nearOutOfStock.length}</p>
              <p className="text-xs text-slate-500">Revisar pedidos a fábrica.</p>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 bg-white">
            <CardHeader>
              <CardTitle>Stock disponible</CardTitle>
              <CardDescription>Catálogo activo</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-slate-900">
                {catalogData.reduce((acc, product) => acc + product.quantity, 0)} uds
              </p>
              <p className="text-xs text-slate-500">Sumatoria mayorista.</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <Card className="border border-slate-200 bg-white">
            <CardHeader>
              <CardTitle>Cargar/editar producto</CardTitle>
              <CardDescription>Gestioná fotos, precios y estado.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4" onSubmit={handleProductSubmit}>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-sm text-slate-600">
                    Nombre
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                      value={productForm.name}
                      onChange={(event) => setProductForm((prev) => ({ ...prev, name: event.target.value }))}
                      required
                    />
                  </label>
                  <label className="text-sm text-slate-600">
                    SKU
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 uppercase"
                      value={productForm.id}
                      onChange={(event) => setProductForm((prev) => ({ ...prev, id: event.target.value }))}
                    />
                  </label>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="text-sm text-slate-600">
                    Categoría
                    <select
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                      value={productForm.category}
                      onChange={(event) => setProductForm((prev) => ({ ...prev, category: event.target.value }))}
                    >
                      <option>Aros</option>
                      <option>Collares</option>
                      <option>Pulseras</option>
                      <option>Kits</option>
                      <option>Perlas</option>
                    </select>
                  </label>
                  <label className="text-sm text-slate-600">
                    Precio mayorista
                    <input
                      type="number"
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                      value={productForm.wholesalePrice}
                      onChange={(event) => setProductForm((prev) => ({ ...prev, wholesalePrice: event.target.value }))}
                      required
                    />
                  </label>
                  <label className="text-sm text-slate-600">
                    Precio minorista
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
                    Stock disponible
                    <input
                      type="number"
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                      value={productForm.quantity}
                      onChange={(event) => setProductForm((prev) => ({ ...prev, quantity: event.target.value }))}
                      required
                    />
                  </label>
                  <label className="text-sm text-slate-600">
                    Estado
                    <select
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                      value={productForm.status ? "activo" : "pausado"}
                      onChange={(event) => setProductForm((prev) => ({ ...prev, status: event.target.value === "activo" }))}
                    >
                      <option value="activo">Activo</option>
                      <option value="pausado">Pausado</option>
                    </select>
                  </label>
                  <label className="text-sm text-slate-600">
                    URLs de imagen
                    <textarea
                      className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                      placeholder="https://...jpg, https://...jpg"
                      value={productForm.images}
                      onChange={(event) => setProductForm((prev) => ({ ...prev, images: event.target.value }))}
                    />
                  </label>
                </div>
                <label className="text-sm text-slate-600">
                  Subir foto (opcional)
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
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Previsualización</p>
                    <div className="flex flex-wrap gap-3">
                      {previewImages.map((img) => (
                        <div key={img} className="relative h-20 w-24 overflow-hidden rounded-xl border border-slate-200">
                          <img src={img} alt="preview" className="h-full w-full object-cover" />
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
                      Cancelar
                    </Button>
                  )}
                  <Button type="submit" className="bg-slate-900 text-white">
                    {editingId ? "Actualizar" : "Agregar producto"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 bg-white">
            <CardHeader>
              <CardTitle>Proyección & alertas</CardTitle>
              <CardDescription>Organizá la reposición.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Faltantes por semana</p>
                <div className="mt-3 space-y-2">
                  {forecastShortages.map((item) => (
                    <div key={item.product} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
                      <div>
                        <p className="font-semibold text-slate-900">{item.product}</p>
                        <p className="text-xs text-slate-500">{item.week}</p>
                      </div>
                      <Badge variant="outline" className="border-rose-200 text-rose-600">
                        -{item.shortage} uds
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Casi sin stock</p>
                <div className="mt-3 space-y-2">
                  {nearOutOfStock.map((item) => (
                    <div key={item.product} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
                      <div>
                        <p className="font-semibold text-slate-900">{item.product}</p>
                        <p className="text-xs text-slate-500">Cobertura {item.coverage}</p>
                      </div>
                      <Badge variant="outline" className="border-amber-200 text-amber-600">
                        {item.remaining} uds
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
            <CardTitle>Bulk pricing</CardTitle>
            <CardDescription>Aplicá markup/markdown a precios mayoristas o minoristas.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <label className="text-sm text-slate-600">
              Target
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                value={bulkPricing.target}
                onChange={(event) => setBulkPricing((prev) => ({ ...prev, target: event.target.value }))}
              >
                <option value="wholesale">Mayorista</option>
                <option value="retail">Minorista</option>
                <option value="both">Ambos</option>
              </select>
            </label>
            <label className="text-sm text-slate-600">
              Acción
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                value={bulkPricing.mode}
                onChange={(event) => setBulkPricing((prev) => ({ ...prev, mode: event.target.value }))}
              >
                <option value="markup">Markup (+)</option>
                <option value="markdown">Markdown (-)</option>
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
                Aplicar ajustes
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Categoría</span>
            <select className="rounded-lg border border-slate-200 px-3 py-1">
              <option>Root</option>
              <option>Aros</option>
              <option>Collares</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Acciones</span>
            <select className="rounded-lg border border-slate-200 px-3 py-1">
              <option>Bulk actions</option>
              <option>Activar</option>
              <option>Desactivar</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Buscar</span>
            <input
              type="text"
              className="rounded-lg border border-slate-200 px-3 py-1"
              placeholder="SKU o nombre"
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
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3">Mayorista</th>
                  <th className="px-4 py-3">Minorista</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Fotos</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
              {filteredProducts.map((product) => (
                  <tr key={product.id} className="border-b border-slate-100 text-slate-700">
                    <td className="px-4 py-3 text-slate-500">{product.id}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{product.name}</td>
                    <td className="px-4 py-3">{product.category}</td>
                    <td className="px-4 py-3">${product.wholesalePrice.toLocaleString("es-AR")}</td>
                    <td className="px-4 py-3">${product.retailPrice.toLocaleString("es-AR")}</td>
                    <td className="px-4 py-3">{product.quantity}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {product.images.slice(0, 2).map((img) => (
                          <span key={img} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                            Foto
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${product.status ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}
                        onClick={() => handleToggleStatus(product.id)}
                      >
                        {product.status ? "Activo" : "Pausado"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button className="text-slate-500 underline" onClick={() => handleEditProduct(product.id)}>
                        Editar
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
              <CardTitle>Stock total</CardTitle>
              <CardDescription>Todo el catálogo</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-slate-900">{totalStock} uds</p>
              <p className="text-xs text-slate-500">Incluye productos suspendidos.</p>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 bg-white">
            <CardHeader>
              <CardTitle>Disponible</CardTitle>
              <CardDescription>Liberado para venta</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-slate-900">{totalAvailable} uds</p>
              <p className="text-xs text-emerald-600">
                {(totalAvailable / totalStock * 100).toFixed(0)}% disponible
              </p>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 bg-white">
            <CardHeader>
              <CardTitle>Reservado</CardTitle>
              <CardDescription>Pedidos confirmados</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-slate-900">{totalReserved} uds</p>
              <p className="text-xs text-amber-600">
                {(totalReserved / totalStock * 100).toFixed(0)}% en preparación
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <Card className="border border-slate-200 bg-white">
            <CardHeader>
              <CardTitle>Inventario por producto</CardTitle>
              <CardDescription>Total, disponible y reservado</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Producto</th>
                    <th className="px-4 py-3">Categoría</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Disponible</th>
                    <th className="px-4 py-3">Reservado</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryProducts.map((product) => (
                    <tr key={product.id} className="border-b border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-900">{product.id}</td>
                      <td className="px-4 py-3">{product.name}</td>
                      <td className="px-4 py-3">{product.category}</td>
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
              <CardTitle>Stock por categoría</CardTitle>
              <CardDescription>Proporción del inventario</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {categoryStock.map((category) => (
                <div key={category.category}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-800">{category.category}</span>
                    <span className="text-slate-500">{category.total} uds</span>
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

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border border-slate-200 bg-white">
            <CardHeader>
              <CardTitle>Faltantes proyectados</CardTitle>
              <CardDescription>En base a ventas y reposiciones</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {upcomingShortages.map((item) => (
                <div key={item.week} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
                  <div>
                    <p className="font-semibold text-slate-900">{item.product}</p>
                    <p className="text-xs text-slate-500">{item.week}</p>
                  </div>
                  <Badge variant="outline" className="border-rose-200 text-rose-600">
                    {item.expected} uds
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border border-slate-200 bg-white">
            <CardHeader>
              <CardTitle>Pedidos a proveedores</CardTitle>
              <CardDescription>Órdenes en preparación</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {supplierOrders.map((order) => (
                <div key={order.supplier} className="rounded-xl border border-slate-100 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-900">{order.supplier}</p>
                    <Badge variant="outline" className="border-slate-200 text-slate-600">
                      {order.eta}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500">{order.products}</p>
                  <p className="text-xs text-slate-400">Qty {order.qty} uds</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="border border-slate-200 bg-white">
          <CardHeader>
            <CardTitle>Stock por depósito</CardTitle>
            <CardDescription>Disponibilidad y reservas activas.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3">Depósito</th>
                  <th className="px-4 py-3">Ubicación</th>
                  <th className="px-4 py-3">Disponible</th>
                  <th className="px-4 py-3">Reservado</th>
                </tr>
              </thead>
              <tbody>
                {warehouses.map((warehouse) => (
                  <tr key={warehouse.id} className="border-b border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-900">{warehouse.id}</td>
                    <td className="px-4 py-3">{warehouse.location}</td>
                    <td className="px-4 py-3">{warehouse.available} uds</td>
                    <td className="px-4 py-3 text-amber-600">{warehouse.reserved} uds</td>
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
              <CardTitle>Reclamos nuevos</CardTitle>
              <CardDescription>Últimas 48hs</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-slate-900">{complaints.length}</p>
              <p className="text-xs text-rose-600">Revisar tickets abiertos.</p>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 bg-white">
            <CardHeader>
              <CardTitle>Pedidos activos</CardTitle>
              <CardDescription>En tránsito o preparando</CardDescription>
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
              <p className="text-xs text-slate-500">Seguimiento en vivo</p>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 bg-white">
            <CardHeader>
              <CardTitle>Pedidos entregados</CardTitle>
              <CardDescription>Última semana</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-slate-900">
                {shipmentsData.filter((shipment) => shipment.status === "Entregado").length}
              </p>
              <p className="text-xs text-emerald-600">Sin reclamos.</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border border-slate-200 bg-white">
          <CardHeader>
            <CardTitle>Dashboard de status</CardTitle>
            <CardDescription>Distribución de pedidos</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
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
                  <p className="text-xs text-slate-500">Pedidos totales</p>
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
                    <span className="font-semibold text-slate-800">{status.status}</span>
                  </div>
                  <div className="text-right text-slate-500">
                    <p>{((status.total / shipmentsData.length) * 100).toFixed(0)}%</p>
                    <p className="text-xs">{status.total} pedidos</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <CardContent className="space-y-3 text-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Acciones rápidas</p>
            <div className="rounded-xl border border-slate-100 px-3 py-2 text-slate-600">
              <p className="font-semibold text-slate-900">Pedidos con reclamos</p>
              {complaints.map((shipment) => (
                <p key={shipment.id} className="text-sm">
                  {shipment.id} · {shipment.retailer}
                </p>
              ))}
            </div>
            <div className="rounded-xl border border-slate-100 px-3 py-2 text-slate-600">
              <p className="font-semibold text-slate-900">Notas recientes</p>
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
            placeholder="Buscar por pedido o cliente"
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2"
            value={shipmentSearch}
            onChange={(event) => setShipmentSearch(event.target.value)}
          />
          <select
            className="rounded-xl border border-slate-200 px-3 py-2"
            value={clientFilter}
            onChange={(event) => setClientFilter(event.target.value)}
          >
            <option value="all">Todos los clientes</option>
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
                  <th className="px-4 py-3">Pedido</th>
                  <th className="px-4 py-3">Retailer</th>
                  <th className="px-4 py-3">Carrier</th>
                  <th className="px-4 py-3">ETA</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Notas</th>
                  <th className="px-4 py-3">Reclamo</th>
                  <th className="px-4 py-3 text-center">Historial</th>
                </tr>
              </thead>
              <tbody>
                {filteredShipments.map((shipment) => (
                  <tr key={shipment.id} className="border-b border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-900">{shipment.id}</td>
                    <td className="px-4 py-3">{shipment.retailer}</td>
                    <td className="px-4 py-3">{shipment.carrier}</td>
                    <td className="px-4 py-3">{shipment.eta}</td>
                    <td className="px-4 py-3">
                      <select
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs"
                        value={shipment.status}
                        onChange={(event) => handleShipmentStatusChange(shipment.id, event.target.value)}
                      >
                        {shipmentStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {shipment.history.filter((entry) => entry.type === "note").length === 0
                        ? "Sin notas"
                        : shipment.history.filter((entry) => entry.type === "note")[shipment.history.filter((entry) => entry.type === "note").length - 1].value}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {shipment.hasClaim ? (
                        <Badge variant="glow" className="bg-rose-100 px-4 text-rose-700">
                          Reclamo activo
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
                        Notas
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
                <CardTitle>Timeline del pedido {timelineOrder}</CardTitle>
                <CardDescription>Evolución de status y notas</CardDescription>
              </div>
              <Button variant="outline" className="border-slate-200 text-slate-600" onClick={() => setTimelineOrder(null)}>
                Cerrar
              </Button>
            </CardHeader>
            <CardContent className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
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
                          {entry.type === "status" ? `Status: ${entry.value}` : entry.value}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
              <form className="grid gap-3" onSubmit={handleAddShipmentNote}>
                <p className="text-sm font-semibold text-slate-800">Agregar nota</p>
                <textarea
                  className="h-24 w-full rounded-xl border border-slate-200 px-3 py-2"
                  placeholder="Actualización de inventario, reclamo, etc."
                  value={noteForm.text}
                  onChange={(event) => setNoteForm((prev) => ({ ...prev, text: event.target.value }))}
                />
                <Button type="submit" className="bg-slate-900 text-white">
                  Guardar nota
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <Card className="border border-slate-200 bg-white">
          <CardHeader>
            <CardTitle>Historial de notas</CardTitle>
            <CardDescription>Últimas entradas</CardDescription>
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
          <h2 className="text-xl font-semibold text-slate-900">Pendings del equipo</h2>
          <p className="text-sm text-slate-500">Seguimiento Kanban: asigná tareas y cambiá status.</p>
        </div>
        <Card className="border border-slate-200 bg-white">
          <CardHeader>
            <CardTitle>Agregar tarea</CardTitle>
            <CardDescription>Crear un nuevo pendiente en cualquier columna.</CardDescription>
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
                Tarea
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={newTask.title}
                  onChange={(event) => setNewTask((prev) => ({ ...prev, title: event.target.value }))}
                  required
                />
              </label>
              <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Asignado
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={newTask.assignee}
                  onChange={(event) => setNewTask((prev) => ({ ...prev, assignee: event.target.value }))}
                />
              </label>
              <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Detalle
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={newTask.detail}
                  onChange={(event) => setNewTask((prev) => ({ ...prev, detail: event.target.value }))}
                />
              </label>
              <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Due
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={newTask.due}
                  onChange={(event) => setNewTask((prev) => ({ ...prev, due: event.target.value }))}
                />
              </label>
              <label className="text-xs uppercase tracking-[0.2em] text-slate-400 md:col-span-2">
                Columna
                <select
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={newTask.column}
                  onChange={(event) => setNewTask((prev) => ({ ...prev, column: event.target.value }))}
                >
                  {kanbanColumns.map((column) => (
                    <option key={column.id} value={column.id}>
                      {column.title}
                    </option>
                  ))}
                </select>
              </label>
              <div className="md:col-span-2 md:flex md:items-end">
                <Button type="submit" className="w-full bg-slate-900 text-white">
                  Añadir a tablero
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        <div className="mx-auto grid w-full max-w-5xl gap-4 md:grid-cols-2 xl:grid-cols-3">
          {kanbanColumns.map((column) => (
            <Card key={column.id} className="border border-slate-200 bg-white">
              <CardHeader>
                <CardTitle>{column.title}</CardTitle>
                <CardDescription>
                  {kanbanCards.filter((card) => card.column === column.id).length} pendientes
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
                        <span>{card.assignee || "Unassigned"}</span>
                        <span>{card.due || "Sin fecha"}</span>
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
                            {option.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                {kanbanCards.filter((card) => card.column === column.id).length === 0 && (
                  <p className="text-xs text-slate-400">Sin tareas asignadas.</p>
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
        return overviewContent;
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
          <p className="text-xl font-semibold">Backoffice</p>
        </div>
        <nav className="flex-1 space-y-1 px-4 py-6">
          {navSections.map((section) => {
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
          <p>¿Necesitás ayuda?</p>
          <Button variant="outline" className="mt-2 w-full border-white/40 text-white hover:bg-white/10">
            <Link href="mailto:hola@aurelia.com">Contactar soporte</Link>
          </Button>
        </div>
      </aside>

      <main className="flex-1 space-y-6 px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Breadcrumb active={activeSection} />
            <p className="text-2xl font-semibold text-slate-900">Panel Operativo</p>
            <p className="text-sm text-slate-500">Seleccioná un módulo para trabajar en detalle.</p>
          </div>
          <div className="flex gap-3 text-sm">
            <Button variant="outline" className="border-slate-300 text-slate-700">
              Descargar reporte
            </Button>
            <Button className="bg-slate-900 text-white">
              <BadgeCheck className="mr-2 h-4 w-4" /> Confirmar pedidos
            </Button>
          </div>
        </div>

        {renderContent()}
      </main>
    </div>
  );
}

function Breadcrumb({ active }: { active: string }) {
  const labels: Record<string, string> = {
    overview: "Dashboard",
    catalog: "Catálogo",
    stock: "Stock",
    tracking: "Tracking",
    pendings: "Pendings",
  };

  return (
    <div className="mb-1 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
      <span>Home</span>
      <span>/</span>
      <span>{labels[active]}</span>
    </div>
  );
}
