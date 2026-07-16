import { createReadStream, existsSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { parseCliValue, runStellar } from "./stellar-cli.mjs";
import { CONTRACT_ERROR, contractErrorCode, transactionError } from "./contract-errors.mjs";

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoDir = path.resolve(appDir, "..");
const distDir = path.join(appDir, "dist");
const stellarDir = path.join(repoDir, ".stellar");
const runtimePath = path.join(stellarDir, "awrisan-runtime.json");
const roomsPath = path.join(stellarDir, "rooms.json");
const port = Number(process.env.PORT || 4173);
const shareStroops = 1_000_000;
// The deployed hackathon contract uses its default demo cadence. Weekly maps
// to 60 seconds unless the contract is built with production-cadences.
const cadenceSeconds = 60;

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

function normalizeStoredRoom(room) {
  const lastResult = room.result;
  const history = room.history?.length ? room.history : lastResult ? [lastResult] : [];
  if (!lastResult || lastResult.round >= room.memberLimit) {
    return { ...room, history };
  }
  const nextKocok = room.firstKocok + cadenceSeconds * lastResult.round;
  return {
    ...room,
    status: "sealed",
    round: lastResult.round + 1,
    history,
    nextKocok,
    nextDate: new Date(nextKocok * 1000).toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Jakarta",
    }),
  };
}

async function readRooms() {
  const rooms = await readJson(roomsPath, []);
  const normalized = rooms.map(normalizeStoredRoom);
  if (JSON.stringify(normalized) !== JSON.stringify(rooms)) await writeJson(roomsPath, normalized);
  return normalized;
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

// Contract error codes and their human messages live in ./contract-errors.mjs,
// which is import-safe (this file starts a listener, that one does not).

async function createRoom(payload, runtime) {
  const memberLimit = Number(payload.memberLimit);
  if (!Number.isInteger(memberLimit) || memberLimit < 3 || memberLimit > runtime.members.length) {
    throw new Error(`Pilih 3 sampai ${runtime.members.length} anggota sandbox untuk demo on-chain.`);
  }
  const contribution = Number(payload.contribution);
  const requestedDrawAt = Date.parse(payload.drawAt);
  if (!payload.name || !Number.isFinite(contribution) || contribution < 10_000 || !Number.isFinite(requestedDrawAt)) {
    throw new Error("Nama dan nominal room tidak valid.");
  }
  if (!payload.scheduleAgreed) {
    throw new Error("Jadwal kocok harus disepakati anggota sebelum room dibuat.");
  }

  const code = inviteCode();
  const now = Math.floor(Date.now() / 1000);
  const firstKocok = Math.floor(requestedDrawAt / 1000);
  if (firstKocok < now + 75) {
    throw new Error("Jadwal kocok pertama minimal 2 menit dari sekarang untuk memberi waktu transaksi Testnet.");
  }
  const joinDeadline = Math.min(now + 60, firstKocok - 1);
  const selectedMembers = runtime.members.slice(0, memberLimit);
  const host = selectedMembers[0];
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

  for (const member of selectedMembers.slice(1)) {
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
    drawAt: new Date(firstKocok * 1000).toISOString(),
    firstKocok,
    nextKocok: firstKocok,
    cadence: "Weekly",
    cadenceSeconds,
    scheduleAgreed: true,
    status: "ready",
    source: "stellar",
    contractId: runtime.contractId,
    transactionId: created.transactionId,
    history: [],
    members: selectedMembers.map((member) => ({
      id: member.address,
      name: member.name,
      address: member.address,
      amount: contribution,
      paid: true,
    })),
  };
  const rooms = await readRooms();
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
  const scheduledKocok = room.nextKocok || room.firstKocok;
  const waitSeconds = scheduledKocok - Math.floor(Date.now() / 1000);
  if (waitSeconds > 0) {
    const availableAt = new Date(scheduledKocok * 1000).toLocaleString("id-ID", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "Asia/Jakarta",
    });
    const error = new Error(`Jadwal kocok belum tiba. Tombol akan aktif otomatis pada ${availableAt}.`);
    error.status = 409;
    error.waitSeconds = waitSeconds;
    throw error;
  }
  const caller = runtime.members[0];
  const sealed = await runStellar(invokeArgs(runtime, caller.alias, "seal_kocok", [
    "--room_id", String(room.chainRoomId),
    "--caller", caller.address,
  ]), { configDir: stellarDir, allowFailure: true });
  // Sealing is idempotent from here: the round only needs A seed, not OUR seed.
  // If it is already sealed (someone else sealed it, or we are retrying after a
  // network blip), that is benign and we go straight to the draw. Anything else
  // is a real failure, and the user gets a sentence rather than a stderr dump.
  // `trusted` is safe here and only here: seal_kocok never calls the token
  // (the token::Client calls live in create_room, join_room and kocok), so any
  // Error(Contract, #N) coming out of this invocation is unambiguously ours.
  if (!sealed.ok && contractErrorCode(sealed.stderr) !== CONTRACT_ERROR.ALREADY_SEALED) {
    throw new Error(transactionError({ message: sealed.stderr }, { trusted: true }));
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
  const previousHistory = room.history?.length
    ? room.history
    : room.result
      ? [room.result]
      : [];
  const history = [...previousHistory.filter((item) => item.round !== result.round), result];
  const isComplete = result.round >= room.memberLimit;
  const nextRound = isComplete ? room.round : room.round + 1;
  const nextKocok = isComplete ? null : scheduledKocok + cadenceSeconds;
  const nextDate = nextKocok
    ? new Date(nextKocok * 1000).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" })
    : room.nextDate;
  await updateRoom(room.id, {
    status: isComplete ? "paid" : "sealed",
    round: nextRound,
    winner: winner.name,
    result,
    history,
    nextKocok,
    nextDate,
  });
  return { ...result, isComplete, nextRound, nextKocok, nextDate };
}

async function updateRoom(id, changes) {
  const rooms = await readRooms();
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
    sendJson(response, 200, runtime?.contractId ? await readRooms() : []);
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
    const rooms = await readRooms();
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
    // Re-read the runtime so the token's id is available: without it we cannot
    // tell our Error(Contract, #10) from the token's BalanceError, and
    // transactionError will correctly refuse to guess. One extra file read on
    // the failure path is a fair price for not lying to the user.
    const runtime = await readJson(runtimePath, null);
    sendJson(response, error.status || 500, {
      error: transactionError(error, { tokenId: runtime?.tokenId }),
      ...(error.waitSeconds ? { waitSeconds: error.waitSeconds } : {}),
    });
  }
});

server.listen(port, "0.0.0.0", () => {
  process.stdout.write(`Awrisan tersedia di http://127.0.0.1:${port}\n`);
});
