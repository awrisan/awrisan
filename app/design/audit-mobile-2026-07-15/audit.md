# Audit mobile Awrisan

Tanggal: 15 Juli 2026

## Ruang lingkup

Audit gabungan UX, visual, responsive reflow, dan risiko aksesibilitas pada:

- Android 15, 1080 x 1920, density 420
- Viewport iPhone 390 x 844
- Landing page publik
- Sign-in dan onboarding Android
- Dashboard setelah pengguna masuk

Audit ini bersifat read-only. Tidak ada kode aplikasi yang diubah.

## Kesimpulan

Observasi pengguna benar. Landing page terasa terlalu panjang pada ponsel, tetapi layar aplikasi setelah masuk tidak mempunyai masalah yang sama.

Pada iPhone 390 x 844, landing page mempunyai tinggi 6.919 CSS pixel atau sekitar 8,2 viewport. Hero sendiri memakai 1.170 pixel dan bagian budaya memakai 1.527 pixel. Pada Android, diperlukan sekitar tiga swipe panjang untuk mencapai gambar budaya dan empat swipe untuk mencapai penjelasan budaya.

Dashboard iPhone hanya setinggi sekitar 1,2 viewport dan sudah menampilkan dua room serta navigasi bawah. Sign-in Android juga muat dalam satu layar. Prioritas redesign seharusnya landing page mobile, bukan seluruh aplikasi.

## Langkah audit dan kondisi

1. Android landing, posisi awal: perlu perbaikan. Headline mendominasi hampir seluruh layar pertama dan gambar produk belum terlihat lengkap.
2. Android landing, satu swipe: perlu perbaikan. Pengguna masih berada di hero dan baru melihat awal gambar serta room card.
3. Android landing, dua swipe: buruk untuk ritme. Room card memenuhi satu layar dan terdapat ruang kosong besar sebelum bagian berikutnya.
4. Android landing, tiga swipe: perlu perbaikan. Gambar budaya tampil besar sebelum pesan budaya muncul.
5. Android budaya, empat swipe: isi kuat tetapi terlalu besar. Headline, paragraf, dan tiga poin membuat bagian ini panjang.
6. Android sign-in: sehat. Seluruh form, reassurance, dan CTA terlihat dalam satu layar.
7. Android dashboard: sehat. Hirarki saldo, room utama, status, dan navigasi bawah jelas.
8. iPhone landing, posisi awal: perlu perbaikan. Hero mencapai lebih dari satu viewport dan memakai dua CTA penuh.
9. iPhone transisi hero ke budaya: perlu perbaikan. Room card, ruang kosong, dan gambar budaya menunda pesan budaya.
10. iPhone bagian budaya: cukup sehat secara visual. Tiga manfaat dapat dipindai, tetapi tinggi bagian masih sekitar 1,8 viewport.
11. iPhone dashboard: sehat. Dua room terlihat dalam satu layar dengan CTA dan status yang jelas.

## Temuan prioritas

### P1. Narasi culture-first datang terlalu terlambat

Pada mobile, gambar budaya diberi urutan pertama. Headline dan penjelasan budaya baru muncul setelah gambar besar. Ini berlawanan dengan tujuan produk yang ingin menjelaskan budaya sebelum mekanisme finansial.

Rekomendasi: tampilkan headline budaya dan satu paragraf singkat sebelum gambar. Gunakan gambar 16:9 yang lebih pendek setelah intro.

### P1. Hero mobile memakan terlalu banyak tinggi

Headline menggunakan skala yang sangat besar, dua CTA ditumpuk, gambar memiliki tinggi minimum 440 pixel, dan room card menambah tinggi visual lagi.

Rekomendasi: targetkan hero sekitar 1,1 sampai 1,2 viewport. Gunakan headline 44 sampai 52 pixel, satu CTA utama, secondary link, gambar lebih pendek, dan room summary yang lebih ringkas.

### P1. Padding desktop dibawa terlalu jauh ke mobile

Beberapa bagian masih memakai padding vertikal 100 pixel, sementara bagian budaya memakai padding atas 152 pixel.

Rekomendasi: gunakan padding vertikal 56 sampai 72 pixel pada mobile. Targetkan total landing page sekitar 5,5 sampai 6 viewport tanpa menghapus pesan bisnis utama.

### P2. Tidak ada jalan cepat pada halaman panjang

Navigasi section disembunyikan pada mobile. Pengguna tidak dapat langsung menuju cara kerja, keamanan, atau budaya.

Rekomendasi: tambahkan compact jump navigation atau sticky CTA ringan yang tidak menutupi isi.

### P2. Semua detail desktop ditumpuk berurutan

Problem, cara kerja, business path, CTA akhir, dan legal footer semuanya dipertahankan penuh. Ini membuat halaman panjang meskipun tiap bagian terlihat rapi.

Rekomendasi: pertahankan satu pesan utama per bagian, ringkas copy pendukung, dan gunakan progressive disclosure untuk detail cara kerja atau model bisnis.

## Risiko aksesibilitas

- Positif: tombol utama dan item navigasi memiliki target sentuh yang besar.
- Positif: reading order visual pada dashboard jelas.
- Risiko: setelah checkbox onboarding diketuk, accessibility tree Android tetap melaporkan `checkable=false` dan `checked=false`. Status ini perlu diuji langsung dengan TalkBack dan diperbaiki jika tidak diumumkan.
- Risiko: teks legal dan helper berwarna abu-abu berukuran kecil mungkin mempunyai masalah kontras atau keterbacaan. Screenshot saja tidak cukup untuk memastikan rasio WCAG.
- Belum diuji: VoiceOver iOS, dynamic type, zoom 200 persen, keyboard eksternal, dan reduced motion.

## Bukti screenshot

- `01-android-landing-top.png`
- `02-android-landing-scroll-1.png`
- `03-android-landing-scroll-2.png`
- `04-android-culture-entry.png`
- `05-android-culture-copy.png`
- `06-android-sign-in.png`
- `07-android-dashboard.png`
- `08-iphone-landing-top.jpg`
- `09-iphone-landing-scroll-1.jpg`
- `10-iphone-culture.jpg`
- `11-iphone-dashboard.jpg`

## Batas bukti

Audit iPhone menggunakan responsive viewport browser 390 x 844, bukan simulator iOS native. Audit membuktikan responsive reflow web, bukan perilaku Safari, safe-area, VoiceOver, atau keyboard iOS secara penuh. Android diuji sebagai aplikasi native wrapper di emulator Android 15. Crash buffer dan scan fatal aplikasi kosong selama audit.

## Hasil perbaikan

Perbaikan selesai dan telah diuji ulang pada 15 Juli 2026.

- Tinggi landing iPhone turun dari 6.919 menjadi 4.864 CSS pixel, atau dari 8,2 menjadi 5,8 viewport.
- Tinggi hero turun dari 1.094 menjadi 809 CSS pixel.
- Tinggi bagian budaya turun dari 1.527 menjadi 1.009 CSS pixel.
- Hero sekarang selesai di layar pertama dengan satu CTA utama dan satu tautan sekunder.
- Penjelasan budaya sekarang tampil sebelum gambar pada mobile.
- Gambar budaya memakai crop 16:9 setelah tiga poin budaya.
- Padding, typography, kartu problem, timeline, jalur bisnis, CTA akhir, dan footer telah dipadatkan.
- Dashboard dan sign-in yang sebelumnya sehat tetap dipertahankan.
- Kontrol persetujuan onboarding sekarang mengumumkan status eksplisit `Belum dipilih` dan `Dipilih` pada pohon aksesibilitas Android.
- Alur Android dari landing sampai dashboard lulus tanpa crash atau error fatal.

Bukti perbandingan sebelum dan sesudah tersedia di `40-mobile-before-after-comparison.png`.
