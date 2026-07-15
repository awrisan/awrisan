import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "motion/react";
import {
  ArrowRight,
  CalendarBlank,
  Check,
  CheckCircle,
  Clock,
  Copy,
  CreditCard,
  IdentificationCard,
  LinkSimple,
  ListChecks,
  LockKey,
  Plus,
  Receipt,
  SealCheck,
  ShieldCheck,
  SignOut,
  Sparkle,
  UserCircle,
  UsersThree,
  Wallet,
  WarningCircle,
} from "@phosphor-icons/react";
import { formatRupiah, useDemo } from "../demo-state.jsx";
import {
  Button,
  ConfirmDialog,
  FormField,
  InfoStrip,
  InlineNotice,
  PageHeader,
  PhaseTracker,
  StatusBadge,
  TestnetPill,
  TrustPanel,
} from "../ui.jsx";

export function HomePage() {
  const { state } = useDemo();
  const lockedTotal = state.rooms
    .filter((room) => room.source === "stellar" && room.status !== "funding")
    .reduce((total, room) => total + room.pool, 0);

  return (
    <div className="app-page home-page">
      <header className="home-header">
        <div><h1><span>Selamat sore, </span>{state.profile.firstName}</h1></div>
        <Link className="profile-avatar" to="/app/profil" aria-label="Buka profil Dina">D</Link>
      </header>
      <TestnetPill compact />

      <InlineNotice
        title={state.network.connected ? "Smart contract Testnet terhubung" : state.network.mode === "checking" ? "Memeriksa koneksi" : "Mode simulasi lokal"}
        tone={state.network.connected ? "success" : "neutral"}
      >
        {state.network.connected
          ? `Contract ${shortId(state.network.contractId)} siap menerima transaksi sandbox.`
          : state.network.message}
      </InlineNotice>

      <section className="safe-balance">
        <span><LockKey size={30} weight="regular" aria-hidden="true" /></span>
        <div><p>Nilai room on-chain</p><strong>{formatRupiah(lockedTotal)}</strong><small>{state.network.connected ? "terkunci di Stellar Testnet" : "belum ada transaksi blockchain"}</small></div>
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
        <span><CalendarBlank size={18} aria-hidden="true" /> {room.nextDate}</span>
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
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "Arisan Sahabat",
    memberLimit: "3",
    contribution: "1000000",
    startDate: "1 Agustus 2026",
  });

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function next() {
    if (step === 1 && form.name.trim().length < 3) {
      setError("Nama room minimal 3 karakter.");
      return;
    }
    if (step === 2 && (Number(form.memberLimit) < 3 || Number(form.contribution) < 10000)) {
      setError("Gunakan minimal 3 anggota dan setoran minimal Rp10.000.");
      return;
    }
    if (step === 2 && state.network.connected && Number(form.memberLimit) !== state.network.members.length) {
      setError(`Demo on-chain memakai tepat ${state.network.members.length} identitas sandbox.`);
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
            <h2>Mulai dari lingkarannya</h2>
            <p>Beri nama yang langsung dikenali oleh anggota Anda.</p>
            <FormField label="Nama room" error={error}><input value={form.name} onChange={(event) => update("name", event.target.value)} /></FormField>
            <FormField label="Tanggal mulai" hint="Tanggal ini menjadi pengingat putaran pertama."><input value={form.startDate} onChange={(event) => update("startDate", event.target.value)} /></FormField>
          </>
        ) : null}
        {step === 2 ? (
          <>
            <h2>Tetapkan aturan setoran</h2>
            <p>Aturan akan ditampilkan kepada anggota sebelum mereka bergabung.</p>
            <div className="form-grid">
              <FormField label="Jumlah anggota" error={error}><input type="number" min="3" max="20" value={form.memberLimit} onChange={(event) => update("memberLimit", event.target.value)} /></FormField>
              <FormField label="Setoran per anggota"><input type="number" min="10000" step="10000" value={form.contribution} onChange={(event) => update("contribution", event.target.value)} /></FormField>
            </div>
            <InfoStrip title="Pool tidak dipegang host" icon={LockKey}>{state.network.connected ? "Tiga identitas sandbox akan mengunci Testnet XLM langsung di smart contract. Nilai IDR di layar hanya menjelaskan aturan arisan." : "Gateway belum terhubung. Room ini akan disimpan sebagai simulasi lokal dan tidak mengirim dana."}</InfoStrip>
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
              <div><dt>Mulai</dt><dd>{form.startDate}</dd></div>
            </dl>
            <InlineNotice title={state.network.connected ? "Akan dikirim ke Stellar Testnet" : "Simulasi lokal"} tone={state.network.connected ? "success" : "neutral"}>{state.network.connected ? `Pembuatan room dan prefund tiga anggota akan ditandatangani gateway sandbox pada contract ${shortId(state.network.contractId)}.` : "Room dan kode undangan disimpan di perangkat ini. Tidak ada transaksi blockchain yang dikirim."}</InlineNotice>
            {error ? <p className="action-error" role="alert">{error}</p> : null}
          </>
        ) : null}
      </section>
      <div className="sticky-actions">
        {step > 1 ? <Button variant="ghost" onClick={() => setStep((current) => current - 1)}>Kembali</Button> : <span />}
        <Button onClick={next} disabled={submitting}>{submitting ? "Mengirim transaksi..." : step === 3 ? "Buat room" : "Lanjutkan"}</Button>
      </div>
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
            <div><small>Room ditemukan</small><h3>{found.name}</h3><p>{found.memberLimit} anggota, {formatRupiah(found.contribution)} per putaran</p></div>
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
  const { getRoom, sealRoom } = useDemo();
  const room = getRoom(roomId);
  const [showAll, setShowAll] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!room) return <MissingRoom />;

  const trackerStatus = room.status === "ready" ? "sealed" : room.status;
  const visibleMembers = showAll ? room.members : room.members.slice(0, 4);

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

  return (
    <div className="app-page room-page">
      <PageHeader title={room.name} backTo="/app" action={room.source === "stellar" ? <TestnetPill compact /> : <span className="source-label">Lokal</span>} />
      <TrustPanel
        amount={formatRupiah(room.pool)}
        paidCount={room.paidCount}
        memberLimit={room.memberLimit}
        label={room.source === "stellar" ? (room.status === "sealed" || room.status === "paid" ? "Pool terkunci" : "Pool terkumpul") : "Nilai simulasi"}
      />
      <PhaseTracker active={trackerStatus} />

      <InlineNotice title={room.source === "stellar" ? "Room Stellar Testnet" : "Room simulasi lokal"} tone={room.source === "stellar" ? "success" : "neutral"}>{room.source === "stellar" ? `Contract ${shortId(room.contractId)} memegang Testnet XLM. Nilai IDR adalah representasi aturan room.` : "Room ini tidak berada di blockchain dan tidak menyimpan dana sungguhan."}</InlineNotice>
      {actionError ? <p className="action-error" role="alert">{actionError}</p> : null}

      {room.status === "funding" ? (
        <InlineNotice title="Bagikan kode ke anggota" icon={Copy}>Room akan siap dikunci setelah semua anggota menyetor.</InlineNotice>
      ) : null}

      <section className="member-section">
        <div className="section-heading-row"><div><p className="eyebrow">Daftar transparan</p><h2>Anggota dan setoran</h2></div><StatusBadge status={room.status} /></div>
        <div className="member-list">
          {visibleMembers.map((member) => (
            <div className="member-row" key={member.id}>
              <span className="member-avatar">{member.name.charAt(0)}</span>
              <div><strong>{member.name}</strong><small>{member.paid ? formatRupiah(member.amount) : "Belum setor"}</small></div>
              <span className={member.paid ? "paid-label" : "waiting-label"}>{member.paid ? <><Check size={15} weight="bold" /> Sudah setor</> : <><Clock size={15} /> Menunggu</>}</span>
            </div>
          ))}
        </div>
        {room.members.length > 5 ? <button className="text-button" type="button" onClick={() => setShowAll((current) => !current)}>{showAll ? "Tampilkan lebih sedikit" : `Lihat semua ${room.members.length} anggota`}</button> : null}
      </section>

      <section className="room-action-panel">
        {room.status === "ready" ? (
          <><span className="panel-icon"><ShieldCheck size={27} weight="regular" /></span><div><h2>Semua dana sudah masuk</h2><p>Kunci room agar daftar anggota dan nominal tidak dapat diubah.</p></div><Button onClick={() => setConfirmOpen(true)} icon={<LockKey size={20} weight="regular" />}>Kunci room</Button><a href="#aturan">Lihat aturan</a></>
        ) : null}
        {room.status === "sealed" ? (
          <><span className="panel-icon"><Sparkle size={27} weight="regular" /></span><div><h2>Room siap dikocok</h2><p>{room.source === "stellar" ? "Hasil akan dicatat dan Testnet XLM dibayar otomatis." : "Hasil simulasi hanya akan disimpan di perangkat ini."}</p></div><Button onClick={() => navigate(`/app/room/${room.id}/kocok`)} icon={<Sparkle size={20} weight="regular" />}>Mulai kocok</Button><a href="#aturan">Lihat aturan</a></>
        ) : null}
        {room.status === "paid" ? (
          <><span className="panel-icon"><Receipt size={27} weight="regular" /></span><div><h2>Putaran sudah selesai</h2><p>{room.source === "stellar" ? `${room.winner} menerima pembayaran Testnet pada putaran ini.` : `${room.winner} terpilih dalam simulasi lokal.`}</p></div><Button onClick={() => navigate(`/app/room/${room.id}/hasil`)}>Lihat hasil</Button></>
        ) : null}
        {room.status === "funding" ? (
          <><span className="panel-icon"><UsersThree size={27} weight="regular" /></span><div><h2>Menunggu anggota</h2><p>{room.paidCount} dari {room.memberLimit} anggota sudah masuk ke room.</p></div><Button variant="outline" onClick={copyCode} icon={<Copy size={20} />}>{copied ? "Kode tersalin" : `Salin ${room.code}`}</Button></>
        ) : null}
      </section>

      <section className="rules-section" id="aturan">
        <h2>Aturan room</h2>
        <dl><div><dt>Setoran</dt><dd>{formatRupiah(room.contribution)}</dd></div><div><dt>Anggota</dt><dd>{room.memberLimit} orang</dd></div><div><dt>Putaran</dt><dd>{room.round} dari {room.memberLimit}</dd></div><div><dt>Host</dt><dd>{room.host}</dd></div></dl>
      </section>

      <ConfirmDialog
        open={confirmOpen}
        title="Kunci room ini?"
        body="Setelah dikunci, anggota dan nominal tidak dapat diubah. Pastikan semua orang sudah menyetujui aturan."
        confirmLabel="Ya, kunci room"
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmSeal}
      />
      {submitting ? <div className="transaction-overlay" role="status">Mengirim transaksi ke smart contract...</div> : null}
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

  if (!room) return <MissingRoom />;

  async function startDraw() {
    setDrawing(true);
    setError("");
    try {
      await Promise.all([
        completeDraw(room.id),
        new Promise((resolve) => window.setTimeout(resolve, 900)),
      ]);
      navigate(`/app/room/${room.id}/hasil`);
    } catch (requestError) {
      setError(requestError.message);
      setDrawing(false);
    }
  }

  return (
    <div className="app-page focused-page draw-page">
      <PageHeader title="Kocok putaran" eyebrow={`${room.name}, putaran ${room.round}`} backTo={`/app/room/${room.id}`} />
      <div className="draw-content">
        <TestnetPill compact />
        <motion.div className={`draw-motif${drawing ? " drawing" : ""}`} animate={drawing ? { rotate: 360 } : { rotate: 0 }} transition={{ duration: 1.4, ease: "easeInOut" }}>
          <span><Sparkle size={46} weight="regular" aria-hidden="true" /></span>
        </motion.div>
        <h1>{drawing ? "Sedang mengocok..." : "Semua nama punya peluang yang sama."}</h1>
        <p>{drawing ? (room.source === "stellar" ? "Dua transaksi sedang menyegel hasil dan membayar pemenang di Testnet." : "Hasil simulasi sedang disiapkan di perangkat ini.") : `${room.memberLimit} anggota sudah terkunci. Hasil tidak dapat diubah oleh host.`}</p>
        {!drawing ? (
          <div className="draw-proof-list">
            <span><Check size={17} weight="bold" /> Daftar anggota terkunci</span>
            <span><Check size={17} weight="bold" /> Pool {formatRupiah(room.pool)} tersedia</span>
            <span><Check size={17} weight="bold" /> Bukti hasil akan dicatat</span>
          </div>
        ) : <div className="draw-loader"><span /><span /><span /></div>}
        {error ? <p className="action-error" role="alert">{error}</p> : null}
      </div>
      <div className="sticky-actions single-action"><Button onClick={startDraw} disabled={drawing} icon={<Sparkle size={20} />}>{drawing ? "Memproses" : "Kocok sekarang"}</Button></div>
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

  return (
    <div className="app-page focused-page result-page">
      <PageHeader title="Hasil kocok" backTo={`/app/room/${room.id}`} action={<TestnetPill compact />} />
      <section className="result-hero">
        <p className="eyebrow">Putaran {result.round} dari {room.memberLimit}</p>
        <h1>{result.firstName} mendapat giliran</h1>
        <p>{result.source === "stellar" ? `${formatRupiah(result.amount)} direpresentasikan oleh pembayaran Testnet XLM ke dompet ${result.firstName}.` : `${result.firstName} dipilih dalam simulasi bernilai ${formatRupiah(result.amount)}.`}</p>
        <div className="winner-motif"><span>{result.firstName.charAt(0)}</span></div>
      </section>
      <section className="proof-panel">
        <div className="proof-title"><ShieldCheck size={25} weight="regular" /><h2>{result.source === "stellar" ? "Bukti kocok tercatat di Stellar" : "Hasil simulasi tercatat lokal"}</h2></div>
        <dl>
          <div><dt><Sparkle size={20} /> Nomor putaran</dt><dd>{result.round}</dd></div>
          <div><dt><UsersThree size={20} /> Peserta</dt><dd>{result.participants}</dd></div>
          <div><dt><CheckCircle size={20} /> Status pembayaran</dt><dd className="success-text">Berhasil</dd></div>
          <div><dt><Receipt size={20} /> ID transaksi</dt><dd>{result.transactionId.slice(0, 4)}...{result.transactionId.slice(-4)}</dd></div>
        </dl>
        <button className="text-button" type="button" onClick={() => navigate(`/app/room/${room.id}/tanda-terima`)}>Lihat detail transaksi</button>
      </section>
      <div className="result-actions"><Button onClick={() => navigate(`/app/room/${room.id}/tanda-terima`)}>Lihat tanda terima</Button><Button variant="outline" onClick={() => navigate(`/app/room/${room.id}`)}>Kembali ke room</Button></div>
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
        <div className="receipt-success"><span><Check size={28} weight="bold" /></span><p>Pembayaran testnet berhasil</p><h1>{formatRupiah(result.amount)}</h1></div>
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
      <div className="standard-page-heading"><p className="eyebrow">Jejak yang dapat diperiksa</p><h1>Aktivitas</h1><p>Semua perubahan penting pada room demo Anda.</p></div>
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
