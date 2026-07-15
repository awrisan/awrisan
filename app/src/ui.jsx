import { NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CirclesFour,
  Clock,
  DotsThree,
  House,
  IdentificationCard,
  ListChecks,
  LockKey,
  Receipt,
  ShieldCheck,
  SignOut,
  UserCircle,
  UsersThree,
} from "@phosphor-icons/react";

export function Logo({ light = false }) {
  return (
    <Link className={`wordmark${light ? " wordmark-light" : ""}`} to="/" aria-label="Awrisan beranda">
      Awrisan
    </Link>
  );
}

export function TestnetPill({ compact = false }) {
  return (
    <span className={`testnet-pill${compact ? " testnet-pill-compact" : ""}`}>
      <span className="stellar-official-logo" aria-hidden="true">
        <img className="stellar-logo-black" src="/assets/stellar-logo-black.png" alt="" />
        <img className="stellar-logo-white" src="/assets/stellar-logo-white.png" alt="" />
      </span>
      <span className="sr-only">Stellar </span>testnet
    </span>
  );
}

export function MoreDots({ size = 20 }) {
  return <DotsThree size={size} weight="bold" aria-hidden="true" />;
}

export function Button({
  children,
  to,
  variant = "primary",
  icon,
  className = "",
  ...props
}) {
  const classes = `button button-${variant} ${className}`.trim();
  const content = (
    <>
      <span>{children}</span>
      {icon === false ? null : icon || (to ? <ArrowRight size={19} weight="bold" aria-hidden="true" /> : null)}
    </>
  );
  return to ? (
    <Link className={classes} to={to} {...props}>
      {content}
    </Link>
  ) : (
    <button className={classes} type="button" {...props}>
      {content}
    </button>
  );
}

const navigation = [
  { to: "/app", label: "Beranda", icon: House, end: true },
  { to: "/app/aktivitas", label: "Aktivitas", icon: ListChecks },
  { to: "/app/profil", label: "Profil", icon: UserCircle },
];

export function AppShell({ children }) {
  const location = useLocation();
  const hideNavigation = location.pathname.startsWith("/app/room/") || ["/buat-room", "/gabung"].some(
    (part) => location.pathname.includes(part),
  );

  return (
    <div className="app-background">
      <div className="app-layout">
        <aside className="app-sidebar" aria-label="Navigasi aplikasi">
          <div>
            <Logo />
            <TestnetPill compact />
          </div>
          <nav className="sidebar-links">
            {navigation.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? "active" : "")}>
                <Icon size={22} weight="regular" aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
          <Link className="sidebar-exit" to="/">
            <SignOut size={21} aria-hidden="true" />
            Keluar dari demo
          </Link>
        </aside>
        <main className={`app-main${hideNavigation ? " app-main-focused" : ""}`}>{children}</main>
      </div>
      {!hideNavigation ? <MobileNavigation /> : null}
    </div>
  );
}

function MobileNavigation() {
  return (
    <nav className="mobile-navigation" aria-label="Navigasi bawah">
      {navigation.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? "active" : "")}>
          <Icon size={23} weight="regular" aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export function PageHeader({ title, eyebrow, backTo = "/app", action }) {
  const navigate = useNavigate();
  return (
    <header className="page-header">
      <button
        className="icon-button"
        type="button"
        aria-label="Kembali"
        onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
      >
        <ArrowLeft size={24} weight="regular" aria-hidden="true" />
      </button>
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
      </div>
      <div className="page-header-action">{action}</div>
    </header>
  );
}

export function PhaseTracker({ active }) {
  const steps = [
    { key: "funding", label: "Setor" },
    { key: "sealed", label: "Kunci" },
    { key: "paid", label: "Kocok" },
  ];
  const activeIndex = Math.max(
    0,
    steps.findIndex((item) => item.key === active),
  );
  return (
    <ol className="phase-tracker" aria-label="Tahap room">
      {steps.map((step, index) => {
        const completed = index < activeIndex;
        const current = index === activeIndex;
        return (
          <li key={step.key} className={completed ? "completed" : current ? "current" : ""}>
            <span className="phase-marker">
              {completed ? <Check size={16} weight="bold" aria-hidden="true" /> : <span />}
            </span>
            <span>{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function TrustPanel({ amount, paidCount, memberLimit, label = "Pool terkunci" }) {
  return (
    <section className="trust-panel" aria-label="Status pool">
      <div className="trust-panel-main">
        <span className="trust-icon"><LockKey size={30} weight="regular" aria-hidden="true" /></span>
        <div>
          <p>{label}</p>
          <strong>{amount}</strong>
        </div>
      </div>
      <div className="trust-panel-foot">
        <UsersThree size={22} weight="regular" aria-hidden="true" />
        <span>{paidCount} dari {memberLimit} anggota sudah setor</span>
      </div>
    </section>
  );
}

export function StatusBadge({ status }) {
  const labels = {
    ready: "Siap dikocok",
    funding: "Menunggu setoran",
    sealed: "Room terkunci",
    paid: "Sudah dibayar",
  };
  const icons = {
    ready: Check,
    funding: Clock,
    sealed: LockKey,
    paid: Receipt,
  };
  const Icon = icons[status] || CirclesFour;
  return (
    <span className={`status-badge status-${status}`}>
      <Icon size={16} weight="regular" aria-hidden="true" />
      {labels[status] || status}
    </span>
  );
}

export function FormField({ label, hint, error, children }) {
  return (
    <label className={`form-field${error ? " has-error" : ""}`}>
      <span className="form-label">{label}</span>
      {children}
      {error ? <span className="field-error" role="alert">{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

export function InfoStrip({ title, children, icon: Icon = IdentificationCard }) {
  return (
    <div className="info-strip">
      <Icon size={23} weight="regular" aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, body, confirmLabel, onConfirm, onClose, icon: Icon = LockKey }) {
  if (!open) return null;
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" onMouseDown={(event) => event.stopPropagation()}>
        <span className="dialog-icon"><Icon size={27} weight="regular" aria-hidden="true" /></span>
        <h2 id="dialog-title">{title}</h2>
        <p>{body}</p>
        <div className="dialog-actions">
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </section>
    </div>
  );
}

export function InlineNotice({ title, children, tone = "neutral", icon: Icon = ShieldCheck }) {
  return (
    <div className={`inline-notice notice-${tone}`}>
      <Icon size={21} weight="regular" aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </div>
  );
}
