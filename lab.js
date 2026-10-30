// Interactive labs: every card opens a modal with interview guidance,
// a judgement question and a simulated terminal (docker, psql, redis, curl…).
(() => {
  const LABS = window.LABS;
  const PASS_KEY = 'masterclass-labs-v1';
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const norm = (t) => t.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();

  let passed = {};
  try { passed = JSON.parse(localStorage.getItem(PASS_KEY) || '{}'); } catch { /* storage unavailable */ }
  const savePassed = () => { try { localStorage.setItem(PASS_KEY, JSON.stringify(passed)); } catch { /* ignore */ } };

  // ---------- Tag cards and add a "LAB" sticker ----------
  const cards = [];
  ['1', '2'].forEach((q) => {
    document.querySelectorAll(`#q${q}View .card`).forEach((card, i) => {
      const key = `${q}-${i + 1}`;
      if (!LABS[key]) return;
      card.dataset.lab = key;
      card.classList.add('has-lab');
      card.tabIndex = 0;
      card.setAttribute('aria-label', `${LABS[key].title}: open interactive lab`);
      const tag = document.createElement('span');
      tag.className = 'lab-sticker';
      card.appendChild(tag);
      cards.push(key);
    });
  });
  function paintStickers() {
    document.querySelectorAll('.card[data-lab]').forEach((c) => {
      const ok = passed[c.dataset.lab];
      const s = c.querySelector('.lab-sticker');
      s.textContent = ok ? '✓ LAB PASSED' : '▶ OPEN LAB';
      s.classList.toggle('ok', Boolean(ok));
    });
  }
  paintStickers();

  // ---------- Modal ----------
  const dlg = document.createElement('dialog');
  dlg.className = 'lab';
  dlg.innerHTML = `
    <div class="lab-top">
      <span class="num" id="labNum">1</span>
      <div class="lab-heading"><small id="labCrumb"></small><h2 id="labTitle"></h2></div>
      <button class="lab-x" data-lab-close aria-label="Close lab">✕</button>
    </div>
    <div class="lab-body">
      <div class="lab-left">
        <section class="box box-blue sketch">
          <h3>🎯 What the interviewer is looking for</h3>
          <ul class="dots" id="labWants"></ul>
        </section>
        <section class="quiz box box-yellow sketch">
          <h3>🧠 Interview check</h3>
          <p id="labQ"></p>
          <div class="quiz-opts" id="labOpts"></div>
          <p class="quiz-why" id="labWhy" hidden></p>
        </section>
        <section class="box box-green sketch">
          <h3>✅ Strong answer</h3>
          <button class="btn sketch reveal" id="labReveal">Think first, then reveal</button>
          <ul class="checks" id="labAnswer" hidden></ul>
        </section>
      </div>
      <div class="lab-right">
        <div class="term">
          <div class="term-bar"><i></i><i></i><i></i><span id="termTitle">engineer@lab: ~</span></div>
          <div class="term-out" id="termOut" aria-live="polite"></div>
          <form class="term-in" id="termForm" autocomplete="off">
            <span class="term-prompt" id="termPrompt">$</span>
            <input id="termInput" spellcheck="false" aria-label="Terminal command" placeholder="type a command, or click one below">
          </form>
        </div>
        <div class="chips"><span>Try:</span><div id="termChips"></div></div>
      </div>
    </div>
    <div class="lab-foot">
      <button class="btn sketch" id="labPrev">← Previous lab</button>
      <span class="lab-count" id="labCount"></span>
      <button class="btn btn-blue sketch" id="labNext">Next lab →</button>
    </div>`;
  document.body.appendChild(dlg);
  const $ = (id) => dlg.querySelector('#' + id);

  const state = {};      // per-lab simulated state (e.g. index created)
  const screens = {};    // per-lab terminal scrollback
  const history = [];
  let histPos = 0;
  let current = null;
  let queue = Promise.resolve();

  const NUM_CLASS = ['n-yellow', 'n-green', 'n-blue', 'n-purple', 'n-orange', 'n-red', 'n-teal', 'n-purple'];

  function open(key) {
    if (current) screens[current] = $('termOut').innerHTML;
    current = key;
    const lab = LABS[key];
    const [q, n] = key.split('-').map(Number);
    state[key] ||= {};
    $('labNum').textContent = n;
    $('labNum').className = 'num ' + NUM_CLASS[n - 1];
    $('labCrumb').textContent = `Question ${q} · Step ${n} of 8 · Interactive lab`;
    $('labTitle').textContent = lab.title;
    $('labWants').innerHTML = lab.wants.map((w) => `<li>${esc(w)}</li>`).join('');
    $('labAnswer').innerHTML = lab.answer.map((w) => `<li>${esc(w)}</li>`).join('');
    $('labAnswer').hidden = true;
    $('labReveal').hidden = false;

    $('labQ').textContent = lab.quiz.q;
    $('labOpts').innerHTML = lab.quiz.options.map((o, i) => `<button class="opt sketch" data-i="${i}">${String.fromCharCode(65 + i)}. ${esc(o)}</button>`).join('');
    $('labWhy').hidden = true;

    const prompt = `engineer@${lab.host}:~$`;
    $('termTitle').textContent = `engineer@${lab.host}: ~`;
    $('termPrompt').textContent = prompt;
    $('termChips').innerHTML = lab.cmds.map((c, i) => `<button class="chip" data-c="${i}">${esc(c.cmd || c.hint)}</button>`).join('');
    $('termOut').innerHTML = screens[key] || `<div class="t-dim">Lab environment ready. Type <b>help</b> or click a command below.</div>`;

    const idx = cards.indexOf(key);
    $('labCount').textContent = `${idx + 1} / ${cards.length}`;
    $('labPrev').disabled = idx === 0;
    $('labNext').disabled = idx === cards.length - 1;

    if (!dlg.open) dlg.showModal();
    $('termOut').scrollTop = 1e9;
    if (matchMedia('(pointer:fine)').matches) $('termInput').focus();
  }

  // ---------- Terminal ----------
  function lineClass(l) {
    if (/✗|ERROR|FAIL|BLOCKED|ALERT|saturated/.test(l)) return 'tc-red';
    if (/WARN|timeout/.test(l)) return 'tc-yellow';
    if (/✓|PASS|Started|Created|healthy|\bok\b/.test(l)) return 'tc-green';
    if (/^(─|-{4})/.test(l)) return 'tc-dim';
    return '';
  }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function print(text) {
    const out = $('termOut');
    const fast = matchMedia('(prefers-reduced-motion: reduce)').matches;
    for (const l of String(text).split('\n')) {
      const div = document.createElement('div');
      div.className = lineClass(l);
      div.textContent = l || ' ';
      out.appendChild(div);
      out.scrollTop = 1e9;
      if (!fast) await sleep(16);
    }
  }
  async function stream(text) {
    const out = $('termOut');
    const [first, ...rest] = text.split('\n');
    const div = document.createElement('div');
    div.className = 't-stream';
    out.appendChild(div);
    for (const w of first.split(/(\s+)/)) { div.textContent += w; out.scrollTop = 1e9; await sleep(35); }
    if (rest.length) await print(rest.join('\n'));
  }

  function resolve(input) {
    const lab = LABS[current];
    const n = norm(input);
    for (const c of lab.cmds) {
      if (c.cmd && norm(c.cmd) === n) return c.out;
    }
    for (const c of lab.cmds) {
      if (c.re) { const m = n.match(c.re); if (m) return (s) => c.out(s, m[1] || ''); }
    }
    return null;
  }

  function run(input) {
    const cmd = input.trim();
    if (!cmd) return;
    history.push(cmd); histPos = history.length;
    queue = queue.then(async () => {
      const out = $('termOut');
      const echo = document.createElement('div');
      echo.className = 't-cmd';
      echo.innerHTML = `<span class="t-prompt">${esc($('termPrompt').textContent)}</span> ${esc(cmd)}`;
      out.appendChild(echo);

      const lower = norm(cmd).toLowerCase();
      if (lower === 'clear') { out.innerHTML = ''; return; }
      if (lower === 'help') {
        await print('Commands in this lab:\n' + LABS[current].cmds.map((c) => '  ' + (c.cmd || c.hint)).join('\n') + '\nAlso: clear, history. Tab autocompletes, ↑/↓ cycles history.');
        return;
      }
      if (lower === 'history') { await print(history.map((h, i) => `${String(i + 1).padStart(4)}  ${h}`).join('\n')); return; }

      const res = resolve(cmd);
      if (!res) {
        const tool = cmd.split(' ')[0];
        await print(`${tool}: this lab doesn't simulate that command.\nType "help" to see what you can run here.`);
        return;
      }
      const value = typeof res === 'function' ? res(state[current], '') : res;
      if (value && value.stream) await stream(value.stream);
      else await print(value);
    });
    return queue;
  }

  // ---------- Events ----------
  $('termForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = $('termInput').value;
    $('termInput').value = '';
    run(v);
  });
  $('termInput').addEventListener('keydown', (e) => {
    const inp = e.target;
    if (e.key === 'ArrowUp' && history.length) { e.preventDefault(); histPos = Math.max(0, histPos - 1); inp.value = history[histPos]; }
    else if (e.key === 'ArrowDown') { e.preventDefault(); histPos = Math.min(history.length, histPos + 1); inp.value = history[histPos] || ''; }
    else if (e.key === 'Tab') {
      const v = norm(inp.value);
      const hit = LABS[current].cmds.map((c) => c.cmd || c.hint).find((c) => v && norm(c).startsWith(v));
      if (hit) { e.preventDefault(); inp.value = hit; }
    }
  });

  dlg.addEventListener('click', async (e) => {
    if (e.target === dlg || e.target.closest('[data-lab-close]')) { dlg.close(); return; }
    const chip = e.target.closest('.chip');
    if (chip) {
      const c = LABS[current].cmds[Number(chip.dataset.c)];
      const text = c.cmd || c.hint;
      const inp = $('termInput');
      inp.value = '';
      for (const ch of text) { inp.value += ch; await sleep(text.length > 60 ? 4 : 12); }
      inp.value = '';
      run(text);
      return;
    }
    const opt = e.target.closest('.opt');
    if (opt) {
      const lab = LABS[current];
      const i = Number(opt.dataset.i);
      const ok = i === lab.quiz.correct;
      dlg.querySelectorAll('.opt').forEach((b, j) => {
        b.classList.toggle('right', j === lab.quiz.correct && ok);
        b.classList.toggle('wrong', j === i && !ok);
      });
      const why = $('labWhy');
      why.hidden = false;
      why.className = 'quiz-why ' + (ok ? 'ok' : 'no');
      why.textContent = ok ? `✓ Correct. ${lab.quiz.why}` : '✗ Not quite. Think about what a senior engineer would check first, then try again.';
      if (ok) { passed[current] = true; savePassed(); paintStickers(); }
      return;
    }
    if (e.target.closest('#labReveal')) { $('labAnswer').hidden = false; $('labReveal').hidden = true; return; }
    if (e.target.closest('#labPrev')) open(cards[cards.indexOf(current) - 1]);
    if (e.target.closest('#labNext')) open(cards[cards.indexOf(current) + 1]);
  });
  dlg.addEventListener('close', () => { if (current) screens[current] = $('termOut').innerHTML; });

  // Open from a card (but let checklist ticks keep working)
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.card[data-lab]');
    if (!card || e.target.closest('.checks li, button:not(.lab-sticker)')) return;
    open(card.dataset.lab);
  });
  document.addEventListener('keydown', (e) => {
    const card = e.target.closest && e.target.closest('.card[data-lab]');
    if (card && (e.key === 'Enter' || e.key === ' ') && e.target === card) { e.preventDefault(); open(card.dataset.lab); }
  });

  window.openLab = open; // handy for testing
})();
