# Checklist Pengujian — ALGOPLAY (PRD §14)

Tandai `[x]` saat lulus. Gunakan identitas uji yang mudah dikenali (mis. `UJI COBA 01`) dan hapus barisnya dari spreadsheet setelah selesai.

## A. Fungsional website

- [ ] Semua halaman terbuka tanpa error konsol: index, tentang, materi, panduan, akses-game, pretest, posttest, evaluasi, selesai, faq, 404.
- [ ] Semua tautan navigasi (header, footer, tombol CTA) menuju halaman yang benar.
- [ ] Tautan aktif di header tersorot sesuai halaman.
- [ ] Menu mobile bisa dibuka/ditutup (klik & tombol Esc).
- [ ] Tombol unduh game membuka tautan Drive dari `config.links.gameDownload` di tab baru.
- [ ] Nilai `game.*` yang `null` tampil sebagai "Belum dikonfirmasi pengelola", bukan kosong.
- [ ] Ilustrasi materi: akses indeks array (termasuk di luar batas), tambah/hapus/telusuri linked list, push/pop/peek stack, enqueue/dequeue queue — log berubah sesuai operasi.
- [ ] Rail alur belajar menampilkan status lokal dan keterangan "bukan bukti resmi".

## B. Mesin kuis (mode pratinjau, tanpa backend)

- [ ] Banner "MODE PRATINJAU" tampil saat `appsScriptUrl` kosong & `mockMode: true`.
- [ ] Tombol "Mulai" menyembunyikan intro dan memuat soal.
- [ ] Progress bar bertambah saat menjawab; mencapai 100% & berubah warna saat semua terjawab.
- [ ] Kirim tanpa mengisi wajib → kartu merah + pesan + fokus pindah ke soal pertama yang invalid.
- [ ] Pilihan "Lainnya" (jika ada) memunculkan input teks dan wajib diisi.
- [ ] Dialog konfirmasi muncul; "Periksa lagi" menutup; "Ya, kirim" mengirim.
- [ ] Saat mengirim: tombol nonaktif, input nonaktif, pesan "Mengirim…".
- [ ] Hasil tampil dengan persentase, skor/maks, jumlah soal otomatis & manual, ID respons.
- [ ] Draft jawaban bertahan setelah muat ulang halaman (sessionStorage) dan hilang setelah sukses.
- [ ] Setelah sukses, rail di beranda menandai tahap tersebut "Selesai".
- [ ] Set `mockMode: false` dengan `appsScriptUrl` kosong → kartu "Konfigurasi kuis belum lengkap", bukan soal contoh.

## C. Integrasi backend (Apps Script sungguhan)

- [ ] `?action=ping` → `ok:true`, `quizzes` berisi `pretest`, `posttest`.
- [ ] `?action=getQuiz&quiz=pretest` → `scoring.available: true`, `maxScore` sesuai total poin kunci.
- [ ] `?action=getQuiz&quiz=posttest` → judul dan soal berbeda dari pretest.
- [ ] `?action=getQuiz&quiz=lainnya` → `INVALID_QUIZ`.
- [ ] Kirim pre-test lengkap → baris baru hanya di **spreadsheet pre-test**.
- [ ] Kirim post-test lengkap → baris baru hanya di **spreadsheet post-test**.
- [ ] Nilai di kolom setiap soal pada spreadsheet sama dengan jawaban yang dipilih.
- [ ] Evaluasi (mode link) → baris baru di spreadsheet evaluasi.

## D. Penilaian

- [ ] Semua jawaban benar → skor = maxScore, 100%.
- [ ] Semua salah → 0.
- [ ] Checkbox: pilihan tepat → poin penuh; kurang satu → 0; lebih satu → 0.
- [ ] Soal teks dengan poin → masuk `manualReviewCount`, tidak menambah skor.
- [ ] Formulir bukan mode kuis → `scoring.available:false` dengan `reason`, jawaban tetap tersimpan, halaman hasil menampilkan notis netral (bukan skor 0).
- [ ] Persentase dibulatkan 1 desimal; sama dengan hitungan manual.

## E. Kegagalan & keamanan

- [ ] Putus internet saat memuat soal → pesan + tombol "Coba muat lagi".
- [ ] Putus internet saat kirim → pesan jaringan + "Coba kirim lagi"; **tidak ada** pesan sukses.
- [ ] Kirim ulang payload yang sama (retry) → `duplicate:true`, **tidak ada baris ganda**.
- [ ] Klik "Ya, kirim" berkali-kali cepat → hanya satu baris.
- [ ] Matikan *Accepting responses* → `FORM_NOT_ACCEPTING`, tombol kirim nonaktif.
- [ ] `formId` salah → `QUIZ_NOT_CONFIGURED`, kartu konfigurasi untuk pengelola.
- [ ] Tambahkan soal grid di formulir uji → `UNSUPPORTED_QUESTION_TYPE`, kuis tidak tampil sebagian.
- [ ] Kirim `answers` dengan ID soal asing via devtools → `VALIDATION_ERROR` + `INVALID_QUESTION_ID`.
- [ ] Kirim pilihan di luar daftar via devtools → `INVALID_CHOICE`.
- [ ] Kirim `quiz: "posttest"` dari halaman pretest via devtools → respons masuk ke post-test (sesuai `quiz` yang dikirim) — konfirmasi bahwa **ID formulir tidak pernah bisa ditentukan klien**.
- [ ] Mengubah DOM untuk menampilkan skor tidak mungkin tanpa respons server (skor hanya dari `data.result`).

## F. Responsif & aksesibilitas

- [ ] Lebar 320px, 360px, 768px, 1024px, 1440px: tidak ada scroll horizontal.
- [ ] Semua tombol/pilihan ≥ 44px tinggi; bisa disentuh nyaman.
- [ ] Navigasi penuh dengan keyboard: Tab mencapai semua kontrol, fokus terlihat, radio bisa dipilih dengan panah, dialog bisa ditutup Esc.
- [ ] Pembaca layar: label soal terbaca (`aria-labelledby`), tanda wajib terbaca "(wajib)", pesan error `role="alert"`, status progres `aria-live`.
- [ ] Kontras teks utama ≥ 4.5:1 (ink di atas paper/sage-pale).
- [ ] `prefers-reduced-motion`: animasi dan spinner tidak bergerak.
- [ ] Error tidak hanya memakai warna (ikon + teks).

## G. Uji pengguna terbatas (sebelum penelitian)

- [ ] 3–5 siswa mencoba alur penuh; catat waktu, kebingungan, dan kendala perangkat.
- [ ] Instruksi di halaman intro dipahami tanpa penjelasan tambahan.
- [ ] Siswa memahami bahwa skor hanya mencakup soal objektif.
- [ ] Siswa tahu harus kembali ke website setelah bermain.
- [ ] Semua temuan diperbaiki, lalu **seluruh data uji dihapus** dari ketiga spreadsheet.
