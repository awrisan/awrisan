import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export function stellarCommandArgs(args, configDir) {
  return configDir ? ["--config-dir", configDir, ...args] : args;
}

export async function runStellar(args, { configDir, allowFailure = false } = {}) {
  const commandArgs = stellarCommandArgs(args, configDir);

  try {
    const result = await execFileAsync("stellar", commandArgs, {
      encoding: "utf8",
      maxBuffer: 4 * 1024 * 1024,
      windowsHide: true,
      timeout: 180_000,
    });
    return {
      ok: true,
      stdout: result.stdout.trim(),
      stderr: result.stderr.trim(),
      transactionId: extractTransactionId(result.stderr),
    };
  } catch (error) {
    const details = [error.stderr, error.stdout, error.message].filter(Boolean).join("\n").trim();
    if (allowFailure) {
      return { ok: false, stdout: "", stderr: details, transactionId: null };
    }
    throw new Error(details || "Stellar CLI command failed.");
  }
}

export function extractTransactionId(output = "") {
  const matches = output.match(/[a-f0-9]{64}/gi);
  return matches ? matches.at(-1).toLowerCase() : null;
}

export function parseCliValue(output) {
  const value = output.trim();
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value.replace(/^"|"$/g, "");
  }
}
