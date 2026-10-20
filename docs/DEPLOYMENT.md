# Panduan Deployment — ALGOPLAY

Dokumen ini untuk **pengelola/peneliti**. Urutannya: siapkan Google Forms → deploy Apps Script → sambungkan website → uji end-to-end → bersihkan data uji.

## 0. Prasyarat

- Satu akun Google yang menjadi **pemilik atau editor** ketiga formulir (pre-test, post-test, evaluasi). Akun ini yang akan men-deploy Apps Script; semua respons akan dikirim atas nama akun ini.
- Hosting statis untuk website (GitHub Pages, Netlify, Vercel, hosting sekolah, atau folder di server PHP yang sudah ada). Tidak ada build step.

## 1. Siapkan Google Forms

Untuk formulir **pre-test** dan **post-test**:

1. Buka formulir sebagai editor → **Settings** → aktifkan **Make this a quiz** (Jadikan kuis).
2. Pada setiap soal objektif (pilihan ganda / dropdown / kotak centang), klik **Answer key** → tandai jawaban benar dan isi **poin** (> 0). Soal tanpa kunci atau dengan 0 poin tidak akan dinilai otomatis.
3. Soal uraian (jawaban singkat / paragraf) boleh diberi poin — akan dihitung sebagai "diperiksa manual" dan tidak masuk skor otomatis.
4. Pastikan formulir **menerima respons** dan **tidak** mewajibkan login Google (Settings → Responses → matikan *Restrict to users in …* dan *Limit to 1 response*), karena respons dikirim oleh Apps Script atas nama pemilik.
5. Pastikan formulir **terhubung ke spreadsheet** yang benar (tab Responses → ikon Sheets). Pre-test, post-test, dan evaluasi harus ke spreadsheet yang **berbeda**.
6. Tipe pertanyaan yang didukung antarmuka kustom: pilihan ganda, dropdown, kotak centang, jawaban singkat, paragraf, dan judul bagian. **Grid, skala linear, tanggal, waktu, unggah file, rating belum didukung** — jika ada, `getQuiz` akan menolak dengan `UNSUPPORTED_QUESTION_TYPE` dan halaman kuis menampilkan pesan konfigurasi.

### Mendapatkan ID formulir yang benar

Ada dua jenis ID dan **hanya satu yang bisa dipakai di Apps Script**:

| Jenis | Contoh URL | Dipakai untuk |
|---|---|---|
| ID editor | `https://docs.google.com/forms/d/`**`1AbCdEf…`**`/edit` | `Config.gs` → `formId` (FormApp.openById) |
| ID publik | `https://docs.google.com/forms/d/e/`**`1FAIpQL…`**`/viewform` | tautan isi formulir biasa (`config.js` → `links.*`) |

Buka formulir sebagai editor, salin bagian di antara `/d/` dan `/edit`. Tautan `viewform` yang ada di PRD **tidak** bisa dipakai sebagai `formId`.

## 2. Deploy Google Apps Script

1. Buka <https://script.google.com> dengan akun pemilik formulir → **New project** → beri nama `ALGOPLAY Quiz Backend`.
2. Buat file sesuai isi folder `apps-script/`:
   - `Code.gs`, `Config.gs`, `FormService.gs`, `Validation.gs`, `Scoring.gs`, `Submit.gs`, `Tests.gs` (File → New → Script).
   - `appsscript.json`: aktifkan **Project Settings → Show "appsscript.json" manifest file**, lalu tempel isinya.
   - Alternatif: gunakan [`clasp`](https://github.com/google/clasp) — `clasp create --type standalone`, salin folder, `clasp push`.
3. Isi `Config.gs`: ganti ketiga `REPLACE_WITH_…` dengan ID editor. Biarkan `evaluation.enabled = false` kecuali website memakai `evaluationMode: "custom"`.
4. Jalankan `test_pure_all` dari editor (menu Run) → semua tes murni harus lulus. Lalu jalankan `test_getQuiz_pretest` → saat pertama kali, setujui izin akses Forms. Periksa log (View → Logs / Executions): harus `"ok":true` dan `scoring.available: true`.
5. **Deploy** → **New deployment** → tipe **Web app**:
   - Description: `v1`
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Klik Deploy, salin **Web app URL** (berakhiran `/exec`).
6. Uji di browser (tab penyamaran agar tidak memakai sesi Google):
   - `…/exec?action=ping` → JSON `{"ok":true,…}`
   - `…/exec?action=getQuiz&quiz=pretest` → daftar pertanyaan
   - `…/exec?action=getQuiz&quiz=posttest`

> Setiap kali mengubah kode `.gs`, lakukan **Deploy → Manage deployments → Edit → Version: New version**. Tanpa versi baru, URL `/exec` tetap menjalankan kode lama.

## 3. Sambungkan website

Edit `assets/js/config.js`:

```js
appsScriptUrl: "https://script.google.com/macros/s/XXXX/exec",
mockMode: false,          // WAJIB false untuk penelitian
evaluationMode: "link",   // atau "custom" bila evaluation.enabled = true di Config.gs
```

Isi juga `game.*` (platform, format, ukuran, versi, spesifikasi) **setelah** file di Drive diperiksa, serta `contact.*`. Biarkan `academicImpactNotice: null` kecuali peneliti menetapkan kalimatnya.

Unggah seluruh folder (kecuali `apps-script/` dan `docs/`, opsional) ke hosting statis. Tidak ada build.

## 4. Uji end-to-end (sebelum penelitian)

Gunakan nama/kode peserta yang jelas-jelas data uji, misalnya `UJI COBA 01`.

1. Buka `pretest.html` → tidak ada banner "Mode Pratinjau" → soal muncul sesuai Google Forms.
2. Kirim dengan pertanyaan wajib kosong → ditolak di klien. Kosongkan lewat devtools dan kirim → ditolak server (`VALIDATION_ERROR`).
3. Kirim lengkap → halaman hasil tampil dengan ID respons → **baris baru muncul di spreadsheet pre-test** (bukan post-test).
4. Tekan "Coba kirim lagi" dengan payload yang sama (simulasikan dengan memutus jaringan sesaat) → server membalas `duplicate: true`, **tidak ada baris ganda**.
5. Ulangi langkah 1–4 pada `posttest.html` → baris masuk ke spreadsheet post-test.
6. Hitung skor manual dari kunci jawaban dan bandingkan dengan yang ditampilkan; uji kombinasi checkbox kurang/berlebih (harus 0 poin).
7. Buka `evaluasi.html` → tombol membuka Google Form evaluasi → kirim → baris masuk ke spreadsheet evaluasi.
8. Uji di ponsel (lebar 360px) dan desktop; uji dengan keyboard saja.
9. **Hapus semua baris data uji** dari ketiga spreadsheet sebelum pengambilan data resmi. Jangan ubah urutan/nama kolom.

Checklist kegagalan yang perlu dicoba: matikan "Accepting responses" → halaman harus menampilkan `FORM_NOT_ACCEPTING`; isi `formId` salah → `QUIZ_NOT_CONFIGURED`; putuskan internet saat kirim → pesan jaringan + tombol coba lagi, tanpa pesan sukses palsu.

## 5. Catatan keamanan & batasan

- Web app berjalan **sebagai pemilik** dan bisa diakses siapa pun yang tahu URL-nya. Jangan sebarkan URL `/exec` di luar website; pantau spreadsheet selama pengumpulan data; nonaktifkan deployment setelah penelitian selesai (Manage deployments → Archive).
- Jangan buka spreadsheet ke publik. Akses cukup untuk peneliti/pembimbing.
- `clientSubmissionId` mencegah duplikasi dari klik ganda/retry selama 6 jam, **bukan** pencegah spam. Identitas peserta mengikuti protokol penelitian (kode peserta).
- Skor yang dihitung backend **tidak ditulis ke spreadsheet** — Google Forms mode kuis menyimpan skornya sendiri di kolom *Score* jika kunci diatur. Bila dibutuhkan kolom tambahan, buat integrasi terpisah.
- Tipe soal yang belum didukung harus dihindari atau instrumen disesuaikan **dengan persetujuan peneliti**; jangan mengubah redaksi/urutan soal sepihak.
- Jika formulir diubah (soal, kunci, poin) setelah deployment, ulangi langkah 4.
