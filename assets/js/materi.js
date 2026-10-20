/* ALGOPLAY — ilustrasi interaktif halaman materi (tanpa dependensi). */
(function () {
  "use strict";
  var esc = (window.AlgoPlay && window.AlgoPlay.escapeHtml) || function (s) { return String(s); };

  function log(root, msg) {
    var el = root.querySelector("[data-log]");
    if (el) el.textContent = msg;
  }

  /* ---------- Array ---------- */
  function initArray(root) {
    var stage = root.querySelector("[data-stage]");
    var input = root.querySelector("#arr-idx");
    var data = [12, 7, 25, 3, 18];
    var active = -1;

    function render() {
      stage.innerHTML = data
        .map(function (v, i) {
          return '<button type="button" class="cell' + (i === active ? " is-active" : "") + '" data-i="' + i + '" aria-label="Indeks ' + i + ', nilai ' + v + '">' + v + '<span class="cell__idx" aria-hidden="true">[' + i + "]</span></button>";
        })
        .join("");
    }
    function access(i) {
      if (isNaN(i) || i < 0 || i >= data.length) {
        active = -1; render();
        log(root, "nilai[" + i + "] → di luar batas! Indeks valid: 0 sampai " + (data.length - 1) + ".");
        return;
      }
      active = i; render();
      log(root, "nilai[" + i + "] → " + data[i] + "   (akses langsung, tanpa menelusuri)");
    }
    stage.addEventListener("click", function (e) {
      var b = e.target.closest("[data-i]");
      if (!b) return;
      input.value = b.getAttribute("data-i");
      access(parseInt(b.getAttribute("data-i"), 10));
    });
    root.querySelector('[data-act="get"]').addEventListener("click", function () { access(parseInt(input.value, 10)); });
    root.querySelector('[data-act="set"]').addEventListener("click", function () {
      var i = parseInt(input.value, 10);
      if (isNaN(i) || i < 0 || i >= data.length) { access(i); return; }
      var v = Math.floor(Math.random() * 90) + 10;
      data[i] = v; active = i; render();
      log(root, "nilai[" + i + "] = " + v + ";   (nilai pada indeks " + i + " diganti)");
    });
    render();
  }

  /* ---------- Linked List ---------- */
  function initList(root) {
    var stage = root.querySelector("[data-stage]");
    var nodes = ["A", "B", "C"];
    var counter = 3;

    function render(highlight) {
      var html = '<span class="null" style="margin-right:4px">head</span><span class="arrow" aria-hidden="true"></span>';
      if (!nodes.length) html += '<span class="null">null</span>';
      nodes.forEach(function (v, i) {
        html += '<div class="node' + (highlight === i ? " is-active" : "") + '" style="' + (highlight === i ? "outline:3px solid var(--yellow-dark);outline-offset:2px" : "") + '"><span class="node__val">' + esc(v) + '</span><span class="node__next">next</span></div>';
        html += '<span class="arrow" aria-hidden="true"></span>';
        if (i === nodes.length - 1) html += '<span class="null">null</span>';
      });
      stage.innerHTML = html;
    }
    root.querySelector('[data-act="append"]').addEventListener("click", function () {
      var v = String.fromCharCode(65 + (counter % 26)); counter += 1;
      nodes.push(v); render(nodes.length - 1);
      log(root, "Node baru " + v + " dibuat; pointer next node terakhir sebelumnya kini menunjuk ke " + v + ".");
    });
    root.querySelector('[data-act="removeHead"]').addEventListener("click", function () {
      if (!nodes.length) { log(root, "List kosong — tidak ada yang dihapus."); return; }
      var v = nodes.shift(); render(-1);
      log(root, "Node " + v + " dihapus; head sekarang menunjuk ke " + (nodes[0] || "null") + ".");
    });
    root.querySelector('[data-act="traverse"]').addEventListener("click", function () {
      var i = 0;
      if (!nodes.length) { log(root, "head → null"); return; }
      var path = [];
      (function step() {
        render(i); path.push(nodes[i]);
        log(root, "head → " + path.join(" → ") + (i === nodes.length - 1 ? " → null" : " → …"));
        i += 1;
        if (i < nodes.length) setTimeout(step, 450);
        else setTimeout(function () { render(-1); }, 600);
      })();
    });
    render(-1);
  }

  /* ---------- Stack ---------- */
  function initStack(root) {
    var burger = root.querySelector("[data-burger]");
    var LAYERS = [
      { name: "patty", cls: "layer--patty", label: "patty" },
      { name: "cheese", cls: "layer--cheese", label: "keju" },
      { name: "lettuce", cls: "layer--lettuce", label: "selada" },
      { name: "tomato", cls: "layer--tomato", label: "tomat" },
    ];
    var stack = [];
    var n = 0;

    function render() {
      var html = '<div class="layer layer--bun">roti bawah</div>';
      stack.forEach(function (l, i) {
        html += '<div class="layer ' + l.cls + '"' + (i === stack.length - 1 ? ' style="outline:3px solid var(--ink);outline-offset:2px"' : "") + ">" + l.label + " #" + l.id + "</div>";
      });
      burger.innerHTML = html;
    }
    root.querySelector('[data-act="push"]').addEventListener("click", function () {
      if (stack.length >= 6) { log(root, "Stack penuh (kapasitas 6) — pop dulu."); return; }
      var l = LAYERS[n % LAYERS.length]; n += 1;
      stack.push({ cls: l.cls, label: l.label, id: n });
      render();
      log(root, "push(" + l.label + " #" + n + ")  → top sekarang " + l.label + " #" + n + "  · ukuran " + stack.length);
    });
    root.querySelector('[data-act="pop"]').addEventListener("click", function () {
      if (!stack.length) { log(root, "pop() pada stack kosong → tidak ada yang diambil (underflow)."); return; }
      var l = stack.pop(); render();
      log(root, "pop() → " + l.label + " #" + l.id + "  · lapisan terakhir dimasukkan, pertama keluar (LIFO)  · ukuran " + stack.length);
    });
    root.querySelector('[data-act="peek"]').addEventListener("click", function () {
      if (!stack.length) { log(root, "peek() → stack kosong."); return; }
      var l = stack[stack.length - 1];
      log(root, "peek() → " + l.label + " #" + l.id + "  (tidak diambil)");
    });
    render();
  }

  /* ---------- Queue ---------- */
  function initQueue(root) {
    var stage = root.querySelector("[data-stage]");
    var queue = [1, 2, 3];
    var next = 4;

    function render() {
      var html = '<div class="queue-line"><span class="endcap">front</span>';
      if (!queue.length) html += '<span class="null">kosong</span>';
      queue.forEach(function (v, i) {
        html += '<div class="ticket"' + (i === 0 ? ' style="outline:3px solid var(--ink);outline-offset:2px"' : "") + ">" + v + "</div>";
      });
      html += '<span class="endcap">rear</span></div>';
      stage.innerHTML = html;
    }
    root.querySelector('[data-act="enqueue"]').addEventListener("click", function () {
      if (queue.length >= 7) { log(root, "Queue penuh (kapasitas 7) — dequeue dulu."); return; }
      queue.push(next); render();
      log(root, "enqueue(" + next + ") → masuk di rear  · front tetap " + queue[0] + "  · ukuran " + queue.length);
      next += 1;
    });
    root.querySelector('[data-act="dequeue"]').addEventListener("click", function () {
      if (!queue.length) { log(root, "dequeue() pada queue kosong → tidak ada yang dilayani."); return; }
      var v = queue.shift(); render();
      log(root, "dequeue() → " + v + "  · yang pertama masuk, pertama keluar (FIFO)  · front sekarang " + (queue[0] !== undefined ? queue[0] : "kosong"));
    });
    render();
  }

  document.addEventListener("DOMContentLoaded", function () {
    var a = document.querySelector('[data-viz="array"]'); if (a) initArray(a);
    var l = document.querySelector('[data-viz="list"]'); if (l) initList(l);
    var s = document.querySelector('[data-viz="stack"]'); if (s) initStack(s);
    var q = document.querySelector('[data-viz="queue"]'); if (q) initQueue(q);
  });
})();
