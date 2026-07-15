import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { parseCliValue, runStellar } from "./stellar-cli.mjs";

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoDir = path.resolve(appDir, "..");
const stellarDir = path.join(repoDir, ".stellar");
const runtimePath = path.join(stellarDir, "awrisan-runtime.json");
const identities = [
  { alias: "awrisan-dina", name: "Dina Prameswari" },
  { alias: "awrisan-rani", name: "Rani Wulandari" },
  { alias: "awrisan-sari", name: "Sari Kusuma" },
];

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

async function ensureIdentity(identity) {
  const existing = await runStellar(["keys", "address", identity.alias], {
    configDir: stellarDir,
    allowFailure: true,
  });
  if (!existing.ok) {
    await runStellar([
      "keys",
      "generate",
      identity.alias,
      "--network",
      "testnet",
      "--fund",
    ], { configDir: stellarDir });
  }
  const address = await runStellar(["keys", "address", identity.alias], { configDir: stellarDir });
  return { ...identity, address: parseCliValue(address.stdout) };
}

async function readDeployment(deploymentPath) {
  if (!deploymentPath) return null;
  return JSON.parse(await readFile(path.resolve(deploymentPath), "utf8"));
}

async function main() {
  await mkdir(stellarDir, { recursive: true });
  const deployment = await readDeployment(argument("--deployment"));
  let contractId = argument("--contract-id") || process.env.AWRISAN_CONTRACT_ID || deployment?.contractId;
  let tokenId = deployment?.tokenId;

  const members = [];
  for (const identity of identities) members.push(await ensureIdentity(identity));

  if (!tokenId) {
    const token = await runStellar([
      "contract",
      "id",
      "asset",
      "--asset",
      "native",
      "--network",
      "testnet",
    ], { configDir: stellarDir });
    tokenId = parseCliValue(token.stdout);
  }

  if (!contractId) {
    const wasmPath = path.resolve(
      argument("--wasm") ||
      path.join(repoDir, "target", "wasm32v1-none", "release", "arisan_rooms.wasm"),
    );
    if (!existsSync(wasmPath)) {
      throw new Error("Contract WASM tidak ditemukan. Unduh artifact CI atau gunakan --deployment <deployment.json>.");
    }
    const deployed = await runStellar([
      "contract",
      "deploy",
      "--wasm",
      wasmPath,
      "--source",
      members[0].alias,
      "--network",
      "testnet",
    ], { configDir: stellarDir });
    contractId = parseCliValue(deployed.stdout);
    await runStellar([
      "contract",
      "invoke",
      "--id",
      contractId,
      "--source",
      members[0].alias,
      "--network",
      "testnet",
      "--",
      "initialize",
      "--token",
      tokenId,
    ], { configDir: stellarDir });
  }

  const runtime = {
    network: "testnet",
    rpcUrl: "https://soroban-testnet.stellar.org",
    explorerBaseUrl: "https://stellar.expert/explorer/testnet",
    contractId,
    tokenId,
    members,
    configuredAt: new Date().toISOString(),
  };
  await writeFile(runtimePath, `${JSON.stringify(runtime, null, 2)}\n`, "utf8");
  process.stdout.write(`Awrisan Testnet siap. Contract ID: ${contractId}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
