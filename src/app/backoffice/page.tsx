"use client";

import Link from "next/link";
import { useState } from "react";
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
  { id: "notes", label: "Notas", icon: MessageCircle },
];

const catalogProducts = [
  {
    id: "SIE-AR-12",
    name: "Pack Argollas Siena",
    category: "Aros",
    price: "$18.900",
    quantity: 120,
    status: true,
  },
  {
    id: "AUR-LAY-08",
    name: "Layering Aura",
    category: "Collares",
    price: "$24.500",
    quantity: 86,
    status: true,
  },
  {
    id: "CAP-PUL-18",
    name: "Mix Pulseras Capri",
    category: "Pulseras",
    price: "$21.700",
    quantity: 140,
    status: true,
  },
  {
    id: "KIT-VIT-80",
    name: "Kit Vitrina Premium",
    category: "Kits",
    price: "$98.500",
    quantity: 22,
    status: false,
  },
];

const warehouses = [
  { id: "CABA", location: "Depósito Parque Patricios", available: 420, reserved: 120 },
  { id: "CBA", location: "Hub Córdoba", available: 280, reserved: 64 },
  { id: "CDMX", location: "Fulfillment México", available: 190, reserved: 22 },
];

const shipments = [
  {
    id: "PED-981",
    retailer: "Alma Mayorista",
    status: "En tránsito",
    carrier: "Andreani",
    eta: "Entrega mañana 10hs",
  },
  {
    id: "PED-982",
    retailer: "Galería Cumbre",
    status: "Hold aduana",
    carrier: "Correo Argentino",
    eta: "Revisión",
  },
  {
    id: "PED-983",
    retailer: "Live Shopping MX",
    status: "Despachado",
    carrier: "FedEx",
    eta: "Entrega hoy 18hs",
  },
];

const notes = [
  {
    title: "Checklist nueva tienda Lima",
    detail: "Enviar merchandising, kit vitrina y capacitación virtual.",
  },
  {
    title: "Alertar sobre top sellers",
    detail: "Layering Aura agotará en 7 días. Proponer alternativa.",
  },
  {
    title: "Live Shopping MX",
    detail: "Documentar playbook. Ticket +21% en la última sesión.",
  },
];

export default function BackofficePage() {
  const [activeSection, setActiveSection] = useState<string>("catalog");

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {["Pedidos activos", "Ticket promedio", "Reposiciones", "Alertas"].map((label, index) => (
          <Card key={label} className="border border-slate-200 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-500">{label}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-slate-900">
              {index === 0 && "124"}
              {index === 1 && "$ 82.300"}
              {index === 2 && "37"}
              {index === 3 && "9"}
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="border border-slate-200 bg-white">
        <CardHeader className="flex flex-wrap items-center justify-between">
          <div>
            <CardTitle>Pedidos recientes</CardTitle>
            <CardDescription>Seguimiento de última milla.</CardDescription>
          </div>
          <Badge variant="outline">Actualizado</Badge>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-t border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="py-2 px-3">Retailer</th>
                <th className="py-2 px-3">Items</th>
                <th className="py-2 px-3">ETA</th>
                <th className="py-2 px-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {[
                { retailer: "Luna Concept Store", items: 56, eta: "En picking", status: "Preparando" },
                { retailer: "Alma Mayorista", items: 82, eta: "Entrega 24h", status: "Despachado" },
                { retailer: "Galería Cumbre", items: 40, eta: "Aprobación", status: "Revisión" },
              ].map((order) => (
                <tr key={order.retailer} className="border-b border-slate-100">
                  <td className="px-3 py-2 font-medium text-slate-800">{order.retailer}</td>
                  <td className="px-3 py-2">{order.items}</td>
                  <td className="px-3 py-2">{order.eta}</td>
                  <td className="px-3 py-2 text-slate-500">{order.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );

  const renderCatalog = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-slate-900">Productos</h2>
          <p className="text-sm text-slate-500">Filtrá, editá y publicá tu catálogo.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-slate-300 text-slate-800">
            Recomendaciones
          </Button>
          <Button className="bg-slate-900 text-white">
            <PlusCircle className="mr-2 h-4 w-4" /> Nuevo producto
          </Button>
        </div>
      </div>
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
      </div>
      <Card className="border border-slate-200 bg-white">
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-[12px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Precio</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {catalogProducts.map((product) => (
                <tr key={product.id} className="border-b border-slate-100 text-slate-700">
                  <td className="px-4 py-3 text-slate-500">{product.id}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{product.name}</td>
                  <td className="px-4 py-3">{product.category}</td>
                  <td className="px-4 py-3">{product.price}</td>
                  <td className="px-4 py-3">{product.quantity}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${product.status ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>
                      {product.status ? "Activo" : "Pausado"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">Editar</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );

  const renderStock = () => (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-slate-900">Stock por depósito</h2>
        <p className="text-sm text-slate-500">Disponibilidad y reservas activas.</p>
      </div>
      <Card className="border border-slate-200 bg-white">
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

  const renderTracking = () => (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-slate-900">Tracking y reclamos</h2>
        <p className="text-sm text-slate-500">Estado de envíos y soporte.</p>
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
              </tr>
            </thead>
            <tbody>
              {shipments.map((shipment) => (
                <tr key={shipment.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">{shipment.id}</td>
                  <td className="px-4 py-3">{shipment.retailer}</td>
                  <td className="px-4 py-3">{shipment.carrier}</td>
                  <td className="px-4 py-3">{shipment.eta}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="border-slate-300 text-slate-700">
                      {shipment.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );

  const renderNotes = () => (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-slate-900">Notas internas</h2>
        <p className="text-sm text-slate-500">Checklist compartido con el equipo.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {notes.map((note) => (
          <Card key={note.title} className="border border-slate-200 bg-white">
            <CardHeader>
              <CardTitle className="text-base">{note.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">{note.detail}</CardContent>
          </Card>
        ))}
        <Card className="border border-slate-200 bg-white">
          <CardHeader>
            <CardTitle>Equipo online</CardTitle>
            <CardDescription>Disponibilidad de asesoras.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {["Belén · Cono Sur", "Aura · Live Commerce", "Maru · Brasil"].map((advisor) => (
              <div key={advisor} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <span>{advisor}</span>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Online</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );

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
      case "notes":
        return renderNotes();
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
    notes: "Notas",
  };

  return (
    <div className="mb-1 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
      <span>Home</span>
      <span>/</span>
      <span>{labels[active]}</span>
    </div>
  );
}
