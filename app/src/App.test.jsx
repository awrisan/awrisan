import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App.jsx";
import { initialDemoState } from "./demo-state.jsx";

/**
 * This file mocked neither fetch nor the SDK, and DemoProvider's connect effect
 * runs on every render — so every test here was reaching the real internet.
 * Measured, not deduced: one render fired 1 request at /api/stellar/status and
 * then 29 live simulateTransaction POSTs at soroban-testnet.stellar.org, and
 * settled on `mode: "readonly"` with the 7 real rooms of the live contract merged
 * into its state. Eight tests, on every run, from a suite whose subject is a
 * landing page and two hand-written demo rooms.
 *
 * That makes this file's colour depend on a public RPC's uptime, its rate limit,
 * and what the testnet contract happens to hold today — none of which any
 * assertion below is about. It is also live: mergeStellarRooms drops a local room
 * whose id collides with a chain one, and the dissolved-room test seats
 * "stellar-9" by hand. The contract has 7 rooms. At 9 that test starts losing its
 * own fixture to whatever the chain says, for reasons nothing in it mentions.
 *
 * So: no gateway (a static host's SPA shell, which is what the public build gets
 * on /api/*) and no reachable RPC. That is `mode: "local"` — this app with
 * nothing behind it, which is precisely the world these tests describe. The
 * readonly-* files own the with-a-chain world, and they stub the transport.
 */
vi.mock("./stellar-rpc.js", () => ({
  isRpcConfigured: () => true,
  readStatus: async () => { throw new Error("RPC tidak dapat dihubungi"); },
  readRooms: async () => { throw new Error("RPC tidak dapat dihubungi"); },
}));

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
    "<!doctype html><html><body><div id=\"root\"></div></body></html>",
    { status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
  )));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

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
    expect(screen.getByRole("heading", { name: "Riwayat pemenang" })).toBeInTheDocument();
    expect(screen.getByText("Putaran 1, 27 Juni 2026, 19.08")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Tambahkan jadwal kocok ke Google Calendar/i })).toHaveAttribute("href", expect.stringContaining("calendar.google.com"));
  });

  it("requires an agreed draw schedule and formats the room contribution", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/app/buat-room");
    render(<App />);

    const dateInput = screen.getByLabelText("Tanggal dan waktu kocok pertama");
    expect(dateInput).toHaveAttribute("type", "datetime-local");
    const defaultDelay = new Date(dateInput.value).getTime() - Date.now();
    expect(defaultDelay).toBeGreaterThan(75_000);
    expect(defaultDelay).toBeLessThanOrEqual(4 * 60_000);
    expect(screen.getByRole("button", { name: "Demo cepat, +3 menit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Besok, 19.00" })).toBeInTheDocument();

    const consent = screen.getByRole("checkbox", { name: /Jadwal sudah disepakati anggota/i });
    expect(consent).toHaveAttribute("aria-checked", "false");
    await user.click(consent);
    await user.click(screen.getByRole("button", { name: "Lanjutkan" }));

    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByLabelText("Setoran per anggota dalam Rupiah")).toHaveValue("1.000.000");
    await user.click(screen.getByRole("button", { name: "Tambah anggota" }));
    expect(screen.getByText("6")).toBeInTheDocument();
  });

  /**
   * DELETED with this change: "tells a dissolved room what happened, instead of a
   * bare badge over an empty panel".
   *
   * It seeded a hand-written chain room (source "stellar", status "dissolved")
   * into localStorage and asserted the room detail explained it. Both halves of
   * that are gone on purpose, and neither can be repaired here:
   *
   *   - readState now drops every saved chain room (demo-state.jsx:192-194). The
   *     replay it depended on was the last way a chain room reached AppPages
   *     without a chain read, and it was removed because a cached chain room is
   *     one this app can no longer verify.
   *   - AppPages has no `dissolved` branch any more, correctly: only the chain
   *     produces that status (grep the gateway for it: 0 hits), and the chain now
   *     renders in app/src/chain/.
   *
   * The sentences it pinned — cancel_room refunds everyone, a dissolved room runs
   * no further round — are owed by the new view, and chain-sentences.test.js is
   * where they are now stated against lib.rs. Restoring this test would mean
   * putting a dead branch back into AppPages to keep it green.
   */

  it("shows a deterministic final recipient instead of pretending to shuffle one name", () => {
    const finalRoom = {
      id: "final-round",
      code: "FINAL-3",
      name: "Arisan Final",
      host: "Dina Prameswari",
      contribution: 1000000,
      memberLimit: 3,
      paidCount: 3,
      pool: 3000000,
      round: 3,
      nextKocok: Math.floor(Date.now() / 1000) - 1,
      scheduleAgreed: true,
      cadenceSeconds: 60,
      status: "sealed",
      source: "local",
      history: [
        { round: 1, winner: "Dina Prameswari" },
        { round: 2, winner: "Rani Wulandari" },
      ],
      members: [
        { id: "final-1", name: "Dina Prameswari", amount: 1000000, paid: true },
        { id: "final-2", name: "Rani Wulandari", amount: 1000000, paid: true },
        { id: "final-3", name: "Sari Kusuma", amount: 1000000, paid: true },
      ],
    };
    localStorage.setItem("awrisan-demo-v6", JSON.stringify({ ...initialDemoState, rooms: [finalRoom] }));
    window.history.pushState({}, "", "/app/room/final-round/kocok");

    render(<App />);

    expect(screen.getByRole("heading", { name: "Giliran terakhir sudah pasti." })).toBeInTheDocument();
    expect(screen.getByText("Sari Kusuma")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Selesaikan putaran dan bayar" })).toBeInTheDocument();
    expect(screen.queryByText("Semua nama punya peluang yang sama.")).not.toBeInTheDocument();
    localStorage.removeItem("awrisan-demo-v6");
  });
});
