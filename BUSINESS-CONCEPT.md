# Awrisan Business Concept

**Working title:** Awrisan

**Category:** Trustless rotating savings circle

**Initial market:** Indonesia

**Current scope:** Stellar testnet business and product concept

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

## English

### 1. Executive summary

Awrisan is an arisan where a Soroban smart contract holds the savings pool instead of a human organizer.

An arisan is a rotating savings and credit association. Members contribute equal amounts, one member receives the full pot each period, and everyone receives it exactly once. The model is common because it turns affordable recurring payments into a useful lump sum without collateral, credit scoring, or interest.

The model has one structural weakness: the bandar controls the money.

In a close community, social pressure once acted as collateral. In an online group, the organizer may be a stranger. The economic transaction moved online, but the social enforcement did not. This creates a recurring pattern of fictitious winners, missing payouts, Ponzi schemes, and organizers disappearing with the pool.

Awrisan removes that single point of custody. Members prefund their full cycle commitments into a smart contract. The room starts only after the full pool is locked. The contract then runs a verifiable rotation and pays each winner automatically.

The promise is not investment return. The promise is enforceable custody:

> The host can organize the arisan, but the host can never hold or withdraw the pool.

### 2. Arisan is a cultural institution before it is a financial mechanism

Awrisan begins with the assumption that arisan already works, culturally as well as economically.

The word arisan does not refer only to a pool of money. Indonesia's official dictionary definition includes the periodic gathering where equal contributions are collected and a recipient is drawn. The meeting is not decoration around the financial mechanism. It is part of the mechanism's social meaning.

Arisan gives a group a calendar. RT/RW neighbors, PKK groups, pengajian circles, extended families, office colleagues, alumni, and women-led circles have a reason to meet repeatedly instead of waiting for a special event. The gathering can include food, conversation, family news, community information, advice, introductions, and mutual assistance. In some groups, hosting also rotates, distributing hospitality and recognition. The draw gives the meeting suspense and a shared focus.

Clifford Geertz's research in East Java in the 1950s described arisan as a cooperative endeavor or mutual help. His deeper observation was that traditional social relationships could be mobilized to perform an economic function. That relationship between culture and money is the intellectual foundation of Awrisan. The study appeared in *Economic Development and Cultural Change*, volume 10, number 3, in 1962.

#### Why people value arisan beyond money

| Cultural function | What members experience | Why it matters |
|---|---|---|
| Regular gathering | A dependable reason to meet | Relationships survive busy schedules and physical distance |
| Belonging | Repeated participation in a named group | Membership becomes visible and emotionally meaningful |
| Reciprocity | Everyone contributes and everyone receives a turn | Fairness is experienced collectively, not only calculated privately |
| Gotong royong | The group supports one member at a time | Individual milestones become a shared achievement |
| Social accountability | A commitment is made in front of people who matter | Saving becomes harder to abandon quietly |
| Women's social space | Information, confidence, and decisions can develop within the group | Arisan can support agency as well as companionship |
| Anticipation and celebration | The kocok produces suspense and recognition | Each payout becomes a community moment |
| Informal mutual aid | Needs and opportunities become visible through conversation | The group can respond beyond the formal pool |

The money gives the gathering continuity. The gathering gives the money trust, discipline, and meaning. An arisan stripped down to transfers and balances would lose part of what makes people return.

#### The host has two different roles

In a traditional arisan, the host or bandar often combines two roles:

1. **Social convener**: invites members, sets the tone, keeps the rhythm, welcomes the group, and makes each turn feel important.
2. **Financial custodian**: receives contributions, holds the pool, records balances, and releases payouts.

Awrisan should remove only the second role. The contract becomes the financial custodian. The host remains the social convener.

That distinction is central to the product. If Awrisan removes the host entirely, it risks removing the warmth, identity, and accountability that make arisan durable. If it leaves the host in control of funds, it fails to solve the pain point.

#### Financial value still matters

People do not join because they misunderstand interest. They also join because arisan provides a combination that formal products often do not:

- Access to a lump sum through small recurring contributions
- Interest free informal credit for early recipients
- Commitment savings for later recipients
- A tool that works without collateral or a formal credit file

The product principle is therefore precise: preserve the group, gathering, anticipation, reciprocity, and mutual help, while moving custody and rotation into rules no individual can override.

### 3. The customer pain

#### Functional pain

- Members cannot independently verify whether the pool still exists.
- Payout depends on one organizer acting honestly and on time.
- A bandar can create fictitious winners or alter records.
- Members have no automatic refund or payout mechanism.

#### Financial pain

- The loss can equal several months or years of household savings.
- Victims may have no affordable credit to replace the missing money.
- Criminal punishment does not guarantee restitution.
- Civil recovery is slow, expensive, and uncertain.

#### Emotional and social pain

- Victims often know or trusted the organizer.
- Fraud damages families, friendships, and neighborhood groups.
- Fear of fraud can destroy a useful savings habit, not only one transaction.

### 4. Evidence that punishment is not prevention

Three convictions in the product research show the pattern:

| Location and year | Reported loss | Sentence | Recovery outcome |
|---|---:|---|---|
| Banjarmasin, 2022 | Rp11 billion, 320 victims | 1 year and 9 months | Rp650 million ordered, less than 6 percent |
| Salatiga, 2022 | About Rp4.7 billion | 9 months each | About Rp71.3 million ordered, around 1.5 percent |
| Gresik, 2025, case 106/Pid.B/2025/PN Gsk | Rp1,662,550,000, 63 victims | 3 years and 6 months | No money returned by the criminal verdict |

The legal process can establish guilt. It cannot guarantee that dissipated funds still exist. Awrisan changes the architecture before the loss occurs.

### 5. The legal protection gap

Community arisan does not have the same prudential supervision as a bank deposit or a regulated investment product. Agreements may be oral. The pool is not covered by Indonesia's deposit insurance system. The practical legal tools usually arrive after a default through criminal reports or civil claims.

Awrisan must not claim that arisan is outside all law. General contract, fraud, embezzlement, AML, data protection, and consumer rules may still apply. The business claim is narrower: there is no equivalent of bank-style pool supervision and deposit protection preventing the bandar from taking the money.

Formal Indonesian legal advice is required before handling real value.

### 6. Product proposition

#### For members

- The organizer cannot withdraw the pool.
- A winner cannot stop paying after receiving the pot.
- Every draw can be independently recomputed.
- Every member can see the same ledger history.
- Refund paths do not depend only on the host.

#### For hosts

- The host can run a group without personally holding other people's money.
- Transparent rules reduce accusations of favoritism.
- Automatic payout reduces administrative work.
- The host can preserve the social role without accepting custody liability.

#### For the ecosystem

- A familiar financial habit gains verifiable settlement.
- Stablecoin and smart contract infrastructure serve an existing need.
- Blockchain stays below the user experience instead of becoming a speculative product.

### 7. How the guaranteed prefund model works

Let:

- `N` be the number of members
- `S` be the contribution represented by one round
- `N x S` be each member's full cycle commitment
- `N x S` also be the pot paid in each round

Before the first draw, all `N` members lock `N x S`. The contract therefore holds `N x N x S`.

Each of the `N` rounds pays `N x S` to one member who has not won. Total payouts are `N x N x S`, which equals the amount initially locked.

No payment remains due after the room starts. Member default after winning is therefore not merely discouraged. It is impossible within the model.

### 8. The cost of the guarantee

Prefunding solves the default problem by removing credit exposure. That also removes much of the traditional early-recipient credit benefit.

The product must validate whether customers value these remaining benefits enough:

- A strong commitment savings mechanism
- A fair and verifiable payout order
- No bandar custody
- No member default after winning
- Social participation with transparent money flow

Installment collection may reduce the burden of making one large transfer, but it does not change the invariant. No draw can begin until the entire cycle is funded.

This trade-off must be visible in product messaging. Hiding it would create the same kind of misleading financial promise Awrisan is trying to prevent.

### 9. Customer segments

#### Primary beachhead

- Existing neighborhood and family arisan groups
- Office and professional community groups
- Women-led groups that already have regular saving behavior
- Groups that trust one another socially but do not want one person to hold the money

These users already understand arisan. Awrisan does not need to teach the behavior, only the new custody promise.

#### Secondary segments

- Gig and informal worker communities
- Creator and online communities
- Diaspora groups with cross-border members
- Cooperatives and associations exploring transparent member pools

The fully prefunded model may be too capital-heavy for some financially excluded users. That should be tested rather than hidden behind a large market statistic.

### 10. End-to-end experience

The intended member journey is:

1. Sign in using a familiar identity method.
2. Complete identity and AML checks.
3. Create or join an invite-controlled room.
4. Top up in rupiah using familiar payment rails.
5. See an IDR balance while settlement occurs in USDC on Stellar.
6. Fund the full commitment, either once or during a funding window.
7. Start only after all members are fully funded.
8. Seal and execute each scheduled draw.
9. Receive payout and a public verification receipt.
10. Cash out in rupiah through a licensed provider.

The user should not need an extension, a seed phrase, XLM, or knowledge of transaction hashes. Advanced users may open the public receipt if they choose.

The custody and account recovery design remains a critical open decision. A server-managed wallet can make onboarding easier but may create a new trusted custodian outside the room contract.

### 11. Trust architecture

Awrisan separates four kinds of trust:

| Layer | What it does | What can still go wrong |
|---|---|---|
| Smart contract | Holds pool, enforces rotation, pays winners | Contract bugs, storage lifecycle, network assumptions |
| Identity and KYC | Links accounts to verified people | Provider failure, privacy risk, direct contract bypass if not enforced |
| Fiat and stablecoin rails | Convert IDR and settle USDC | FX movement, depeg, issuer, anchor, and payment provider risk |
| Social group | Decides who should participate | Collusion, coercion, scams outside the app |

The correct product claim is specific: Awrisan removes discretionary human custody of the in-contract arisan pool. It does not remove every technical, legal, identity, or social risk.

### 12. Why Stellar and Soroban

- Soroban can hold and move the pool according to public rules.
- Stellar supports low-cost stablecoin settlement.
- Public ledger history creates a shared receipt.
- The ecosystem is suited to payment and access use cases.
- Contract execution removes the need for Awrisan's server to decide winners or release payouts.

Awrisan is built on Stellar. It does not claim affiliation, endorsement, or partnership with the Stellar Development Foundation or Stellar Aid Assist.

### 13. Two phase randomness as a business feature

Fairness must survive actual transaction execution, not only look fair in a demo.

Soroban simulation creates a footprint before execution. Direct PRNG winner selection can produce different addresses during simulation and execution. The result can fail because the execution needs ledger entries outside the simulated footprint.

Awrisan first seals a seed at a fixed storage key. The next transaction reads that seed and selects from the remaining members deterministically. This produces the same winner during simulation and execution and gives every observer the information needed to verify the outcome.

The business benefit is not the word PRNG. The benefit is that the host cannot choose a winner, re-roll a disliked result, or ask the system for a favor.

An external VRF is planned to reduce dependence on the unpredictability assumption of the ledger seeded PRNG.

### 14. Business model

#### Intended revenue

A small fee on each successful payout:

- Disclosed before a member joins
- Applied consistently by the contract
- Visible on the receipt
- Potentially capped to protect larger rooms

The exact fee, cap, tax treatment, and treatment of failed or dissolved rooms are not decided.

#### Rejected incentive

The MVP should not depend on yield earned from the locked pool. Earning more when user funds remain locked longer would create a conflict between company revenue and member liquidity.

#### Unit economics to validate

- KYC cost per verified member
- Fiat collection cost
- Stablecoin conversion spread
- Stellar transaction and sponsorship cost
- Cash-out cost
- Support and fraud operations cost
- Revenue per completed payout
- Completion rate per room

### 15. Go-to-market

#### Beachhead motion

Start with existing groups, not strangers matched by a marketplace.

- One trusted host invites an existing arisan group.
- The host becomes the product champion but never the custodian.
- The first room is a small testnet or sandbox cycle.
- Every payout produces a simple public receipt.
- Successful groups invite another real-world group.

This uses the existing social network as distribution while the contract protects the pool.

#### Messaging

Primary message:

> Arisan yang tidak bisa dibawa kabur.

Supporting message:

> Host tetap mengatur grup. Kontrak yang memegang uang.

Avoid leading with blockchain, crypto, DeFi, yield, or token terminology. Those words describe infrastructure, not the customer problem.

#### Trust building

- Clearly label testnet and sandbox experiences.
- Show the complete fee before joining.
- Explain prefunding before any transfer.
- Publish the contract address and verification method.
- Use independent smart contract review before real value.
- Use licensed partners for real fiat conversion.

### 16. Competitive alternatives

| Alternative | Strength | Failure relative to Awrisan |
|---|---|---|
| Traditional cash or bank transfer arisan | Familiar and flexible | Bandar controls the pool and winners can default later |
| Personal savings account | Liquid and regulated | Does not create the same lump-sum timing or social commitment |
| Bank credit | Can provide immediate capital | Requires eligibility, documentation, and often collateral |
| Online lending | Fast access for some users | Can be expensive and is not community savings |
| Generic multi-signature wallet | Reduces one-person control | Poor fit for automatic rotating payouts and mainstream onboarding |
| Awrisan | Contract custody and enforced rotation | Requires full prefunding and introduces technology and provider risks |

Awrisan should not claim to replace every alternative. Its advantage is strongest for an existing group that wants arisan behavior without bandar custody.

### 17. Defensibility

The smart contract alone is reproducible. Long-term defensibility would come from execution around it:

- Trustworthy and simple IDR onboarding
- Licensed payment and anchor relationships
- KYC and one-human-per-seat enforcement
- A strong reputation for transparent room completion
- Local language education and support
- Compliance operations designed for Indonesian community finance
- Verifiable receipts that users can understand without blockchain knowledge

The moat is not a token. It is trusted distribution, licensed rails, operational reliability, and a user experience built around real arisan behavior.

### 18. MVP boundary

The honest MVP boundary is:

- Stellar testnet only
- Fully prefunded rooms
- Invite-controlled group experience
- Two phase draw
- One winner per member
- Automatic test token payout
- Open-room refunds
- Bounded postpone before sealing
- Emergency dissolution after a grace period
- Public verification data

Not yet proven or production-ready:

- Real IDR deposits and withdrawals
- Licensed anchor integration
- Production KYC enforcement
- Installment funding
- External VRF
- Production wallet custody and recovery
- Final payout fee
- Legal approval for handling real value

### 19. Roadmap

#### Phase 1: Testnet proof

- Demonstrate custody, prefunding, rotation, and refunds
- Demonstrate two phase verifiable draws
- Validate the story with existing arisan participants
- Measure willingness to prefund

#### Phase 2: Controlled sandbox

- Add identity flow and one-human-per-seat controls
- Test IDR-first user experience with sandbox payment rails
- Test installment collection without starting an underfunded room
- Complete smart contract review and operational threat model

#### Phase 3: Licensed pilot

- Work with qualified legal counsel and licensed providers
- Use real KYC and AML controls
- Introduce clearly disclosed fees
- Limit room size and exposure
- Monitor settlement and support operations

#### Later

- External VRF
- Reputation signals
- Cross-border and cross-currency rooms
- Bonded or partial prefund designs with explicit residual risk

### 20. Success metrics

Hackathon output should not be presented as market traction. Useful testnet and discovery metrics include:

- Percentage of invited members who understand prefunding
- Percentage willing to lock a full cycle commitment
- Room funding completion rate
- Time from room creation to full funding
- Draw completion without host intervention
- Refund and dissolve completion rate
- Ability of a non-technical user to verify a payout receipt
- User understanding of what Guaranteed does and does not mean
- Estimated cost per member and per completed cycle

The most important early result is not transaction volume. It is evidence that real arisan users accept the prefund trade-off.

### 21. Hackathon narrative

The strongest presentation sequence is:

1. **Culture**: open with a recurring arisan gathering, where food, conversation, belonging, reciprocity, and the kocok matter as much as the transfer. Arisan is a social institution, not a crypto invention.
2. **Breakage**: online distribution separated the money from the social collateral.
3. **Human consequence**: convictions punish organizers but often return little or none of the pool.
4. **Architectural insight**: the bandar is both the organizer and the custodian, but only the custody role needs to disappear.
5. **Product**: a Soroban contract holds the fully prefunded pool and performs the rotation.
6. **Proof**: show the sealed seed, deterministic winner, payout, and zero residual balance.
7. **Business**: charge a transparent payout fee through an IDR-first experience.
8. **Honesty**: explain the capital burden, testnet status, licensing needs, and VRF roadmap.

The closing line:

> Blockchain is not the product. It is the plumbing that makes the promise enforceable.

### 22. Decisions required before real-value development

- Validate the fully prefunded product with target users.
- Define installment funding behavior.
- Decide the exact payout fee and cap.
- Define IDR and USDC exchange rate treatment.
- Select licensed on and off-ramp partners.
- Define wallet custody, signing, and recovery.
- Define KYC enforcement for direct contract calls.
- Replace public invite secrets with a real membership authorization model.
- Define room-specific accounting and solvency verification.
- Decide deployment, upgrade, pause, and incident authority.
- Define storage TTL and archival recovery.
- Decide when external VRF becomes mandatory.
- Obtain Indonesian legal, AML, privacy, tax, and consumer protection advice.

## Bahasa Indonesia

### 1. Ringkasan eksekutif

Awrisan adalah arisan yang pool tabungannya dipegang smart contract Soroban, bukan pengelola manusia.

Arisan adalah kelompok simpanan dan kredit bergilir. Anggota menyetor jumlah yang sama, satu anggota menerima seluruh pot setiap periode, dan semua anggota menerima tepat satu kali. Model ini umum karena mampu mengubah pembayaran kecil yang terjangkau menjadi dana besar tanpa agunan, penilaian kredit, atau bunga.

Model ini memiliki satu kelemahan struktural: bandar menguasai uang.

Dalam komunitas dekat, tekanan sosial dahulu menjadi jaminan. Dalam kelompok online, pengelola dapat menjadi orang asing. Transaksi ekonominya pindah ke internet, tetapi penegakan sosialnya tidak. Akibatnya muncul pola pemenang fiktif, payout hilang, skema Ponzi, dan pengelola yang kabur membawa pool.

Awrisan menghapus titik custody tunggal tersebut. Anggota mendanai komitmen satu siklus penuh ke smart contract. Room hanya mulai setelah seluruh pool terkunci. Kontrak kemudian menjalankan rotasi yang dapat diverifikasi dan membayar setiap pemenang secara otomatis.

Janjinya bukan keuntungan investasi. Janjinya adalah custody yang dapat ditegakkan:

> Host dapat mengatur arisan, tetapi host tidak pernah dapat memegang atau menarik pool.

### 2. Arisan adalah institusi budaya sebelum menjadi mekanisme finansial

Awrisan dimulai dari asumsi bahwa arisan sudah bekerja, baik secara budaya maupun ekonomi.

Kata arisan tidak hanya berarti pool uang. Definisi kamus resmi Indonesia memasukkan pertemuan berkala tempat setoran bernilai sama dikumpulkan dan penerima diundi. Pertemuan bukan hiasan di sekitar mekanisme finansial. Pertemuan adalah bagian dari makna sosial arisan.

Arisan memberi kelompok sebuah kalender. Tetangga RT/RW, kelompok PKK, pengajian, keluarga besar, rekan kantor, alumni, dan kelompok yang dipimpin perempuan mempunyai alasan untuk bertemu berulang kali tanpa menunggu acara khusus. Pertemuan dapat berisi makanan, percakapan, kabar keluarga, informasi lingkungan, saran, perkenalan, dan saling membantu. Dalam sebagian kelompok, giliran menjadi tuan rumah juga berputar, sehingga keramahan dan pengakuan dibagikan. Kocok memberikan rasa penasaran dan fokus bersama kepada pertemuan tersebut.

Riset Clifford Geertz di Jawa Timur pada 1950-an menjelaskan arisan sebagai usaha bersama atau saling membantu. Pengamatan yang lebih dalam adalah bahwa hubungan sosial tradisional dapat digerakkan untuk menjalankan fungsi ekonomi. Hubungan antara budaya dan uang tersebut adalah fondasi intelektual Awrisan. Studi tersebut terbit dalam *Economic Development and Cultural Change*, volume 10, nomor 3, pada 1962.

#### Mengapa orang menghargai arisan di luar uang

| Fungsi budaya | Pengalaman anggota | Mengapa penting |
|---|---|---|
| Pertemuan rutin | Alasan yang pasti untuk bertemu | Hubungan bertahan di tengah kesibukan dan jarak fisik |
| Rasa memiliki | Partisipasi berulang dalam kelompok yang mempunyai identitas | Keanggotaan menjadi terlihat dan bermakna secara emosional |
| Timbal balik | Semua menyetor dan semua menerima giliran | Keadilan dialami bersama, bukan hanya dihitung secara pribadi |
| Gotong royong | Kelompok mendukung satu anggota pada satu waktu | Pencapaian individu menjadi keberhasilan bersama |
| Akuntabilitas sosial | Komitmen dibuat di hadapan orang-orang yang penting | Menabung menjadi lebih sulit ditinggalkan diam-diam |
| Ruang sosial perempuan | Informasi, kepercayaan diri, dan keputusan dapat tumbuh dalam kelompok | Arisan dapat mendukung kendali diri sekaligus kebersamaan |
| Antisipasi dan perayaan | Kocok menghasilkan rasa penasaran dan pengakuan | Setiap payout menjadi momen komunitas |
| Saling membantu informal | Kebutuhan dan peluang terlihat melalui percakapan | Kelompok dapat merespons melampaui pool formal |

Uang memberi pertemuan kesinambungan. Pertemuan memberi uang kepercayaan, disiplin, dan makna. Arisan yang dipersempit menjadi transfer dan saldo akan kehilangan sebagian alasan orang terus kembali.

#### Host mempunyai dua peran yang berbeda

Dalam arisan tradisional, host atau bandar sering menggabungkan dua peran:

1. **Pengikat sosial**: mengundang anggota, membentuk suasana, menjaga ritme, menyambut kelompok, dan membuat setiap giliran terasa penting.
2. **Kustodian finansial**: menerima setoran, memegang pool, mencatat saldo, dan melepaskan payout.

Awrisan hanya boleh menghapus peran kedua. Kontrak menjadi kustodian finansial. Host tetap menjadi pengikat sosial.

Perbedaan ini adalah pusat produk. Jika Awrisan menghapus host sepenuhnya, produk berisiko menghapus kehangatan, identitas, dan akuntabilitas yang membuat arisan bertahan. Jika host tetap menguasai dana, produk gagal menyelesaikan pain point.

#### Nilai finansial tetap penting

Orang tidak bergabung karena tidak memahami bunga. Mereka juga bergabung karena arisan memberikan kombinasi yang sering tidak diberikan produk formal:

- Akses dana besar melalui setoran rutin yang kecil
- Kredit informal tanpa bunga bagi penerima awal
- Tabungan komitmen bagi penerima akhir
- Alat yang bekerja tanpa agunan atau riwayat kredit formal

Prinsip produknya harus tepat: pertahankan kelompok, pertemuan, antisipasi, timbal balik, dan rasa saling membantu, sambil memindahkan custody dan rotasi ke aturan yang tidak dapat dilangkahi individu mana pun.

### 3. Pain point pengguna

#### Pain fungsional

- Anggota tidak dapat memverifikasi sendiri apakah pool masih utuh.
- Payout bergantung pada satu pengelola yang harus jujur dan tepat waktu.
- Bandar dapat membuat pemenang fiktif atau mengubah catatan.
- Anggota tidak memiliki mekanisme refund atau payout otomatis.

#### Pain finansial

- Kerugian dapat bernilai beberapa bulan atau tahun tabungan rumah tangga.
- Korban mungkin tidak memiliki kredit terjangkau untuk mengganti uang yang hilang.
- Hukuman pidana tidak menjamin restitusi.
- Pemulihan perdata lambat, mahal, dan belum tentu berhasil.

#### Pain emosional dan sosial

- Korban sering mengenal atau mempercayai pengelola.
- Penipuan merusak keluarga, pertemanan, dan kelompok lingkungan.
- Ketakutan terhadap penipuan dapat menghancurkan kebiasaan menabung yang berguna, bukan hanya satu transaksi.

### 4. Bukti bahwa hukuman bukan pencegahan

Tiga putusan dalam riset produk menunjukkan polanya:

| Lokasi dan tahun | Kerugian dilaporkan | Hukuman | Hasil pengembalian |
|---|---:|---|---|
| Banjarmasin, 2022 | Rp11 miliar, 320 korban | 1 tahun 9 bulan | Rp650 juta diperintahkan, kurang dari 6 persen |
| Salatiga, 2022 | Sekitar Rp4,7 miliar | 9 bulan masing-masing | Sekitar Rp71,3 juta diperintahkan, sekitar 1,5 persen |
| Gresik, 2025, perkara 106/Pid.B/2025/PN Gsk | Rp1.662.550.000, 63 korban | 3 tahun 6 bulan | Tidak ada uang dikembalikan melalui putusan pidana |

Proses hukum dapat menetapkan kesalahan. Proses tersebut tidak menjamin dana yang sudah tersebar masih tersedia. Awrisan mengubah arsitektur sebelum kerugian terjadi.

### 5. Kesenjangan perlindungan hukum

Arisan komunitas tidak memiliki pengawasan prudensial yang sama seperti simpanan bank atau produk investasi teregulasi. Perjanjian dapat bersifat lisan. Pool tidak ditanggung sistem penjaminan simpanan Indonesia. Alat hukum praktis biasanya baru bergerak setelah gagal bayar melalui laporan pidana atau gugatan perdata.

Awrisan tidak boleh menyatakan bahwa arisan berada di luar seluruh hukum. Hukum kontrak, penipuan, penggelapan, AML, perlindungan data, dan konsumen mungkin tetap berlaku. Klaim bisnisnya lebih sempit: tidak ada perlindungan pool setara bank yang mencegah bandar mengambil uang sebelum kejadian.

Nasihat hukum formal Indonesia diperlukan sebelum menangani nilai riil.

### 6. Proposisi produk

#### Bagi anggota

- Pengelola tidak dapat menarik pool.
- Pemenang tidak dapat berhenti membayar setelah menerima pot.
- Setiap hasil kocok dapat dihitung ulang secara independen.
- Semua anggota dapat melihat riwayat ledger yang sama.
- Jalur refund tidak hanya bergantung pada host.

#### Bagi host

- Host dapat menjalankan kelompok tanpa memegang uang orang lain.
- Aturan transparan mengurangi tuduhan pilih kasih.
- Payout otomatis mengurangi pekerjaan administrasi.
- Host dapat mempertahankan peran sosial tanpa menerima tanggung jawab custody.

#### Bagi ekosistem

- Kebiasaan finansial yang dikenal memperoleh penyelesaian yang dapat diverifikasi.
- Stablecoin dan smart contract melayani kebutuhan yang sudah ada.
- Blockchain tetap berada di bawah pengalaman pengguna dan tidak berubah menjadi produk spekulatif.

### 7. Cara kerja model prefund Terjamin

Misalkan:

- `N` adalah jumlah anggota
- `S` adalah iuran yang direpresentasikan oleh satu putaran
- `N x S` adalah komitmen penuh setiap anggota
- `N x S` juga merupakan pot setiap putaran

Sebelum kocok pertama, seluruh `N` anggota mengunci `N x S`. Kontrak memegang `N x N x S`.

Masing-masing dari `N` putaran membayar `N x S` kepada satu anggota yang belum menang. Total payout adalah `N x N x S`, sama dengan jumlah yang dikunci sejak awal.

Tidak ada kewajiban pembayaran setelah room dimulai. Gagal bayar anggota setelah menang bukan hanya dicegah, tetapi mustahil di dalam model tersebut.

### 8. Harga dari jaminan

Prefunding menyelesaikan gagal bayar dengan menghapus eksposur kredit. Langkah tersebut juga menghapus sebagian besar manfaat kredit bagi penerima awal dalam arisan tradisional.

Produk harus memvalidasi apakah pengguna cukup menghargai manfaat yang tersisa:

- Mekanisme tabungan komitmen yang kuat
- Urutan payout yang adil dan dapat diverifikasi
- Tidak ada custody bandar
- Tidak ada gagal bayar anggota setelah menang
- Partisipasi sosial dengan aliran uang transparan

Pengumpulan cicilan dapat mengurangi beban satu transfer besar, tetapi tidak mengubah invariant. Kocok tidak dapat dimulai sebelum seluruh siklus didanai.

Trade-off ini harus terlihat dalam pesan produk. Menyembunyikannya akan menciptakan janji finansial menyesatkan yang justru ingin dihindari Awrisan.

### 9. Segmen pengguna

#### Beachhead utama

- Kelompok arisan lingkungan dan keluarga yang sudah ada
- Kelompok kantor dan komunitas profesional
- Kelompok pimpinan perempuan yang sudah mempunyai kebiasaan menabung rutin
- Kelompok yang saling percaya secara sosial tetapi tidak ingin satu orang memegang uang

Pengguna tersebut sudah memahami arisan. Awrisan tidak perlu mengajarkan perilakunya, hanya janji custody yang baru.

#### Segmen sekunder

- Komunitas pekerja gig dan informal
- Komunitas kreator dan online
- Kelompok diaspora dengan anggota lintas negara
- Koperasi dan asosiasi yang mengeksplorasi pool anggota transparan

Model prefund penuh mungkin terlalu berat modal bagi sebagian pengguna yang tidak terlayani sistem finansial. Hal tersebut harus diuji, bukan disembunyikan di balik statistik pasar yang besar.

### 10. Pengalaman dari awal sampai akhir

Perjalanan anggota yang direncanakan:

1. Masuk dengan metode identitas yang familiar.
2. Menyelesaikan pemeriksaan identitas dan AML.
3. Membuat atau bergabung dengan room yang dikontrol undangan.
4. Top up dalam rupiah memakai jalur pembayaran familiar.
5. Melihat saldo IDR sementara penyelesaian berlangsung dalam USDC di Stellar.
6. Mendanai komitmen penuh sekaligus atau selama funding window.
7. Memulai hanya setelah semua anggota didanai penuh.
8. Menyegel dan menjalankan setiap kocok terjadwal.
9. Menerima payout dan bukti verifikasi publik.
10. Mencairkan rupiah melalui penyedia berlisensi.

Pengguna tidak perlu extension, seed phrase, XLM, atau pengetahuan tentang transaction hash. Pengguna lanjutan dapat membuka bukti publik jika memilih.

Desain custody dan pemulihan akun tetap menjadi keputusan kritis. Wallet yang dikelola server dapat mempermudah onboarding, tetapi berpotensi menciptakan kustodian tepercaya baru di luar kontrak room.

### 11. Arsitektur kepercayaan

Awrisan memisahkan empat jenis kepercayaan:

| Lapisan | Fungsi | Risiko yang masih ada |
|---|---|---|
| Smart contract | Memegang pool, menegakkan rotasi, membayar pemenang | Bug kontrak, siklus storage, asumsi jaringan |
| Identitas dan KYC | Menghubungkan akun dengan orang terverifikasi | Kegagalan penyedia, risiko privasi, bypass panggilan kontrak jika tidak ditegakkan |
| Jalur fiat dan stablecoin | Mengubah IDR dan menyelesaikan USDC | Perubahan kurs, depeg, risiko issuer, anchor, dan penyedia pembayaran |
| Kelompok sosial | Menentukan siapa yang seharusnya bergabung | Kolusi, paksaan, penipuan di luar aplikasi |

Klaim produk yang tepat bersifat spesifik: Awrisan menghapus custody manusia secara diskresioner terhadap pool arisan di dalam kontrak. Awrisan tidak menghapus seluruh risiko teknis, hukum, identitas, atau sosial.

### 12. Mengapa Stellar dan Soroban

- Soroban dapat memegang dan memindahkan pool sesuai aturan publik.
- Stellar mendukung penyelesaian stablecoin berbiaya rendah.
- Riwayat ledger publik menciptakan bukti bersama.
- Ekosistemnya cocok untuk use case pembayaran dan akses.
- Eksekusi kontrak menghapus kebutuhan server Awrisan untuk menentukan pemenang atau melepaskan payout.

Awrisan dibangun di atas Stellar. Awrisan tidak mengklaim afiliasi, dukungan, atau kemitraan dengan Stellar Development Foundation maupun Stellar Aid Assist.

### 13. Keacakan dua fase sebagai fitur bisnis

Fairness harus bertahan dalam eksekusi transaksi nyata, bukan hanya terlihat adil dalam demo.

Simulasi Soroban membuat footprint sebelum eksekusi. Pemilihan pemenang langsung dengan PRNG dapat menghasilkan alamat berbeda saat simulasi dan eksekusi. Hasilnya dapat gagal karena eksekusi membutuhkan entri ledger di luar footprint yang disimulasikan.

Awrisan pertama-tama menyegel seed pada kunci storage tetap. Transaksi berikutnya membaca seed tersebut dan memilih dari anggota tersisa secara deterministik. Proses ini menghasilkan pemenang yang sama saat simulasi dan eksekusi, serta memberikan informasi kepada setiap pengamat untuk memverifikasi hasil.

Manfaat bisnisnya bukan istilah PRNG. Manfaatnya adalah host tidak dapat memilih pemenang, mengulang hasil yang tidak disukai, atau meminta perlakuan khusus dari sistem.

VRF eksternal direncanakan untuk mengurangi ketergantungan pada asumsi bahwa PRNG berbasis ledger tidak dapat diprediksi.

### 14. Model bisnis

#### Pendapatan yang direncanakan

Fee kecil pada setiap payout yang berhasil:

- Diungkapkan sebelum anggota bergabung
- Diterapkan secara konsisten oleh kontrak
- Terlihat pada bukti transaksi
- Berpotensi dibatasi untuk melindungi room bernilai besar

Besaran fee, batas maksimum, perlakuan pajak, serta perlakuan room gagal atau dibubarkan belum diputuskan.

#### Insentif yang ditolak

MVP tidak seharusnya bergantung pada yield dari pool yang terkunci. Pendapatan yang meningkat ketika dana pengguna terkunci lebih lama akan menciptakan konflik antara pendapatan perusahaan dan likuiditas anggota.

#### Unit economics yang perlu divalidasi

- Biaya KYC per anggota terverifikasi
- Biaya pengumpulan fiat
- Spread konversi stablecoin
- Biaya transaksi dan sponsorship Stellar
- Biaya pencairan
- Biaya dukungan dan operasi penipuan
- Pendapatan per payout selesai
- Tingkat penyelesaian per room

### 15. Go-to-market

#### Gerakan beachhead

Mulai dengan kelompok yang sudah ada, bukan mempertemukan orang asing melalui marketplace.

- Satu host tepercaya mengundang kelompok arisan yang sudah berjalan.
- Host menjadi champion produk tetapi tidak pernah menjadi kustodian.
- Room pertama memakai siklus testnet atau sandbox bernilai kecil.
- Setiap payout menghasilkan bukti publik yang sederhana.
- Kelompok sukses mengundang kelompok nyata lainnya.

Pendekatan ini memakai jaringan sosial yang sudah ada sebagai distribusi, sementara kontrak melindungi pool.

#### Pesan

Pesan utama:

> Arisan yang tidak bisa dibawa kabur.

Pesan pendukung:

> Host tetap mengatur grup. Kontrak yang memegang uang.

Jangan memulai dengan istilah blockchain, crypto, DeFi, yield, atau token. Istilah tersebut menjelaskan infrastruktur, bukan masalah pengguna.

#### Membangun kepercayaan

- Selalu melabeli pengalaman testnet dan sandbox.
- Menampilkan fee lengkap sebelum bergabung.
- Menjelaskan prefunding sebelum transfer apa pun.
- Mempublikasikan alamat kontrak dan metode verifikasi.
- Memakai review smart contract independen sebelum nilai riil.
- Memakai mitra berlisensi untuk konversi fiat riil.

### 16. Alternatif kompetitif

| Alternatif | Kekuatan | Kegagalan dibanding Awrisan |
|---|---|---|
| Arisan tunai atau transfer bank tradisional | Familiar dan fleksibel | Bandar menguasai pool dan pemenang dapat gagal bayar kemudian |
| Rekening tabungan pribadi | Likuid dan teregulasi | Tidak menciptakan timing dana besar atau komitmen sosial yang sama |
| Kredit bank | Dapat memberikan modal langsung | Membutuhkan kelayakan, dokumen, dan sering kali agunan |
| Pinjaman online | Akses cepat bagi sebagian pengguna | Dapat mahal dan bukan tabungan komunitas |
| Wallet multi-signature umum | Mengurangi kontrol satu orang | Tidak cocok untuk payout bergilir otomatis dan onboarding arus utama |
| Awrisan | Custody kontrak dan rotasi yang ditegakkan | Membutuhkan prefunding penuh dan memperkenalkan risiko teknologi serta penyedia |

Awrisan tidak seharusnya mengklaim menggantikan semua alternatif. Keunggulannya paling kuat bagi kelompok yang sudah ada dan menginginkan perilaku arisan tanpa custody bandar.

### 17. Defensibility

Smart contract saja dapat direplikasi. Defensibility jangka panjang berasal dari eksekusi di sekelilingnya:

- Onboarding IDR yang tepercaya dan sederhana
- Hubungan dengan jalur pembayaran dan anchor berlisensi
- KYC dan penegakan satu manusia per kursi
- Reputasi kuat untuk penyelesaian room transparan
- Edukasi dan dukungan bahasa lokal
- Operasi kepatuhan yang dirancang untuk keuangan komunitas Indonesia
- Bukti verifikasi yang dipahami pengguna tanpa pengetahuan blockchain

Moat bukan token. Moat adalah distribusi tepercaya, jalur berlisensi, keandalan operasional, dan pengalaman yang dibangun untuk perilaku arisan nyata.

### 18. Batas MVP

Batas MVP yang jujur:

- Stellar testnet saja
- Room prefund penuh
- Pengalaman kelompok dengan kontrol undangan
- Kocok dua fase
- Satu kemenangan per anggota
- Payout token test otomatis
- Refund room terbuka
- Penundaan terbatas sebelum seal
- Pembubaran darurat setelah masa tenggang
- Data verifikasi publik

Belum terbukti atau belum siap produksi:

- Setoran dan pencairan IDR riil
- Integrasi anchor berlisensi
- Penegakan KYC produksi
- Funding cicilan
- VRF eksternal
- Custody dan pemulihan wallet produksi
- Fee payout final
- Persetujuan hukum untuk menangani nilai riil

### 19. Roadmap

#### Fase 1: Bukti testnet

- Mendemonstrasikan custody, prefunding, rotasi, dan refund
- Mendemonstrasikan kocok dua fase yang dapat diverifikasi
- Memvalidasi cerita dengan peserta arisan nyata
- Mengukur kesediaan melakukan prefund

#### Fase 2: Sandbox terkontrol

- Menambahkan alur identitas dan kontrol satu manusia per kursi
- Menguji pengalaman IDR-first dengan jalur pembayaran sandbox
- Menguji pengumpulan cicilan tanpa memulai room yang belum penuh dana
- Menyelesaikan review smart contract dan threat model operasional

#### Fase 3: Pilot berlisensi

- Bekerja dengan penasihat hukum dan penyedia berlisensi yang memenuhi syarat
- Memakai kontrol KYC dan AML nyata
- Memperkenalkan fee yang dijelaskan terbuka
- Membatasi ukuran room dan eksposur
- Memantau penyelesaian serta operasi dukungan

#### Nanti

- VRF eksternal
- Sinyal reputasi
- Room lintas negara dan lintas mata uang
- Desain bonded atau prefund parsial dengan risiko tersisa yang dijelaskan terbuka

### 20. Metrik keberhasilan

Output hackathon tidak boleh disajikan sebagai traksi pasar. Metrik testnet dan discovery yang berguna meliputi:

- Persentase anggota undangan yang memahami prefunding
- Persentase yang bersedia mengunci komitmen satu siklus penuh
- Tingkat penyelesaian funding room
- Waktu dari pembuatan room sampai pendanaan penuh
- Penyelesaian kocok tanpa intervensi host
- Tingkat keberhasilan refund dan dissolve
- Kemampuan pengguna nonteknis memverifikasi bukti payout
- Pemahaman pengguna tentang arti dan batas kata Terjamin
- Estimasi biaya per anggota dan per siklus selesai

Hasil awal terpenting bukan volume transaksi. Hasil terpenting adalah bukti bahwa pengguna arisan nyata menerima trade-off prefunding.

### 21. Narasi hackathon

Urutan presentasi terkuat:

1. **Budaya**: buka dengan pertemuan arisan rutin, tempat makanan, percakapan, rasa memiliki, timbal balik, dan kocok sama pentingnya dengan transfer. Arisan adalah institusi sosial, bukan ciptaan crypto.
2. **Kerusakan**: distribusi online memisahkan uang dari jaminan sosial.
3. **Konsekuensi manusia**: vonis menghukum pengelola tetapi sering mengembalikan sedikit atau tidak mengembalikan pool.
4. **Insight arsitektural**: bandar adalah pengelola sekaligus kustodian, tetapi hanya peran custody yang perlu dihapus.
5. **Produk**: smart contract Soroban memegang pool prefund penuh dan menjalankan rotasi.
6. **Bukti**: tampilkan seed yang disegel, pemenang deterministik, payout, dan saldo akhir nol.
7. **Bisnis**: kenakan fee transparan melalui pengalaman IDR-first.
8. **Kejujuran**: jelaskan beban modal, status testnet, kebutuhan lisensi, dan roadmap VRF.

Kalimat penutup:

> Blockchain bukan produknya. Blockchain adalah infrastruktur yang membuat janji tersebut dapat ditegakkan.

### 22. Keputusan sebelum pengembangan nilai riil

- Memvalidasi produk prefund penuh dengan pengguna sasaran.
- Menentukan perilaku funding cicilan.
- Memutuskan fee payout dan batasnya.
- Menentukan perlakuan kurs IDR dan USDC.
- Memilih mitra on dan off-ramp berlisensi.
- Menentukan custody, penandatanganan, dan pemulihan wallet.
- Menentukan penegakan KYC untuk panggilan kontrak langsung.
- Mengganti rahasia kode undangan publik dengan model otorisasi anggota yang nyata.
- Menentukan akuntansi dan verifikasi solvabilitas per room.
- Memutuskan kewenangan deployment, upgrade, pause, dan insiden.
- Menentukan TTL storage dan pemulihan arsip.
- Memutuskan kapan VRF eksternal menjadi wajib.
- Mendapatkan nasihat hukum Indonesia tentang AML, privasi, pajak, dan perlindungan konsumen.

## Product honesty rules

1. Always label testnet and sandbox behavior.
2. Never imply that Awrisan is an investment or promises profit.
3. Guaranteed means protected from the defined bandar and member-default risks.
4. Never claim that victims automatically recovered their money after conviction.
5. Never claim to have invented arisan or to be first in the world.
6. Never claim affiliation with Stellar, SDF, or Stellar Aid Assist.
7. Separate on-chain proof from off-chain identity and social claims.
8. State the capital cost of prefunding before asking anyone to join.
