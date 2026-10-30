// Builds question pages 3–50 from compact data (window.QDATA) in the same
// cartoon style as the hand-built pages, and registers each card's lab.
//
// Card block types:
//   ['talk', leftBubble, rightBubble]        two people talking (business framing)
//   ['people', bubble]                       engineer presenting to PM / designer / exec
//   ['flow', [[icon, label, sub?], ...]]     icons joined by arrows
//   ['checks', heading|null, [items], 'yellow'|'green'|'blue']
//   ['steps', heading, [items]]              numbered list
//   ['dots', [items]]                        plain bullets
//   ['pillars', [[icon, label, [items]], ...]]
//   ['tiles', [[value, label], ...]]         KPI tiles
//   ['table', [[head...], [row...], ...]]
//   ['code', text]                           mini terminal / code snippet
//   ['alert', text]                          red incident box
//   ['prompt', tag, text]                    yellow box with a label
//   ['bot', tag, text]                       purple answer box with robot
//   ['quote', text]
window.QDATA = window.QDATA || [];
window.QD = (n, d) => window.QDATA.push({ n, ...d });

window.buildQuestions = () => {
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const NUMC = ['n-yellow', 'n-green', 'n-blue', 'n-purple', 'n-orange', 'n-red', 'n-teal', 'n-purple'];
  const BG = ['#fffdf3', '#ffffff', '#f7fbff', '#fbfffb', '#fffdf5', '#ffffff', '#fbfffd', '#fdfcff'];
  const TILE = ['t-green', 't-blue', 't-yellow', 't-purple'];
  const BOX = { yellow: 'box-yellow', green: 'box-green', blue: 'box-blue' };
  const icon = (id) => `<svg><use href="#${id}"/></svg>`;

  const B = {
    talk: (a, b) => `<div class="c1-scene g-talk">
        <span class="bubble sketch b-a">${esc(a)}</span><span class="bubble sketch b-b">${esc(b)}</span>
        <svg class="c1-girl" viewBox="0 0 100 110"><use href="#girl"/></svg>
        <svg class="c1-laptop" viewBox="0 0 90 56"><use href="#laptop"/></svg>
        <svg class="c1-boy" viewBox="0 0 100 110"><use href="#boy-think"/></svg></div>`,
    people: (t) => `<div class="c7-scene">
        <svg class="c7-boy" viewBox="0 0 120 110"><use href="#boy-point"/></svg>
        <span class="bubble sketch b-lead">${esc(t)}</span>
        <div class="people">
          <figure><svg viewBox="0 0 100 110" style="--shirt:#f783ac;--hair:#3b2a20"><use href="#girl"/></svg><figcaption>Product<br>Manager</figcaption></figure>
          <figure><svg viewBox="0 0 100 110" style="--shirt:#20c997;--shirt2:#12b886;--hair:#5a3b25"><use href="#boy"/><use href="#glasses-beard"/></svg><figcaption>Designer</figcaption></figure>
          <figure><svg viewBox="0 0 100 110" style="--shirt:#2b3a55;--shirt2:#1e2a40;--skin:#a86b45;--hair:#1d1d1d"><use href="#boy"/></svg><figcaption>Executive</figcaption></figure>
        </div></div>`,
    flow: (nodes) => `<div class="g-flow">${nodes.map(([ic, label, sub], i) =>
        `${i ? '<span class="g-arrow">→</span>' : ''}<div class="a-node g-node"><span class="a-ic sketch">${icon(ic)}</span>${esc(label)}${sub ? `<small>${esc(sub)}</small>` : ''}</div>`).join('')}</div>`,
    checks: (h, items, color = 'green') => `<div class="box ${BOX[color] || 'box-green'} sketch">${h ? `<h3>${esc(h)}</h3>` : ''}<ul class="checks">${items.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>`,
    steps: (h, items) => `<div class="box box-cream sketch">${h ? `<h3>${esc(h)}</h3>` : ''}<ol class="steps">${items.map((t) => `<li>${esc(t)}</li>`).join('')}</ol></div>`,
    dots: (items) => `<ul class="dots g-dots">${items.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`,
    pillars: (rows) => rows.map(([ic, label, items]) => `<div class="pillar"><div class="p-label">${icon(ic)}${esc(label)}</div><ul class="dots">${items.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>`).join(''),
    tiles: (rows) => `<div class="tiles">${rows.map(([v, l], i) => `<div class="tile sketch ${TILE[i % 4]}"><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div>`,
    table: (rows) => `<div class="m-table sketch">${rows.map((r, i) => `<div class="m-row ${i ? '' : 'm-head'}" style="grid-template-columns:repeat(${r.length},minmax(0,1fr))">${r.map((c) => `<span>${esc(c)}</span>`).join('')}</div>`).join('')}</div>`,
    code: (t) => `<pre class="g-code sketch">${esc(t)}</pre>`,
    alert: (t) => `<div class="alert sketch"><span class="alert-ic">!</span><div><b>ALERT!</b><br>${esc(t)}</div></div>`,
    prompt: (tag, t) => `<div class="prompt sketch"><span class="tag tag-yellow">${esc(tag)}</span><p>${esc(t)}</p></div>`,
    bot: (tag, t) => `<div class="response sketch g-bot"><span class="tag tag-purple">${esc(tag)}</span><p>${esc(t)}</p><svg class="c3-robot" viewBox="0 0 80 84"><use href="#robot"/></svg></div>`,
    quote: (t) => `<blockquote class="quote sketch">“${esc(t)}”</blockquote>`,
  };

  const main = document.getElementById('main');
  const anchor = document.getElementById('soonView');
  window.QMETA = {};
  [...window.QDATA].sort((a, b) => a.n - b.n).forEach((d) => {
    const sec = document.createElement('section');
    sec.className = 'grid';
    sec.id = `q${d.n}View`;
    sec.hidden = true;
    sec.innerHTML = d.cards.map(([title, blocks], i) => `
      <article class="card sketch gcard" style="background:${BG[i]}">
        <h2 class="card-h${i === 5 ? ' card-h-pink' : ''}"><span class="num ${NUMC[i]}">${i + 1}</span>${esc(title)}</h2>
        ${blocks.map(([type, ...args]) => (B[type] ? B[type](...args) : '')).join('')}
      </article>`).join('');
    main.insertBefore(sec, anchor);

    d.cards.forEach(([title, , L], i) => {
      // Rotate options so the right answer isn't always in the same slot
      const opts = L.q[1];
      const shift = (d.n * 7 + i * 3) % opts.length;
      const options = opts.map((_, j) => opts[(j + shift) % opts.length]);
      const correct = (L.q[2] - shift + opts.length) % opts.length;
      window.LABS[`${d.n}-${i + 1}`] = {
        title, host: d.host,
        wants: L.w, answer: L.a,
        quiz: { q: L.q[0], options, correct, why: L.q[3] },
        cmds: L.t.map(([cmd, out]) => ({ cmd, out })),
      };
    });
    window.QMETA[d.n] = d;
  });
};
