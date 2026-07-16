import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { describe, expect, it } from "vitest";
import {
  CONTRACT_ERROR,
  SAC_MAX_CODE,
  contractErrorCode,
  transactionError,
} from "./contract-errors.mjs";

const CONTRACT_SRC = path.join("contracts", "arisan_rooms", "src", "lib.rs");

/** Walk up from the working directory until we find the contract source. */
function findLibRs() {
  let dir = process.cwd();
  for (let i = 0; i < 6; i += 1) {
    const candidate = path.join(dir, CONTRACT_SRC);
    if (existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`could not locate ${CONTRACT_SRC} from ${process.cwd()}`);
}

/** Read `enum Error { NotYet = 10, ... }` straight out of the contract source. */
function contractErrorsFromRust() {
  const src = readFileSync(findLibRs(), "utf8");
  const block = src.match(/pub enum Error \{([\s\S]*?)\n\}/);
  if (!block) throw new Error("could not find `pub enum Error` in lib.rs");
  const out = {};
  // Anchor to line starts, or a doc comment like `/// was = 11, before` gets
  // scraped as a phantom variant and the drift guard cries wolf.
  for (const [, name, code] of block[1].matchAll(/^\s*(\w+)\s*=\s*(\d+),/gm)) {
    out[name] = Number(code);
  }
  return out;
}

const normalize = (name) => name.toUpperCase().replaceAll("_", "");

describe("contract error codes stay in sync with the contract", () => {
  // The CLI only ever hands us a number. If lib.rs renumbers an error and this
  // map does not follow, the gateway tells the user something that is simply
  // untrue, and it does it confidently. That is worse than saying nothing.
  it("matches every discriminant in contracts/arisan_rooms/src/lib.rs", () => {
    const rust = contractErrorsFromRust();
    const rustByName = Object.fromEntries(
      Object.entries(rust).map(([k, v]) => [normalize(k), v])
    );
    const gatewayByName = Object.fromEntries(
      Object.entries(CONTRACT_ERROR).map(([k, v]) => [normalize(k), v])
    );
    expect(gatewayByName).toEqual(rustByName);
  });

  it("gives every contract error a human sentence once the token is ruled out", () => {
    for (const code of Object.values(CONTRACT_ERROR)) {
      const text = transactionError({ message: `Error(Contract, #${code})` }, { trusted: true });
      expect(text).not.toMatch(/Error\(Contract/);
      expect(text.length).toBeGreaterThan(8);
    }
  });
});

describe("contractErrorCode", () => {
  it("pulls the code out of CLI stderr", () => {
    expect(contractErrorCode("host error: Error(Contract, #13)")).toBe(13);
    expect(contractErrorCode("Error(Contract, #7)")).toBe(7);
  });

  it("returns null when this was not a contract error", () => {
    expect(contractErrorCode("connection refused")).toBeNull();
    expect(contractErrorCode("")).toBeNull();
    expect(contractErrorCode(null)).toBeNull();
    expect(contractErrorCode(undefined)).toBeNull();
  });

  it("does not confuse #1 with #13", () => {
    // A substring match on "#1" would happily swallow "#13". Regression guard.
    expect(contractErrorCode("Error(Contract, #13)")).toBe(13);
    expect(contractErrorCode("Error(Contract, #1)")).toBe(1);
  });
});

describe("the token shares the code space, so do not guess", () => {
  // The native Stellar Asset Contract's ContractError runs 1..13 and reaches
  // the CLI as the same `Error(Contract, #N)`. BalanceError is 10; so is our
  // NotYet. A member whose testnet account is empty hits this on create_room,
  // which has no schedule component at all.
  const TOKEN = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
  const sacBalanceError = [
    "error: transaction simulation failed: host invocation failed",
    "",
    "Caused by:",
    "    HostError: Error(Contract, #10)",
    "",
    "    Event log (newest first):",
    '       0: [Diagnostic Event] topics:[error, Error(Contract, #10)], data:["escalating error to panic", "transfer"]',
    `       1: [Diagnostic Event] contract:${TOKEN}, topics:[fn_call, ...]`,
  ].join("\n");

  it("does not call a token BalanceError a scheduling problem", () => {
    const text = transactionError({ message: sacBalanceError }, { tokenId: TOKEN });
    expect(text).not.toContain("Jadwal kocok belum tiba");
    expect(text).toContain("#10");
  });

  it("still explains our own #10 when the token is not in the failure", () => {
    const ours = "HostError: Error(Contract, #10)\n  Event log: contract:CDTNEK4EXYCEZY6XF5MZHQ7C7GBOYYVYR4MBS6D32LPP5OG2L2L4CIDX";
    expect(transactionError({ message: ours }, { tokenId: TOKEN })).toBe(
      "Jadwal kocok belum tiba."
    );
  });

  it("refuses to guess when it has no token id to rule out", () => {
    // No tokenId means the token cannot be excluded, so say the true thing.
    expect(transactionError({ message: "Error(Contract, #10)" })).toContain("#10");
  });

  it("trusts codes from a call that provably never reaches the token", () => {
    // seal_kocok holds no token::Client call, so its codes are unambiguous.
    expect(transactionError({ message: "Error(Contract, #13)" }, { trusted: true })).toBe(
      "Ronde ini sudah diundi sebelumnya."
    );
  });

  it("treats 14 as ours even unattributed, because the token's enum stops at 13", () => {
    expect(CONTRACT_ERROR.JOIN_CLOSED).toBe(14);
    expect(SAC_MAX_CODE).toBe(13);
    expect(transactionError({ message: "Error(Contract, #14)" })).toBe(
      "Pendaftaran room sudah ditutup."
    );
  });
});

describe("transactionError, regression for the two mis-mapped codes", () => {
  // Bug 1: "Jadwal kocok belum tiba" was wired to #12 (NotSealed). The contract
  // raises #10 (NotYet) when the schedule has not arrived. So the one message a
  // user actually hits was unreachable, and #12 lied to them.
  it("maps #10 NotYet to the schedule message", () => {
    expect(CONTRACT_ERROR.NOT_YET).toBe(10);
    expect(transactionError({ message: "Error(Contract, #10)" }, { trusted: true })).toBe(
      "Jadwal kocok belum tiba."
    );
  });

  it("does not tell a NotSealed user their schedule has not arrived", () => {
    expect(CONTRACT_ERROR.NOT_SEALED).toBe(12);
    const text = transactionError({ message: "Error(Contract, #12)" }, { trusted: true });
    expect(text).not.toContain("Jadwal kocok belum tiba");
    expect(text).toContain("kocok");
  });

  // Bug 2: the seal step tolerated #11 (AlreadyPostponed) when it meant to
  // tolerate #13 (AlreadySealed). An already-sealed round therefore threw the
  // raw stderr and the room could never be drawn again: permanent jam, on the
  // exact path a retry takes.
  it("keeps AlreadySealed at 13, distinct from AlreadyPostponed at 11", () => {
    expect(CONTRACT_ERROR.ALREADY_SEALED).toBe(13);
    expect(CONTRACT_ERROR.ALREADY_POSTPONED).toBe(11);
    expect(CONTRACT_ERROR.ALREADY_SEALED).not.toBe(CONTRACT_ERROR.ALREADY_POSTPONED);
  });

  it("passes non-contract failures through untouched", () => {
    expect(transactionError({ message: "spawn stellar ENOENT" })).toBe(
      "spawn stellar ENOENT"
    );
  });

  it("falls back to a labelled code for an error it does not know", () => {
    expect(transactionError({ message: "Error(Contract, #99)" })).toContain("#99");
  });

  it("survives a missing message", () => {
    expect(transactionError({})).toBe("Transaksi Testnet gagal.");
    expect(transactionError(null)).toBe("Transaksi Testnet gagal.");
  });
});
