// Senior AI Engineer Interview Masterclass: home page behaviour.
const TOTAL = 50;

const QUESTIONS = [
  { n: 1, nav: 'RAG System', tab: 'RAG System', icon: 'i-brain', title: 'Design a RAG System for a Company’s Internal Documents',
    sub: 'Build a production-ready RAG system that answers employee questions using the company’s internal documents.' },
  { n: 2, nav: 'LLM System Design', tab: 'LLM System<br>Design', icon: 'i-robot', title: 'Design an LLM-Powered Customer Support Assistant',
    sub: 'Design an LLM system that answers 10,000 customer chats a day and stays fast, safe and affordable.',
    bubble: 'Let’s think in<br>numbers!', note: 'This tests LLM architecture, model choice, latency, cost, safety and scale.' },
  { n: 3, nav: 'AI Agent', tab: 'AI Agents<br>Design', icon: 'i-brain', brain: '#da77f2', title: 'Design an AI Agent That Uses Tools Safely',
    sub: 'Plan the loop, tools, memory and safety limits for an agent that takes real actions.' },
  { n: 4, nav: 'Vector Databases', tab: 'Vector<br>Databases', icon: 'i-db', title: 'Choose and Scale a Vector Database',
    sub: 'Compare vector stores, indexing and filtering for millions of embeddings.' },
  { n: 5, nav: 'Prompt Engineering', tab: 'Prompt<br>Engineering', icon: 'i-gear', title: 'Engineer Prompts That Hold Up in Production',
    sub: 'Write, version and test prompts so quality doesn’t drift.' },
  { n: 6, nav: 'Model Evaluation', tab: 'Model<br>Evaluation', icon: 'i-board', title: 'Evaluate an LLM Feature Before Launch',
    sub: 'Build eval sets, metrics and LLM-as-judge checks you can trust.' },
  { n: 7, nav: 'Fine-tuning', tab: 'Fine-tuning<br>&amp; LoRA', icon: 'i-robot', title: 'Decide When (and How) to Fine-tune',
    sub: 'Weigh prompting vs RAG vs LoRA fine-tuning on cost, quality and speed.' },
  { n: 8, nav: 'Multi-Agent Systems', tab: 'Multi-Agent<br>Systems', icon: 'i-bars', title: 'Design a Multi-Agent System',
    sub: 'Split work across agents without losing control, cost or traceability.' },
  { n: 9, nav: 'Production Deployment', tab: 'Production<br>&amp; MLOps', icon: 'i-cloud', title: 'Deploy an AI Service to Production',
    sub: 'Ship with CI/CD, rollouts, rollbacks and capacity planning.' },
  { n: 10, nav: 'Monitoring & Observability', tab: 'Monitoring<br>&amp; Observability', icon: 'i-siren', title: 'Monitor and Debug an LLM App',
    sub: 'Trace requests, watch quality and cost, and catch regressions early.' },
];
// Questions with a finished page: number -> section id
const VIEWS = { 1: 'q1View', 2: 'q2View' };
const DEFAULT_BUBBLE = 'Let’s design this<br>step by step!';
const DEFAULT_NOTE = 'This tests system design, LLMs, RAG, data pipelines, security, and production thinking.';

const NUM_COLORS = ['n-yellow', 'n-blue', 'n-teal', 'n-purple', 'n-yellow', 'n-red', 'n-green', 'n-purple', 'n-orange', 'n-blue'];

const $ = (s) => document.querySelector(s);
const STORE_KEY = 'masterclass-progress-v1';

function loadDone() {
  try { return new Set(JSON.parse(localStorage.getItem(STORE_KEY) || '[]')); } catch { return new Set(); }
}
function saveDone() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify([...done])); } catch { /* storage unavailable: progress lives for this visit */ }
}

const done = loadDone();
let current = 1;
let view = 'question'; // 'question' | 'all' | 'job'

// ---------- Render sidebar + footer tabs ----------
function renderNav() {
  const items = [
    `<button class="nav-item" data-nav="home"><svg><use href="#i-house"/></svg><span class="lbl">Home</span></button>`,
    `<button class="nav-item nav-job" data-nav="job" data-job><svg><use href="#i-target"/></svg><span class="lbl">Get Hired: <b>$120k Track</b></span></button>`,
    `<button class="nav-item" data-nav="all" data-all><svg><use href="#i-bulb"/></svg><span class="lbl">All Questions (${TOTAL})</span></button>`,
    ...QUESTIONS.map((q) =>
      `<button class="nav-item" data-q="${q.n}"${q.brain ? ` style="--brain:${q.brain}"` : ''}>
        <svg><use href="#${q.icon}"/></svg><span class="n">${q.n}.</span><span class="lbl">${q.nav}</span>
        ${done.has(q.n) ? '<span class="done-mark">✓</span>' : ''}
      </button>`),
  ];
  $('#sideNav').innerHTML = items.join('');

  $('#tabs').innerHTML = QUESTIONS.slice(1).map((q, i) =>
    `<button class="tab" data-q="${q.n}"><span class="num ${NUM_COLORS[i + 1]}">${q.n}</span><span>${q.tab}</span></button>`
  ).join('') + `<button class="tab tab-next" data-nav="next" aria-label="Next question"><svg><use href="#i-chevron-r"/></svg></button>`;

  document.querySelectorAll('#tabs .tab[data-q]').forEach((el) => el.classList.toggle('active', view === 'question' && Number(el.dataset.q) === current));
  document.querySelectorAll('#sideNav .nav-item').forEach((el) => {
    const isActive = view === 'all' ? el.hasAttribute('data-all') : view === 'job' ? el.hasAttribute('data-job') : Number(el.dataset.q) === current;
    el.classList.toggle('active', isActive);
  });
}

// ---------- Render header + body for current question ----------
function render() {
  const q = QUESTIONS.find((x) => x.n === current);
  $('#qPill').textContent = `Question ${current} of ${TOTAL}`;
  $('#qTitle').textContent = q ? q.title : `Interview Question ${current}`;
  $('#qSub').textContent = q ? q.sub : 'A real senior AI engineering interview question.';
  $('#qBubble').innerHTML = (q && q.bubble) || DEFAULT_BUBBLE;
  $('#qNote').textContent = (q && q.note) || DEFAULT_NOTE;
  document.title = current === 1 ? 'Senior AI Engineer Masterclass' : `Q${current} · Senior AI Engineer Masterclass`;
  document.body.classList.toggle('in-job', view === 'job');
  $('#jobView').hidden = view !== 'job';
  if (view === 'job') {
    $('#qPill').textContent = 'Get Hired · $120k Track';
    $('#qTitle').textContent = 'Become a $120k AI Engineer';
    $('#qSub').textContent = 'Prove the skills employers pay for: pass the labs, ace strict mock interviews, and ship portfolio projects.';
    $('#qBubble').innerHTML = 'Let’s get you<br>hired!';
    $('#qNote').textContent = 'Hiring managers pay for proof: shipped projects, clear numbers and calm debugging.';
    document.title = 'Get Hired · Senior AI Engineer Masterclass';
    Object.values(VIEWS).forEach((id) => { $('#' + id).hidden = true; });
    $('#soonView').hidden = true;
    window.renderJob();
    updateProgress();
    renderNav();
    return;
  }

  const viewId = view === 'question' ? VIEWS[current] : null;
  Object.values(VIEWS).forEach((id) => { $('#' + id).hidden = id !== viewId; });
  const ready = Boolean(viewId);
  $('#soonView').hidden = ready;
  if (!ready) {
    $('#soonTitle').textContent = view === 'all' ? 'All 50 questions' : `Question ${current} is coming soon`;
    $('#soonText').textContent = view === 'all'
      ? 'The full question library is being drawn. Questions 1 (RAG System) and 2 (LLM System Design) are ready now.'
      : 'This question’s step-by-step breakdown is being drawn. Questions 1 and 2 are ready to study now.';
  }

  const isDone = done.has(current);
  $('#doneBtn').classList.toggle('is-done', isDone);
  $('#doneLabel').textContent = isDone ? 'Done!' : 'Mark as Done';

  updateProgress();
  renderNav();
}

function updateProgress() {
  const pct = Math.round((done.size / TOTAL) * 100);
  $('#progText').textContent = `${done.size} / ${TOTAL} (${pct}%)`;
  const fill = $('#progFill');
  fill.style.width = `${pct}%`;
  fill.classList.toggle('zero', done.size === 0);
}

function go(n) {
  current = Math.min(TOTAL, Math.max(1, n));
  view = 'question';
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

// ---------- Events ----------
document.addEventListener('click', (e) => {
  const navEl = e.target.closest('[data-nav]');
  const qEl = e.target.closest('[data-q]');
  const li = e.target.closest('.checks li');

  if (navEl) {
    e.preventDefault();
    const a = navEl.dataset.nav;
    if (a === 'home') go(1);
    else if (a === 'next') { if (current >= TOTAL) toast('That was the last question!'); else go(current + 1); }
    else if (a === 'prev') { if (current <= 1 && view === 'question') toast('You’re on the first question.'); else go(view === 'question' ? current - 1 : current); }
    else if (a === 'all') { view = 'all'; render(); }
    else if (a === 'job') { view = 'job'; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    return;
  }
  if (qEl) { go(Number(qEl.dataset.q)); return; }
  if (li) { li.classList.toggle('off'); return; }

  if (e.target.closest('#doneBtn')) {
    if (done.has(current)) { done.delete(current); toast(`Question ${current} marked as not done`); }
    else { done.add(current); toast(`Nice! Question ${current} done ✓`); }
    saveDone();
    render();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea') || document.querySelector('dialog[open]')) return;
  if (e.key === 'ArrowRight') go(current + 1);
  if (e.key === 'ArrowLeft') go(current - 1);
});

render();
