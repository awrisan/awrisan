import { afterEach, describe, expect, it, vi } from "vitest";
import { createStellarRoom, drawStellarRoom, getStellarStatus } from "./stellar-client.js";

afterEach(() => vi.unstubAllGlobals());

describe("Stellar gateway client", () => {
  it("reads the public contract status", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      connected: true,
      contractId: "CAWRISAN",
    }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getStellarStatus()).resolves.toMatchObject({ connected: true, contractId: "CAWRISAN" });
    expect(fetchMock).toHaveBeenCalledWith("/api/stellar/status", expect.any(Object));
  });

  it("sends room data only to the same-origin gateway", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "stellar-1" }), {
      status: 201,
      headers: { "content-type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await createStellarRoom({ name: "Arisan Sahabat", memberLimit: 3, contribution: 1_000_000 });
    expect(fetchMock).toHaveBeenCalledWith("/api/stellar/rooms", expect.objectContaining({ method: "POST" }));
  });

  it("surfaces the contract wait time", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: "Kocok tersedia dalam 20 detik.",
      waitSeconds: 20,
    }), { status: 409, headers: { "content-type": "application/json" } })));

    await expect(drawStellarRoom("stellar-1")).rejects.toMatchObject({
      message: "Kocok tersedia dalam 20 detik.",
      status: 409,
      waitSeconds: 20,
    });
  });
});
