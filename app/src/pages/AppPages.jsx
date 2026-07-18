import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { motion } from "motion/react";
import {
  ArrowRight,
  CalendarBlank,
  CalendarPlus,
  Check,
  CheckCircle,
  Clock,
  Confetti,
  Copy,
  CreditCard,
  DiceFive,
  IdentificationCard,
  LinkSimple,
  ListChecks,
  LockKey,
  Minus,
  Plus,
  Receipt,
  SealCheck,
  ShieldCheck,
  SignOut,
  Sparkle,
  Trophy,
  UserCircle,
  UsersThree,
  Wallet,
  WarningCircle,
} from "@phosphor-icons/react";
import { formatMoney, formatRupiah, useDemo } from "../demo-state.jsx";
import {
  Button,
  ConfirmDialog,
  FormField,
  HOLDS_FUNDS,
  InfoStrip,
  InlineNotice,
  PageHeader,
  PhaseTracker,
  StatusBadge,
  TestnetPill,
  TrustPanel,
} from "../ui.jsx";

const plainNumberFormatter = new Intl.NumberFormat("id-ID");
const demoCadenceSeconds = 60;
const celebrationPieces = Array.from({ length: 18 }, (_, index) => ({
  id: index,
  left: `${6 + ((index * 37) % 88)}%`,
  delay: (index % 6) * 0.08,
  rotate: (index * 47) % 180,
}));

function defaultDrawAt() {
  const date = new Date(Date.now() + 3 * 60 * 1000);
  date.setSeconds(0, 0);
  if (date.getTime() < Date.now() + 90_000) date.setMinutes(date.getMinutes() + 1);
  return toDateTimeLocal(date);
}

function tomorrowDrawAt() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  date.setHours(19, 0, 0, 0);
  return toDateTimeLocal(date);
}

function toDateTimeLocal(date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function formatSchedule(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "Belum ditentukan";
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatCountdown(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} jam ${remainingMinutes} menit`;
  }
  if (minutes > 0) return `${minutes} menit ${seconds} detik`;
  return `${seconds} detik`;
}

// `agreed` is the room's own record that its members settled this time, and it
// has to travel here because this text outlives the app: the room detail offers
// this link on a chain room too, so the unconditional version wrote "yang telah
// disepakati anggota" into the member's Google Calendar, about a schedule the
// contract only ever heard from the host (lib.rs:189). The furthest a claim of
// ours travels is the one place it can never be corrected.
function calendarUrl({ name, drawAt, nextKocok, agreed }) {
  const start = drawAt ? new Date(drawAt) : nextKocok ? new Date(nextKocok * 1000) : null;
  if (!start || Number.isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const stamp = (date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Kocok ${name}`,
    dates: `${stamp(start)}/${stamp(end)}`,
    details: agreed
      ? "Jadwal kocok Awrisan yang telah disepakati anggota."
      : "Jadwal kocok Awrisan yang ditetapkan host saat room dibuat.",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function MemberStake({ member }) {
  if (!member.paid) return <small>Belum setor</small>;
  return <small>{formatMoney({ rupiah: member.amount })}</small>;
}

function TransactionProgress({ memberLimit }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setPhase(1), 3500),
      window.setTimeout(() => setPhase(2), 11000),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, []);

  const steps = [
    "Membuat room di smart contract",
    `Mengunci prefund ${memberLimit} anggota sandbox`,
    "Menyimpan jadwal dan kode undangan",
  ];

  return (
    <motion.div className="transaction-progress-backdrop" role="status" aria-live="polite" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.section className="transaction-progress-card" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <span className="transaction-progress-icon"><LockKey size={28} weight="regular" /></span>
        <p className="eyebrow">Stellar Testnet</p>
        <h2>Room sedang disiapkan</h2>
        <p>Setiap identitas menandatangani transaksi sendiri. Proses dapat memerlukan beberapa puluh detik, tetapi halaman tidak macet.</p>
        <ol>
          {steps.map((step, index) => (
            <li key={step} className={index < phase ? "done" : index === phase ? "active" : ""}>
              <span>{index < phase ? <Check size={15} weight="bold" /> : index + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </motion.section>
    </motion.div>
  );
}

/**
 * What "Nilai room on-chain" means, asked of the same rooms the number was summed
 * from. The caption used to ask state.network instead, which is a different
 * question with a different answer: a room holding funds is itself proof a
 * transaction happened, whatever the RPC says right now, and the replay path
 * (chain rooms out of localStorage, RPC down) printed a real 3,6 XLM under "belum
 * ada transaksi blockchain".
 *
 * The mode gets asked in exactly the two cases that have no rooms to ask. Not a
 * relapse into asking it about the rooms: "checking" is still asking and "local"
 * never got through, and a sum of no rooms is 0 under both — neither of which is
 * a contract with nothing in it.
 */
function lockedCaption({ holding, hasChainRooms, mode }) {
  if (!holding) {
    if (mode === "checking") return "sedang membaca kontrak";
    if (mode === "local") return "kontrak tidak dapat dihubungi";
    return hasChainRooms ? "tidak ada room yang sedang memegang dana" : "belum ada transaksi blockchain";
  }
  return "terkunci di Stellar Testnet";
}

export function HomePage() {
  const { state } = useDemo();
  const holdingRooms = state.rooms.filter(
    (room) => room.source === "stellar" && HOLDS_FUNDS.has(room.status),
  );
  // The Rupiah a gateway room's own demo declared. It is the only figure a room
  // reaching this page can offer: the gateway prices the share itself and never
  // reads a balance off the contract (server/testnet-gateway.mjs:185-189), and a
  // local room is this app's own simulation. Neither carries the contract's own
  // unit, so nothing here has stroops to sum.
  const lockedTotal = holdingRooms.reduce((total, room) => total + room.pool, 0);
  // An empty sum has two meanings and only one of them is "nothing is held": the
  // gateway may still be answering. A room that holds is proof enough on its own,
  // so the rooms get asked first and the mode only where there are none.
  const knowsHoldings = holdingRooms.length > 0 || state.network.mode === "stellar";
  // formatMoney({}) is already "Belum diketahui": the one answer for an amount
  // that is genuinely unknown rather than zero.
  const lockedLabel = knowsHoldings ? formatMoney({ rupiah: lockedTotal }) : formatMoney({});

  return (
    <div className="app-page home-page">
      <header className="home-header">
        <div><h1><span>Selamat sore, </span>{state.profile.firstName}</h1></div>
        <Link className="profile-avatar" to="/app/profil" aria-label="Buka profil Dina">D</Link>
      </header>
      <TestnetPill compact />

      <InlineNotice
        title={
          state.network.mode === "stellar"
            ? "Smart contract Testnet terhubung"
            : state.network.mode === "checking"
              ? "Memeriksa koneksi"
              : "Mode simulasi lokal"
        }
        tone={state.network.connected ? "success" : "neutral"}
      >
        {state.network.mode === "stellar"
          ? `Contract ${shortId(state.network.contractId)} siap menerima transaksi sandbox.`
          : state.network.message}
      </InlineNotice>

      <section className="safe-balance">
        <span><LockKey size={30} weight="regular" aria-hidden="true" /></span>
        <div><p>Nilai room on-chain</p><strong>{lockedLabel}</strong><small>{lockedCaption({ holding: holdingRooms.length, hasChainRooms: state.rooms.some((room) => room.source === "stellar"), mode: state.network.mode })}</small></div>
      </section>

      <div className="section-heading-row">
        <div><p className="eyebrow">Lingkaran aktif</p><h2>Arisan saya</h2></div>
        <Link to="/app/aktivitas">Lihat aktivitas</Link>
      </div>

      <div className="room-list">
        {state.rooms.map((room) => <RoomListItem key={room.id} room={room} />)}
      </div>

      <div className="home-actions">
        <Button to="/app/buat-room" icon={<Plus size={21} weight="bold" aria-hidden="true" />}>Buat room</Button>
        <Button to="/app/gabung" variant="outline" icon={<LinkSimple size={20} weight="bold" aria-hidden="true" />}>Gabung dengan kode</Button>
      </div>
    </div>
  );
}

function RoomListItem({ room }) {
  const progress = Math.round((room.paidCount / room.memberLimit) * 100);
  return (
    <Link className="room-list-item" to={`/app/room/${room.id}`}>
      <div className="room-list-top">
        <span className="room-icon"><UsersThree size={25} weight="regular" aria-hidden="true" /></span>
        <div><h3>{room.name}</h3><p>{room.memberLimit} anggota, {room.source === "stellar" ? "Stellar on-chain" : "simulasi lokal"}</p></div>
        <ArrowRight size={21} weight="bold" aria-hidden="true" />
      </div>
      <div className="room-list-meta">
        {/* This row has no label to put on a date, which is exactly why it may
            only print one that needs none. `nextDate` is now null wherever the
            room has no next round to date (stellar-rpc.js:403 formats kocokAt
            alone), and the calendar glyph beside it is not a caption: an empty
            date left the icon standing on its own, still saying "there is a date
            here", with nothing after it. A room that has no next kocok says so
            through its badge — "Siklus selesai", "Room dibubarkan" — and its
            first_kocok is on the detail page, under the caption that page has
            room for. */}
        {room.nextDate ? <span><CalendarBlank size={18} aria-hidden="true" /> {room.nextDate}</span> : null}
        <StatusBadge status={room.status} />
      </div>
      <div className="progress-track" aria-label={`${progress} persen anggota sudah setor`}><span style={{ width: `${progress}%` }} /></div>
      <div className="progress-label"><span>{room.paidCount} dari {room.memberLimit} anggota sudah setor</span><strong>{progress}%</strong></div>
    </Link>
  );
}

export function CreateRoomPage() {
  const navigate = useNavigate();
  const { createRoom, state } = useDemo();
  const scheduleInputRef = useRef(null);
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "Arisan Sahabat",
    memberLimit: "5",
    contribution: "1000000",
    drawAt: defaultDrawAt(),
    scheduleAgreed: false,
  });
  const maxSandboxMembers = state.network.members?.length || 10;
  const minimumDrawAt = toDateTimeLocal(new Date(Date.now() + 2 * 60 * 1000));

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function chooseSchedule(drawAt) {
    setForm((current) => ({ ...current, drawAt, scheduleAgreed: false }));
    setError("");
  }

  async function next() {
    if (step === 1 && form.name.trim().length < 3) {
      setError("Nama room minimal 3 karakter.");
      return;
    }
    if (step === 1 && (!form.drawAt || new Date(form.drawAt).getTime() < Date.now() + 75_000)) {
      setError("Pilih jadwal kocok minimal 2 menit dari sekarang.");
      return;
    }
    if (step === 1 && !form.scheduleAgreed) {
      setError("Pastikan jadwal sudah disepakati bersama anggota.");
      return;
    }
    if (step === 2 && (Number(form.memberLimit) < 3 || Number(form.contribution) < 10000)) {
      setError("Gunakan minimal 3 anggota dan setoran minimal Rp10.000.");
      return;
    }
    if (step === 2 && state.network.mode === "stellar" && Number(form.memberLimit) > maxSandboxMembers) {
      setError(`Demo on-chain saat ini menyiapkan maksimal ${maxSandboxMembers} identitas sandbox.`);
      return;
    }
    setError("");
    if (step < 3) setStep((current) => current + 1);
    else {
      setSubmitting(true);
      try {
        const roomId = await createRoom(form);
        navigate(`/app/room/${roomId}`);
      } catch (requestError) {
        setError(requestError.message);
        setSubmitting(false);
      }
    }
  }

  return (
    <div className="app-page focused-page">
      <PageHeader title="Buat room" eyebrow={`Langkah ${step} dari 3`} backTo={step > 1 ? null : "/app"} />
      <div className="form-progress">{[1, 2, 3].map((item) => <span key={item} className={item <= step ? "active" : ""} />)}</div>
      <section className="form-section">
        {step === 1 ? (
          <>
            <h2>Sepakati waktu kocok</h2>
            <p>Room boleh penuh lebih dulu, tetapi kocok hanya terbuka pada waktu yang sudah disetujui bersama.</p>
            <FormField label="Nama room"><input value={form.name} onChange={(event) => update("name", event.target.value)} /></FormField>
            <div className="schedule-presets" aria-label="Pilihan jadwal kocok">
              <button type="button" onClick={() => chooseSchedule(defaultDrawAt())}><DiceFive size={17} /> Demo cepat, +3 menit</button>
              <button type="button" onClick={() => chooseSchedule(tomorrowDrawAt())}><CalendarPlus size={17} /> Besok, 19.00</button>
            </div>
            <FormField label="Tanggal dan waktu kocok pertama" hint="Untuk demo hackathon, gunakan +3 menit. Smart contract tetap menolak kocok sebelum jadwal tiba.">
              <div className="date-time-input">
                <CalendarBlank size={21} aria-hidden="true" />
                <input
                  ref={scheduleInputRef}
                  type="datetime-local"
                  aria-label="Tanggal dan waktu kocok pertama"
                  min={minimumDrawAt}
                  value={form.drawAt}
                  onClick={(event) => event.currentTarget.showPicker?.()}
                  onChange={(event) => update("drawAt", event.target.value)}
                />
              </div>
            </FormField>
            <button
              type="button"
              className={`schedule-consent${form.scheduleAgreed ? " selected" : ""}`}
              role="checkbox"
              aria-checked={form.scheduleAgreed}
              onClick={() => update("scheduleAgreed", !form.scheduleAgreed)}
            >
              <span>{form.scheduleAgreed ? <Check size={15} weight="bold" /> : null}</span>
              <div><strong>Jadwal sudah disepakati anggota</strong><small>Host tidak menentukan waktu kocok secara sepihak.</small></div>
            </button>
          </>
        ) : null}
        {step === 2 ? (
          <>
            <h2>Tetapkan aturan setoran</h2>
            <p>Aturan akan ditampilkan kepada anggota sebelum mereka bergabung.</p>
            <div className="form-grid">
              <div className="form-field">
                <span className="form-label">Jumlah anggota</span>
                <div className="member-stepper">
                  <button type="button" aria-label="Kurangi anggota" onClick={() => update("memberLimit", String(Math.max(3, Number(form.memberLimit) - 1)))} disabled={Number(form.memberLimit) <= 3}><Minus size={19} weight="bold" /></button>
                  <div><strong>{form.memberLimit}</strong><span>orang</span></div>
                  <button type="button" aria-label="Tambah anggota" onClick={() => update("memberLimit", String(Math.min(maxSandboxMembers, Number(form.memberLimit) + 1)))} disabled={Number(form.memberLimit) >= maxSandboxMembers}><Plus size={19} weight="bold" /></button>
                </div>
                <span className="field-hint">Tersedia 3 sampai {maxSandboxMembers} identitas sandbox.</span>
              </div>
              <div className="form-field">
                <span className="form-label">Setoran per anggota</span>
                <div className="currency-input">
                  <span>Rp</span>
                  <input
                    aria-label="Setoran per anggota dalam Rupiah"
                    inputMode="numeric"
                    value={plainNumberFormatter.format(Number(form.contribution || 0))}
                    onChange={(event) => update("contribution", event.target.value.replace(/\D/g, ""))}
                  />
                </div>
                <div className="amount-presets" aria-label="Pilihan nominal cepat">
                  {[500000, 1000000, 2500000, 5000000].map((amount) => <button type="button" key={amount} onClick={() => update("contribution", String(amount))}>{formatRupiah(amount).replace("Rp", "Rp ")}</button>)}
                </div>
              </div>
            </div>
            <InfoStrip title="Pool tidak dipegang host" icon={LockKey}>{state.network.mode === "stellar" ? `${form.memberLimit} identitas sandbox akan mengunci Testnet XLM langsung di smart contract. Semakin banyak anggota, semakin banyak transaksi yang perlu dikonfirmasi.` : "Gateway belum terhubung. Room ini akan disimpan sebagai simulasi lokal dan tidak mengirim dana."}</InfoStrip>
          </>
        ) : null}
        {step === 3 ? (
          <>
            <h2>Periksa sebelum membuat room</h2>
            <p>Setelah room dikunci nanti, anggota dan nominal tidak dapat diubah.</p>
            <dl className="review-list">
              <div><dt>Nama</dt><dd>{form.name}</dd></div>
              <div><dt>Anggota</dt><dd>{form.memberLimit} orang</dd></div>
              <div><dt>Setoran</dt><dd>{formatRupiah(Number(form.contribution))}</dd></div>
              <div><dt>Total pool</dt><dd>{formatRupiah(Number(form.contribution) * Number(form.memberLimit))}</dd></div>
              <div><dt>Kocok pertama</dt><dd>{formatSchedule(form.drawAt)}</dd></div>
              <div><dt>Putaran berikutnya</dt><dd>{state.network.mode === "stellar" ? `Mode demo, setiap ${demoCadenceSeconds} detik` : "Mode simulasi"}</dd></div>
              <div><dt>Persetujuan</dt><dd><CheckCircle size={17} /> Disepakati anggota</dd></div>
            </dl>
            {/* form.scheduleAgreed is the box itself, and next() refuses to
                leave step 1 without it — so this is always true here. Passed
                anyway: the value is the answer either way, and reading it is
                what stops this string from being a constant again. */}
            <a className="calendar-preview-link" href={calendarUrl({ name: form.name, drawAt: form.drawAt, agreed: form.scheduleAgreed })} target="_blank" rel="noreferrer"><CalendarPlus size={19} /> Pratinjau di Google Calendar</a>
            <InlineNotice title={state.network.mode === "stellar" ? "Akan dikirim ke Stellar Testnet" : "Simulasi lokal"} tone={state.network.mode === "stellar" ? "success" : "neutral"}>{state.network.mode === "stellar" ? `Pembuatan room dan prefund ${form.memberLimit} anggota akan ditandatangani gateway sandbox pada contract ${shortId(state.network.contractId)}. Jadwal kocok disimpan dan ditegakkan oleh kontrak.` : "Room dan kode undangan disimpan di perangkat ini. Tidak ada transaksi blockchain yang dikirim."}</InlineNotice>
            {error ? <p className="action-error" role="alert">{error}</p> : null}
          </>
        ) : null}
        {step < 3 && error ? <p className="action-error" role="alert">{error}</p> : null}
      </section>
      <div className="sticky-actions">
        {step > 1 ? <Button variant="ghost" onClick={() => setStep((current) => current - 1)}>Kembali</Button> : <span />}
        <Button onClick={next} disabled={submitting}>{submitting ? "Mengirim transaksi..." : step === 3 ? "Buat room" : "Lanjutkan"}</Button>
      </div>
      {submitting && state.network.mode === "stellar" ? <TransactionProgress memberLimit={form.memberLimit} /> : null}
    </div>
  );
}

export function JoinRoomPage() {
  const navigate = useNavigate();
  const { state } = useDemo();
  const [code, setCode] = useState("RT08-2026");
  const [error, setError] = useState("");
  const [found, setFound] = useState(null);

  function findRoom(event) {
    event.preventDefault();
    const room = state.rooms.find((item) => item.code.toLowerCase() === code.trim().toLowerCase());
    if (!room) {
      setFound(null);
      setError("Kode tidak ditemukan. Coba kode demo RT08-2026.");
      return;
    }
    setError("");
    setFound(room);
  }

  return (
    <div className="app-page focused-page">
      <PageHeader title="Gabung room" backTo="/app" />
      <section className="form-section join-section">
        <span className="large-icon"><LinkSimple size={32} weight="regular" aria-hidden="true" /></span>
        <h2>Masukkan kode dari host</h2>
        <p>Kode room memastikan Anda bergabung ke lingkaran yang tepat.</p>
        <form onSubmit={findRoom}>
          <FormField label="Kode room" error={error}><input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} autoCapitalize="characters" /></FormField>
          <button className="button button-primary button-full" type="submit"><span>Cari room</span><ArrowRight size={19} weight="bold" /></button>
        </form>
        {found ? (
          <motion.div className="found-room" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <span><CheckCircle size={28} weight="regular" aria-hidden="true" /></span>
            {/* A chain room answers a code lookup too: get_room carries the same
                invite code the gateway's rooms use. */}
            <div><small>Room ditemukan</small><h3>{found.name}</h3><p>{found.memberLimit} anggota, {formatMoney({ stroops: found.onChainShareStroops, rupiah: found.contribution })} per putaran</p></div>
            <Button onClick={() => navigate(`/app/room/${found.id}`)}>Lihat room</Button>
          </motion.div>
        ) : null}
      </section>
    </div>
  );
}

export function RoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { createRoom, getRoom, sealRoom } = useDemo();
  const room = getRoom(roomId);
  const [showAll, setShowAll] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [preparingDemo, setPreparingDemo] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!room) return <MissingRoom />;

  const trackerStatus = room.status === "ready" ? "sealed" : room.status;
  // Nothing further happens, and everyone was paid.
  const cycleOver = room.status === "paid";
  const visibleMembers = showAll ? room.members : room.members.slice(0, 4);
  const history = room.history?.length ? room.history : room.result ? [room.result] : [];
  const scheduledAt = room.nextKocok
    ? new Date(room.nextKocok * 1000)
    : room.drawAt
      ? new Date(room.drawAt)
      : null;
  const scheduleLabel = `Jadwal putaran ${room.round}`;
  // What "Lihat hasil terakhir" needs, which is not what the history list needs:
  // ResultPage resolves room.result or room.winner and shows MissingResult
  // without them, and a chain room carries neither — its rounds were paid to
  // addresses this app never drew for. Gating the button on history.length sent
  // every finished chain room to "Belum ada hasil kocok, kunci room dan jalankan
  // kocok lebih dulu", and that page prices the pot with formatRupiah.
  const hasResultPage = Boolean(room.result || room.winner);
  const hasValidSchedule = scheduledAt && !Number.isNaN(scheduledAt.getTime());
  const scheduleReady = !hasValidSchedule || now >= scheduledAt.getTime();
  const scheduleWait = hasValidSchedule ? scheduledAt.getTime() - now : 0;
  const canOfferFastDemo = room.source === "stellar" && !scheduleReady && scheduleWait > 5 * 60 * 1000;
  // hasValidSchedule only ever asked whether the date PARSES, and a kocok that
  // already ran parses fine: a finished room keeps the schedule it last drew on
  // (demo-state.jsx:325 holds item.nextKocok when the local draw completes, and
  // drawAt survives the gateway nulling nextKocok at server/testnet-gateway.mjs:286),
  // so a Done room offered to file its long-since-drawn kocok into a member's
  // calendar. This is the claim the comment on calendarUrl is about: the one place
  // we can never correct it is the one place this link puts it. Ask whether there
  // is a kocok left before exporting one.
  const addCalendarUrl = hasValidSchedule && room.status !== "paid" ? calendarUrl({ name: room.name, drawAt: scheduledAt.toISOString(), agreed: room.scheduleAgreed }) : null;

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(room.code);
    } catch {
      // The visible confirmation remains useful in environments without clipboard access.
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function confirmSeal() {
    setSubmitting(true);
    setActionError("");
    try {
      await sealRoom(room.id);
      setConfirmOpen(false);
    } catch (requestError) {
      setActionError(requestError.message);
      setConfirmOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  async function createFastDemo() {
    setPreparingDemo(true);
    setActionError("");
    try {
      const fastRoomId = await createRoom({
        name: `${room.name} Demo`,
        memberLimit: String(room.memberLimit),
        contribution: String(room.contribution),
        drawAt: defaultDrawAt(),
        scheduleAgreed: true,
      });
      navigate(`/app/room/${fastRoomId}`);
    } catch (requestError) {
      setActionError(requestError.message);
      setPreparingDemo(false);
    }
  }

  return (
    <div className="app-page room-page">
      <PageHeader title={room.name} backTo="/app" action={room.source === "stellar" ? <TestnetPill compact /> : <span className="source-label">Lokal</span>} />
      <TrustPanel
        // The pot, and there is no holdings figure here to prefer over it.
        // `room.pool` is one round's pot (server/testnet-gateway.mjs:189, and
        // :270 hands exactly that to each round's winner), formatMoney takes
        // rupiah before stroops (demo-state.jsx:523), and every room that reaches
        // this page carries pool. The `lockedStroops` passed alongside it was
        // read on none of them: only stellar-rpc.js:494 writes that field, and
        // App.jsx:29 routes every room that has one to ChainBoard instead. It was
        // a holdings figure on a page whose rooms never have one, and the comment
        // here cited it as the reason "terkunci" below was safe.
        amount={formatMoney({ rupiah: room.pool })}
        paidCount={room.paidCount}
        memberLimit={room.memberLimit}
        // One number, and a different thing true of it at each status — so
        // `paid` gets its own word instead of sharing `sealed`'s. `paid` is every
        // round drawn (testnet-gateway.mjs:284, :291), and this is a PREFUND
        // arisan: members lock their whole commitment before round 1 and the
        // rounds pay all of it back out, so "After N rounds everyone has won
        // exactly once and the contract balance for the room is exactly zero"
        // (lib.rs:7-9). "Pool terkunci" over that said, present tense, that the
        // contract still held money it had already handed to the last winner.
        label={room.source === "stellar"
          ? room.status === "paid" ? "Pool sudah dibayarkan" : room.status === "sealed" ? "Pool terkunci" : "Pool terkumpul"
          : "Nilai simulasi"}
      />
      <PhaseTracker active={trackerStatus} />

      <InlineNotice title={room.source === "stellar" ? "Room Stellar Testnet" : "Room simulasi lokal"} tone={room.source === "stellar" ? "success" : "neutral"}>{room.source === "stellar" ? `Contract ${shortId(room.contractId)} memegang Testnet XLM. Nilai IDR adalah representasi aturan room.` : "Room ini tidak berada di blockchain dan tidak menyimpan dana sungguhan."}</InlineNotice>
      {actionError ? <p className="action-error" role="alert">{actionError}</p> : null}

      <section className="schedule-card">
        <span className="schedule-card-icon"><CalendarBlank size={24} /></span>
        <div>
          <p className="eyebrow">{scheduleLabel}</p>
          <h2>{formatSchedule(scheduledAt)}</h2>
          {/* Ask the room, not nobody. This check was filled, green and
              unconditional, so it made the claim on every room the contract
              holds — and the contract has no agreement in it to make the claim
              from: `first_kocok` is a create_room parameter the host passes
              alone (lib.rs:189), and no function anywhere in lib.rs asks a
              member about it. What a local room has is its creator's own ticked
              box (demo-state.jsx:375), which is a real record of a real answer,
              and it was sitting right here on the room unread. */}
          <p>
            {room.scheduleAgreed
              ? <><CheckCircle size={16} weight="fill" /> Disepakati bersama anggota</>
              : <><UserCircle size={16} /> Ditetapkan host saat room dibuat</>}
            {!scheduleReady ? `, ${formatCountdown(scheduleWait)} lagi` : ""}
          </p>
        </div>
        {addCalendarUrl ? <a href={addCalendarUrl} target="_blank" rel="noreferrer" aria-label="Tambahkan jadwal kocok ke Google Calendar"><CalendarPlus size={20} /><span>Google Calendar</span></a> : null}
      </section>

      {room.status === "funding" ? (
        <InlineNotice title="Bagikan kode ke anggota" icon={Copy}>Room akan siap dikunci setelah semua anggota menyetor.</InlineNotice>
      ) : null}

      <section className="member-section">
        <div className="section-heading-row"><div><p className="eyebrow">Daftar transparan</p><h2>Anggota dan setoran</h2></div><StatusBadge status={room.status} /></div>
        <div className="member-list">
          {visibleMembers.map((member) => (
            <div className="member-row" key={member.id}>
              <span className="member-avatar">{member.name.charAt(0)}</span>
              <div><strong>{member.name}</strong><MemberStake member={member} /></div>
              {history.find((item) => item.winner === member.name) ? (
                <span className="winner-label"><Trophy size={15} weight="fill" /> Putaran {history.find((item) => item.winner === member.name).round}</span>
              ) : (
                <span className={member.paid ? "paid-label" : "waiting-label"}>{member.paid ? <><Check size={15} weight="bold" /> Sudah setor</> : <><Clock size={15} /> Menunggu</>}</span>
              )}
            </div>
          ))}
        </div>
        {room.members.length > 5 ? <button className="text-button" type="button" onClick={() => setShowAll((current) => !current)}>{showAll ? "Tampilkan lebih sedikit" : `Lihat semua ${room.members.length} anggota`}</button> : null}
      </section>

      <section className="room-action-panel">
        {room.status === "ready" ? (
          <><span className="panel-icon"><ShieldCheck size={27} weight="regular" /></span><div><h2>Semua dana sudah masuk</h2><p>Kunci daftar anggota dan nominal. Kocok tetap menunggu jadwal yang disepakati.</p></div><Button onClick={() => setConfirmOpen(true)} icon={<LockKey size={20} weight="regular" />}>Kunci room</Button><a href="#aturan">Lihat aturan</a></>
        ) : null}
        {room.status === "sealed" ? (
          <><span className="panel-icon"><DiceFive size={27} weight="regular" /></span><div><h2>{scheduleReady ? "Waktunya kocok" : "Menunggu jadwal kocok"}</h2><p>{scheduleReady ? (room.source === "stellar" ? "Hasil akan dicatat dan Testnet XLM dibayar otomatis." : "Hasil simulasi hanya akan disimpan di perangkat ini.") : `Tersedia dalam ${formatCountdown(scheduleWait)}, pada ${formatSchedule(scheduledAt)}.`}</p></div><Button onClick={() => navigate(`/app/room/${room.id}/kocok`)} disabled={!scheduleReady} icon={<DiceFive size={20} weight="regular" />}>{scheduleReady ? "Mulai kocok" : `Tunggu ${formatCountdown(scheduleWait)}`}</Button>{canOfferFastDemo ? <button type="button" className="fast-demo-button" onClick={createFastDemo} disabled={preparingDemo}><Clock size={18} /> {preparingDemo ? "Menyiapkan salinan..." : "Buat salinan demo, kocok +3 menit"}</button> : null}{!scheduleReady && addCalendarUrl ? <a href={addCalendarUrl} target="_blank" rel="noreferrer">Ingatkan saya</a> : <a href="#aturan">Lihat aturan</a>}</>
        ) : null}
        {room.status === "paid" ? (
          // The button only exists when the page behind it does, which having a
          // winner list is not: a chain room lists its winners right below and
          // still has no result to open. Offering it anyway lands on "Belum ada
          // hasil kocok, kunci room dan jalankan kocok lebih dulu", false twice
          // over for a finished room nobody here can sign for.
          <><span className="panel-icon"><Trophy size={27} weight="regular" /></span><div><h2>Semua putaran selesai</h2><p>{history.length ? "Setiap anggota sudah mendapat giliran dan riwayat pemenang tetap tersimpan." : "Setiap anggota sudah mendapat giliran. Daftar pemenangnya tidak bisa dibaca dari kontrak saat ini."}</p></div>{hasResultPage ? <Button onClick={() => navigate(`/app/room/${room.id}/hasil`)}>Lihat hasil terakhir</Button> : null}</>
        ) : null}
        {room.status === "funding" ? (
          <><span className="panel-icon"><UsersThree size={27} weight="regular" /></span><div><h2>Menunggu anggota</h2><p>{room.paidCount} dari {room.memberLimit} anggota sudah masuk ke room.</p></div><Button variant="outline" onClick={copyCode} icon={<Copy size={20} />}>{copied ? "Kode tersalin" : `Salin ${room.code}`}</Button></>
        ) : null}
      </section>

      <section className="winner-history-section">
        <div className="section-heading-row"><div><p className="eyebrow">Tidak ada yang terlewat</p><h2>Riwayat pemenang</h2></div><Trophy size={25} /></div>
        {history.length ? (
          <ol className="winner-history-list">
            {history.slice().sort((a, b) => a.round - b.round).map((item) => (
              <li key={`${item.round}-${item.winner}`}>
                <span>{item.round}</span>
                <div><strong>{item.winner}</strong><small>Putaran {item.round}, {item.timestamp || "tercatat"}</small></div>
                <CheckCircle size={20} weight="fill" />
              </li>
            ))}
            {cycleOver ? null : <li className="next-round"><span>{room.round}</span><div><strong>Putaran berikutnya</strong><small>{formatSchedule(scheduledAt)}</small></div><Clock size={20} /></li>}
          </ol>
        ) : (
          <div className="history-empty"><DiceFive size={25} /><div><strong>Belum ada pemenang</strong><p>Pemenang putaran pertama akan muncul di sini setelah jadwal kocok tiba.</p></div></div>
        )}
      </section>

      <section className="rules-section" id="aturan">
        <h2>Aturan room</h2>
        <dl><div><dt>Setoran per putaran</dt><dd>{formatMoney({ stroops: room.onChainShareStroops, rupiah: room.contribution })}</dd></div><div><dt>Anggota</dt><dd>{room.memberLimit} orang</dd></div><div><dt>Putaran</dt><dd>{room.round} dari {room.memberLimit}</dd></div><div><dt>Jadwal kocok</dt><dd>{formatSchedule(scheduledAt)}</dd></div>{/* Same claim as the schedule card, same answer, and the label goes with it: a chain room cannot answer "Persetujuan" at all, and a row that asks it anyway needs something to print. Who set the schedule is a question both kinds of room can answer. */}<div><dt>{room.scheduleAgreed ? "Persetujuan" : "Penetapan jadwal"}</dt><dd>{room.scheduleAgreed ? "Disepakati anggota" : "Ditetapkan host"}</dd></div><div><dt>Host</dt><dd>{room.host}</dd></div></dl>
      </section>

      <ConfirmDialog
        open={confirmOpen}
        title="Kunci room ini?"
        body={`Setelah dikunci, anggota dan nominal tidak dapat diubah. Kocok tetap baru terbuka sesuai jadwal ${formatSchedule(scheduledAt)}.`}
        confirmLabel="Ya, kunci room"
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmSeal}
      />
      {submitting ? <div className="transaction-overlay" role="status">Mengirim transaksi ke smart contract...</div> : null}
      {preparingDemo ? <TransactionProgress memberLimit={room.memberLimit} /> : null}
    </div>
  );
}

export function DrawPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { getRoom, completeDraw } = useDemo();
  const room = getRoom(roomId);
  const [drawing, setDrawing] = useState(false);
  const [error, setError] = useState("");
  const [rollingIndex, setRollingIndex] = useState(0);
  const [drawStage, setDrawStage] = useState(0);
  const [activeRound, setActiveRound] = useState(room?.round || 1);
  const [frozenCandidates, setFrozenCandidates] = useState([]);
  const [finalRecipientAtStart, setFinalRecipientAtStart] = useState(false);
  const [drawNow, setDrawNow] = useState(Date.now());

  const previousWinners = new Set(room?.history?.map((item) => item.winner) || []);
  const candidates = room?.members?.filter((member) => !previousWinners.has(member.name)) || [];
  const rollingCandidates = drawing && frozenCandidates.length ? frozenCandidates : candidates;
  const isFinalRecipient = candidates.length === 1;
  const finalFlowActive = drawing ? finalRecipientAtStart : isFinalRecipient;
  const finalRecipient = (drawing ? frozenCandidates[0] : candidates[0]) || null;
  const drawSchedule = room?.nextKocok
    ? new Date(room.nextKocok * 1000)
    : room?.drawAt
      ? new Date(room.drawAt)
      : null;
  const drawOpen = !drawSchedule || Number.isNaN(drawSchedule.getTime()) || drawNow >= drawSchedule.getTime();
  const drawWait = drawSchedule && !Number.isNaN(drawSchedule.getTime()) ? drawSchedule.getTime() - drawNow : 0;

  useEffect(() => {
    if (drawOpen) return undefined;
    const timer = window.setInterval(() => setDrawNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [drawOpen]);

  useEffect(() => {
    if (!drawing) return undefined;
    const rollTimer = !finalRecipientAtStart && rollingCandidates.length
      ? window.setInterval(() => setRollingIndex((current) => (current + 1) % rollingCandidates.length), 115)
      : null;
    const stageTimers = [
      window.setTimeout(() => setDrawStage(1), 850),
      window.setTimeout(() => setDrawStage(2), 1800),
    ];
    return () => {
      if (rollTimer) window.clearInterval(rollTimer);
      stageTimers.forEach(window.clearTimeout);
    };
  }, [drawing, finalRecipientAtStart, rollingCandidates.length]);

  if (!room) return <MissingRoom />;
  // This page's whole premise is that a round is waiting to be drawn, and until
  // now nothing checked it. `sealed` is the room's own record of exactly that,
  // and it is the same question RoomPage already answers before it offers the
  // only button that leads here (:665) — so every other status arrives by URL
  // alone, and a URL survives a bookmark and a reload.
  //
  // Each one made this page lie differently. `paid` is every round drawn, and
  // this is a prefund arisan (lib.rs:7-9), so /app/room/stellar-6/kocok printed
  // "Semua nama punya peluang yang sama" and "Pool Rp3.000.000 tersedia" over a
  // room the contract holds nothing for, with "0 anggota yang belum menang"
  // between them, and an enabled "Kocok sekarang" whose POST /draw the gateway
  // does not even refuse — room 6's schedule is long past, so it falls through
  // the 409 (testnet-gateway.mjs:225-237) and spends a real kocok on a `Done`
  // room. `ready` and `funding` are the contract's `Open`: not started, nothing
  // to draw, and both printed "Daftar anggota terkunci" over a list their own
  // detail panel says is not locked yet (:663).
  //
  // Back to the room rather than a panel of new sentences: the detail page
  // already says the true thing at each of these statuses, and it is the one
  // that gets corrected when the room moves. `replace` so Back does not land
  // straight back in here.
  //
  // `drawing` is the exception, and it is load-bearing: completeDraw flips the
  // room to "paid" (demo-state.jsx:365) while startDraw is still inside its
  // 2.800ms await, so on the LAST round of every room that completes, the status
  // is already "paid" for the rest of the draw — the animation, the payment, and
  // the navigate to /hasil after it. Asking status alone here would fire
  // mid-payment on the gateway's own path.
  if (!drawing && room.status !== "sealed") return <Navigate to={`/app/room/${room.id}`} replace />;

  async function startDraw() {
    if (!drawOpen) {
      setError(`Kocok baru terbuka ${formatSchedule(drawSchedule)}.`);
      return;
    }
    setActiveRound(room.round);
    setFrozenCandidates(candidates);
    setFinalRecipientAtStart(isFinalRecipient);
    setRollingIndex(0);
    setDrawing(true);
    setDrawStage(0);
    setError("");
    try {
      await Promise.all([
        completeDraw(room.id),
        new Promise((resolve) => window.setTimeout(resolve, 2800)),
      ]);
      navigate(`/app/room/${room.id}/hasil`);
    } catch (requestError) {
      setError(requestError.message);
      setDrawing(false);
    }
  }

  const drawHeading = drawing
    ? finalFlowActive
      ? ["Mencatat giliran terakhir...", "Mengirim pembayaran...", "Menyelesaikan siklus..."][drawStage]
      : ["Nama sedang diacak...", "Hasil sedang dikunci...", "Menyiapkan kejutan..."][drawStage]
    : !drawOpen
      ? "Belum waktunya kocok."
      : finalFlowActive
        ? "Giliran terakhir sudah pasti."
        : "Semua nama punya peluang yang sama.";

  const drawDescription = drawing
    ? finalFlowActive
      ? room.source === "stellar"
        ? `Smart contract sedang mencatat ${finalRecipient?.name || "penerima terakhir"} dan mengirim pembayaran di Testnet.`
        : `Simulasi sedang mencatat ${finalRecipient?.name || "penerima terakhir"} dan menyelesaikan siklus.`
      : room.source === "stellar"
        ? "Smart contract sedang menyegel hasil dan membayar pemenang di Testnet."
        : "Hasil simulasi sedang disiapkan di perangkat ini."
    : !drawOpen
      ? `Tombol aktif otomatis dalam ${formatCountdown(drawWait)}, pada ${formatSchedule(drawSchedule)}.`
      : finalFlowActive
        ? "Semua anggota lain sudah mendapat giliran. Tidak ada lagi nama yang perlu diacak, tetapi pembayaran dan bukti putaran terakhir tetap harus diproses."
        : `${candidates.length} anggota yang belum menang ikut pada putaran ini. Host tidak dapat memilih hasil.`;

  return (
    <div className="app-page focused-page draw-page">
      <PageHeader title="Kocok putaran" eyebrow={`${room.name}, putaran ${drawing ? activeRound : room.round}`} backTo={`/app/room/${room.id}`} />
      <div className="draw-content">
        {room.source === "stellar" ? <TestnetPill compact /> : <span className="source-label">Simulasi lokal</span>}
        <motion.div
          className={`draw-motif${drawing ? " drawing" : ""}${finalFlowActive ? " final-recipient" : ""}`}
          animate={drawing && !finalFlowActive ? { rotate: [0, -12, 14, -8, 10, 0], y: [0, -8, 0] } : { rotate: 0, y: 0, scale: drawing ? [1, 1.035, 1] : 1 }}
          transition={drawing ? { duration: finalFlowActive ? 1.1 : 0.62, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}
        >
          <span>{finalFlowActive ? <Trophy size={52} weight="regular" aria-hidden="true" /> : <DiceFive size={52} weight="regular" aria-hidden="true" />}</span>
        </motion.div>
        {finalFlowActive && finalRecipient ? <div className="rolling-name final-recipient-name"><CheckCircle size={18} weight="fill" /> {finalRecipient.name}</div> : null}
        {drawing && !finalFlowActive ? <motion.div className="rolling-name" key={rollingCandidates[rollingIndex]?.id || rollingIndex} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>{rollingCandidates[rollingIndex]?.name || "Mengacak nama"}</motion.div> : null}
        <h1>{drawHeading}</h1>
        <p>{drawDescription}</p>
        {!drawing ? (
          // Both "Pool ... tersedia" rows below used to pass poolStroops
          // alongside the Rupiah. Same dead field as the room detail's
          // lockedStroops: only stellar-rpc.js:493 writes poolStroops, App.jsx:29
          // routes every room that has one to ChainBoard, and formatMoney would
          // have taken the Rupiah over it anyway (demo-state.jsx:523). Both are
          // named bare, without the binding in front, on purpose: readsOff
          // (field-contract.test.js:273) censuses this file for field reads and
          // deliberately does not strip comments (:267), so writing the prefixed
          // form here would hand its census a reader that no longer exists.
          <div className="draw-proof-list">
            {finalFlowActive ? (
              <>
                <span><Check size={17} weight="bold" /> {room.history?.length || 0} anggota sudah menerima giliran</span>
                <span><Check size={17} weight="bold" /> Riwayat menetapkan penerima terakhir</span>
                <span><Check size={17} weight="bold" /> Pool {formatMoney({ rupiah: room.pool })} tersedia</span>
                <span><Check size={17} weight="bold" /> {room.source === "stellar" ? "Pembayaran tetap dijalankan smart contract" : "Putaran akhir tetap dicatat lokal"}</span>
              </>
            ) : (
              <>
                <span><Check size={17} weight="bold" /> Daftar anggota terkunci</span>
                <span><Check size={17} weight="bold" /> Pool {formatMoney({ rupiah: room.pool })} tersedia</span>
                <span><Check size={17} weight="bold" /> Jadwal kocok sudah disepakati</span>
                <span><Check size={17} weight="bold" /> Pemenang sebelumnya tidak diikutkan lagi</span>
              </>
            )}
          </div>
        ) : <div className="draw-loader"><span /><span /><span /></div>}
        {error ? <p className="action-error" role="alert">{error}</p> : null}
      </div>
      <div className="sticky-actions single-action"><Button onClick={startDraw} disabled={drawing || !drawOpen} icon={finalFlowActive ? <SealCheck size={20} /> : <DiceFive size={20} />}>{drawing ? (finalFlowActive ? "Memproses putaran akhir" : "Sedang mengocok") : drawOpen ? (finalFlowActive ? "Selesaikan putaran dan bayar" : "Kocok sekarang") : `Tunggu ${formatCountdown(drawWait)}`}</Button></div>
    </div>
  );
}

export function ResultPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { getRoom, state } = useDemo();
  const room = getRoom(roomId);
  const result = (state.drawResult?.roomId === roomId ? state.drawResult : null) || room?.result || (room?.winner ? {
    roomId,
    roomName: room.name,
    round: room.round,
    winner: room.winner,
    firstName: room.winner.split(" ")[0],
    amount: room.pool,
    participants: room.memberLimit,
    transactionId: "local-a3f9b8421d7e0c21",
    timestamp: "15 Juli 2026, 19.32 WIB",
    source: "local",
  } : null);

  if (!room || !result) return <MissingResult roomId={roomId} />;

  const isComplete = result.isComplete ?? result.round >= room.memberLimit;

  return (
    <div className="app-page focused-page result-page">
      <div className="confetti-layer" aria-hidden="true">
        {celebrationPieces.map((piece) => <motion.span key={piece.id} style={{ left: piece.left }} initial={{ y: -30, opacity: 0, rotate: 0 }} animate={{ y: 580, opacity: [0, 1, 1, 0], rotate: piece.rotate + 280 }} transition={{ duration: 2.5, delay: piece.delay, ease: "easeOut" }} />)}
      </div>
      <PageHeader title={isComplete ? "Siklus selesai" : "Hasil kocok"} backTo={`/app/room/${room.id}`} action={result.source === "stellar" ? <TestnetPill compact /> : <span className="source-label">Lokal</span>} />
      <section className="result-hero">
        <motion.div className="celebration-mark" initial={{ scale: 0.4, rotate: -18, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 220, damping: 14 }}><Confetti size={28} weight="fill" /></motion.div>
        <p className="eyebrow">{isComplete ? `Putaran terakhir, ${result.round} dari ${room.memberLimit}` : `Putaran ${result.round} dari ${room.memberLimit}`}</p>
        <h1>{isComplete ? "Siklus Awrisan selesai!" : `Selamat, ${result.firstName}!`}</h1>
        <strong className="winner-announcement">{isComplete ? `${result.firstName} menerima giliran terakhir` : `Mendapat giliran putaran ${result.round}`}</strong>
        <p>{result.source === "stellar" ? `${formatRupiah(result.amount)} direpresentasikan oleh pembayaran Testnet XLM ke dompet ${result.firstName}.` : `${result.firstName} dipilih dalam simulasi bernilai ${formatRupiah(result.amount)}.`}</p>
        <motion.div className="winner-motif" initial={{ scale: 0.65, opacity: 0 }} animate={{ scale: [0.65, 1.08, 1], opacity: 1 }} transition={{ duration: 0.65, delay: 0.18 }}><span>{result.firstName.charAt(0)}</span><Trophy size={31} weight="fill" /></motion.div>
        <div className="celebration-copy"><Sparkle size={18} weight="fill" /> {isComplete ? "Semua anggota sudah menerima tepat satu kali" : "Pemenang tersimpan di riwayat room"} <Sparkle size={18} weight="fill" /></div>
      </section>
      <section className="proof-panel">
        <div className="proof-title"><ShieldCheck size={25} weight="regular" /><h2>{result.source === "stellar" ? (isComplete ? "Bukti putaran terakhir tercatat di Stellar" : "Bukti kocok tercatat di Stellar") : (isComplete ? "Putaran terakhir tercatat lokal" : "Hasil simulasi tercatat lokal")}</h2></div>
        <dl>
          <div><dt><Sparkle size={20} /> Nomor putaran</dt><dd>{result.round}</dd></div>
          <div><dt><UsersThree size={20} /> Peserta</dt><dd>{result.participants}</dd></div>
          <div><dt><CheckCircle size={20} /> Status pembayaran</dt><dd className="success-text">Berhasil</dd></div>
          <div><dt><Receipt size={20} /> ID transaksi</dt><dd>{result.transactionId.slice(0, 4)}...{result.transactionId.slice(-4)}</dd></div>
        </dl>
        <button className="text-button" type="button" onClick={() => navigate(`/app/room/${room.id}/tanda-terima`)}>Lihat detail transaksi</button>
      </section>
      <div className="result-actions"><Button onClick={() => navigate(`/app/room/${room.id}/tanda-terima`)}>Lihat tanda terima</Button><Button variant="outline" onClick={() => navigate(`/app/room/${room.id}`)}>{isComplete ? "Lihat seluruh riwayat" : `Lihat jadwal putaran ${result.round + 1}`}</Button></div>
    </div>
  );
}

export function ReceiptPage() {
  const { roomId } = useParams();
  const { getRoom, state } = useDemo();
  const room = getRoom(roomId);
  const result = (state.drawResult?.roomId === roomId ? state.drawResult : null) || room?.result;

  if (!room || !result) return <MissingResult roomId={roomId} />;

  return (
    <div className="app-page focused-page receipt-page">
      <PageHeader title="Tanda terima" backTo={`/app/room/${room.id}/hasil`} />
      <section className="receipt-card">
        {/* Ask `result.source`, which is what every other string on this card
            already asks. This one line did not, so it made the same claim on
            both kinds of receipt — and the card then contradicted itself in
            three places: /app/room/rt-08/tanda-terima printed "Pembayaran
            testnet berhasil" over "Jaringan: Simulasi lokal", the transaction id
            `local-rt08-round-3`, and its own footer ("Dokumen ini dibuat lokal
            dan tidak mewakili perpindahan uang sungguhan"). No testnet payment
            happened: a local room is this app's own simulation and completeDraw
            mints its result in the browser (demo-state.jsx:341-357), transaction
            id included.
            Not deleted, because on the gateway path the sentence is TRUE and it
            is the project's existing evidence: the same card at
            /app/room/stellar-6/tanda-terima carries transaction
            0208a1fc9fd173ada365af082885703a65ba2b62cf1884d35aa375ea4387d58d and
            links it to stellar.expert. Both rooms were read from `node
            server/testnet-gateway.mjs` in a browser (2026-07-17). One sentence,
            two rooms, and only the room can say which. */}
        <div className="receipt-success"><span><Check size={28} weight="bold" /></span><p>{result.source === "stellar" ? "Pembayaran testnet berhasil" : "Giliran simulasi tercatat"}</p><h1>{formatRupiah(result.amount)}</h1></div>
        <div className="receipt-divider" />
        <dl>
          <div><dt>Penerima</dt><dd>{result.winner}</dd></div>
          <div><dt>Room</dt><dd>{result.roomName}</dd></div>
          <div><dt>Putaran</dt><dd>{result.round} dari {result.participants}</dd></div>
          <div><dt>Waktu</dt><dd>{result.timestamp}</dd></div>
          <div><dt>Jaringan</dt><dd>{result.source === "stellar" ? "Stellar Testnet" : "Simulasi lokal"}</dd></div>
          <div><dt>ID transaksi</dt><dd className="mono">{result.transactionId}</dd></div>
        </dl>
        {result.source === "stellar" ? <InfoStrip title="Bukti transaksi Testnet" icon={ShieldCheck}>Transaksi memakai aset sandbox tanpa nilai nyata. <a href={`https://stellar.expert/explorer/testnet/tx/${result.transactionId}`} target="_blank" rel="noreferrer">Periksa di Stellar Expert</a>.</InfoStrip> : <InfoStrip title="Tanda terima simulasi" icon={ShieldCheck}>Dokumen ini dibuat lokal dan tidak mewakili perpindahan uang sungguhan.</InfoStrip>}
      </section>
      <Button to={`/app/room/${room.id}`} variant="outline" className="button-full">Selesai</Button>
    </div>
  );
}

export function ActivityPage() {
  const { state } = useDemo();
  const icons = { deposit: CreditCard, verified: IdentificationCard, locked: LockKey, draw: Sparkle, room: UsersThree };
  return (
    <div className="app-page activity-page">
      {/* Not "Semua perubahan penting", and not "Jejak yang dapat diperiksa".
          Every row on this page is minted in the browser — demo-state's sealRoom,
          completeDraw and createRoom each unshift one (demo-state.jsx:269, :328,
          :347, :392), plus the two seeded at :131-145 — and the read path mints
          none at all. So the page claimed completeness and examinability over two
          hardcoded demo lines while the home screen listed the contract's rooms
          and the kocoks they have already paid.
          Including those is not the fix available here: an activity row is a
          title, a detail and a TIME, and the contract records who won a round and
          never when. kocok stores Won and Winner and no timestamp (lib.rs:586-591)
          and seal_of (:782) hands back the PRNG seed, so every chain row would
          need a moment invented for it. The claim goes; the rows stay. */}
      <div className="standard-page-heading"><p className="eyebrow">Aktivitas perangkat ini</p><h1>Aktivitas</h1><p>Aksi yang dijalankan dari perangkat ini. Room on-chain di beranda tidak menambah baris di sini.</p></div>
      <div className="activity-list">
        {state.activities.map((activity) => {
          const Icon = icons[activity.kind] || ListChecks;
          return <div className="activity-item" key={activity.id}><span><Icon size={22} weight="regular" /></span><div><strong>{activity.title}</strong><p>{activity.detail}</p><small>{activity.time}</small></div></div>;
        })}
      </div>
    </div>
  );
}

export function ProfilePage() {
  const { state, resetDemo } = useDemo();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="app-page profile-page">
      <div className="standard-page-heading"><p className="eyebrow">Akun sandbox</p><h1>Profil</h1></div>
      <section className="profile-card"><span className="large-avatar">D</span><div><h2>{state.profile.name}</h2><p>{state.profile.email}</p><span><SealCheck size={17} weight="regular" /> Identitas sandbox terverifikasi</span></div></section>
      <section className="profile-list">
        <div><span><Wallet size={21} /></span><div><strong>Dompet sandbox</strong><p>{state.network.members?.[0] ? shortId(state.network.members[0].address) : "Belum terhubung"}</p></div></div>
        <div><span><ShieldCheck size={21} /></span><div><strong>{state.network.connected ? "Smart contract aktif" : "Mode simulasi"}</strong><p>{state.network.connected ? shortId(state.network.contractId) : "Tidak ada aset sungguhan"}</p></div></div>
        <div><span><UserCircle size={21} /></span><div><strong>Peran</strong><p>Host dan anggota demo</p></div></div>
      </section>
      <button className="danger-button" type="button" onClick={() => setConfirming(true)}><SignOut size={20} /> Reset semua data demo</button>
      <ConfirmDialog open={confirming} icon={WarningCircle} title="Reset data demo?" body="Semua room, hasil kocok, dan aktivitas lokal akan kembali ke kondisi awal." confirmLabel="Reset demo" onClose={() => setConfirming(false)} onConfirm={() => { resetDemo(); setConfirming(false); navigate("/app"); }} />
    </div>
  );
}

function MissingRoom() {
  return (
    <div className="empty-state"><span><WarningCircle size={34} /></span><h1>Room tidak ditemukan</h1><p>Room ini mungkin sudah dihapus dari data lokal.</p><Button to="/app">Kembali ke beranda</Button></div>
  );
}

function MissingResult({ roomId }) {
  return (
    <div className="empty-state"><span><Clock size={34} /></span><h1>Belum ada hasil kocok</h1><p>Kunci room dan jalankan kocok lebih dulu.</p><Button to={`/app/room/${roomId}`}>Kembali ke room</Button></div>
  );
}

function shortId(value) {
  if (!value) return "belum tersedia";
  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}
