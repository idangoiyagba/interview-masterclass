# Senior AI Engineer Interview Masterclass

A hand-drawn, cartoon-style study site for senior AI/LLM engineering interviews.

- **50 questions** across 12 topics (RAG, LLM system design, agents, evals, MLOps, security, incidents, leadership, fundamentals and more), 8 steps each
- **400 interactive labs:** every card opens a simulated terminal (docker, psql/pgvector, redis-cli, curl, kubectl, python scripts) plus an interview check
- **All Questions** index grouped by topic, with lab progress per question
- **Get Hired: $120k Track:** readiness score, skills matrix, strict timed mock interviews, portfolio projects and a job-search playbook

Plain HTML/CSS/JS, no build step. Progress is saved in your browser.

Questions 1–2 are hand-built in `index.html`. Questions 3–50 are data in `qdata-*.js`, drawn by `qbuild.js` (block types are documented at the top of that file).

Run locally: `node serve.mjs` then open http://localhost:4321
