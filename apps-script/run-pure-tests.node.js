/* Menjalankan tes murni Apps Script di Node tanpa layanan Google.
 * Pakai: node apps-script/run-pure-tests.node.js
 * Hanya memuat file yang tidak menyentuh FormApp/CacheService/LockService. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const files = ["Config.gs", "Code.gs", "Validation.gs", "Scoring.gs", "Tests.gs"];
const src = files.map((f) => fs.readFileSync(path.join(__dirname, f), "utf8")).join("\n;\n");

const sandbox = {
  console,
  ContentService: {
    MimeType: { JSON: "json" },
    createTextOutput: (s) => ({ setMimeType() { return { getContent: () => s }; } }),
  },
};
vm.createContext(sandbox);
vm.runInContext(src + "\n;test_pure_all();", sandbox, { filename: "apps-script-bundle.gs" });
