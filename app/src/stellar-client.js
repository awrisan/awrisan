const baseUrl = "/api/stellar";

async function request(path, options) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { "content-type": "application/json" },
    ...options,
  });
  // A 200 on this path is not proof the gateway answered. The gateway is
  // server/testnet-gateway.mjs, which holds ten members' keys and so is never
  // deployed with the static build — nothing guarantees what serves /api/ there,
  // and this file cannot find out. What it can check: every gateway reply is
  // written by sendJson (testnet-gateway.mjs:74-80), so a body that will not
  // parse as JSON did not come from the gateway.
  //
  // Hence null and not {}. The `catch(() => ({}))` this replaces made an
  // unparseable body indistinguishable from a real gateway reply that happened
  // to be empty, and callers read a verdict straight off it: demo-state asks
  // status.mode, gets undefined, and treats "nothing answered" as an answer.
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    // The gateway's error replies always carry {error} (testnet-gateway.mjs:383-386);
    // only the not-yet-scheduled kocok adds waitSeconds, on a 409 (:228-237).
    // Anything else answering this path carries neither, which is what `?.` is
    // for: an absent field stays absent rather than being guessed at.
    const error = new Error(body?.error || "Gateway Stellar tidak dapat dihubungi.");
    error.status = response.status;
    error.waitSeconds = body?.waitSeconds;
    throw error;
  }
  // An ok response we could not parse is not a success. Failing here keeps the
  // caller on its own error path, which already knows how to fall back.
  if (!body) throw new Error("Gateway Stellar tidak dapat dihubungi.");
  return body;
}

export function getStellarStatus() {
  return request("/status");
}

export function getStellarRooms() {
  return request("/rooms");
}

export function createStellarRoom(payload) {
  return request("/rooms", { method: "POST", body: JSON.stringify(payload) });
}

export function startStellarRoom(id) {
  return request(`/rooms/${encodeURIComponent(id)}/start`, { method: "POST", body: "{}" });
}

export function drawStellarRoom(id) {
  return request(`/rooms/${encodeURIComponent(id)}/draw`, { method: "POST", body: "{}" });
}
