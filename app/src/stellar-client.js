const baseUrl = "/api/stellar";

async function request(path, options) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { "content-type": "application/json" },
    ...options,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error || "Gateway Stellar tidak dapat dihubungi.");
    error.status = response.status;
    error.waitSeconds = body.waitSeconds;
    throw error;
  }
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
