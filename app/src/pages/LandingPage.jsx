import { motion } from "motion/react";
import {
  ArrowDown,
  Bank,
  BowlFood,
  CaretDown,
  Check,
  CirclesThreePlus,
  HandHeart,
  Info,
  LockKey,
  ShieldCheck,
  Sparkle,
  UsersThree,
  WarningCircle,
} from "@phosphor-icons/react";
import { Button, Logo, MoreDots, TestnetPill } from "../ui.jsx";

const reveal = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
};

export function LandingPage() {
  return (
    <div className="landing-page">
      <header className="landing-header">
        <Logo />
        <nav aria-label="Navigasi landing page">
          <a href="#cara-kerja">Cara kerja</a>
          <a href="#aman">Mengapa aman</a>
          <a href="#budaya">Budaya arisan</a>
        </nav>
        <Button to="/masuk" variant="outline" className="header-button" icon={false}>Masuk</Button>
      </header>

      <main>
        <section className="hero-section">
          <motion.div className="hero-copy" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.62 }}>
            <TestnetPill />
            <h1>Arisan yang tidak bisa dibawa kabur.</h1>
            <p>Host tetap mengatur grup. Kontrak yang memegang dan membayar pool.</p>
            <div className="hero-actions">
              {/* A full navigation, not a client-side link: reaching the chain
                  board needs connect() to re-read the chain, which only happens
                  on a fresh load. A React Router link would keep a "local"
                  session in the simulation and never show the board. */}
              <a className="button button-primary" href="/app">Lihat data on-chain</a>
              <a className="button button-outline" href="#cara-kerja">
                <span>Lihat cara kerja</span>
                <ArrowDown size={19} weight="bold" aria-hidden="true" />
              </a>
            </div>
            <small>Dibaca langsung dari kontrak di Stellar Testnet. Tidak ada uang sungguhan.</small>
          </motion.div>

          <motion.div className="hero-visual" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.72, delay: 0.08 }}>
            <img src="/assets/arisan-gathering.png" alt="Sekelompok perempuan Indonesia sedang berkumpul dan mengocok arisan di rumah" />
            <div className="hero-room-preview" aria-label="Pratinjau room Arisan RT 08">
              <div className="preview-top">
                <span>Room siap</span>
                <span className="preview-dots"><MoreDots /></span>
              </div>
              <h2>Arisan RT 08</h2>
              <div className="preview-stat">
                <span className="preview-icon"><LockKey size={22} weight="regular" aria-hidden="true" /></span>
                <div>
                  <small>Pool terkunci</small>
                  <strong>Rp100.000.000</strong>
                </div>
              </div>
              <div className="preview-members"><UsersThree size={20} aria-hidden="true" /> 10 anggota siap</div>
              <Button to="/app" className="preview-button">Lihat room on-chain</Button>
            </div>
          </motion.div>
        </section>

        <section className="culture-section" id="budaya">
          <motion.div className="culture-copy" {...reveal}>
            <p className="section-kicker">Lebih dari urusan uang</p>
            <h2>Budayanya tetap. Risiko bandarnya hilang.</h2>
            <p className="section-lead">Arisan adalah cara orang Indonesia menjaga hubungan tetap hidup. Orang datang untuk bertemu, makan bersama, bertukar kabar, dan menunjukkan bahwa mereka tetap hadir untuk lingkarannya.</p>
            <div className="culture-points">
              <CulturePoint icon={BowlFood} title="Alasan untuk berkumpul">Jadwal arisan membuat keluarga, tetangga, dan rekan kerja punya ritme pertemuan yang terus dijaga.</CulturePoint>
              <CulturePoint icon={HandHeart} title="Kepercayaan yang dipraktikkan">Menyetor tepat waktu dan menunggu giliran adalah janji sosial, bukan sekadar transaksi.</CulturePoint>
              <CulturePoint icon={UsersThree} title="Rasa memiliki">Setiap putaran membawa cerita, dukungan, dan rasa menjadi bagian dari komunitas.</CulturePoint>
            </div>
          </motion.div>
          <motion.figure className="culture-image" {...reveal}>
            <img src="/assets/arisan-culture.png" alt="Perempuan lintas generasi berbagi makanan dan mencatat arisan bersama" />
            <figcaption>Teknologinya bekerja di belakang. Kebersamaannya tetap di depan.</figcaption>
          </motion.figure>
        </section>

        <section className="problem-section" id="aman">
          <motion.div className="problem-heading" {...reveal}>
            <p className="section-kicker">Arisan tradisional vs Awrisan</p>
            <h2>Arisannya tetap sama. Yang berbeda adalah cara uangnya dilindungi.</h2>
            <p className="problem-lead">Arisan biasa mengandalkan bendahara untuk menjaga uang dan anggota untuk terus menyetor setelah menang. Awrisan mengamankan keduanya sebelum kocok dimulai.</p>
          </motion.div>
          <motion.div className="comparison-board" {...reveal}>
            <div className="comparison-columns">
              <article className="comparison-card comparison-traditional">
                <div className="comparison-card-heading">
                  <span>Arisan tradisional</span>
                  <h3>Uang dan setoran berikutnya masih bergantung pada orang.</h3>
                </div>
                <ComparisonPoint icon={Bank} title="Uang arisan masuk ke rekening bendahara">
                  Semua anggota harus percaya uang tidak dipakai, salah dikirim, atau dibawa pergi.
                </ComparisonPoint>
                <ComparisonPoint icon={UsersThree} title="Menang bulan pertama, tetapi tetap harus setor">
                  Contoh: 10 orang menyetor Rp1.000.000 per bulan. Pemenang bulan pertama baru menyetor Rp1.000.000, lalu masih harus menyetor Rp9.000.000 selama sembilan bulan berikutnya. Jika ia berhenti, kelompok kekurangan Rp9.000.000.
                </ComparisonPoint>
              </article>

              <article className="comparison-card comparison-awrisan">
                <div className="comparison-card-heading">
                  <span>Awrisan, dana diamankan di awal</span>
                  <h3>Uang dan setoran berikutnya diamankan sebelum kocok.</h3>
                </div>
                <ComparisonPoint icon={LockKey} title="Uang dijaga oleh teknologi smart contract" help={<SmartContractInfo />}>
                  Bendahara tetap mengatur anggota dan jadwal, tetapi tidak dapat menarik atau membawa pergi uang arisan.
                </ComparisonPoint>
                <ComparisonPoint icon={ShieldCheck} title="Menang bulan pertama tanpa meninggalkan kekurangan">
                  Contoh yang sama: sebelum kocok pertama, setiap anggota sudah mengamankan total Rp10.000.000. Saat menang bulan pertama, setoran untuk sembilan bulan berikutnya sudah ada. Jika ia pergi, kelompok tetap tidak kekurangan uang.
                </ComparisonPoint>
              </article>
            </div>

            <div className="comparison-proof">
              <span className="comparison-proof-icon"><ShieldCheck size={27} weight="regular" aria-hidden="true" /></span>
              <div>
                <p className="section-kicker">Intinya</p>
                <h3>Bendahara tidak memegang uang. Pemenang pertama tidak bisa meninggalkan kekurangan setoran.</h3>
                <p>Awrisan tidak dapat mencegah seseorang keluar dari grup. Awrisan memastikan seluruh kewajiban uangnya sudah tersedia sebelum ia boleh ikut kocok.</p>
              </div>
            </div>

            <details className="tradeoff-disclosure">
              <summary>
                <span><WarningCircle size={22} weight="regular" aria-hidden="true" /></span>
                <span><strong>Konsekuensinya</strong> Anggota perlu menyiapkan dana lebih banyak di awal.</span>
                <CaretDown size={20} weight="bold" aria-hidden="true" />
              </summary>
              <div className="tradeoff-content">
                <p>Untuk arisan 10 bulan dengan setoran Rp1.000.000, setiap orang perlu mengamankan Rp10.000.000 sebelum kocok pertama. Ini lebih berat daripada menyetor Rp1.000.000 per bulan, tetapi inilah yang mencegah bendahara atau pemenang awal meninggalkan kerugian.</p>
                <ul>
                  <li>Arisan belum berjalan sebelum dana semua anggota lengkap.</li>
                  <li>Sebelum arisan dimulai, anggota dapat batal dan menerima seluruh dananya kembali.</li>
                  <li>Versi demo saat ini meminta Rp10.000.000 dalam satu transfer. Pilihan mencicil sebelum kocok belum tersedia.</li>
                </ul>
              </div>
            </details>
          </motion.div>
        </section>

        <section className="how-section" id="cara-kerja">
          <motion.div className="how-intro" {...reveal}>
            <p className="section-kicker">Dari kumpul sampai cair</p>
            <h2>Empat langkah yang bisa dijelaskan host dalam satu menit.</h2>
            <p>Pengguna tidak perlu memahami wallet, hash, atau smart contract. Mereka cukup memahami aturan room dan status uangnya.</p>
          </motion.div>
          <ol className="how-timeline">
            <HowStep number="01" icon={CirclesThreePlus} title="Buat lingkaran">Host menetapkan nama, jumlah anggota, nominal setoran, dan jadwal.</HowStep>
            <HowStep number="02" icon={UsersThree} title="Semua setor">Dana masuk ke pool testnet. Host tidak pernah memegang uang anggota.</HowStep>
            <HowStep number="03" icon={LockKey} title="Kunci room">Saat pool penuh, daftar anggota dan aturan dikunci agar tidak dapat diubah sepihak.</HowStep>
            <HowStep number="04" icon={Sparkle} title="Kocok dan bayar">Pemenang dipilih, hasil dicatat, lalu pembayaran dikirim otomatis.</HowStep>
          </ol>
        </section>

        <section className="business-section">
          <motion.div className="business-statement" {...reveal}>
            <p className="section-kicker">Ide bisnis yang lahir dari perilaku yang sudah ada</p>
            <h2>Awrisan tidak perlu menciptakan kebiasaan baru.</h2>
            <p>Distribusinya mengikuti host yang sudah dipercaya di RT, keluarga, kantor, komunitas, dan koperasi. Produk tumbuh ketika satu host membawa satu lingkaran nyata.</p>
          </motion.div>
          <motion.div className="business-path" {...reveal}>
            <div><span>Mulai</span><strong>Arisan komunitas</strong><p>Biaya layanan kecil per pool yang berhasil dibayar.</p></div>
            <div><span>Meluas</span><strong>Koperasi dan kelompok usaha</strong><p>Administrasi, identitas, dan bukti pembayaran untuk lebih banyak lingkaran.</p></div>
            <div><span>Terhubung</span><strong>Komunitas lintas negara</strong><p>Rail Stellar membantu anggota diaspora tetap ikut dalam lingkaran keluarga.</p></div>
          </motion.div>
        </section>

        <section className="final-cta">
          <motion.div {...reveal}>
            <p className="section-kicker">Demo ujung ke ujung</p>
            <h2>Kumpulnya tetap hangat. Pool-nya jadi lebih aman.</h2>
            <p>Masuk ke simulasi lokal, kunci room yang sudah penuh, kocok pemenang, lalu lihat tanda terimanya.</p>
            <Button to="/masuk">Mulai demo testnet</Button>
          </motion.div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="footer-brand">
          <Logo light />
          <p>Infrastruktur kepercayaan untuk budaya arisan.</p>
          <p className="trademark-notice">"Stellar" is a trademark of the Stellar Development Foundation. All rights reserved.<br />This is independent software, not affiliated with, sponsored or endorsed by the Stellar Development Foundation.</p>
        </div>
        <div className="footer-meta"><span>Prototipe lokal</span><span>Stellar testnet</span><span>Bukan layanan keuangan aktif</span></div>
      </footer>
    </div>
  );
}

function CulturePoint({ icon: Icon, title, children }) {
  return (
    <div className="culture-point">
      <span><Icon size={23} weight="regular" aria-hidden="true" /></span>
      <div><h3>{title}</h3><p>{children}</p></div>
    </div>
  );
}

function ComparisonPoint({ icon: Icon, title, help, children }) {
  return (
    <div className="comparison-point">
      <span><Icon size={22} weight="regular" aria-hidden="true" /></span>
      <div>
        <div className="comparison-point-title">
          <h4>{title}</h4>
          {help}
        </div>
        <p>{children}</p>
      </div>
    </div>
  );
}

function SmartContractInfo() {
  return (
    <details className="term-info">
      <summary aria-label="Apa itu smart contract?">
        <Info size={16} weight="bold" aria-hidden="true" />
      </summary>
      <div className="term-info-popover" role="note">
        <strong>Apa itu smart contract?</strong>
        <p>Smart contract adalah program otomatis di blockchain. Program ini menyimpan uang dan hanya mengeluarkannya sesuai aturan arisan yang sudah disepakati.</p>
      </div>
    </details>
  );
}

function HowStep({ number, icon: Icon, title, children }) {
  return (
    <motion.li {...reveal}>
      <span className="how-number">{number}</span>
      <span className="how-icon"><Icon size={27} weight="regular" aria-hidden="true" /></span>
      <div><h3>{title}</h3><p>{children}</p></div>
      <Check className="how-check" size={21} weight="bold" aria-hidden="true" />
    </motion.li>
  );
}
