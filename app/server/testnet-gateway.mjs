import { createReadStream, existsSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { parseCliValue, runStellar } from "./stellar-cli.mjs";

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoDir = path.resolve(appDir, "..");
const distDir = path.join(appDir, "dist");
const stellarDir = path.join(repoDir, ".stellar");
const runtimePath = path.join(stellarDir, "awrisan-runtime.json");
const roomsPath = path.join(stellarDir, "rooms.json");
const port = Number(process.env.PORT || 4173);
const shareStroops = 1_000_000;

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function sendJson(response, status, value) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(value));
}

async function bodyJson(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 64 * 1024) throw new Error("Request terlalu besar.");
  }
  return body ? JSON.parse(body) : {};
}

function publicRuntime(runtime) {
  if (!runtime?.contractId) {
    return {
      connected: false,
      mode: "local",
      network: "testnet",
      message: "Gateway aktif, tetapi contract Testnet belum dikonfigurasi.",
    };
  }
  return {
    connected: true,
    mode: "stellar",
    network: runtime.network,
    contractId: runtime.contractId,
    tokenId: runtime.tokenId,
    explorerBaseUrl: runtime.explorerBaseUrl,
    configuredAt: runtime.configuredAt,
    members: runtime.members.map(({ name, address }) => ({ name, address })),
  };
}

function inviteCode() {
  return `AWR${crypto.randomUUID().replaceAll("-", "").slice(0, 6)}`.toUpperCase();
}

function invokeArgs(runtime, source, functionName, values = []) {
  return [
    "contract",
    "invoke",
    "--id",
    runtime.contractId,
    "--source",
    source,
    "--network",
    "testnet",
    "--",
    functionName,
    ...values,
  ];
}

function transactionError(error) {
  const message = error.message || "Transaksi Testnet gagal.";
  if (message.includes("Error(Contract, #12)")) return "Jadwal kocok belum tiba.";
  if (message.includes("Error(Contract, #")) return `Kontrak menolak transaksi. ${message.match(/Error\(Contract, #\d+\)/)?.[0] || ""}`.trim();
  return message;
}

async function createRoom(payload, runtime) {
  const memberLimit = Number(payload.memberLimit);
  if (memberLimit !== runtime.members.length) {
    throw new Error(`Demo on-chain memakai tepat ${runtime.members.length} identitas sandbox.`);
  }
  const contribution = Number(payload.contribution);
  if (!payload.name || !Number.isFinite(contribution) || contribution < 10_000) {
    throw new Error("Nama dan nominal room tidak valid.");
  }

  const code = inviteCode();
  const now = Math.floor(Date.now() / 1000);
  const joinDeadline = now + 60;
  const firstKocok = now + 90;
  const host = runtime.members[0];
  const created = await runStellar(invokeArgs(runtime, host.alias, "create_room", [
    "--host", host.address,
    "--code", code,
    "--name", payload.name.slice(0, 40),
    "--member_target", String(memberLimit),
    "--share", String(shareStroops),
    "--cadence", "Weekly",
    "--first_kocok", String(firstKocok),
    "--join_deadline", String(joinDeadline),
  ]), { configDir: stellarDir });
  const chainRoomId = Number(parseCliValue(created.stdout));
  if (!Number.isInteger(chainRoomId)) throw new Error("Room ID dari kontrak tidak dapat dibaca.");

  for (const member of runtime.members.slice(1)) {
    await runStellar(invokeArgs(runtime, member.alias, "join_room", [
      "--room_id", String(chainRoomId),
      "--code", code,
      "--member", member.address,
    ]), { configDir: stellarDir });
  }

  const room = {
    id: `stellar-${chainRoomId}`,
    chainRoomId,
    code,
    name: payload.name.slice(0, 40),
    host: host.name,
    contribution,
    onChainShareStroops: shareStroops,
    memberLimit,
    paidCount: memberLimit,
    pool: contribution * memberLimit,
    round: 1,
    nextDate: new Date(firstKocok * 1000).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }),
    firstKocok,
    status: "ready",
    source: "stellar",
    contractId: runtime.contractId,
    transactionId: created.transactionId,
    members: runtime.members.map((member) => ({
      id: member.address,
      name: member.name,
      address: member.address,
      amount: contribution,
      paid: true,
    })),
  };
  const rooms = await readJson(roomsPath, []);
  await writeJson(roomsPath, [room, ...rooms]);
  return room;
}

async function startRoom(room, runtime) {
  const host = runtime.members[0];
  const result = await runStellar(invokeArgs(runtime, host.alias, "start_room", [
    "--room_id", String(room.chainRoomId),
    "--host", host.address,
  ]), { configDir: stellarDir });
  return updateRoom(room.id, { status: "sealed", startTransactionId: result.transactionId });
}

async function drawRoom(room, runtime) {
  const waitSeconds = room.firstKocok - Math.floor(Date.now() / 1000);
  if (waitSeconds > 0) {
    const error = new Error(`Kocok tersedia dalam ${waitSeconds} detik.`);
    error.status = 409;
    error.waitSeconds = waitSeconds;
    throw error;
  }
  const caller = runtime.members[0];
  const sealed = await runStellar(invokeArgs(runtime, caller.alias, "seal_kocok", [
    "--room_id", String(room.chainRoomId),
    "--caller", caller.address,
  ]), { configDir: stellarDir, allowFailure: true });
  if (!sealed.ok && !sealed.stderr.includes("Error(Contract, #11)")) {
    throw new Error(sealed.stderr);
  }
  const drawn = await runStellar(invokeArgs(runtime, caller.alias, "kocok", [
    "--room_id", String(room.chainRoomId),
    "--caller", caller.address,
  ]), { configDir: stellarDir });
  const winnerAddress = parseCliValue(drawn.stdout);
  const winner = runtime.members.find((member) => member.address === winnerAddress) || {
    name: "Anggota sandbox",
    address: winnerAddress,
  };
  const result = {
    roomId: room.id,
    roomName: room.name,
    round: room.round,
    winner: winner.name,
    winnerAddress: winner.address,
    firstName: winner.name.split(" ")[0],
    amount: room.pool,
    participants: room.memberLimit,
    transactionId: drawn.transactionId || "pending-indexer",
    sealTransactionId: sealed.transactionId,
    contractId: runtime.contractId,
    source: "stellar",
    timestamp: new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" }),
  };
  await updateRoom(room.id, { status: "paid", winner: winner.name, result });
  return result;
}

async function updateRoom(id, changes) {
  const rooms = await readJson(roomsPath, []);
  let updated = null;
  const next = rooms.map((room) => {
    if (room.id !== id) return room;
    updated = { ...room, ...changes };
    return updated;
  });
  if (!updated) throw new Error("Room Testnet tidak ditemukan.");
  await writeJson(roomsPath, next);
  return updated;
}

async function handleApi(request, response, pathname) {
  const runtime = await readJson(runtimePath, null);
  if (request.method === "GET" && pathname === "/api/stellar/status") {
    sendJson(response, 200, publicRuntime(runtime));
    return;
  }
  if (request.method === "GET" && pathname === "/api/stellar/rooms") {
    sendJson(response, 200, runtime?.contractId ? await readJson(roomsPath, []) : []);
    return;
  }
  if (!runtime?.contractId) {
    sendJson(response, 503, { error: "Contract Testnet belum dikonfigurasi. Jalankan npm run stellar:bootstrap." });
    return;
  }
  if (request.method === "POST" && pathname === "/api/stellar/rooms") {
    sendJson(response, 201, await createRoom(await bodyJson(request), runtime));
    return;
  }
  const actionMatch = pathname.match(/^\/api\/stellar\/rooms\/([^/]+)\/(start|draw)$/);
  if (request.method === "POST" && actionMatch) {
    const rooms = await readJson(roomsPath, []);
    const room = rooms.find((item) => item.id === decodeURIComponent(actionMatch[1]));
    if (!room) {
      sendJson(response, 404, { error: "Room Testnet tidak ditemukan." });
      return;
    }
    const result = actionMatch[2] === "start" ? await startRoom(room, runtime) : await drawRoom(room, runtime);
    sendJson(response, 200, result);
    return;
  }
  sendJson(response, 404, { error: "Endpoint tidak ditemukan." });
}

async function serveStatic(response, pathname) {
  const requested = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  let filePath = path.resolve(distDir, requested);
  if (!filePath.startsWith(distDir)) {
    response.writeHead(403).end();
    return;
  }
  try {
    if (!(await stat(filePath)).isFile()) filePath = path.join(distDir, "index.html");
  } catch {
    filePath = path.join(distDir, "index.html");
  }
  if (!existsSync(filePath)) {
    response.writeHead(503, { "content-type": "text/plain; charset=utf-8" });
    response.end("Build belum tersedia. Jalankan npm run build.");
    return;
  }
  response.writeHead(200, {
    "content-type": mimeTypes[path.extname(filePath)] || "application/octet-stream",
    "cache-control": path.basename(filePath) === "index.html" ? "no-cache" : "public, max-age=3600",
  });
  createReadStream(filePath).pipe(response);
}

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, `http://${request.headers.host || "localhost"}`).pathname;
  try {
    if (pathname.startsWith("/api/")) await handleApi(request, response, pathname);
    else await serveStatic(response, pathname);
  } catch (error) {
    sendJson(response, error.status || 500, {
      error: transactionError(error),
      ...(error.waitSeconds ? { waitSeconds: error.waitSeconds } : {}),
    });
  }
});

server.listen(port, "0.0.0.0", () => {
  process.stdout.write(`Awrisan tersedia di http://127.0.0.1:${port}\n`);
});
