import { NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUUpLeft,
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
          {/* Full navigation on purpose: leaving the simulation needs a fresh
              load so connect() re-reads the chain, otherwise the mode stays
              "local" and every "on-chain" link loops back into the demo. */}
          <a className="sidebar-exit" href="/">
            <SignOut size={21} aria-hidden="true" />
            Keluar dari demo
          </a>
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

/**
 * `label` has no default on purpose. Which sentence is true here depends on the
 * room's status, which this component is not given and cannot work out: "Pool
 * terkunci" is false over a room the contract has already emptied, and "Pool
 * terkumpul" is false over one whose members were refunded. The one caller
 * (pages/AppPages.jsx) knows the status and picks. A default would hand the next
 * caller whichever sentence happened to be typed here, for free, on a panel
 * captioned with a number it did not check.
 */
export function TrustPanel({ amount, paidCount, memberLimit, label }) {
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

/**
 * The app's entire status vocabulary. Exported because stellar-rpc's STATUS_MAP
 * has to land inside it, and that file does not import this one: a status
 * missing here renders as a bare word over an action panel with no branch for
 * it. Neither file can check the other, so stellar-rpc.test.js:158 imports both
 * and holds them together.
 *
 * `dissolved` has no local counterpart: only the contract can dissolve a room.
 * Both paths out pay every member the contract still owes and leave it holding
 * nothing (cancel_room lib.rs:437-439, emergency_dissolve :708-717), so there is
 * nothing left to act on. Which members were owed is not the same question, and
 * the two paths answer it differently — the room detail asks it there.
 */
export const STATUS_LABELS = {
  ready: "Dana lengkap",
  funding: "Menunggu setoran",
  sealed: "Room terkunci",
  paid: "Siklus selesai",
  dissolved: "Room dibubarkan",
};

/**
 * The statuses whose rooms the contract is still holding money for. An allowlist
 * rather than the `!== "funding"` it replaces: that denylist counted `paid`,
 * where kocok has already paid the last pot out, and would count `dissolved`,
 * where the refunds emptied the room. Both hold exactly nothing. The home screen
 * captions this sum "terkunci di Stellar Testnet", so a status guessed into this
 * set turns that caption into a sentence that is no longer true.
 *
 * `ready` has no on-chain counterpart: it is a gateway room, prefunded and
 * waiting to be started, which is `Open` as far as the contract is concerned.
 */
export const HOLDS_FUNDS = new Set(["ready", "funding", "sealed"]);

export function StatusBadge({ status }) {
  const icons = {
    ready: Check,
    funding: Clock,
    sealed: LockKey,
    paid: Receipt,
    dissolved: ArrowUUpLeft,
  };
  const Icon = icons[status] || CirclesFour;
  return (
    <span className={`status-badge status-${status}`}>
      <Icon size={16} weight="regular" aria-hidden="true" />
      {STATUS_LABELS[status] || status}
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
