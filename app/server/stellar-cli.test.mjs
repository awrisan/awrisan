import { describe, expect, it } from "vitest";
import { extractTransactionId, parseCliValue, stellarCommandArgs } from "./stellar-cli.mjs";

describe("Stellar CLI output helpers", () => {
  it("extracts the last transaction hash from CLI logs", () => {
    const first = "a".repeat(64);
    const last = "b".repeat(64);
    expect(extractTransactionId(`submitted ${first}\nconfirmed ${last}`)).toBe(last);
  });

  it("parses JSON and plain contract values", () => {
    expect(parseCliValue("3")).toBe(3);
    expect(parseCliValue('"GTEST"')).toBe("GTEST");
    expect(parseCliValue("CTEST")).toBe("CTEST");
  });

  it("places the global config option before the Stellar subcommand", () => {
    expect(stellarCommandArgs(["contract", "invoke", "--", "create_room"], ".stellar")).toEqual([
      "--config-dir",
      ".stellar",
      "contract",
      "invoke",
      "--",
      "create_room",
    ]);
  });
});
