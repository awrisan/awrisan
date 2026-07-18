# Awrisan

**An arisan that cannot be carried away by its organizer.**

Awrisan is an Indonesian rotating savings circle where a Soroban smart contract holds the pool instead of a person. The goal is simple: preserve the social and financial value of arisan while removing the single human custodian who can disappear with everyone else's money.

> **Rise In, Stellar Journey to Mastery, Level 4 (Green Belt) submission.**
> See [SUBMISSION.md](SUBMISSION.md) for the requirement-to-evidence map and [DEPLOYMENTS.md](DEPLOYMENTS.md) for the live contract and on-chain transaction trail.

> Status: Stellar testnet preview. No mainnet funds, traction, partnership, or regulatory approval is implied. Awrisan is built on Stellar and is not affiliated with the Stellar Development Foundation or Stellar Aid Assist.

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

## Local demo | Demo lokal

**English:** A working culture-first web and installable PWA lives in `app/`. It covers the landing page, sign-in, onboarding, dashboard, room creation, prefunding status, contract activation, two-transaction draw, winner result, activity, profile, and receipt.

The app has three modes, picked by what it can reach:

1. **Gateway** — with a local gateway holding a Testnet deployment *and* signing identities, room creation, activation, draw, and payout are real Soroban transactions using native Testnet XLM.
2. **Read-only** — with no gateway, the app reads the contract straight from the public Soroban RPC and shows real on-chain state. It cannot write. See [Read-only mode](#read-only-mode--mode-baca-saja).
3. **Local simulation** — the last resort, used only when the RPC cannot be reached either.

Testnet throughout. No real money moves.

**Bahasa Indonesia:** Web culture-first dan PWA yang dapat dipasang berada di `app/`. Alurnya mencakup landing page, masuk, onboarding, dashboard, pembuatan room, status prefund, aktivasi kontrak, kocok dua transaksi, hasil pemenang, aktivitas, profil, dan tanda terima.

Aplikasinya punya tiga mode, ditentukan oleh apa yang bisa dihubungi:

1. **Gateway** — saat gateway lokal punya deployment Testnet *dan* identitas penanda tangan, pembuatan room, aktivasi, kocok, dan payout adalah transaksi Soroban nyata memakai XLM Testnet.
2. **Baca saja** — tanpa gateway, aplikasi membaca kontrak langsung dari RPC Soroban publik dan menampilkan keadaan on-chain yang sebenarnya. Aplikasi tidak bisa menulis apa pun.
3. **Simulasi lokal** — pilihan terakhir, hanya dipakai kalau RPC pun tidak bisa dihubungi.

Semuanya Testnet. Tidak ada uang sungguhan yang berpindah.

### Run the web and PWA | Jalankan web dan PWA

```powershell
cd app
npm install
npm run build
npm run preview
```

Open `http://127.0.0.1:4173/`. The production build includes a web app manifest and service worker. The Android Capacitor wrapper remains in `app/android/` and can be refreshed with `npm run android:sync`.

`npm run preview` starts the local gateway, which serves `dist/` and reports the
committed deployment metadata in `.stellar/awrisan-runtime.json`. It signs only
if you have also run `stellar:bootstrap` to create the identities; a fresh clone
has the deployment but not the keys, so writes will fail until you do.

### Read-only mode | Mode baca saja

**English:** With no gateway in front of it, the app talks to the public Soroban
RPC itself and renders what the contract actually says: the contract id, the
ledger height it read at, what the contract holds, and each room's status,
members, rounds, and winners. Every figure on that screen is a live read.

To see it, use either path — neither serves `/api`, so the app goes straight to
the chain:

```powershell
cd app
npm run dev                  # or: npm run build, then serve app/dist/ with any static file server
```

**It is read-only, and that is a boundary, not a setting.** A Soroban read is a
simulated transaction: no signature, no submission, no fee, no account — which is
why a browser can do it alone, and why a static bundle with no backend can show
real on-chain state. A *write* needs a signature. Per-member signing (Freighter
or passkey) is not built, so nothing on that screen can be created, joined,
started, sealed, or drawn.

**Why it exists.** The gateway signs by holding all ten test members' secret keys
and shelling out to the Stellar CLI. Hosting that would put ten people's keys on
one server, for a project whose entire thesis is that nobody should hold
everyone's money. Reads need none of it, so the read-only build is the part that
can be published: static, no backend, no keys, nothing to steal.

**Bahasa Indonesia:** Tanpa gateway, aplikasi menghubungi RPC Soroban publik
sendiri dan menampilkan apa yang benar-benar dikatakan kontrak: contract id,
ledger saat dibaca, dana yang dipegang kontrak, serta status, anggota, putaran,
dan pemenang tiap room. Semua angka di layar itu hasil baca langsung.

Mode ini **hanya bisa membaca**, dan itu batas teknis, bukan pengaturan. Membaca
Soroban berarti mensimulasikan transaksi: tanpa tanda tangan, tanpa pengiriman,
tanpa biaya, tanpa akun. Menulis butuh tanda tangan, dan penandatanganan per
anggota (Freighter atau passkey) belum dibuat. Alasannya: gateway menyimpan
secret key sepuluh anggota uji dan memanggil Stellar CLI, jadi menghostingnya
berarti menaruh kunci sepuluh orang di satu server — persis yang ditolak tesis
proyek ini. Membaca tidak butuh semua itu.

### Connect a Testnet deployment | Hubungkan deployment Testnet

The `Soroban contract` GitHub workflow formats, tests, and builds `contracts/arisan_rooms`. A manual run with `deploy_testnet` enabled also deploys a fresh contract, initializes it with the native Testnet XLM asset contract, and publishes two artifacts:

- `arisan-rooms-wasm`, the verified contract WASM
- `awrisan-testnet-deployment`, public deployment metadata with the Contract ID and Token ID

Download `deployment.json`, then run:

```powershell
cd app
npm run stellar:bootstrap -- --deployment C:\path\to\deployment.json
npm run build
npm run preview
```

The bootstrap command creates and funds a local sandbox identity for each demo member using Friendbot — the committed runtime (`.stellar/awrisan-runtime.json`) carries ten of them. Their signing material stays in `.stellar/identity/`, which Git ignores: no secret key is committed anywhere in this repository. Two files under `.stellar/` *are* committed on purpose — `awrisan-runtime.json` and `rooms.json` — and they carry the contract id, the token id, and public addresses, nothing else. The browser and PWA never receive a secret key. They call the same-origin localhost gateway, which signs Testnet transactions server-side.

Workflow `Soroban contract` memformat, mengetes, dan membangun `contracts/arisan_rooms`. Jalankan workflow secara manual dengan `deploy_testnet` aktif, unduh `deployment.json`, lalu gunakan perintah di atas. Bootstrap membuat identitas sandbox lokal untuk tiap anggota demo memakai Friendbot; runtime yang ter-commit berisi sepuluh identitas. Materi penandatanganan berada di `.stellar/identity/` yang diabaikan Git; tidak ada satu pun secret key yang ikut ter-commit. Browser dan PWA tidak pernah menerima secret key.

The interface displays IDR to explain the business rules, while the current on-chain demo locks a small fixed amount of Testnet XLM. This is not a rupiah stablecoin, fiat custody system, or mainnet deployment.

## English

### The pitch

An arisan is one of Indonesia's most familiar grassroots financial tools. Members contribute equal amounts, one person receives the pot each period, and everyone receives it once. It works because the group trusts one organizer, known as the bandar, to hold and distribute the money.

That trust model breaks online.

When arisan moved from close neighborhood circles to WhatsApp, Facebook, and Instagram, its economic function moved with it, but its social collateral did not. The bandar can now be a stranger who controls the entire pool and can disappear with one tap.

Awrisan replaces that bandar with a Soroban smart contract. The contract holds the pool, enforces the rotation, seals the draw, and pays the winner automatically. The host organizes the group but never controls the money.

### The pain point

The problem is not that arisan is a bad financial habit. The problem is architectural:

> One person holds everyone's money, and that person can run.

Real court cases show why punishment is not enough:

| Case | Reported loss | Criminal result | Money recovery problem |
|---|---:|---|---|
| Banjarmasin, 2022 | Rp11 billion from 320 victims | 1 year and 9 months | Rp650 million ordered, less than 6 percent of the loss |
| Salatiga, 2022 | About Rp4.7 billion | 9 months each | About Rp71.3 million ordered, around 1.5 percent |
| Gresik, 2025 | Rp1,662,550,000 from 63 victims | 3 years and 6 months | The verdict returned nothing, so victims needed a separate civil claim |

A conviction punishes a person after the event. It does not rebuild the pool. Awrisan is designed to prevent the pool from becoming stealable in the first place.

### Arisan is a social ritual before it is a financial product

To understand why arisan matters in Indonesia, it is not enough to explain the money. The gathering is part of the institution.

Indonesia's official dictionary definition includes the idea that the collection and draw happen at a periodic gathering. An arisan is therefore not simply a payment schedule with a random recipient. It is a recurring social appointment that gives people a reason to keep meeting.

Arisan appears in many kinds of circles, including RT/RW neighborhoods, PKK groups, pengajian circles, extended families, workplaces, alumni groups, and groups led by women. The exact form differs, but the gathering can include food, conversation, family news, community updates, mutual advice, and the draw itself. In some groups, the gathering place or host also rotates, so hospitality and recognition take turns with the money. The kocok is both a financial event and a shared moment of anticipation.

Anthropologist Clifford Geertz observed arisan in East Java in the 1950s. He described its local meaning as a cooperative endeavor or mutual help. His central insight was that traditional social relationships were being used to perform an economic function. That is still the cultural heart of arisan. His study was published in *Economic Development and Cultural Change*, volume 10, number 3, in 1962.

People enjoy and preserve arisan for reasons that are not reducible to money:

- **A dependable reason to meet**: the schedule protects relationships from being crowded out by daily life.
- **Belonging**: regular participation says that a person is part of the group and intends to remain part of it.
- **Reciprocity**: everyone contributes, everyone receives, and every turn is recognized by the community.
- **Gotong royong**: the group makes a meaningful moment possible for one member at a time.
- **Social accountability**: people keep commitments because their contribution has a human meaning to others.
- **A space for women**: in many women-led circles, arisan creates an independent place to exchange information, build confidence, and make collective decisions.
- **Anticipation and celebration**: the draw creates suspense, conversation, and a reason to celebrate another member's turn.
- **Informal mutual support**: the gathering can surface needs, opportunities, and problems that would otherwise remain invisible.

The money makes the gathering binding, and the gathering makes the saving habit durable. Separating the two would misunderstand the tradition.

This creates an important product principle for Awrisan: remove the host's custody role, but preserve the host's social role. The host should still invite people, set the rhythm, welcome members, and make each turn feel meaningful. The contract should hold the money quietly in the background. Awrisan succeeds only if it feels like a safer arisan, not like a crypto wallet with an arisan label.

### Why people use a zero interest product

Arisan is not an investment. It allocates time, not profit.

If someone can save only Rp500,000 each month, saving alone produces Rp5,000,000 after ten months. In a ten person arisan, that person may receive Rp5,000,000 in month one.

- An early winner receives an interest free advance from the group.
- A late winner receives a commitment savings plan that is hard to abandon quietly.
- People rejected by formal credit avoid extremely expensive informal loans.
- Social obligation makes regular saving happen.
- The gathering also creates community, mutual support, and financial agency.

Zero interest is not a weak return when the practical alternative is no savings or very expensive debt.

### The solution

Awrisan changes custody without trying to replace the tradition.

1. **Contract custody**: member funds sit in the smart contract, not in the host's account.
2. **Full prefunding**: every member locks their full cycle commitment before the first draw.
3. **Two phase draw**: one transaction seals a random seed, and the next derives the winner deterministically.
4. **One win per member**: the contract draws only from members who have not won.
5. **Automatic payout**: the pot moves directly from the contract to the selected member.
6. **Public verification**: contributions, sealed seeds, winners, and payouts can be audited on the ledger.
7. **Safety exits**: open rooms can refund, and stalled active rooms can be dissolved after a grace period.

### Why winning and then stopping payment is impossible

Consider ten members and a contribution of Rp1,000,000 per round.

- Each member's full cycle commitment is 10 x Rp1,000,000 = Rp10,000,000.
- Ten members lock Rp10,000,000 each.
- The contract holds Rp100,000,000 before any draw.
- Each round pays a Rp10,000,000 pot to one member who has not won.
- After ten rounds, everyone has received Rp10,000,000 once.
- The cycle balance ends at zero.

If member 8 wins in the first round, there is no future payment for that member to skip. Their full Rp10,000,000 was already locked before the draw.

In a traditional pay as you go arisan, the same member might pay Rp1,000,000, receive Rp10,000,000, disappear, and leave a Rp9,000,000 hole. Prefunding removes that hole mathematically.

### The honest trade-off

Full prefunding is safer, but it is heavier on capital. It changes the product from an interest free credit instrument into a trustless commitment savings and fair rotation instrument.

This is the central business risk to validate. The customers who benefit most from arisan may be the least able to lock a full cycle commitment. Installment funding can make collection easier, but the draw must still wait until the entire pool is funded if the no-default guarantee is to remain true.

Awrisan will not present an unprotected pay as you go mode as guaranteed. A bonded or partial prefund model may be explored later, with its remaining default risk stated clearly.

### Why the draw uses two transactions

Soroban transactions are simulated before execution to determine their storage footprint. A PRNG result can differ between simulation and execution.

If the contract used the PRNG to select a winner directly, simulation could select member A while execution selects member B. The transaction would then need different winner and token balance entries, causing an outside-the-footprint failure.

Awrisan separates the process:

1. `seal_kocok` stores a PRNG seed under one fixed key for the room and round.
2. `kocok` reads that on-chain seed and calculates `winner = unwon[seed % unwon_count]`.

The executed seed is fixed before the second transaction. Simulation and execution therefore derive the same winner and touch the same ledger entries. The seed remains public so anyone can verify the result.

**Known limitation, stated plainly.** The two phases defeat simulate-and-preview grinding, but they do not make the draw unbiasable, and unpredictability of the PRNG does not save it. `seal_kocok` returns the seed inside the same atomic transaction that writes the seal, so a member can wrap the call, compute the winner themselves, and revert the transaction whenever the winner is not them, then retry on a later ledger for a fresh seed. The cost is a few failed transaction fees.

What bounds the damage is prefunding, not the PRNG. Every member is owed the same pot (N x s), so a grinder can only buy an earlier slot, never a larger payout and never anyone else's principal. Slot order still has real value in an arisan, so this is a genuine weakness we are not hiding.

The intended fix is commit-reveal bonded by the prefund that already exists: each member commits H(secret) at join, reveals once per round, the seed becomes H(concat(reveals)), and a member who fails to reveal forfeits their locked share to the rest. Commit-reveal usually fails because the bond is not collectable; here every member has already locked N x s, so the prefund is the bond. An external VRF or threshold oracle is the alternative. Neither is implemented yet.

### User experience

The intended experience is crypto invisible:

- Sign in with an ordinary account.
- Complete KYC before funding a room.
- Top up using familiar Indonesian payment rails.
- See balances, contributions, and payouts in rupiah.
- Let USDC on Stellar handle settlement underneath.
- Cash out through a licensed on and off-ramp.

Google sign-in, server-side wallet provisioning, Sumsub, Xendit, and a licensed Stellar anchor are design directions, not confirmed production partnerships. A real rupiah flow requires licensed providers.

### Target customers

- Neighborhood, family, office, and community arisan groups
- Women-led savings circles
- Informal and gig workers with limited access to affordable credit
- Diaspora groups that need a shared pool without one cross-border custodian

Indonesia is the initial market. International ROSCA expansion is a later possibility, not part of the MVP.

### Business model

The intended model is a small, disclosed fee on each successful payout. Every member must see the fee before joining. The exact percentage, cap, tax treatment, and contract accounting remain open decisions.

Awrisan does not depend on earning yield from locked customer funds. That would reward the company for longer lockups and create a conflict with members.

### What the ledger proves

The ledger can prove the flow of funds, the sealed seed, the deterministic winner, and the payout address. It does not prove that people are honest, that one human owns only one wallet, or that no scam exists outside the application.

KYC and invite controls reduce social abuse. They do not eliminate it. The specific failure Awrisan removes is the human bandar's ability to take the in-contract pool.

### Hackathon business thesis

Awrisan is not selling blockchain. It is selling enforceable trust for a financial tradition that already has users, behavior, and demand.

The business story is:

1. Arisan already works and is deeply embedded in Indonesian communities.
2. Online distribution removed the social collateral that once protected it.
3. Court punishment arrives after the pool is gone and rarely makes victims whole.
4. Smart contract custody prevents the organizer from ever holding the pool.
5. A rupiah-first experience keeps blockchain as plumbing, not the product.

Read the full bilingual business concept in [BUSINESS-CONCEPT.md](BUSINESS-CONCEPT.md).

## Bahasa Indonesia

### Pitch singkat

Arisan adalah salah satu alat keuangan akar rumput yang paling dikenal di Indonesia. Anggota menyetor jumlah yang sama, satu orang menerima pot setiap periode, dan semua anggota mendapat giliran tepat satu kali. Sistem ini berjalan karena kelompok mempercayai satu pengelola, yaitu bandar, untuk memegang dan membagikan uang.

Model kepercayaan itu jebol ketika arisan pindah ke internet.

Ketika arisan berpindah dari lingkungan yang saling mengenal ke WhatsApp, Facebook, dan Instagram, fungsi ekonominya ikut berpindah, tetapi jaminan sosialnya tidak. Bandar sekarang bisa menjadi orang asing yang menguasai seluruh pool dan dapat menghilang dalam satu ketukan.

Awrisan mengganti bandar tersebut dengan smart contract Soroban. Kontrak memegang pool, menegakkan rotasi, menyegel kocok, dan membayar pemenang secara otomatis. Host tetap mengatur kelompok, tetapi tidak pernah menguasai uang.

### Pain point utama

Masalahnya bukan arisan sebagai kebiasaan finansial. Masalahnya bersifat arsitektural:

> Satu orang memegang uang semua anggota, dan orang itu bisa kabur.

Kasus pengadilan menunjukkan mengapa hukuman tidak cukup:

| Kasus | Kerugian dilaporkan | Hasil pidana | Masalah pengembalian uang |
|---|---:|---|---|
| Banjarmasin, 2022 | Rp11 miliar dari 320 korban | 1 tahun 9 bulan | Rp650 juta diperintahkan kembali, kurang dari 6 persen kerugian |
| Salatiga, 2022 | Sekitar Rp4,7 miliar | 9 bulan masing-masing | Sekitar Rp71,3 juta diperintahkan kembali, sekitar 1,5 persen |
| Gresik, 2025 | Rp1.662.550.000 dari 63 korban | 3 tahun 6 bulan | Putusan tidak mengembalikan uang, sehingga korban membutuhkan gugatan perdata terpisah |

Vonis menghukum seseorang setelah kejadian. Vonis tidak membangun kembali pool. Awrisan dirancang agar pool tidak pernah bisa dibawa kabur sejak awal.

### Arisan adalah ritual sosial sebelum menjadi produk finansial

Untuk memahami mengapa arisan penting di Indonesia, tidak cukup hanya menjelaskan uangnya. Pertemuan adalah bagian dari institusi arisan itu sendiri.

Definisi kamus resmi Indonesia memasukkan gagasan bahwa pengumpulan dan pengundian berlangsung dalam pertemuan berkala. Jadi arisan bukan sekadar jadwal pembayaran dengan penerima acak. Arisan adalah janji sosial yang berulang dan memberi orang alasan untuk terus bertemu.

Arisan hidup dalam banyak jenis kelompok, termasuk lingkungan RT/RW, kelompok PKK, pengajian, keluarga besar, kantor, alumni, dan kelompok yang dipimpin perempuan. Bentuknya berbeda-beda, tetapi pertemuan dapat berisi makanan, obrolan, kabar keluarga, informasi lingkungan, saling memberi saran, dan acara kocok itu sendiri. Dalam sebagian kelompok, tempat pertemuan atau tuan rumah juga bergilir, sehingga keramahan dan pengakuan ikut mendapat giliran bersama uang. Kocok adalah peristiwa finansial sekaligus momen menunggu bersama.

Antropolog Clifford Geertz mengamati arisan di Jawa Timur pada 1950-an. Ia menjelaskan makna lokal arisan sebagai usaha bersama atau saling membantu. Insight utamanya adalah bahwa hubungan sosial tradisional dipakai untuk menjalankan fungsi ekonomi. Itulah jantung budaya arisan sampai sekarang. Studinya diterbitkan dalam *Economic Development and Cultural Change*, volume 10, nomor 3, pada 1962.

Orang menyukai dan mempertahankan arisan karena alasan yang tidak bisa direduksi menjadi uang:

- **Alasan yang pasti untuk bertemu**: jadwal arisan menjaga hubungan agar tidak hilang karena kesibukan sehari-hari.
- **Rasa memiliki**: kehadiran rutin menandakan bahwa seseorang adalah bagian dari kelompok dan ingin tetap menjadi bagian darinya.
- **Timbal balik**: semua menyetor, semua menerima, dan setiap giliran diakui bersama.
- **Gotong royong**: kelompok membuat satu momen penting menjadi mungkin bagi satu anggota secara bergantian.
- **Akuntabilitas sosial**: orang menjaga komitmen karena setoran mereka mempunyai arti manusiawi bagi anggota lain.
- **Ruang bagi perempuan**: dalam banyak kelompok yang dipimpin perempuan, arisan menjadi ruang mandiri untuk bertukar informasi, membangun percaya diri, dan mengambil keputusan bersama.
- **Antisipasi dan perayaan**: kocok menciptakan rasa penasaran, percakapan, dan alasan untuk merayakan giliran anggota lain.
- **Saling membantu secara informal**: pertemuan dapat membuka kebutuhan, peluang, atau masalah yang sebelumnya tidak terlihat.

Uang membuat pertemuan mempunyai ikatan, sedangkan pertemuan membuat kebiasaan menabung bertahan. Memisahkan keduanya berarti salah memahami tradisi arisan.

Ini menghasilkan prinsip produk penting bagi Awrisan: hapus peran host sebagai pemegang uang, tetapi pertahankan peran sosialnya. Host tetap mengundang, menjaga ritme, menyambut anggota, dan membuat setiap giliran terasa bermakna. Kontrak memegang uang secara tenang di belakang layar. Awrisan hanya berhasil jika terasa seperti arisan yang lebih aman, bukan seperti crypto wallet yang diberi label arisan.

### Mengapa orang memakai produk berbunga nol

Arisan bukan investasi. Arisan mengalokasikan waktu, bukan keuntungan.

Jika seseorang hanya mampu menabung Rp500.000 per bulan, ia baru memiliki Rp5.000.000 setelah sepuluh bulan. Dalam arisan sepuluh orang, ia mungkin menerima Rp5.000.000 pada bulan pertama.

- Pemenang awal memperoleh dana muka tanpa bunga dari kelompok.
- Pemenang akhir memperoleh tabungan komitmen yang sulit ditinggalkan diam-diam.
- Orang yang ditolak kredit formal dapat menghindari pinjaman informal yang sangat mahal.
- Kewajiban sosial membuat kebiasaan menabung benar-benar terjadi.
- Pertemuan arisan juga membangun komunitas, dukungan bersama, dan kendali finansial.

Bunga nol bukan manfaat yang lemah ketika alternatif nyatanya adalah tidak menabung atau memakai utang yang sangat mahal.

### Solusi

Awrisan mengubah custody tanpa mencoba mengganti tradisinya.

1. **Custody kontrak**: dana anggota berada di smart contract, bukan rekening host.
2. **Prefunding penuh**: setiap anggota mengunci komitmen satu siklus sebelum kocok pertama.
3. **Kocok dua fase**: satu transaksi menyegel seed acak, transaksi berikutnya menentukan pemenang secara deterministik.
4. **Satu kemenangan per anggota**: kontrak hanya memilih anggota yang belum pernah menang.
5. **Payout otomatis**: pot berpindah langsung dari kontrak ke anggota yang terpilih.
6. **Verifikasi publik**: setoran, seed, pemenang, dan payout dapat diaudit di ledger.
7. **Jalur pengaman**: room terbuka dapat mengembalikan dana, dan room aktif yang macet dapat dibubarkan setelah masa tenggang.

### Mengapa menang lalu berhenti membayar mustahil

Misalkan ada sepuluh anggota dan iuran Rp1.000.000 per putaran.

- Komitmen penuh setiap anggota adalah 10 x Rp1.000.000 = Rp10.000.000.
- Sepuluh anggota mengunci Rp10.000.000 masing-masing.
- Kontrak memegang Rp100.000.000 sebelum kocok apa pun.
- Setiap putaran membayar pot Rp10.000.000 kepada satu anggota yang belum menang.
- Setelah sepuluh putaran, semua anggota sudah menerima Rp10.000.000 sekali.
- Saldo siklus berakhir nol.

Jika anggota ke-8 menang pada putaran pertama, tidak ada pembayaran berikutnya yang bisa ia lewatkan. Seluruh Rp10.000.000 miliknya sudah dikunci sebelum kocok.

Dalam arisan tradisional yang dibayar sambil berjalan, anggota yang sama dapat menyetor Rp1.000.000, menerima Rp10.000.000, lalu menghilang dan meninggalkan lubang Rp9.000.000. Prefunding menghapus lubang itu secara matematis.

### Trade-off yang jujur

Prefunding penuh lebih aman, tetapi lebih berat modal. Produk berubah dari instrumen kredit tanpa bunga menjadi tabungan komitmen dengan custody trustless dan rotasi yang adil.

Ini adalah risiko bisnis utama yang harus divalidasi. Pengguna yang paling membutuhkan arisan mungkin justru paling sulit mengunci komitmen satu siklus penuh. Pengumpulan secara cicilan dapat membantu, tetapi kocok tetap harus menunggu seluruh pool terkumpul jika jaminan tanpa gagal bayar ingin dipertahankan.

Awrisan tidak akan menyebut mode bayar sambil berjalan yang tidak terlindungi sebagai Terjamin. Model bonded atau prefund parsial dapat dieksplorasi nanti dengan risiko gagal bayar yang dijelaskan terbuka.

### Mengapa kocok memakai dua transaksi

Transaksi Soroban disimulasikan sebelum eksekusi untuk menentukan storage footprint. Hasil PRNG dapat berbeda antara simulasi dan eksekusi.

Jika PRNG langsung memilih pemenang, simulasi dapat memilih anggota A sementara eksekusi memilih anggota B. Transaksi kemudian membutuhkan entri pemenang dan saldo token yang berbeda, sehingga gagal dengan masalah outside the footprint.

Awrisan memisahkan prosesnya:

1. `seal_kocok` menyimpan seed PRNG pada satu kunci tetap untuk room dan putaran.
2. `kocok` membaca seed on-chain dan menghitung `pemenang = belum_menang[seed % jumlah_belum_menang]`.

Seed hasil eksekusi sudah tetap sebelum transaksi kedua. Simulasi dan eksekusi memilih pemenang yang sama dan menyentuh entri ledger yang sama. Seed tetap publik agar hasilnya dapat diverifikasi siapa pun.

**Batasan yang kami sebut terus terang.** Dua fase itu mematikan grinding lewat simulasi, tetapi tidak membuat kocok bebas dari bias, dan ketidakterdugaan PRNG tidak menyelamatkannya. `seal_kocok` mengembalikan seed di dalam transaksi atomik yang sama saat menulis seal, sehingga seorang anggota bisa membungkus pemanggilannya, menghitung sendiri pemenangnya, lalu membatalkan transaksi itu setiap kali pemenangnya bukan dia, dan mencoba lagi pada ledger berikutnya untuk seed baru. Ongkosnya hanya beberapa biaya transaksi gagal.

Yang membatasi kerugian adalah prefunding, bukan PRNG-nya. Setiap anggota berhak atas pot yang sama besar (N x s), jadi pelaku hanya bisa membeli giliran yang lebih awal — tidak pernah payout yang lebih besar, dan tidak pernah pokok dana anggota lain. Urutan giliran tetap bernilai nyata dalam arisan, jadi ini kelemahan sungguhan yang tidak kami sembunyikan.

Perbaikan yang dituju adalah commit-reveal yang dijamin oleh prefund yang sudah ada: setiap anggota menyerahkan H(rahasia) saat gabung, membukanya sekali tiap putaran, seed menjadi H(gabungan semua reveal), dan anggota yang tidak membuka kehilangan setoran terkuncinya untuk anggota lain. Commit-reveal biasanya gagal karena jaminannya tidak bisa ditagih; di sini setiap anggota sudah mengunci N x s, jadi prefund itulah jaminannya. VRF eksternal atau oracle threshold adalah alternatifnya. Keduanya belum diterapkan.

### Pengalaman pengguna

Pengalaman yang direncanakan membuat crypto tidak terlihat:

- Masuk dengan akun biasa.
- Menyelesaikan KYC sebelum mendanai room.
- Top up memakai jalur pembayaran Indonesia yang familiar.
- Melihat saldo, setoran, dan payout dalam rupiah.
- Membiarkan USDC di Stellar menjadi penyelesaian di bawahnya.
- Mencairkan uang melalui on dan off-ramp berlisensi.

Google sign-in, wallet server-side, Sumsub, Xendit, dan anchor Stellar berlisensi adalah arah desain, bukan kemitraan produksi yang sudah dikonfirmasi. Aliran rupiah riil membutuhkan penyedia berlisensi.

### Pengguna sasaran

- Kelompok arisan lingkungan, keluarga, kantor, dan komunitas
- Lingkaran tabungan yang dipimpin perempuan
- Pekerja informal dan gig dengan akses terbatas ke kredit terjangkau
- Kelompok diaspora yang membutuhkan pool bersama tanpa satu kustodian lintas negara

Indonesia adalah pasar pertama. Ekspansi ROSCA internasional adalah kemungkinan masa depan, bukan bagian MVP.

### Model bisnis

Model yang direncanakan adalah fee kecil dan terbuka pada setiap payout yang berhasil. Semua anggota harus melihat fee sebelum bergabung. Persentase, batas maksimum, perlakuan pajak, dan akuntansi kontraknya masih perlu diputuskan.

Awrisan tidak menggantungkan model bisnis pada yield dari dana pengguna yang terkunci. Model seperti itu memberi insentif kepada perusahaan untuk memperpanjang masa lock dan bertentangan dengan kepentingan anggota.

### Apa yang dibuktikan ledger

Ledger dapat membuktikan aliran dana, seed yang disegel, pemenang deterministik, dan alamat payout. Ledger tidak membuktikan bahwa semua orang jujur, bahwa satu manusia hanya memiliki satu wallet, atau bahwa tidak ada penipuan di luar aplikasi.

KYC dan kontrol undangan mengurangi penyalahgunaan sosial. Keduanya tidak menghapus seluruh risiko. Kegagalan spesifik yang dihapus Awrisan adalah kemampuan bandar manusia untuk membawa pool yang berada di kontrak.

### Tesis bisnis hackathon

Awrisan tidak menjual blockchain. Awrisan menjual kepercayaan yang dapat ditegakkan untuk tradisi finansial yang sudah memiliki pengguna, perilaku, dan kebutuhan.

Cerita bisnisnya:

1. Arisan sudah bekerja dan tertanam kuat di komunitas Indonesia.
2. Distribusi online menghilangkan jaminan sosial yang dahulu melindunginya.
3. Hukuman pengadilan datang setelah pool hilang dan jarang membuat korban pulih penuh.
4. Custody smart contract mencegah pengelola memegang pool sejak awal.
5. Pengalaman berbahasa rupiah menjaga blockchain sebagai infrastruktur, bukan produk.

Baca konsep bisnis bilingual lengkap di [BUSINESS-CONCEPT.md](BUSINESS-CONCEPT.md).

## Core principles

- Testnet is always labelled.
- Guaranteed means protected from member default and bandar absconding, not guaranteed profit.
- Net interest is zero before any service fee.
- Arisan is a tradition, not an invention by Awrisan.
- No claim of being first in the world.
- No claim of Stellar affiliation or endorsement.
- No claim that on-chain data proves off-chain honesty.
