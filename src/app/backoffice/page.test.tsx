import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import BackofficePage from "./page";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
}));

vi.mock("@/components/language-provider", () => ({
  useLanguage: () => ({ language: "es" as const }),
}));

function openSection(label: string) {
  const sectionButtons = screen.getAllByRole("button", { name: label });
  fireEvent.click(sectionButtons[0]);
}

describe("BackofficePage contextual top actions", () => {
  it("shows both top actions in overview", () => {
    render(<BackofficePage />);
    expect(screen.getByRole("button", { name: "Descargar reporte" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Confirmar pedidos/i })).toBeInTheDocument();
  });

  it("hides both top actions in catalog", () => {
    render(<BackofficePage />);
    openSection("Catálogo");

    expect(screen.queryByRole("button", { name: "Descargar reporte" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Confirmar pedidos/i })).toBeNull();
  });

  it("shows only download action in stock", () => {
    render(<BackofficePage />);
    openSection("Stock");

    expect(screen.getByRole("button", { name: "Descargar reporte" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Confirmar pedidos/i })).toBeNull();
  });

  it("shows both actions in tracking", () => {
    render(<BackofficePage />);
    openSection("Seguimiento");

    expect(screen.getByRole("button", { name: "Descargar reporte" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Confirmar pedidos/i })).toBeInTheDocument();
  });

  it("hides both actions in pendings", () => {
    render(<BackofficePage />);
    openSection("Pendientes");

    expect(screen.queryByRole("button", { name: "Descargar reporte" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Confirmar pedidos/i })).toBeNull();
  });

  it("keeps support button text visible in dark sidebar", () => {
    render(<BackofficePage />);
    const supportLink = screen.getByRole("link", { name: "Contactar soporte" });
    const supportButton = supportLink.closest("button");

    expect(supportButton).not.toBeNull();
    expect(supportButton).toHaveClass("text-white");
    expect(supportButton).toHaveClass("bg-transparent");
  });
});
