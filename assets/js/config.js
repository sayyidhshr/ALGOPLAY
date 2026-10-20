/**
 * ALGOPLAY — konfigurasi frontend.
 * Satu-satunya file yang perlu diubah pengelola saat deployment.
 * JANGAN menaruh token, kredensial, atau ID formulir internal di sini.
 */
window.ALGOPLAY_CONFIG = {
  /**
   * URL Web App Google Apps Script (berakhiran /exec).
   * Kosongkan untuk pengembangan lokal; gabungkan dengan mockMode: true
   * agar halaman kuis tetap bisa dipratinjau tanpa backend.
   */
  appsScriptUrl: "",

  /**
   * true  → jika appsScriptUrl kosong, kuis memakai data contoh (assets/js/mock-data.js)
   *          dan TIDAK mengirim apa pun. Banner "Mode Pratinjau" ditampilkan.
   * false → jika appsScriptUrl kosong, halaman kuis menampilkan status
   *          "Konfigurasi backend belum lengkap".
   * WAJIB false saat pengambilan data penelitian.
   */
  mockMode: true,

  /**
   * Cara evaluasi dikumpulkan:
   *  "link"   → tombol menuju Google Form evaluasi (default, instrumen tidak tersentuh)
   *  "custom" → dirender oleh mesin kuis via backend (quiz = "evaluation"),
   *             hanya jika Config.gs mengaktifkan evaluation.enabled = true
   */
  evaluationMode: "link",

  links: {
    pretestForm:
      "https://docs.google.com/forms/d/e/1FAIpQLSchVsxAiI_RtvL_z6R1y82DP5M26iBAggvXluCThwAGE7RUQw/viewform",
    posttestForm:
      "https://docs.google.com/forms/d/e/1FAIpQLScY5p3M4deNFSapsx4XflpRUi4A7iM3T85KKrqxOhNzwqHwpw/viewform",
    evaluationForm:
      "https://docs.google.com/forms/d/e/1FAIpQLSdUMuNiXdBUrt9-Z40kiiFOTqQnSmME5VER-Q8LxMpktp9EOA/viewform",
    gameDownload:
      "https://drive.google.com/file/d/1R2V7ejo0rX7-2ET_-IVbuaE_5CojLFZK/view",
    repository: "https://github.com/Raiduts/project_s",
  },

  /**
   * Informasi aplikasi yang ditampilkan di halaman Akses Game & Panduan.
   * Isi SETELAH file di Drive diperiksa; nilai null akan ditampilkan sebagai
   * "belum dikonfirmasi pengelola" — bukan diasumsikan.
   */
  game: {
    platform: null, // contoh: "Android (APK)" | "Windows (ZIP)" | "WebGL"
    fileFormat: null, // contoh: "APK" | "ZIP"
    fileSize: null, // contoh: "85 MB"
    version: null, // contoh: "1.0"
    minRequirements: null, // contoh: "Android 8.0+, RAM 2 GB"
  },

  /** Kontak pendamping/pengelola yang ditampilkan di FAQ & halaman error. */
  contact: {
    name: "Pengelola ALGOPLAY",
    channel: "Hubungi guru pendamping di kelas",
  },

  /**
   * Teks pernyataan dampak akademik. Tampilkan hanya jika sesuai prosedur
   * penelitian (PRD §8.1). null → kalimat tidak ditampilkan sama sekali.
   */
  academicImpactNotice: null,
};
