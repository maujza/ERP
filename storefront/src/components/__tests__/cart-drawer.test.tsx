import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MiniCartDrawer, CartToast } from "../cart-drawer";
import type { CartLineItem } from "../cart-provider";

// ---------------------------------------------------------------------------
// Next.js mocks
// ---------------------------------------------------------------------------
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    onClick,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <a href={href} onClick={onClick} className={className}>
      {children}
    </a>
  ),
}));

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// ---------------------------------------------------------------------------
// Language provider mock (mutable via closure)
// ---------------------------------------------------------------------------
const { mockLang } = vi.hoisted(() => ({ mockLang: { current: "es" as "es" | "ko" } }));

vi.mock("@/components/language-provider", () => ({
  useLanguage: () => ({
    language: mockLang.current,
    toggleLanguage: vi.fn(),
    setLanguage: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Cart provider mock (mutable state)
// ---------------------------------------------------------------------------
const mockCloseDrawer = vi.fn();
const mockUpdateQuantity = vi.fn();
const mockRemoveFromCart = vi.fn();
const mockClearCart = vi.fn();

let mockItems: CartLineItem[] = [];
let mockIsDrawerOpen = true;
let mockSubtotal = 0;

vi.mock("@/components/cart-provider", () => ({
  useCart: () => ({
    get items() { return mockItems; },
    get isDrawerOpen() { return mockIsDrawerOpen; },
    get subtotal() { return mockSubtotal; },
    closeDrawer: mockCloseDrawer,
    updateQuantity: mockUpdateQuantity,
    removeFromCart: mockRemoveFromCart,
    clearCart: mockClearCart,
  }),
}));

// ---------------------------------------------------------------------------
// Medusa SDK mock (for customer.retrieve used in checkout gating)
// ---------------------------------------------------------------------------
const mockCustomerRetrieve = vi.fn();
vi.mock("@/lib/medusa", () => ({
  sdk: {
    store: {
      customer: {
        retrieve: (...args: unknown[]) => mockCustomerRetrieve(...args),
      },
    },
  },
}));

// ---------------------------------------------------------------------------
// SafeImage mock (avoids Next.js Image issues in jsdom)
// ---------------------------------------------------------------------------
vi.mock("@/components/safe-image", () => ({
  SafeImage: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

// ---------------------------------------------------------------------------
// shop-data mock
// ---------------------------------------------------------------------------
vi.mock("@/lib/shop-data", () => ({
  formatArs: (amount: number) => `$ ${amount.toLocaleString("es-AR")}`,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeLineItem(overrides: Partial<CartLineItem> = {}): CartLineItem {
  return {
    id: "line_1",
    title: "Aro Dorado",
    variantTitle: "Talle único",
    quantity: 1,
    unitPrice: 15000,
    thumbnail: "/aro.jpg",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// MiniCartDrawer – structural rendering
// ---------------------------------------------------------------------------
describe("MiniCartDrawer – empty cart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLang.current = "es";
    mockItems = [];
    mockIsDrawerOpen = true;
    mockSubtotal = 0;
    mockCustomerRetrieve.mockResolvedValue({ customer: { id: "cust_1" } });
  });

  it("renders the cart heading in Spanish", () => {
    render(<MiniCartDrawer />);
    expect(screen.getByText("Carrito")).toBeInTheDocument();
  });

  it("renders the close button with accessible label", () => {
    render(<MiniCartDrawer />);
    expect(screen.getByLabelText("Cerrar carrito")).toBeInTheDocument();
  });

  it("shows the empty state message in Spanish", () => {
    render(<MiniCartDrawer />);
    expect(screen.getByText("Tu carrito esta vacio.")).toBeInTheDocument();
  });

  it("shows 'Volver al home' link when cart is empty", () => {
    render(<MiniCartDrawer />);
    expect(screen.getByRole("link", { name: "Volver al home" })).toBeInTheDocument();
  });

  it("shows subtotal of 0 when cart is empty", () => {
    render(<MiniCartDrawer />);
    expect(screen.getByText("Subtotal")).toBeInTheDocument();
  });

  it("'Vaciar carrito' button is disabled when cart is empty", () => {
    render(<MiniCartDrawer />);
    expect(screen.getByRole("button", { name: "Vaciar carrito" })).toBeDisabled();
  });

  it("closes drawer when close button is clicked", () => {
    render(<MiniCartDrawer />);
    fireEvent.click(screen.getByLabelText("Cerrar carrito"));
    expect(mockCloseDrawer).toHaveBeenCalledTimes(1);
  });

  it("closes drawer when backdrop is clicked", () => {
    render(<MiniCartDrawer />);
    // Backdrop is the first fixed inset-0 div
    const backdrop = document.querySelector(".fixed.inset-0.z-\\[70\\]")!;
    fireEvent.click(backdrop);
    expect(mockCloseDrawer).toHaveBeenCalledTimes(1);
  });

  it("aside is translated in when isDrawerOpen=true", () => {
    render(<MiniCartDrawer />);
    const aside = document.querySelector("aside")!;
    expect(aside).toHaveClass("translate-x-0");
  });

  it("aside is translated out when isDrawerOpen=false", () => {
    mockIsDrawerOpen = false;
    render(<MiniCartDrawer />);
    const aside = document.querySelector("aside")!;
    expect(aside).toHaveClass("translate-x-full");
  });
});

// ---------------------------------------------------------------------------
// MiniCartDrawer – cart with items
// ---------------------------------------------------------------------------
describe("MiniCartDrawer – cart with items", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLang.current = "es";
    mockItems = [makeLineItem()];
    mockIsDrawerOpen = true;
    mockSubtotal = 15000;
    mockCustomerRetrieve.mockResolvedValue({ customer: { id: "cust_1" } });
  });

  it("renders the item title", () => {
    render(<MiniCartDrawer />);
    expect(screen.getByText("Aro Dorado")).toBeInTheDocument();
  });

  it("renders the item variant title", () => {
    render(<MiniCartDrawer />);
    expect(screen.getByText("Talle único")).toBeInTheDocument();
  });

  it("does not render a variant title element when variantTitle is undefined", () => {
    mockItems = [makeLineItem({ variantTitle: undefined })];
    render(<MiniCartDrawer />);
    expect(screen.queryByText("Talle único")).not.toBeInTheDocument();
  });

  it("renders the item image when thumbnail is provided", () => {
    render(<MiniCartDrawer />);
    expect(screen.getByAltText("Aro Dorado")).toBeInTheDocument();
  });

  it("does not render an img tag when thumbnail is undefined", () => {
    mockItems = [makeLineItem({ thumbnail: undefined })];
    render(<MiniCartDrawer />);
    expect(screen.queryByAltText("Aro Dorado")).not.toBeInTheDocument();
  });

  it("'Vaciar carrito' button is enabled when cart has items", () => {
    render(<MiniCartDrawer />);
    expect(screen.getByRole("button", { name: "Vaciar carrito" })).not.toBeDisabled();
  });

  it("calls clearCart when 'Vaciar carrito' is clicked", () => {
    render(<MiniCartDrawer />);
    fireEvent.click(screen.getByRole("button", { name: "Vaciar carrito" }));
    expect(mockClearCart).toHaveBeenCalledTimes(1);
  });

  it("calls removeFromCart with the line item ID when the X button is clicked", () => {
    render(<MiniCartDrawer />);
    fireEvent.click(screen.getByLabelText("Quitar producto"));
    expect(mockRemoveFromCart).toHaveBeenCalledWith("line_1");
  });

  it("calls updateQuantity with decreased quantity when − button is clicked", () => {
    mockItems = [makeLineItem({ quantity: 3 })];
    render(<MiniCartDrawer />);
    // First button after the remove (X) button is the − quantity button
    const decreaseBtn = screen.getAllByRole("button").find((btn) => btn.textContent === "-");
    fireEvent.click(decreaseBtn!);
    expect(mockUpdateQuantity).toHaveBeenCalledWith("line_1", 2);
  });

  it("calls updateQuantity with increased quantity when + button is clicked", () => {
    mockItems = [makeLineItem({ quantity: 3 })];
    render(<MiniCartDrawer />);
    const increaseBtn = screen.getAllByRole("button").find((btn) => btn.textContent === "+");
    fireEvent.click(increaseBtn!);
    expect(mockUpdateQuantity).toHaveBeenCalledWith("line_1", 4);
  });

  it("closes the drawer when 'Continuar comprando' is clicked", () => {
    render(<MiniCartDrawer />);
    fireEvent.click(screen.getByRole("button", { name: "Continuar comprando" }));
    expect(mockCloseDrawer).toHaveBeenCalledTimes(1);
  });

  it("does not show the empty state message when cart has items", () => {
    render(<MiniCartDrawer />);
    expect(screen.queryByText("Tu carrito esta vacio.")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// MiniCartDrawer – checkout flow (authenticated user)
// ---------------------------------------------------------------------------
describe("MiniCartDrawer – checkout, authenticated user", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLang.current = "es";
    mockItems = [makeLineItem()];
    mockIsDrawerOpen = true;
    mockSubtotal = 15000;
    mockCustomerRetrieve.mockResolvedValue({ customer: { id: "cust_1" } });
  });

  it("navigates to /checkout and closes drawer when user is authenticated", async () => {
    render(<MiniCartDrawer />);
    fireEvent.click(screen.getByRole("button", { name: "Finalizar compra" }));
    await waitFor(() => {
      expect(mockCloseDrawer).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith("/checkout");
    });
  });
});

// ---------------------------------------------------------------------------
// MiniCartDrawer – checkout flow (unauthenticated user → modal)
// ---------------------------------------------------------------------------
describe("MiniCartDrawer – checkout, unauthenticated user (checkout choice modal)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLang.current = "es";
    mockItems = [makeLineItem()];
    mockIsDrawerOpen = true;
    mockSubtotal = 15000;
    mockCustomerRetrieve.mockRejectedValue(new Error("Unauthorized (401)"));
  });

  it("shows the checkout choice modal when customer retrieve fails", async () => {
    render(<MiniCartDrawer />);
    fireEvent.click(screen.getByRole("button", { name: "Finalizar compra" }));
    await screen.findByText("¿Cómo querés finalizar?");
  });

  it("shows 'Continuar sin cuenta' option in the modal", async () => {
    render(<MiniCartDrawer />);
    fireEvent.click(screen.getByRole("button", { name: "Finalizar compra" }));
    await screen.findByRole("button", { name: "Continuar sin cuenta" });
  });

  it("shows 'Entrar con mi cuenta' option in the modal", async () => {
    render(<MiniCartDrawer />);
    fireEvent.click(screen.getByRole("button", { name: "Finalizar compra" }));
    await screen.findByRole("button", { name: "Entrar con mi cuenta" });
  });

  it("navigates to /checkout?guest=1 when guest option is chosen", async () => {
    render(<MiniCartDrawer />);
    fireEvent.click(screen.getByRole("button", { name: "Finalizar compra" }));
    const guestBtn = await screen.findByRole("button", { name: "Continuar sin cuenta" });
    fireEvent.click(guestBtn);
    expect(mockPush).toHaveBeenCalledWith("/checkout?guest=1");
    expect(mockCloseDrawer).toHaveBeenCalledTimes(1);
  });

  it("navigates to /auth?next=/checkout when login option is chosen", async () => {
    render(<MiniCartDrawer />);
    fireEvent.click(screen.getByRole("button", { name: "Finalizar compra" }));
    const loginBtn = await screen.findByRole("button", { name: "Entrar con mi cuenta" });
    fireEvent.click(loginBtn);
    expect(mockPush).toHaveBeenCalledWith("/auth?next=/checkout");
    expect(mockCloseDrawer).toHaveBeenCalledTimes(1);
  });

  it("closes the modal when 'Cancelar' is clicked", async () => {
    render(<MiniCartDrawer />);
    fireEvent.click(screen.getByRole("button", { name: "Finalizar compra" }));
    const cancelBtn = await screen.findByRole("button", { name: "Cancelar" });
    fireEvent.click(cancelBtn);
    expect(screen.queryByText("¿Cómo querés finalizar?")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// MiniCartDrawer – Korean translations
// ---------------------------------------------------------------------------
describe("MiniCartDrawer – Korean translations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLang.current = "ko";
    mockItems = [];
    mockIsDrawerOpen = true;
    mockSubtotal = 0;
    mockCustomerRetrieve.mockResolvedValue({ customer: { id: "cust_1" } });
  });

  it("renders cart heading in Korean", () => {
    render(<MiniCartDrawer />);
    expect(screen.getByText("장바구니")).toBeInTheDocument();
  });

  it("renders empty cart message in Korean", () => {
    render(<MiniCartDrawer />);
    expect(screen.getByText("장바구니가 비어 있습니다.")).toBeInTheDocument();
  });

  it("renders 'Vaciar carrito' equivalent in Korean", () => {
    render(<MiniCartDrawer />);
    expect(screen.getByRole("button", { name: "장바구니 비우기" })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// CartToast – rendering
// ---------------------------------------------------------------------------
describe("CartToast – rendering", () => {
  const sampleItem: CartLineItem = {
    id: "line_toast",
    title: "Collar de Plata",
    variantTitle: "S",
    quantity: 1,
    unitPrice: 25000,
    thumbnail: "/collar.jpg",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLang.current = "es";
  });

  it("renders the item title", () => {
    const onDismiss = vi.fn();
    render(<CartToast item={sampleItem} onDismiss={onDismiss} />);
    expect(screen.getByText("Collar de Plata")).toBeInTheDocument();
  });

  it("renders the variant title when provided", () => {
    const onDismiss = vi.fn();
    render(<CartToast item={sampleItem} onDismiss={onDismiss} />);
    expect(screen.getByText("S")).toBeInTheDocument();
  });

  it("shows 'Agregado al carrito' in Spanish", () => {
    const onDismiss = vi.fn();
    render(<CartToast item={sampleItem} onDismiss={onDismiss} />);
    expect(screen.getByText("Agregado al carrito")).toBeInTheDocument();
  });

  it("shows dismiss button with accessible label 'Cerrar'", () => {
    const onDismiss = vi.fn();
    render(<CartToast item={sampleItem} onDismiss={onDismiss} />);
    expect(screen.getByLabelText("Cerrar")).toBeInTheDocument();
  });

  it("calls onDismiss when dismiss button is clicked", () => {
    const onDismiss = vi.fn();
    render(<CartToast item={sampleItem} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByLabelText("Cerrar"));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("renders item thumbnail image", () => {
    const onDismiss = vi.fn();
    render(<CartToast item={sampleItem} onDismiss={onDismiss} />);
    expect(screen.getByAltText("Collar de Plata")).toBeInTheDocument();
  });

  it("does not render thumbnail img when thumbnail is undefined", () => {
    const onDismiss = vi.fn();
    render(<CartToast item={{ ...sampleItem, thumbnail: undefined }} onDismiss={onDismiss} />);
    expect(screen.queryByAltText("Collar de Plata")).not.toBeInTheDocument();
  });

  it("shows 'Agregado al carrito' in Korean", () => {
    mockLang.current = "ko";
    const onDismiss = vi.fn();
    render(<CartToast item={sampleItem} onDismiss={onDismiss} />);
    expect(screen.getByText("장바구니에 추가됨")).toBeInTheDocument();
  });

  it("shows Korean dismiss label", () => {
    mockLang.current = "ko";
    const onDismiss = vi.fn();
    render(<CartToast item={sampleItem} onDismiss={onDismiss} />);
    expect(screen.getByLabelText("닫기")).toBeInTheDocument();
  });
});
