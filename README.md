# ALGOPLAY — Website Pembelajaran Struktur Data Linear

Website pendamping game Unity **ALGOPLAY** untuk siswa kelas XI RPL/PPLG. Menyatukan materi (Array, Linked List, Stack, Queue), akses game, **pre-test dan post-test dengan antarmuka kustom** yang tetap menyimpan respons ke Google Forms/Sheets masing-masing, serta formulir evaluasi.

Implementasi mengikuti `PRD` v1.0 (lingkup P0 + sebagian P1).

## Struktur

```
algoplay/
├── index.html            Beranda (hero, kartu materi, rail alur belajar)
├── tentang.html          Deskripsi, tujuan, sasaran, kompetensi
├── materi.html           4 materi + ilustrasi interaktif (array/list/stack/queue)
├── panduan.html          Kebutuhan perangkat, langkah, kontrol, troubleshooting
├── akses-game.html       Tautan unduh + petunjuk + penanda "sudah bermain"
├── pretest.html          Mesin kuis → quiz=pretest
├── posttest.html         Mesin kuis → quiz=posttest
├── evaluasi.html         Mode "link" (Google Form) atau "custom" (mesin kuis)
├── selesai.html          Ringkasan tahap (lokal) + skor yang tercatat
├── faq.html              Bantuan
├── 404.html
├── assets/
│   ├── css/styles.css    Token desain + komponen
│   ├── css/quiz.css      Komponen kuis
│   ├── js/config.js      ← SATU-SATUNYA file yang diubah saat deployment
│   ├── js/main.js        Nav, tautan aktif, teks dari config
│   ├── js/progress.js    Penanda tahap di localStorage (bukan bukti resmi)
│   ├── js/api.js         Klien Apps Script (GET/POST text/plain, timeout, mock)
│   ├── js/mock-data.js   Data contoh untuk pratinjau tanpa backend
│   ├── js/quiz.js        Mesin kuis: muat → validasi → konfirmasi → kirim → hasil
│   ├── js/materi.js      Ilustrasi interaktif halaman materi
│   └── img/game/         Sprite dari repository game (dikecilkan)
├── apps-script/          Backend Google Apps Script (lihat docs/DEPLOYMENT.md)
│   ├── appsscript.json   Manifest (V8, web app Anyone)
│   ├── Config.gs         ID formulir per tahap + batasan
│   ├── Code.gs           doGet/doPost, amplop JSON, penanganan error
│   ├── FormService.gs    Baca Google Form → model kuis (tanpa kunci jawaban)
│   ├── Validation.gs     Validasi server (wajib, pilihan sah, panjang, ID asing)
│   ├── Scoring.gs        Penilaian otomatis (checkbox all-or-nothing)
│   ├── Submit.gs         Kirim respons + idempotency + lock
│   └── Tests.gs          Tes murni & tes baca formulir
└── docs/
    ├── API-CONTRACT.md   Kontrak JSON frontend ↔ backend (sumber kebenaran)
    ├── DEPLOYMENT.md     Langkah deploy & uji end-to-end
    └── TESTING.md        Rencana pengujian (PRD §14) dalam bentuk checklist
```

## Menjalankan secara lokal

Tidak ada build. Jalankan server statis apa pun dari folder ini, misalnya:

```powershell
# Python
python -m http.server 8080
# atau Node
npx serve .
```

Buka <http://localhost:8080>. Secara bawaan `config.js` memakai `mockMode: true` dengan `appsScriptUrl` kosong, sehingga halaman pre-test/post-test menampilkan soal contoh dengan banner **MODE PRATINJAU** dan tidak mengirim apa pun.

## Alur deployment singkat

1. Atur Google Forms (mode kuis, kunci, poin) dan dapatkan **ID editor** tiap formulir.
2. Deploy `apps-script/` sebagai Web App (Execute as Me, Anyone) → salin URL `/exec`.
3. Isi `assets/js/config.js`: `appsScriptUrl`, `mockMode: false`, info `game.*`, `contact.*`.
4. Unggah folder ke hosting statis.
5. Jalankan checklist `docs/TESTING.md`; hapus data uji sebelum penelitian.

Detail: `docs/DEPLOYMENT.md`.

## Keputusan desain yang perlu diketahui

- **Identitas visual mengikuti aset game nyata** (branch `Aldo` di repository): panel sage-grey, outline tinta, aksen merah, CTA kuning, garis hazard. Saran navy/cyan di PRD tidak dipakai karena PRD sendiri meminta palet diselaraskan dengan aset resmi.
- **Pemisahan tahap mutlak**: klien hanya mengirim `quiz: "pretest" | "posttest" | "evaluation"`. ID formulir hanya ada di `Config.gs` di server.
- **Tidak ada pesan sukses palsu**: hasil hanya tampil bila server membalas `ok:true` dan `submitted:true`. Status jaringan tidak pasti → pengguna diarahkan menghubungi pendamping, bukan mengirim ulang otomatis.
- **Idempotency**: `clientSubmissionId` dibuat sekali per payload dan dipakai ulang saat retry; server menyimpan hasil 6 jam sehingga klik ganda/retry tidak membuat baris ganda.
- **Skor dihitung di server** dari kunci Google Forms, setelah respons tersimpan. Teks/paragraf tidak dinilai otomatis dan dilaporkan sebagai "diperiksa manual".
- **Progres di browser bersifat lokal** dan selalu diberi keterangan "bukan bukti resmi".
- **Evaluasi default memakai tautan Google Forms** agar instrumen tidak tersentuh. Mode kustom tersedia bila disetujui peneliti.

## Hal yang masih perlu dikonfirmasi (PRD §19)

- Platform/format file game di Drive (`config.game.*` saat ini `null` → ditampilkan "belum dikonfirmasi").
- Apakah soal pre/post-test seluruhnya memakai tipe yang didukung; apakah kunci & poin sudah diatur.
- Format kode peserta untuk memasangkan pre-test dan post-test.
- Kalimat dampak akademik (`academicImpactNotice`), jika ada.
- Apakah evaluasi perlu tampilan kustom.
- Screenshot desain final yang dijanjikan belum diterima; tampilan dapat disesuaikan setelahnya.

## Aset & lisensi

Sprite di `assets/img/game/` berasal dari repository proyek game yang sama. Font game pihak ketiga (MorrisRomanBlack, Ritual of the Witch, Calculator) **tidak** dipakai di web karena lisensinya belum diperiksa; web memakai Google Fonts (Archivo Black, Rubik, JetBrains Mono).
