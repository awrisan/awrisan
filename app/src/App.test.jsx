import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App.jsx";

describe("Awrisan local prototype", () => {
  it("shows the culture-first landing proposition", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Arisan yang tidak bisa dibawa kabur." })).toBeInTheDocument();
    expect(screen.getByText(/Arisan adalah cara orang Indonesia menjaga hubungan tetap hidup/i)).toBeInTheDocument();
  });

  it("explains the two anti-abscond risks and the prefund tradeoff", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/");
    render(<App />);

    expect(screen.getByRole("heading", { name: "Uang arisan masuk ke rekening bendahara" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Menang bulan pertama tanpa meninggalkan kekurangan" })).toBeInTheDocument();
    expect(screen.getByText(/Bendahara tidak memegang uang/i)).toBeInTheDocument();

    const smartContractInfo = screen.getByLabelText("Apa itu smart contract?");
    expect(smartContractInfo.parentElement).not.toHaveAttribute("open");
    await user.click(smartContractInfo);
    expect(smartContractInfo.parentElement).toHaveAttribute("open");
    expect(screen.getByText(/program otomatis di blockchain/i)).toBeInTheDocument();

    const summary = screen.getByText("Konsekuensinya").closest("summary");
    expect(summary.parentElement).not.toHaveAttribute("open");
    await user.click(summary);
    expect(summary.parentElement).toHaveAttribute("open");
    expect(screen.getByText(/Pilihan mencicil sebelum kocok belum tersedia/i)).toBeInTheDocument();
  });

  it("opens the sandbox sign-in flow from the primary call to action", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getAllByRole("link", { name: /Coba di testnet/i })[0]);
    expect(screen.getByRole("heading", { name: "Selamat datang di Awrisan" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("dina@awrisan.test")).toBeInTheDocument();
  });

  it("exposes the onboarding consent state to assistive technology", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/");
    render(<App />);
    await user.click(screen.getAllByRole("link", { name: /Coba di testnet/i })[0]);
    await user.click(screen.getByRole("button", { name: "Lanjutkan" }));
    await screen.findByRole("heading", { name: "Kenali akun demo Anda" });
    await user.click(screen.getByRole("button", { name: "Lanjutkan" }));

    const consent = screen.getByRole("checkbox");
    expect(consent).toHaveAttribute("aria-checked", "false");
    expect(consent).toHaveAccessibleName(/Belum dipilih/i);
    await user.click(consent);
    expect(consent).toHaveAttribute("aria-checked", "true");
    expect(consent).toHaveAccessibleName(/Dipilih/i);
  });

  it("renders the ready demo room with transparent contribution status", () => {
    window.history.pushState({}, "", "/app/room/rt-08");
    render(<App />);
    expect(screen.getByRole("heading", { name: "Arisan RT 08", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("10 dari 10 anggota sudah setor")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Kunci room/i })).toBeInTheDocument();
  });
});
