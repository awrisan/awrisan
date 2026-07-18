import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  IdentificationCard,
  LockKey,
  ShieldCheck,
  UserCircle,
} from "@phosphor-icons/react";
import { Button, FormField, InfoStrip, Logo, TestnetPill } from "../ui.jsx";
import { useDemo } from "../demo-state.jsx";

export function SignInPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("dina@awrisan.test");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Masukkan alamat email yang valid.");
      return;
    }
    setError("");
    setLoading(true);
    window.setTimeout(() => navigate("/verifikasi"), 550);
  }

  return (
    <div className="auth-page">
      <aside className="auth-story">
        <Logo light />
        <div>
          <TestnetPill />
          <h1>Kepercayaan komunitas, dengan aturan yang bisa dibuktikan.</h1>
          <p>Demo ini membawa Anda dari verifikasi sandbox sampai pembayaran hasil kocok. Tidak ada uang sungguhan yang dipakai.</p>
        </div>
        <small>Prototipe lokal untuk Stellar testnet</small>
      </aside>
      <main className="auth-form-wrap">
        <a href="/" className="back-link"><ArrowLeft size={18} aria-hidden="true" /> Kembali</a>
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <p className="eyebrow">Masuk ke demo</p>
          <h2>Selamat datang di Awrisan</h2>
          <p className="auth-intro">Gunakan akun sandbox yang sudah disiapkan untuk mencoba alur lengkap.</p>
          <FormField label="Email" error={error} hint="Akun ini hanya tersimpan di perangkat lokal Anda.">
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(error)}
            />
          </FormField>
          <FormField label="Kata sandi demo">
            <input type="password" name="password" value="awrisandemo" readOnly aria-label="Kata sandi demo" />
          </FormField>
          <InfoStrip title="Aman untuk dicoba" icon={ShieldCheck}>Identitas, saldo, dan transaksi di halaman berikut adalah data simulasi.</InfoStrip>
          <button className="button button-primary button-full" type="submit" disabled={loading}>
            {loading ? <span className="button-loading"><span className="spinner" /> Membuka sandbox</span> : <span>Lanjutkan</span>}
          </button>
        </form>
      </main>
    </div>
  );
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const { enterLocalSim } = useDemo();
  const [step, setStep] = useState(1);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");

  function continueFlow() {
    if (step === 2 && !agreed) {
      setError("Centang persetujuan sandbox untuk melanjutkan.");
      return;
    }
    setError("");
    if (step < 3) setStep((current) => current + 1);
    else {
      // Sign-in + sandbox KYC is the "use the app" path. On the public build the
      // chain read would otherwise land it on the read-only board (no create
      // button, a dead end). Enter the local simulation so this flow reaches the
      // full arisan UX -- clearly labelled a simulation everywhere it renders.
      enterLocalSim();
      navigate("/app");
    }
  }

  const copy = {
    1: {
      icon: UserCircle,
      kicker: "Langkah 1 dari 3",
      title: "Kenali akun demo Anda",
      body: "Awrisan memakai identitas terverifikasi agar satu orang tidak masuk berkali-kali ke room yang sama.",
    },
    2: {
      icon: IdentificationCard,
      kicker: "Langkah 2 dari 3",
      title: "Verifikasi identitas sandbox",
      body: "Dalam produk aktif, tahap ini dilakukan oleh mitra KYC berizin. Di demo lokal, kami memakai profil fiktif yang aman.",
    },
    3: {
      icon: LockKey,
      kicker: "Langkah 3 dari 3",
      title: "Dompet testnet siap",
      body: "Dompet dibuat untuk simulasi. Kunci demo tersimpan lokal dan tidak pernah mengendalikan aset sungguhan.",
    },
  };
  const current = copy[step];
  const Icon = current.icon;

  return (
    <div className="onboarding-page">
      <header><Logo /><TestnetPill compact /></header>
      <main className="onboarding-card">
        <div className="onboarding-progress" aria-label={`Langkah ${step} dari 3`}>
          {[1, 2, 3].map((item) => <span key={item} className={item <= step ? "active" : ""} />)}
        </div>
        <span className="onboarding-icon"><Icon size={34} weight="regular" aria-hidden="true" /></span>
        <p className="eyebrow">{current.kicker}</p>
        <h1>{current.title}</h1>
        <p>{current.body}</p>

        {step === 1 ? (
          <dl className="identity-summary">
            <div><dt>Nama</dt><dd>Dina Prameswari</dd></div>
            <div><dt>Email</dt><dd>dina@awrisan.test</dd></div>
            <div><dt>Status</dt><dd><Check size={16} weight="bold" /> Profil sandbox</dd></div>
          </dl>
        ) : null}

        {step === 2 ? (
          <button
            type="button"
            className={`consent-box${error ? " has-error" : ""}`}
            role="checkbox"
            aria-checked={agreed}
            aria-label={`${agreed ? "Dipilih" : "Belum dipilih"}. Saya memahami bahwa data identitas dan verifikasi pada prototipe ini adalah simulasi lokal.`}
            onClick={() => {
              setAgreed((currentValue) => !currentValue);
              setError("");
            }}
          >
            <span className="consent-indicator" aria-hidden="true">
              {agreed ? <Check size={15} weight="bold" /> : null}
            </span>
            <span>Saya memahami bahwa data identitas dan verifikasi pada prototipe ini adalah simulasi lokal.</span>
          </button>
        ) : null}

        {step === 3 ? (
          <div className="wallet-ready">
            <ShieldCheck size={24} weight="regular" aria-hidden="true" />
            <div><strong>GABCD...WXYZ</strong><span>Alamat dompet testnet</span></div>
          </div>
        ) : null}

        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="onboarding-actions">
          {step > 1 ? <Button variant="ghost" onClick={() => setStep((currentStep) => currentStep - 1)}>Kembali</Button> : <span />}
          <Button onClick={continueFlow}>{step === 3 ? "Masuk ke aplikasi" : "Lanjutkan"}</Button>
        </div>
      </main>
    </div>
  );
}
