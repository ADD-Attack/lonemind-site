// Puzzle demo: a real 4x4 solver + checker that runs in this browser.
// It illustrates the loop (rules -> state -> solve -> check). It is not LoneMind itself.
(function () {
  var root = document.getElementById('puzzle');
  if (!root) return;
  var board = root.querySelector('.board');
  var log = root.querySelector('.log');
  var cells = [];
  var givens = [];

  for (var i = 0; i < 16; i++) {
    var inp = document.createElement('input');
    inp.type = 'text'; inp.inputMode = 'numeric'; inp.maxLength = 1; inp.autocomplete = 'off';
    inp.setAttribute('aria-label', 'Row ' + (Math.floor(i / 4) + 1) + ', column ' + (i % 4 + 1));
    inp.addEventListener('input', onEdit);
    board.appendChild(inp); cells.push(inp);
  }

  function box(i) { return Math.floor(Math.floor(i / 4) / 2) * 2 + Math.floor((i % 4) / 2); }
  function peers(i, j) { return i !== j && (Math.floor(i / 4) === Math.floor(j / 4) || i % 4 === j % 4 || box(i) === box(j)); }
  function read() { return cells.map(function (c) { var v = parseInt(c.value, 10); return v >= 1 && v <= 4 ? v : 0; }); }

  function solveAll(g, limit) {
    var out = [], a = g.slice();
    (function rec() {
      if (out.length >= limit) return;
      var k = a.indexOf(0);
      if (k < 0) { out.push(a.slice()); return; }
      for (var v = 1; v <= 4; v++) {
        var ok = true;
        for (var j = 0; j < 16; j++) if (peers(k, j) && a[j] === v) { ok = false; break; }
        if (ok) { a[k] = v; rec(); a[k] = 0; }
      }
    })();
    return out;
  }

  function clashes(g) {
    var bad = {};
    for (var i = 0; i < 16; i++) for (var j = 0; j < 16; j++) if (g[i] && g[i] === g[j] && peers(i, j)) { bad[i] = 1; bad[j] = 1; }
    return bad;
  }

  function line(text, cls) { var li = document.createElement('li'); li.textContent = text; if (cls) li.className = cls; log.appendChild(li); }

  function onEdit(e) {
    var c = e.target;
    c.value = c.value.replace(/[^1-4]/g, '');
    cells.forEach(function (x) { x.classList.remove('solved', 'clash'); });
    givens = read();
    cells.forEach(function (x, i) { x.classList.toggle('given', !!givens[i]); });
    log.innerHTML = '';
    line('Board edited. Press Solve and check.');
  }

  function newPuzzle() {
    // random valid grid: permute digits, rows within bands, bands, columns within stacks
    var base = [1, 2, 3, 4, 3, 4, 1, 2, 2, 1, 4, 3, 4, 3, 2, 1];
    var perm = shuffle([1, 2, 3, 4]);
    var rows = (Math.random() < .5 ? [0, 1] : [1, 0]).concat(Math.random() < .5 ? [2, 3] : [3, 2]);
    if (Math.random() < .5) rows = rows.slice(2).concat(rows.slice(0, 2));
    var cols = (Math.random() < .5 ? [0, 1] : [1, 0]).concat(Math.random() < .5 ? [2, 3] : [3, 2]);
    var full = [];
    for (var r = 0; r < 4; r++) for (var c = 0; c < 4; c++) full.push(perm[base[rows[r] * 4 + cols[c]] - 1]);
    var g = full.slice();
    shuffle([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]).forEach(function (k) {
      var keep = g[k]; g[k] = 0;
      if (solveAll(g, 2).length !== 1 || g.filter(Boolean).length < 5) g[k] = keep;
    });
    givens = g;
    cells.forEach(function (x, i) { x.value = g[i] || ''; x.className = g[i] ? 'given' : ''; });
    log.innerHTML = '';
    line('Photo read (scripted): a 4×4 grid, ' + g.filter(Boolean).length + ' digits given.');
    line('Rules read: each digit 1–4 once per row, column and 2×2 box.');
  }

  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  function solve() {
    var g = read();
    givens = g;
    log.innerHTML = '';
    line('Rules: each digit 1–4 once per row, column and 2×2 box.');
    line('State: ' + g.filter(Boolean).length + ' given, ' + g.filter(function (v) { return !v; }).length + ' empty.');
    var bad = clashes(g);
    if (Object.keys(bad).length) {
      Object.keys(bad).forEach(function (k) { cells[k].classList.add('clash'); });
      line('The given digits already break a rule. No answer exists; the clash is marked.', 'no');
      return;
    }
    var sols = solveAll(g, 2);
    if (!sols.length) { line('Searched every option: no grid satisfies these rules.', 'no'); return; }
    var s = sols[0];
    cells.forEach(function (x, i) { if (!g[i]) { x.value = s[i]; x.classList.add('solved'); } });
    var units = { rows: 0, columns: 0, boxes: 0 };
    for (var u = 0; u < 4; u++) {
      var R = {}, C = {}, B = {};
      for (var i = 0; i < 16; i++) {
        if (Math.floor(i / 4) === u) R[s[i]] = 1;
        if (i % 4 === u) C[s[i]] = 1;
        if (box(i) === u) B[s[i]] = 1;
      }
      if (Object.keys(R).length === 4) units.rows++;
      if (Object.keys(C).length === 4) units.columns++;
      if (Object.keys(B).length === 4) units.boxes++;
    }
    line('Solved, then checked against the rules:');
    line('Rows ' + units.rows + '/4 hold 1–4 once', units.rows === 4 ? 'ok' : 'no');
    line('Columns ' + units.columns + '/4 hold 1–4 once', units.columns === 4 ? 'ok' : 'no');
    line('Boxes ' + units.boxes + '/4 hold 1–4 once', units.boxes === 4 ? 'ok' : 'no');
    var kept = g.every(function (v, i) { return !v || v === s[i]; });
    line('Every given digit unchanged', kept ? 'ok' : 'no');
    if (sols.length > 1) line('Note: more than one grid fits these givens; this is one of them.');
  }

  root.querySelector('[data-act=solve]').addEventListener('click', solve);
  root.querySelector('[data-act=new]').addEventListener('click', newPuzzle);
  root.querySelector('[data-act=clear]').addEventListener('click', function () {
    cells.forEach(function (x, i) { if (!x.classList.contains('given')) x.value = ''; x.classList.remove('solved', 'clash'); });
    log.innerHTML = ''; line('Answer cleared. The given digits stay.');
  });
  newPuzzle();
})();
