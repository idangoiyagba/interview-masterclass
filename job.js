// "Get Hired: $120k Track": readiness score, skills matrix, strict mock
// interviews, portfolio projects and a job-search playbook.
(() => {
  const KEY = 'masterclass-job-v1';
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d; } catch { return d; } };
  const job = Object.assign({ mock: {}, proj: {}, play: {} }, read(KEY, {}));
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(job)); } catch { /* storage unavailable */ } };

  const HIRING_BAR = 75;
  const LAB_TOTAL = Object.keys(window.LABS || {}).length || 16;
  const AVAILABLE_QUESTIONS = 50;

  // ---------- Mock interview prompts ----------
  const PROMPTS = [
    { id: 'rag', type: 'design', q: 'Design a RAG system over 40k internal documents where each team may only see its own docs.' },
    { id: 'latency', type: 'design', q: 'P95 latency of your LLM feature jumped from 2s to 9s after a deploy. Walk me through how you debug and fix it.' },
    { id: 'support', type: 'design', q: 'Design a customer-support assistant for 10k chats a day that must cost under $0.01 per chat.' },
    { id: 'evals', type: 'design', q: 'How do you evaluate an LLM feature before launch, and stop it from regressing afterwards?' },
    { id: 'agent', type: 'design', q: 'An AI agent can issue customer refunds. How do you make it safe enough to ship?' },
    { id: 'finetune', type: 'design', q: 'When would you fine-tune a model instead of using prompting or RAG? Give a concrete example.' },
    { id: 'cost', type: 'design', q: 'Estimate the monthly LLM cost for 5,000 daily users, then show how you would cut it in half.' },
    { id: 'pushback', type: 'behavioral', q: 'Tell me about a time you pushed back on a stakeholder about an AI or data feature.' },
  ];

  // What a senior answer contains. Each signal: test, label, follow-up the interviewer asks if it's missing.
  const SIGNALS = {
    design: [
      { k: 'req', label: 'Clarified users, scale & requirements', re: /\b(users?|requirements?|clarify|assum\w*|scope|peak|traffic|sla|slo)\b/i, ask: 'Before any boxes: who are the users, and what is the peak load?' },
      { k: 'num', label: 'Used real numbers', re: /(\d+(\.\d+)?\s?(ms|s\b|sec|seconds?|req\/s|rps|qps|%|k\b|m\b|tokens?|gb|users|docs|documents))|\$\s?\d/i, ask: 'Put a number on it. What latency, throughput and cost are you designing for?' },
      { k: 'arch', label: 'Named concrete components', test: (t) => ['gateway', 'cache', 'queue', 'vector', 'index', 'retriev', 'embed', 'rerank', 'api', 'postgres', 'database', 'worker', 'load balancer', 'router', 'stream', 'redis', 'docker', 'kubernetes'].filter((w) => t.toLowerCase().includes(w)).length >= 3, ask: 'Walk me through the request path. Which components does one request touch?' },
      { k: 'trade', label: 'Explained tradeoffs', re: /trade-?offs?|instead of|rather than|\bvs\.?\b|at the cost of|downside|but it costs|cheaper but|slower but|the risk is/i, ask: 'What did you give up with that choice, and why is it worth it?' },
      { k: 'fail', label: 'Planned for failure', re: /fallback|retr(y|ies)|timeout|circuit|outage|degrad|rollback|failover|backoff|rate.?limit/i, ask: 'The model provider is down for 20 minutes. What do users see?' },
      { k: 'eval', label: 'Defined evals & metrics', re: /\bevals?\b|evaluat|golden|benchmark|a\/b|judge|metric|precision|recall|faithful|ground truth/i, ask: 'How do you know it works? What is your eval set and your main metric?' },
      { k: 'sec', label: 'Covered security & data access', re: /\bpii\b|\bacl|permission|\bauth|injection|redact|least.privilege|tenant|encrypt|access control/i, ask: 'How do you stop one user from seeing another user’s data?' },
      { k: 'cost', label: 'Reasoned about cost', re: /\bcost|\$|price|budget|token usage|cheaper|per 1m|spend/i, ask: 'What does one request cost, and how would you cut it?' },
    ],
    behavioral: [
      { k: 'sit', label: 'Set the situation', re: /\b(when|at my|we were|situation|context|last year|in my role)\b/i, ask: 'Set the scene: where were you and what was at stake?' },
      { k: 'own', label: 'Said what YOU did', re: /\bi (built|led|proposed|wrote|ran|decided|pushed|showed|measured|prototyped|asked|presented)\b/i, ask: 'What did you do personally, not the team?' },
      { k: 'who', label: 'Named the stakeholder', re: /stakeholder|\bpm\b|product manager|manager|executive|director|ceo|cto|client|team lead/i, ask: 'Who exactly disagreed with you, and what did they want?' },
      { k: 'data', label: 'Used data to persuade', re: /data|eval|metric|experiment|prototype|benchmark|numbers|measured/i, ask: 'What evidence did you bring? Opinions rarely win these.' },
      { k: 'num', label: 'Quantified the result', re: /\d+(\.\d+)?\s?(%|x\b|ms|s\b|weeks?|days?|users|k\b)|\$\s?\d/i, ask: 'What changed, in numbers?' },
      { k: 'trade', label: 'Acknowledged the other side', re: /understood|their concern|tradeoff|trade-off|compromise|agreed to|middle ground|valid point/i, ask: 'What was right about their position?' },
      { k: 'res', label: 'Stated the outcome', re: /result|outcome|in the end|we shipped|launched|reduced|increased|saved|improved/i, ask: 'So what happened in the end?' },
      { k: 'learn', label: 'Reflected on lessons', re: /learn|next time|would do differently|since then|takeaway/i, ask: 'What would you do differently next time?' },
    ],
  };

  function scoreAnswer(text, type) {
    const sigs = SIGNALS[type];
    const hits = sigs.map((s) => (s.test ? s.test(text) : s.re.test(text)));
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const score = Math.min(100, Math.round(hits.filter(Boolean).length * 11 + Math.min(12, (words / 200) * 12)));
    return { hits, words, score };
  }
  const verdict = (s) => (s >= 80 ? ['Strong hire', 'v-hire'] : s >= 65 ? ['Lean hire', 'v-lean'] : s >= 45 ? ['Lean no hire', 'v-leanno'] : ['No hire', 'v-no']);

  // ---------- Portfolio projects ----------
  const PROJECTS = [
    { id: 'rag', name: 'Internal-docs RAG with citations', skills: 'RAG · pgvector · Docker',
      criteria: ['Docker Compose: FastAPI + Postgres/pgvector + Redis', 'Ingest 1,000+ real documents with heading-aware chunking', 'Hybrid search + reranker, answers cite sources', 'Per-user access filtering at retrieval time', 'README with architecture diagram and measured P95 latency'],
      bullet: 'Built a RAG service (FastAPI, Postgres/pgvector, Redis, Docker) that answers questions over [N] documents with citations and per-user access control, at [X]s P95 latency.' },
    { id: 'evals', name: 'LLM eval harness in CI', skills: 'Evals · CI/CD · quality',
      criteria: ['Golden set of 100+ real questions with expected answers', 'LLM-as-judge rubric checked against 30 human labels', 'GitHub Actions job that fails the build when scores drop', 'Report comparing two prompts or models, with a recommendation'],
      bullet: 'Created an LLM evaluation pipeline ([N] golden cases, LLM-as-judge validated against human labels) that runs in CI and blocked [K] regressions before release.' },
    { id: 'gateway', name: 'LLM gateway with routing & cost controls', skills: 'System design · latency · cost',
      criteria: ['Streams tokens to the client', 'Routes between a small and a large model by confidence', 'Answer cache + prompt caching, with hit rate reported', 'Per-user budgets, rate limits and fallback provider', 'Load test (k6 or Locust) with a latency and cost report'],
      bullet: 'Designed an LLM gateway with model routing, caching and fallbacks that cut cost per request by [X]% and held P95 first-token latency under [Y]ms at [Z] req/s in load tests.' },
    { id: 'agent', name: 'Safe tool-using agent + observability', skills: 'Agents · safety · observability',
      criteria: ['Agent with 3+ tools scoped to the signed-in user', 'Human approval for any money or account change', 'Red-team suite of 50+ prompt-injection attacks with pass rate', 'OpenTelemetry traces and a Grafana dashboard (latency, cost, errors)'],
      bullet: 'Shipped a tool-using AI agent with least-privilege tools, human approval for risky actions and full tracing; it blocked [X]% of [N] red-team injection attacks.' },
  ];

  // ---------- Job-search playbook ----------
  const PLAY = [
    ['Resume', 'One page, “AI/LLM Engineer” title, 3–4 project bullets with numbers'],
    ['Resume', 'Skills line matches the job post (Python, RAG, evals, Docker, AWS/GCP)'],
    ['GitHub', 'Pin the 4 portfolio repos, each with a README, diagram and demo GIF'],
    ['LinkedIn', 'Headline: “AI Engineer · RAG, evals, LLM systems” + a featured project'],
    ['Pipeline', 'Apply to 10 targeted roles a week and track them in a sheet'],
    ['Pipeline', 'Ask for 2 referrals a week (former colleagues, meetups, alumni)'],
    ['Interview', 'Score “Strong hire” on 5 of the 8 mock interviews'],
    ['Interview', 'Prepare 5 STAR stories with numbers (conflict, failure, impact, leadership, ambiguity)'],
    ['Offer', 'Research pay for the role and city (Levels.fyi, Glassdoor, posted ranges)'],
    ['Offer', 'Never name a number first; negotiate base, bonus and equity separately, in writing'],
  ];

  // ---------- Skills employers pay for ----------
  const SKILLS = [
    ['RAG & retrieval', ['1-2', '1-3'], 'rag'],
    ['LLM system design', ['2-2', '2-3'], 'gateway'],
    ['Evals & quality', ['1-8', '2-7'], 'evals'],
    ['Debugging incidents', ['1-5'], 'gateway'],
    ['Latency & performance', ['2-4'], 'gateway'],
    ['Cost modeling', ['1-6', '2-6'], 'gateway'],
    ['Safety & guardrails', ['2-5', '1-4'], 'agent'],
    ['Docker, K8s & CI/CD', ['1-4', '2-2'], 'rag'],
    ['Postgres & pgvector', ['1-2', '1-5'], 'rag'],
    ['Communicating tradeoffs', ['1-1', '1-7', '2-1', '2-8'], null],
  ];

  // ---------- Scoring ----------
  const projDone = (p) => p.criteria.every((_, i) => job.proj[`${p.id}-${i}`]);
  function readiness() {
    const done = read('masterclass-progress-v1', []).length;
    const labs = Object.keys(read('masterclass-labs-v1', {})).length;
    const mockSum = PROMPTS.reduce((a, p) => a + (job.mock[p.id]?.best || 0), 0);
    const crit = PROJECTS.reduce((a, p) => a + p.criteria.length, 0);
    const critDone = PROJECTS.reduce((a, p) => a + p.criteria.filter((_, i) => job.proj[`${p.id}-${i}`]).length, 0);
    const playDone = PLAY.filter((_, i) => job.play[i]).length;
    const parts = [
      { name: 'Questions studied', got: Math.min(done, AVAILABLE_QUESTIONS) / AVAILABLE_QUESTIONS * 10, max: 10, detail: `${Math.min(done, AVAILABLE_QUESTIONS)}/${AVAILABLE_QUESTIONS}`, next: 'Study the next question and press Mark as Done.' },
      { name: 'Labs passed', got: labs / LAB_TOTAL * 25, max: 25, detail: `${labs}/${LAB_TOTAL}`, next: 'Open any question card and pass its lab.' },
      { name: 'Mock interviews', got: mockSum / (PROMPTS.length * 100) * 30, max: 30, detail: `${PROMPTS.filter((p) => job.mock[p.id]).length}/${PROMPTS.length} tried`, next: 'Do a strict mock interview below and aim for “Strong hire”.' },
      { name: 'Portfolio proof', got: critDone / crit * 25, max: 25, detail: `${PROJECTS.filter(projDone).length}/${PROJECTS.length} projects`, next: 'Ship the next portfolio project and tick its criteria.' },
      { name: 'Job-search playbook', got: playDone / PLAY.length * 10, max: 10, detail: `${playDone}/${PLAY.length}`, next: 'Work through the job-search playbook.' },
    ];
    const total = Math.round(parts.reduce((a, p) => a + p.got, 0));
    const weakest = parts.slice().sort((a, b) => a.got / a.max - b.got / b.max)[0];
    return { total, parts, weakest, labsPassed: read('masterclass-labs-v1', {}) };
  }

  // ---------- Render ----------
  const root = document.getElementById('jobView');
  let mockState = { id: PROMPTS[0].id, timer: null, left: 600, running: false, result: null };

  function gauge(score) {
    const len = Math.PI * 80; // semicircle with r=80
    const barAngle = Math.PI * (1 - HIRING_BAR / 100);
    const bx = 100 + 80 * Math.cos(barAngle), by = 96 - 80 * Math.sin(barAngle);
    const color = score >= HIRING_BAR ? '#37b24d' : score >= 50 ? '#fab005' : '#fd7e14';
    return `<svg viewBox="0 0 200 112" class="gauge" role="img" aria-label="Readiness ${score} out of 100">
      <path d="M20 96 A80 80 0 0 1 180 96" fill="none" stroke="#e9ecef" stroke-width="18" stroke-linecap="round"/>
      <path d="M20 96 A80 80 0 0 1 180 96" fill="none" stroke="${color}" stroke-width="18" stroke-linecap="round" stroke-dasharray="${(score / 100) * len} ${len}" class="gauge-fill" opacity="${score > 0 ? 1 : 0}"/>
      <line x1="${bx}" y1="${by - 14}" x2="${bx}" y2="${by + 14}" stroke="#e03131" stroke-width="3" stroke-dasharray="4 3" transform="rotate(${90 - (barAngle * 180) / Math.PI} ${bx} ${by})"/>
      <text x="100" y="86" text-anchor="middle" font-family="Kalam" font-weight="700" font-size="40" fill="#1d1d1d">${score}</text>
      <text x="100" y="106" text-anchor="middle" font-family="Patrick Hand" font-size="14" fill="#555">out of 100 · bar ${HIRING_BAR}</text>
    </svg>`;
  }

  function renderReadiness() {
    const r = readiness();
    const status = r.total >= HIRING_BAR ? '✓ Above the hiring bar. Start applying hard!' : `${HIRING_BAR - r.total} points below the hiring bar`;
    root.querySelector('#jobReady').innerHTML = `
      <h2 class="card-h"><span class="num n-yellow">★</span>Your hiring readiness</h2>
      ${gauge(r.total)}
      <div class="ready-status ${r.total >= HIRING_BAR ? 'ok' : ''}">${status}</div>
      <ul class="parts">${r.parts.map((p) => `<li><span>${p.name}</span><small>${p.detail}</small>
        <div class="pbar"><i style="width:${(p.got / p.max) * 100}%"></i></div><b>${Math.round(p.got)}/${p.max}</b></li>`).join('')}</ul>
      <div class="next-action sketch"><b>Next best move:</b> ${p2h(r.weakest.next)}</div>
      <p class="fineprint">This is a practice score, not a promise. Offers come from proof: shipped projects, clear answers and applications.</p>`;

    root.querySelector('#jobSkills').innerHTML = `
      <h2 class="card-h"><span class="num n-blue">✓</span>Skills a $120k AI engineer must prove</h2>
      <ul class="skills">${SKILLS.map(([name, labs, proj]) => {
        const passed = labs.filter((l) => r.labsPassed[l]).length;
        const pDone = proj ? projDone(PROJECTS.find((p) => p.id === proj)) : passed === labs.length;
        const st = passed === labs.length && pDone ? ['Proven', 's-proven'] : passed || (proj && PROJECTS.find((p) => p.id === proj).criteria.some((_, i) => job.proj[`${proj}-${i}`])) ? ['Practicing', 's-practice'] : ['Not started', 's-none'];
        return `<li><span>${name}</span><small>labs ${passed}/${labs.length}${proj ? ' · project' : ''}</small><em class="${st[1]}">${st[0]}</em></li>`;
      }).join('')}</ul>
      <p class="fineprint"><b>Proven</b> = every related lab passed <b>and</b> the related portfolio project shipped.</p>`;
  }
  const p2h = (t) => esc(t);

  function renderMock() {
    const p = PROMPTS.find((x) => x.id === mockState.id);
    const best = job.mock[p.id]?.best;
    const mm = String(Math.floor(mockState.left / 60)).padStart(2, '0'), ss = String(mockState.left % 60).padStart(2, '0');
    const res = mockState.result;
    root.querySelector('#jobMock').innerHTML = `
      <h2 class="card-h"><span class="num n-red">!</span>Strict mock interview <small class="h-sub">10 minutes · no notes</small></h2>
      <div class="mock-pick">${PROMPTS.map((x, i) => {
        const b = job.mock[x.id]?.best;
        return `<button class="mp sketch ${x.id === p.id ? 'on' : ''}" data-mock-pick="${x.id}" ${mockState.running ? 'disabled' : ''}>Q${i + 1}${b != null ? ` · ${b}` : ''}${x.type === 'behavioral' ? ' · STAR' : ''}</button>`;
      }).join('')}</div>
      <div class="mock-q sketch">
        <svg class="mock-girl" viewBox="0 0 100 110"><use href="#girl"/></svg>
        <div><small>Interviewer${p.type === 'behavioral' ? ' · behavioral' : ' · system design'}${best != null ? ` · your best: ${best}` : ''}</small><p>“${esc(p.q)}”</p></div>
        <div class="timer ${mockState.left <= 60 && mockState.running ? 'low' : ''}">${mm}:${ss}</div>
      </div>
      <textarea id="mockAnswer" class="sketch" rows="8" placeholder="${mockState.running ? 'Answer like you are talking to the interviewer. Structure: requirements → design → numbers → tradeoffs → failure modes → evals.' : 'Press Start. The timer runs for 10 minutes, then your answer is submitted automatically.'}" ${mockState.running ? '' : 'disabled'}>${esc(mockState.draft || '')}</textarea>
      <div class="mock-actions">
        ${mockState.running
          ? `<button class="btn btn-green sketch" data-mock="submit">Submit answer</button><span class="wc" id="mockWc">0 words</span>`
          : `<button class="btn btn-blue sketch" data-mock="start">${res ? 'Try again' : 'Start interview'}</button>`}
      </div>
      ${res ? `<div class="mock-result sketch">
        <div class="verdict ${res.v[1]}">${res.v[0]} <b>${res.score}/100</b><small>${res.words} words</small></div>
        <ul class="sig">${SIGNALS[p.type].map((s, i) => `<li class="${res.hits[i] ? 'hit' : 'miss'}">${res.hits[i] ? '✓' : '✗'} ${s.label}</li>`).join('')}</ul>
        ${res.hits.some((h) => !h) ? `<div class="followup"><b>Interviewer follows up:</b> “${esc(SIGNALS[p.type][res.hits.indexOf(false)].ask)}”</div>` : '<div class="followup ok">No gaps found. Now say it out loud in under 8 minutes.</div>'}
        <p class="fineprint">The auto-check looks for the signals senior interviewers listen for. It can’t judge whether your answer is correct, so compare it with the labs’ strong answers.</p>
      </div>` : ''}`;
  }

  function renderPortfolio() {
    root.querySelector('#jobProj').innerHTML = `
      <h2 class="card-h"><span class="num n-green">⚒</span>Portfolio projects that prove it</h2>
      <p class="lead">Hiring managers trust shipped code over certificates. Build these 4 on GitHub. Each unlocks a resume bullet.</p>
      <div class="projects">${PROJECTS.map((p, pi) => {
        const n = p.criteria.filter((_, i) => job.proj[`${p.id}-${i}`]).length;
        const complete = n === p.criteria.length;
        return `<div class="proj sketch ${complete ? 'complete' : ''}">
          <div class="proj-h"><b>${pi + 1}. ${esc(p.name)}</b><small>${esc(p.skills)}</small><span class="proj-n">${n}/${p.criteria.length}</span></div>
          <ul class="checks">${p.criteria.map((c, i) => `<li class="${job.proj[`${p.id}-${i}`] ? '' : 'off'}" data-proj="${p.id}-${i}">${esc(c)}</li>`).join('')}</ul>
          ${complete
            ? `<div class="bullet"><small>Resume bullet (fill in your real numbers):</small><p>${esc(p.bullet)}</p><button class="btn sketch copy" data-copy="${pi}">Copy bullet</button></div>`
            : `<div class="locked">🔒 Resume bullet unlocks when every item is done</div>`}
        </div>`;
      }).join('')}</div>`;
  }

  function renderPlay() {
    const done = PLAY.filter((_, i) => job.play[i]).length;
    root.querySelector('#jobPlay').innerHTML = `
      <h2 class="card-h card-h-pink"><span class="num n-purple">$</span>Job-search playbook <small class="h-sub">${done}/${PLAY.length}</small></h2>
      <ul class="checks play">${PLAY.map(([tag, t], i) => `<li class="${job.play[i] ? '' : 'off'}" data-play="${i}"><em>${tag}</em>${esc(t)}</li>`).join('')}</ul>
      <blockquote class="quote sketch">“Get the interview with proof. Win it with numbers and tradeoffs. Negotiate the offer in writing.”</blockquote>`;
  }

  function renderAll() {
    if (!root.dataset.built) {
      root.innerHTML = `
        <article class="card sketch job-ready" id="jobReady"></article>
        <article class="card sketch job-skills" id="jobSkills"></article>
        <article class="card sketch span2 job-mock" id="jobMock"></article>
        <article class="card sketch span2 job-proj" id="jobProj"></article>
        <article class="card sketch span2 job-play" id="jobPlay"></article>`;
      root.dataset.built = '1';
    }
    renderReadiness(); renderMock(); renderPortfolio(); renderPlay();
  }
  window.renderJob = renderAll;

  // ---------- Mock interview flow ----------
  function startMock() {
    mockState = { ...mockState, running: true, left: 600, result: null, draft: '' };
    renderMock();
    const ta = root.querySelector('#mockAnswer');
    ta.focus();
    clearInterval(mockState.timer);
    mockState.timer = setInterval(() => {
      mockState.left -= 1;
      const t = root.querySelector('.timer');
      if (t) {
        t.textContent = `${String(Math.floor(mockState.left / 60)).padStart(2, '0')}:${String(mockState.left % 60).padStart(2, '0')}`;
        t.classList.toggle('low', mockState.left <= 60);
      }
      if (mockState.left <= 0) submitMock(true);
    }, 1000);
  }
  function submitMock(timeUp) {
    clearInterval(mockState.timer);
    const ta = root.querySelector('#mockAnswer');
    const text = ta ? ta.value : '';
    const p = PROMPTS.find((x) => x.id === mockState.id);
    const r = scoreAnswer(text, p.type);
    const prev = job.mock[p.id] || { best: 0, tries: 0 };
    job.mock[p.id] = { best: Math.max(prev.best, r.score), tries: prev.tries + 1, last: r.score };
    save();
    mockState = { ...mockState, running: false, draft: text, result: { ...r, v: verdict(r.score) } };
    renderAll();
    window.toast?.(timeUp ? 'Time’s up! Answer submitted.' : `Scored ${r.score}/100: ${verdict(r.score)[0]}`);
    root.querySelector('#jobMock').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  root.addEventListener('click', (e) => {
    const pick = e.target.closest('[data-mock-pick]');
    if (pick) { mockState = { ...mockState, id: pick.dataset.mockPick, result: null, draft: '' }; renderMock(); return; }
    const m = e.target.closest('[data-mock]');
    if (m) { m.dataset.mock === 'start' ? startMock() : submitMock(false); return; }
    const pr = e.target.closest('[data-proj]');
    if (pr) { e.stopPropagation(); job.proj[pr.dataset.proj] = !job.proj[pr.dataset.proj]; save(); renderAll(); return; }
    const pl = e.target.closest('[data-play]');
    if (pl) { e.stopPropagation(); job.play[pl.dataset.play] = !job.play[pl.dataset.play]; save(); renderReadiness(); renderPlay(); return; }
    const cp = e.target.closest('[data-copy]');
    if (cp) {
      const text = PROJECTS[Number(cp.dataset.copy)].bullet;
      (navigator.clipboard?.writeText(text) || Promise.reject()).then(() => window.toast?.('Bullet copied. Replace the [brackets] with your real numbers.'), () => window.toast?.('Copy failed. Select the text instead.'));
    }
  }, true);
  root.addEventListener('input', (e) => {
    if (e.target.id !== 'mockAnswer') return;
    mockState.draft = e.target.value;
    const wc = root.querySelector('#mockWc');
    if (wc) wc.textContent = `${e.target.value.trim().split(/\s+/).filter(Boolean).length} words`;
  });

  window.__jobTest = { scoreAnswer, readiness }; // used by tests
})();
