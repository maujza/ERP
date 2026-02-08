"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Product = {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  pack: string;
  stock: string;
  tags: string[];
  image: string;
};

const products: Product[] = [
  {
    id: "siena-pack",
    name: "Pack Argollas Siena",
    description: "Micro circonias, baño oro 18K y tres diámetros combinables.",
    category: "Aros",
    price: 18900,
    pack: "Pack x12 · $18.900 + IVA",
    stock: "En stock",
    tags: ["Níquel free", "Backing card incluida"],
    image:
      "https://images.unsplash.com/photo-1590166223826-12dee1677420?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "layering-aura",
    name: "Layering Aura",
    description: "Stack de 5 collares con cierres magnéticos y largos escalonados.",
    category: "Collares",
    price: 24500,
    pack: "Pack x8 · $24.500 + IVA",
    stock: "Stock bajo",
    tags: ["Cierres imantados", "Tip card"],
    image:
      "https://images.unsplash.com/photo-1601821765780-754fa98637c1?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "capri-pulseras",
    name: "Mix Pulseras Capri",
    description: "Acero 316L pulido, esmaltes pasteles y ajuste deslizable.",
    category: "Pulseras",
    price: 21700,
    pack: "Pack x18 · $21.700 + IVA",
    stock: "En stock",
    tags: ["Esmalte italiano", "Incluye display"],
    image:
      "https://images.unsplash.com/photo-1765852550345-ddb23c794d01?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "statement-fiesta",
    name: "Statement Éclair",
    description: "Aros bold con cristales premium y terminación pavé luminosa.",
    category: "Aros",
    price: 16500,
    pack: "Pack x10 · $16.500 + IVA",
    stock: "En stock",
    tags: ["Cristales premium", "Test de brillo"],
    image:
      "https://images.unsplash.com/photo-1553926297-57bb350c4f08?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "materia-collar",
    name: "Cadenas Materia Prima",
    description: "Layering neutro en acero quirúrgico con baños mixtos.",
    category: "Collares",
    price: 20900,
    pack: "Pack x10 · $20.900 + IVA",
    stock: "Entrega 48h",
    tags: ["Hipoalergénico", "Pack curado"],
    image:
      "https://images.unsplash.com/photo-1652865866859-3913fe2d2406?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "kit-vitrina",
    name: "Kit Vitrina Premium",
    description: "Set completo de 80 piezas + exhibidores y visuales impresos.",
    category: "Kits",
    price: 98500,
    pack: "Kit completo · $98.500 + IVA",
    stock: "Disponible",
    tags: ["Incluye displays", "QR reposición"],
    image:
      "https://images.unsplash.com/photo-1767210338407-54b9264c326b?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "acero-siena",
    name: "Argollas Acero Siena",
    description: "Aros hipoalergénicos con micro pavé cristal y cierre seguro.",
    category: "Aros",
    price: 13200,
    pack: "Pack x15 · $13.200 + IVA",
    stock: "Nuevo ingreso",
    tags: ["Garantía 90 días", "Stock permanente"],
    image:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "set-perlas",
    name: "Set Perlas Boreal",
    description: "Collar + aros con perlas eau y cadenas bañadas en oro.",
    category: "Sets",
    price: 23800,
    pack: "Pack x6 · $23.800 + IVA",
    stock: "En stock",
    tags: ["Perlas freshwater", "Gift box"],
    image:
      "https://images.unsplash.com/photo-1595345705177-ffe090eb0784?auto=format&fit=crop&w=1200&q=80",
  },
];

const priceFilters = [
  { id: "low", label: "Hasta $20.000", range: [0, 20000] as [number, number] },
  { id: "mid", label: "$20.000 - $30.000", range: [20000, 30000] as [number, number] },
  { id: "high", label: "Más de $30.000", range: [30000, Infinity] as [number, number] },
];

const categories = Array.from(new Set(products.map((p) => p.category)));

const formatPrice = (value: number) =>
  value.toLocaleString("es-AR", { style: "currency", currency: "ARS" });

export default function CatalogPage() {
  const [search, setSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [activePrice, setActivePrice] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchSearch =
        search.length === 0 ||
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.description.toLowerCase().includes(search.toLowerCase());

      const matchCategory =
        selectedCategories.length === 0 || selectedCategories.includes(product.category);

      const matchPrice = (() => {
        if (!activePrice) return true;
        const range = priceFilters.find((p) => p.id === activePrice)?.range;
        if (!range) return true;
        return product.price >= range[0] && product.price <= range[1];
      })();

      return matchSearch && matchCategory && matchPrice;
    });
  }, [search, selectedCategories, activePrice]);

  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .map(([id, quantity]) => {
        const product = products.find((p) => p.id === id);
        if (!product) {
          return null;
        }
        return { product, quantity, subtotal: product.price * quantity };
      })
      .filter(Boolean) as { product: Product; quantity: number; subtotal: number }[];
  }, [cart]);

  const cartTotal = cartItems.reduce((acc, item) => acc + item.subtotal, 0);

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((cat) => cat !== category) : [...prev, category],
    );
  };

  const handleAddToCart = (productId: string) => {
    setCart((prev) => ({ ...prev, [productId]: (prev[productId] ?? 0) + 1 }));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      const next = { ...prev };
      const newValue = (next[productId] ?? 0) + delta;
      if (newValue <= 0) {
        delete next[productId];
      } else {
        next[productId] = newValue;
      }
      return next;
    });
  };

  return (
    <div className="bg-[#f7f7f7]">
      <div className="relative isolate overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-[#111111] via-[#1f1f1f]/95 to-[#1f1f1f]/70" />
        <main className="relative mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-16 md:px-10">
          <section className="space-y-6 pb-6 text-white">
            <Badge variant="glow" className="bg-white/10 text-white">
              Catálogo mayorista
            </Badge>
            <div className="grid gap-2">
              <h1 className="text-4xl font-semibold leading-tight">
                Seleccioná packs, filtrá por categoría y levantá tu carrito mayorista.
              </h1>
              <p className="max-w-2xl text-lg text-white/80 drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)]">
                Todos los precios incluyen packaging listo para exhibir y etiquetas con precio
                sugerido. Coordinamos envíos a todo el país en 24/72 horas.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/40 bg-white/5 text-white hover:bg-white/15"
              >
                <Link href="/">Volver al home</Link>
              </Button>
              <Button
                size="lg"
                variant="muted"
              >
                Descargar lista completa
              </Button>
            </div>
          </section>

          <section className="grid gap-8 pt-6 lg:grid-cols-[280px_1fr]">
            <Card className="border-black/10 bg-white/90">
              <CardHeader>
                <CardTitle className="text-[#111111]">Filtros</CardTitle>
                <CardDescription className="text-[#444444]">
                  Ajustá la vista según tus necesidades.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b6b6b]">
                    Buscar
                  </p>
                  <input
                    type="text"
                    placeholder="Argollas, kits, perlas..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm text-[#111111] outline-none focus:border-black/50"
                  />
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b6b6b]">
                    Categorías
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((category) => {
                      const isActive = selectedCategories.includes(category);
                      return (
                        <button
                          key={category}
                          onClick={() => toggleCategory(category)}
                          className={`rounded-full border px-3 py-1 text-sm transition ${
                            isActive
                              ? "border-[#111111] bg-[#111111] text-white"
                              : "border-black/10 bg-white text-[#444444] hover:border-black/20"
                          }`}
                        >
                          {category}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b6b6b]">
                    Precio
                  </p>
                  <div className="flex flex-col gap-2">
                    {priceFilters.map((option) => {
                      const isActive = option.id === activePrice;
                      return (
                        <button
                          key={option.id}
                          onClick={() =>
                            setActivePrice((prev) => (prev === option.id ? null : option.id))
                          }
                          className={`rounded-2xl border px-4 py-2 text-left text-sm transition ${
                            isActive
                              ? "border-[#ff2d55] bg-[#ffe1e8] text-[#111111]"
                              : "border-black/10 bg-white text-[#444444] hover:border-black/20"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {(search || selectedCategories.length > 0 || activePrice) && (
                  <Button
                    variant="ghost"
                    className="w-full justify-center text-[#444444] hover:bg-[#f0f0f0]"
                    onClick={() => {
                      setSearch("");
                      setSelectedCategories([]);
                      setActivePrice(null);
                    }}
                  >
                    Limpiar filtros
                  </Button>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <p className="text-sm text-[#6b6b6b]">
                  {filteredProducts.length} resultados ·{" "}
                  <span className="font-medium text-[#111111]">
                    {selectedCategories.length > 0
                      ? selectedCategories.join(" · ")
                      : "Todas las categorías"}
                  </span>
                </p>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                {filteredProducts.map((product) => {
                  const quantityInCart = cart[product.id] ?? 0;
                  return (
                    <Card key={product.id} className="flex flex-col overflow-hidden">
                      <div className="relative h-56 w-full">
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          sizes="(min-width: 768px) 40vw, 92vw"
                          className="object-cover"
                        />
                        <div className="absolute left-4 top-4 flex gap-2">
                          <Badge variant="outline" className="bg-white/90">
                            {product.category}
                          </Badge>
                          <Badge variant="glow" className="bg-[#111111]/90 text-white">
                            {product.stock}
                          </Badge>
                        </div>
                      </div>
                      <CardHeader className="space-y-2">
                        <CardTitle className="text-[#111111]">{product.name}</CardTitle>
                        <CardDescription className="text-[#444444]">
                          {product.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-1 flex-col gap-4">
                        <div className="flex flex-wrap gap-2">
                          {product.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-[#f0f0f0] px-3 py-1 text-xs text-[#444444]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className="mt-auto flex items-center justify-between">
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-[#6b6b6b]">
                              {product.pack}
                            </p>
                            <p className="text-2xl font-semibold text-[#111111]">
                              {formatPrice(product.price)}
                            </p>
                          </div>
                          <Button
                            size="lg"
                            variant="outline"
                            className="border-black/20 text-[#111111] hover:border-black/30 hover:bg-[#f7f7f7]"
                            onClick={() => handleAddToCart(product.id)}
                          >
                            Añadir
                            {quantityInCart > 0 && (
                              <span className="ml-2 rounded-full bg-black/10 px-2 py-0.5 text-xs">
                                {quantityInCart}
                              </span>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </section>

          <section id="cart" className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <Card className="border-black/10 bg-white/90">
              <CardHeader>
                <CardTitle className="text-[#111111]">¿Cómo seguimos?</CardTitle>
                <CardDescription>
                  Sumá productos al carrito y luego envianos el listado por WhatsApp o email para
                  confirmar stock y envío.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-[#444444]">
                <p>
                  Cuando confirmemos tu orden enviamos un link de pago o factura electrónica. El
                  pedido se arma en 24/48h y despachamos con tu logística habitual o la nuestra.
                </p>
                <p>
                  Si necesitás sugerencias de mix, escribinos y armamos un carrito pre-curado según tu
                  ticket promedio, geografía y tipo de negocio.
                </p>
              </CardContent>
            </Card>

            <Card className="sticky top-10 h-fit border-black/10 bg-white/95 shadow-[0_22px_60px_rgba(0,0,0,0.12)]">
              <CardHeader className="space-y-1">
                <CardTitle className="text-[#111111]">Carrito mayorista</CardTitle>
                <CardDescription className="text-[#444444]">
                  {cartItems.length === 0
                    ? "Aún no agregaste productos."
                    : `${cartItems.length} referencias seleccionadas.`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {cartItems.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-black/10 px-4 py-6 text-sm text-[#6b6b6b]">
                    Seleccioná los packs que quieras cotizar y aparecerán acá para enviarlos al team
                    comercial.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cartItems.map(({ product, quantity }) => (
                      <div
                        key={product.id}
                        className="flex items-start justify-between rounded-2xl border border-black/10 bg-[#f5f5f5] p-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-[#111111]">{product.name}</p>
                          <p className="text-xs text-[#6b6b6b]">{product.pack}</p>
                          <p className="text-sm text-[#444444]">
                            {formatPrice(product.price)} · {quantity} uds
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQuantity(product.id, -1)}
                            className="h-7 w-7 rounded-full border border-black/10 bg-white text-sm font-semibold text-[#444444]"
                          >
                            -
                          </button>
                          <span className="px-2 text-sm font-semibold">{quantity}</span>
                          <button
                            onClick={() => updateQuantity(product.id, 1)}
                            className="h-7 w-7 rounded-full border border-black/10 bg-white text-sm font-semibold text-[#444444]"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="rounded-2xl bg-[#111111] px-4 py-5 text-white">
                  <div className="flex items-center justify-between text-sm text-white/70">
                    <span>Subtotal estimado</span>
                    <span>{formatPrice(cartTotal)}</span>
                  </div>
                  <div className="mt-4 flex flex-col gap-3 text-sm">
                    <Button
                      asChild
                      size="lg"
                      variant="muted"
                      className="w-full justify-center"
                      disabled={cartItems.length === 0}
                    >
                      <Link
                        href={
                          cartItems.length === 0
                            ? "#cart"
                            : `mailto:hola@aurelia.com?subject=Pedido mayorista&body=${encodeURIComponent(
                                `Hola Aurelia, quiero confirmar estos packs:\n\n${cartItems
                                  .map(
                                    (item) =>
                                      `- ${item.product.name} x${item.quantity} (${item.product.pack})`,
                                  )
                                  .join("\n")}\n\nSubtotal estimado: ${formatPrice(cartTotal)}.`,
                              )}`
                        }
                      >
                        Solicitar pedido
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="w-full justify-center border-white/40 bg-white/10 text-white hover:bg-white/20"
                      disabled={cartItems.length === 0}
                    >
                      <Link
                        href={
                          cartItems.length === 0
                            ? "#cart"
                            : `https://wa.me/5491112345678?text=${encodeURIComponent(
                                `Hola! Quiero pedir:\n${cartItems
                                  .map(
                                    (item) =>
                                      `• ${item.product.name} x${item.quantity} (${item.product.pack})`,
                                  )
                                  .join("\n")}\nSubtotal estimado: ${formatPrice(cartTotal)}.`,
                              )}`
                        }
                      >
                        Enviar por WhatsApp
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </main>
      </div>
    </div>
  );
}
