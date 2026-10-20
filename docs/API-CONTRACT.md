# Kontrak API — ALGOPLAY Quiz Backend (Google Apps Script)

Dokumen ini adalah **sumber kebenaran** antara frontend statis (`assets/js/*.js`) dan backend Google Apps Script (`apps-script/*.gs`). Perubahan di salah satu sisi wajib memperbarui dokumen ini.

## Transport

- Backend di-deploy sebagai **Web App** Apps Script (`Deploy > New deployment > Web app`), dengan `Execute as: Me` dan `Who has access: Anyone`.
- URL web app (`https://script.google.com/macros/s/.../exec`) disimpan di `assets/js/config.js` → `appsScriptUrl`.
- **GET** untuk membaca kuis: `GET {appsScriptUrl}?action=getQuiz&quiz=pretest`
- **POST** untuk mengirim jawaban: `POST {appsScriptUrl}` dengan body JSON **dan header `Content-Type: text/plain;charset=utf-8`** (bukan `application/json`) agar browser tidak mengirim CORS preflight — Apps Script tidak menjawab `OPTIONS`. Frontend wajib memakai `redirect: "follow"`.
- Semua respons: `Content-Type: application/json` via `ContentService`. HTTP status selalu 200; keberhasilan dibaca dari field `ok`.

## Amplop respons

```json
{ "ok": true,  "data": { ... } }
{ "ok": false, "error": { "code": "VALIDATION_ERROR", "message": "Teks ramah pengguna (Bahasa Indonesia)", "details": [ ... ] } }
```

## Identifier kuis (`quiz`)

| quiz         | Formulir tujuan      | Catatan                                              |
|--------------|----------------------|------------------------------------------------------|
| `pretest`    | Google Form pre-test | wajib                                                 |
| `posttest`   | Google Form post-test| wajib                                                 |
| `evaluation` | Google Form evaluasi | opsional; hanya aktif jika `enabled: true` di Config |

Nilai lain → `INVALID_QUIZ`. ID formulir **tidak pernah** dikirim dari klien; klien hanya mengirim `quiz`.

## `getQuiz`

Request: `GET ?action=getQuiz&quiz=<quiz>`

Response `data`:

```json
{
  "quiz": "pretest",
  "label": "Pre-test",
  "title": "Judul formulir dari Google Forms",
  "description": "Deskripsi formulir (boleh kosong)",
  "isQuiz": true,
  "acceptingResponses": true,
  "scoring": {
    "available": true,
    "autoGradedCount": 10,
    "manualReviewCount": 2,
    "maxScore": 100,
    "reason": null
  },
  "questions": [
    {
      "id": "1234567890",
      "index": 1,
      "type": "MULTIPLE_CHOICE",
      "title": "Teks pertanyaan",
      "helpText": "",
      "required": true,
      "choices": ["A", "B", "C", "D"],
      "hasOtherOption": false,
      "points": 10,
      "autoGraded": true,
      "maxLength": null
    }
  ]
}
```

- `id` = `item.getId()` sebagai **string**.
- `type` ∈ `MULTIPLE_CHOICE` | `LIST` | `CHECKBOX` | `TEXT` | `PARAGRAPH_TEXT` | `SECTION_HEADER`.
  - `SECTION_HEADER` hanya judul/deskripsi, tidak punya jawaban, `required: false`.
  - `PAGE_BREAK`, `IMAGE`, `VIDEO` **tidak dikirim** (dilewati).
  - Tipe lain (GRID, CHECKBOX_GRID, SCALE, DATE, TIME, FILE_UPLOAD, RATING) → backend mengembalikan `ok:false`, `code: "UNSUPPORTED_QUESTION_TYPE"`, `details: [{ "id", "title", "type" }]`. Kuis tidak boleh ditampilkan sebagian.
- `choices` hanya untuk `MULTIPLE_CHOICE`, `LIST`, `CHECKBOX`. Untuk tipe teks: `[]`.
- `points` = poin item di Google Forms (0 jika bukan kuis / tidak diatur).
- `autoGraded = true` hanya jika item adalah `MULTIPLE_CHOICE`/`LIST`/`CHECKBOX`, `points > 0`, dan minimal satu pilihan ditandai benar.
- `scoring.available = false` bila formulir bukan mode kuis **atau** tidak ada satu pun item `autoGraded`. `reason` berisi penjelasan singkat.
- `scoring.maxScore` = jumlah `points` dari item yang `autoGraded`.
- `scoring.manualReviewCount` = jumlah item teks/paragraf dengan `points > 0`.
- `maxLength` untuk teks: backend memakai batas internal 2000 (TEXT) dan 5000 (PARAGRAPH_TEXT); nilai dikirim agar klien bisa membatasi input.

Error yang mungkin: `INVALID_QUIZ`, `QUIZ_NOT_CONFIGURED` (formId masih placeholder / tidak bisa dibuka), `FORM_NOT_ACCEPTING`, `UNSUPPORTED_QUESTION_TYPE`, `INTERNAL_ERROR`.

## `submitQuiz`

Request body (JSON, dikirim sebagai `text/plain`):

```json
{
  "action": "submitQuiz",
  "quiz": "pretest",
  "clientSubmissionId": "uuid-v4-dibuat-klien",
  "answers": {
    "1234567890": "B",
    "2222222222": ["A", "C"],
    "3333333333": "jawaban teks"
  }
}
```

- `answers` keyed by `id` pertanyaan. `CHECKBOX` → array string; lainnya → string.
- `clientSubmissionId` wajib (8–64 karakter `[A-Za-z0-9-]`). Dipakai untuk **idempotensi**: jika ID yang sama dikirim ulang dalam 6 jam, backend **tidak** membuat respons baru dan mengembalikan hasil sebelumnya dengan `duplicate: true`.

Response `data` (sukses):

```json
{
  "submitted": true,
  "duplicate": false,
  "quiz": "pretest",
  "responseId": "ACYDBN...",
  "submittedAt": "2026-10-20T03:12:45.000Z",
  "result": {
    "available": true,
    "score": 70,
    "maxScore": 100,
    "percentage": 70,
    "autoGradedCount": 10,
    "correctCount": 7,
    "manualReviewCount": 2,
    "totalQuestions": 12,
    "reason": null
  }
}
```

- `percentage` = pembulatan 1 desimal dari `score / maxScore * 100`; `0` jika `maxScore = 0`.
- Jika `result.available = false`, `score/maxScore/percentage` = `null` dan `reason` diisi (mis. "Formulir belum diatur sebagai kuis" atau "Kunci jawaban belum dikonfigurasi").
- **Skor dihitung di server** dari kunci jawaban Google Forms (`Choice.isCorrectAnswer()`), **setelah** respons berhasil disubmit. Checkbox dinilai benar hanya jika himpunan pilihan **tepat sama** dengan himpunan kunci (all-or-nothing). Teks/paragraf tidak dinilai otomatis.

Error yang mungkin:

| code                     | kapan                                                           | details                                        |
|--------------------------|-----------------------------------------------------------------|------------------------------------------------|
| `INVALID_ACTION`         | `action` tidak dikenal                                          | –                                              |
| `INVALID_QUIZ`           | `quiz` tidak dikenal / evaluation nonaktif                      | –                                              |
| `QUIZ_NOT_CONFIGURED`    | formId placeholder / tidak bisa dibuka                          | –                                              |
| `FORM_NOT_ACCEPTING`     | `form.isAcceptingResponses() === false`                         | –                                              |
| `INVALID_PAYLOAD`        | body bukan JSON valid / `answers` bukan objek / submissionId buruk | –                                            |
| `VALIDATION_ERROR`       | satu atau lebih jawaban tidak valid                             | `[{ "questionId", "code", "message" }]` dengan code: `REQUIRED_MISSING`, `INVALID_QUESTION_ID`, `INVALID_CHOICE`, `INVALID_TYPE`, `TEXT_TOO_LONG` |
| `UNSUPPORTED_QUESTION_TYPE` | formulir berubah dan kini berisi tipe tak didukung           | `[{ id, title, type }]`                        |
| `SUBMIT_FAILED`          | `FormResponse.submit()` melempar error                          | –                                              |
| `BUSY`                   | gagal memperoleh lock dalam 20 detik                            | –                                              |
| `INTERNAL_ERROR`         | error tak terduga                                               | –                                              |

Aturan server:
1. Semua `questionId` di `answers` harus milik formulir `quiz` tersebut; ID asing → `INVALID_QUESTION_ID`.
2. Pertanyaan `required` tanpa jawaban (string kosong / array kosong) → `REQUIRED_MISSING`.
3. Pilihan harus salah satu dari `choices` (atau teks bebas bila `hasOtherOption` — dikirim sebagai string yang bukan anggota `choices`, hanya untuk MULTIPLE_CHOICE/CHECKBOX).
4. Panjang teks melebihi batas → `TEXT_TOO_LONG`.
5. Jika ada error validasi, **tidak ada** respons yang dibuat di Google Forms.

## `ping`

`GET ?action=ping` → `{ ok: true, data: { service: "algoplay-quiz", version: "1.0.0", quizzes: ["pretest","posttest"], time: "..." } }`. Dipakai halaman untuk mendeteksi konfigurasi backend.

## Mode mock (frontend saja)

Bila `appsScriptUrl` kosong **dan** `mockMode: true` di `config.js`, `api.js` melayani `getQuiz`/`submitQuiz` dari `assets/js/mock-data.js` tanpa jaringan, dengan banner "MODE PRATINJAU — jawaban tidak dikirim". Mode ini untuk pengembangan lokal, bukan untuk penelitian.
