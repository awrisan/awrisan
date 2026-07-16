// Contract error codes, in one place.
//
// Source of truth: contracts/arisan_rooms/src/lib.rs, `pub enum Error`.
// contract-errors.test.mjs reads that file and fails if these ever drift.
//
// This lives apart from testnet-gateway.mjs on purpose: importing the gateway
// starts an HTTP listener, so anything that needs these constants (tests
// included) would otherwise have to boot a server to read a number.
//
// ---------------------------------------------------------------------------
// THE CODE SPACE IS NOT OURS ALONE. Read this before adding a message.
//
// `Error(Contract, #N)` carries no attribution. The token we use is the native
// Stellar Asset Contract, and its ContractError enum runs 1..13:
//
//     InternalError = 1              AlreadyInitializedError = 3
//     OperationNotSupportedError = 2 UnauthorizedError = 4 ... NegativeAmountError = 8
//     AllowanceError = 9             BalanceError = 10
//     BalanceDeauthorizedError = 11  OverflowError = 12
//     TrustlineMissingError = 13
//     (soroban-env-host/src/builtin_contracts/contract_error.rs)
//
// It reaches the CLI through the identical wire format, and that file says so
// itself: "it's not clear how to distinguish them if multiple built-in
// contracts are involved."
//
// So EVERY code we own except 14 collides with a token error. Our contract
// calls the token in create_room, join_room and kocok, which means a #10 on
// those paths is just as plausibly the token's BalanceError (a member is out of
// funds) as our NotYet. A member with an empty account would be told "the draw
// schedule has not arrived yet" on a request that has no schedule in it.
//
// Guessing would hand the user a confident falsehood, which is precisely the
// bug this module exists to remove. So: a specific sentence is only used when
// the token can be ruled out of the failure. Otherwise we say the true, plain
// thing and print the code. A vague truth beats a fluent lie.
// ---------------------------------------------------------------------------

export const CONTRACT_ERROR = {
  ALREADY_INITIALIZED: 1,
  NOT_INITIALIZED: 2,
  INVALID_PARAMS: 3,
  NOT_FOUND: 4,
  WRONG_STATUS: 5,
  NOT_HOST: 6,
  NOT_MEMBER: 7,
  ALREADY_JOINED: 8,
  ROOM_FULL: 9,
  NOT_YET: 10,
  ALREADY_POSTPONED: 11,
  NOT_SEALED: 12,
  ALREADY_SEALED: 13,
  JOIN_CLOSED: 14,
};

/** Highest code the Stellar Asset Contract can raise. 1..13 are ambiguous. */
export const SAC_MAX_CODE = 13;

export const CONTRACT_ERROR_MESSAGE = {
  [CONTRACT_ERROR.ALREADY_INITIALIZED]: "Kontrak sudah diinisialisasi.",
  [CONTRACT_ERROR.NOT_INITIALIZED]: "Kontrak belum diinisialisasi.",
  [CONTRACT_ERROR.INVALID_PARAMS]: "Parameter room tidak valid.",
  [CONTRACT_ERROR.NOT_FOUND]: "Room tidak ditemukan di kontrak.",
  [CONTRACT_ERROR.WRONG_STATUS]: "Status room tidak mengizinkan aksi ini.",
  [CONTRACT_ERROR.NOT_HOST]: "Hanya host room yang bisa melakukan ini.",
  [CONTRACT_ERROR.NOT_MEMBER]: "Kamu bukan anggota room ini.",
  [CONTRACT_ERROR.ALREADY_JOINED]: "Kamu sudah tergabung di room ini.",
  [CONTRACT_ERROR.ROOM_FULL]: "Room sudah penuh.",
  [CONTRACT_ERROR.NOT_YET]: "Jadwal kocok belum tiba.",
  [CONTRACT_ERROR.ALREADY_POSTPONED]: "Ronde ini sudah pernah ditunda sekali.",
  // Not "seal dulu": the UI's own Seal button is start_room (locking the pool),
  // a different action, and nothing in the UI calls seal_kocok directly. The
  // gateway always seals inside drawRoom, so a user who somehow sees this can
  // only retry.
  [CONTRACT_ERROR.NOT_SEALED]: "Ronde belum siap diundi. Coba kocok lagi.",
  [CONTRACT_ERROR.ALREADY_SEALED]: "Ronde ini sudah diundi sebelumnya.",
  [CONTRACT_ERROR.JOIN_CLOSED]: "Pendaftaran room sudah ditutup.",
};

/**
 * Pull the contract error code out of whatever the Stellar CLI printed,
 * message or stderr. Returns null when this was not a contract error.
 */
export function contractErrorCode(text) {
  const match = String(text ?? "").match(/Error\(Contract, #(\d+)\)/);
  return match ? Number(match[1]) : null;
}

/**
 * True when the token contract appears in the failure, so the code could be
 * the token's rather than ours. The CLI prints each frame's contract id in the
 * diagnostic event log, so the token's id showing up means a token frame was
 * on the stack when this blew up.
 *
 * With no tokenId supplied we cannot rule the token out, so we answer "yes,
 * ambiguous" and the caller falls back to the plain truth.
 */
export function mayBeTokenError(text, tokenId) {
  if (!tokenId) return true;
  return String(text ?? "").includes(tokenId);
}

/** The always-true fallback: names the code, claims nothing about its meaning. */
function labelled(code) {
  return `Kontrak menolak transaksi. Error(Contract, #${code})`;
}

/**
 * Turn a failure into a sentence a person can act on, never a stderr dump, and
 * never a claim we cannot stand behind.
 *
 * @param {{message?: string}} error
 * @param {{tokenId?: string, trusted?: boolean}} context
 *   tokenId  the token contract id, so token frames can be ruled out.
 *   trusted  set only where the call provably never reaches the token
 *            (seal_kocok), which makes every code unambiguously ours.
 */
export function transactionError(error, context = {}) {
  const message = error?.message || "Transaksi Testnet gagal.";
  const code = contractErrorCode(message);
  if (code === null) return message;

  const specific = CONTRACT_ERROR_MESSAGE[code];
  if (!specific) return labelled(code);

  // 14 is ours alone; the token's enum stops at 13.
  if (code > SAC_MAX_CODE) return specific;
  if (context.trusted) return specific;
  if (mayBeTokenError(message, context.tokenId)) return labelled(code);
  return specific;
}
