// Questions 21–30. Format documented in qbuild.js.
QD(21, {
  cat: 'LLM System Design', tab: 'Streaming<br>Chat', host: 'stream-lab',
  title: 'Design Real-Time Streaming Chat for an LLM App',
  sub: 'Stream tokens to 50,000 concurrent users on web and mobile, with reconnects, cancels and backpressure.',
  bubble: 'Tokens should<br>flow, not wait!', note: 'This tests SSE vs WebSockets, connection scaling, cancellation, backpressure and mobile networks.',
  cards: [
    ['Understand the problem like a business owner', [
      ['talk', 'Users stare at a spinner for 6 seconds before any text appears.', 'Can answers appear word by word like other AI apps?'],
      ['checks', 'Key questions to ask:', ['Concurrent users at peak?', 'Web, mobile or both?', 'Do users need to stop answers?', 'Proxies/CDNs in the path?'], 'yellow'],
    ], { w: ['Perceived latency matters'],
      a: ['Peak 50k concurrent streams', 'Web + iOS + Android, often on flaky mobile networks', 'Stop button must cancel generation (and billing)', 'Corporate proxies may buffer responses'],
      q: ['Which metric best captures how fast streaming feels?', ['Total response time', 'Time to first token', 'Model size', 'Tokens per answer'], 1, 'Users judge speed by when text starts appearing.'],
      t: [['python ux_stats.py', 'p50 time-to-first-token 5.8s (non-streaming) · abandon before answer 14%']] }],
    ['Choose SSE or WebSockets', [
      ['table', [['', 'SSE', 'WebSockets'], ['Direction', 'server → client', 'both ways'], ['Over HTTP', 'yes, simple', 'upgrade needed'], ['Reconnect', 'built in', 'manual'], ['Fits', 'LLM token streams', 'live collab, voice']]],
      ['checks', null, ['SSE for one-way token streams', 'Separate POST for cancel', 'WebSockets if truly bidirectional']],
    ], { w: ['Picking the simplest protocol'],
      a: ['LLM answers are one-way: SSE is simple and proxy-friendly', 'Cancel via a separate request with the stream ID', 'WebSockets when you need constant two-way traffic (voice, co-editing)', 'Disable proxy buffering for the stream route'],
      q: ['For streaming LLM tokens to a browser, the simplest good default is…', ['Polling every second', 'Server-Sent Events', 'Email', 'FTP'], 1, 'SSE is one-way, HTTP-native and easy to scale.'],
      t: [['curl -N localhost:8000/chat/stream -d \'{"q":"hi"}\'', `event: token
data: Hello
event: token
data: ! How can I help?
event: done
data: {"ttft_ms":290,"tokens":9}`]] }],
    ['Handle cancel, reconnect and backpressure', [
      ['steps', 'Rules:', ['Stop = cancel the upstream LLM call', 'Client disconnect = cancel too', 'Resume with last event ID', 'Bounded buffers per stream']],
      ['checks', null, ['Cancelled tokens aren’t billed', 'Slow clients don’t eat memory']],
    ], { w: ['Lifecycle management'],
      a: ['Propagate cancellation to the provider request to stop paying', 'Detect disconnects and abort generation', 'Store recent tokens briefly so reconnects can resume', 'Bounded queues; drop or close very slow consumers'],
      q: ['A user closes the tab mid-answer. What should the server do?', ['Keep generating', 'Detect disconnect and cancel the LLM call', 'Email the answer', 'Restart the server'], 1, 'Otherwise you pay for tokens nobody reads.'],
      t: [['python stream_test.py --cancel-at 40', 'tokens sent 40 · upstream cancelled ✓ · billed tokens 52 (vs 410 full)']] }],
    ['Deploy for many open connections', [
      ['flow', [['i-web', 'Clients'], ['i-cloud', 'LB (long timeouts)'], ['i-bolt', 'Async API pods'], ['i-llm', 'LLM']]],
      ['checks', null, ['Async server (no thread per stream)', 'LB idle timeout > longest answer', 'Scale on open streams']],
    ], { w: ['Connection-heavy scaling'],
      a: ['Async framework handles thousands of streams per pod', 'Load balancer idle timeout raised (e.g. 120s) + heartbeats', 'Autoscale on concurrent streams', 'Graceful shutdown drains streams before pods stop'],
      q: ['Streams cut off at exactly 60 seconds. Likely cause?', ['The model', 'A proxy or load balancer idle timeout', 'The user', 'DNS'], 1, 'Infrastructure timeouts often kill long streams.'],
      t: [['kubectl get hpa chat', 'TARGETS 3,850/5,000 streams per pod (avg) · REPLICAS 14']] }],
    ['Investigate “text arrives all at once”', [
      ['alert', 'Some corporate users see the whole answer appear at the end.'],
      ['steps', 'Debugging steps:', ['Reproduce behind a proxy', 'Check response headers', 'Look for gzip/buffering', 'Fix headers, add heartbeat']],
    ], { w: ['Proxy buffering issues'],
      a: ['A proxy was buffering the response', 'Fix: Cache-Control: no-cache, X-Accel-Buffering: no', 'Disable compression on the stream route', 'Send periodic comment heartbeats'],
      q: ['Streaming works locally but arrives in one chunk for some users. Suspect?', ['Model speed', 'Proxy or compression buffering the response', 'Font loading', 'Database'], 1, 'Intermediaries buffer unless told not to.'],
      t: [['curl -sI localhost:8000/chat/stream', 'Content-Type: text/event-stream\nCache-Control: no-cache\nX-Accel-Buffering: no ✓']] }],
    ['Think about cost, security and reliability', [
      ['pillars', [['i-money', 'Cost', ['Cancel = stop billing', 'Max tokens per answer', 'Idle stream cleanup']],
        ['i-shield', 'Security', ['Auth on stream start', 'Per-user stream limits', 'Moderate as you stream']],
        ['i-gear', 'Reliability', ['Heartbeats', 'Resume tokens', 'Graceful drain']]]],
    ], { w: ['Streaming-specific safety'],
      a: ['Limit concurrent streams per user', 'Run output moderation on chunks; stop stream if it fails', 'Max output tokens per request', 'Heartbeats keep connections healthy'],
      q: ['How do you moderate output that’s still streaming?', ['Only after it finishes', 'Check chunks as they’re generated and stop the stream if a check fails', 'You can’t', 'Delay all output 1 minute'], 1, 'Incremental checks keep streaming fast and safe.'],
      t: [['python limits.py --user u_9', 'concurrent streams 2/3 · max_output_tokens 1,024']] }],
    ['Communicate and lead', [
      ['people', 'Streaming cut time-to-first-text from 5.8s to 0.3s. Abandonment dropped from 14% to 4%.'],
      ['checks', null, ['Lead with user-perceived speed', 'Explain infra changes', 'Share cost savings from cancel']],
    ], { w: ['UX-focused reporting'],
      a: ['TTFT is the headline metric', 'Abandonment before first token as product metric', 'Cancel saves ~8% of output tokens', 'Infra changes listed for ops'],
      q: ['Best headline metric after adding streaming?', ['CPU usage', 'Time to first token and abandonment rate', 'Pod count', 'Lines of code'], 1, 'They reflect user experience directly.'],
      t: [['python report.py --streaming', 'ttft p50 0.29s · abandon 4.1% · cancelled tokens saved 8.3%']] }],
    ['Drive continuous improvement', [
      ['tiles', [['0.29s', 'TTFT p50'], ['4%', 'abandon'], ['50k', 'concurrent'], ['8%', 'tokens saved']]],
      ['checks', null, ['Track TTFT by region', 'Synthetic stream checks', 'Mobile reconnect tests']],
    ], { w: ['Ongoing streaming quality'],
      a: ['Monitor TTFT per region and model', 'Synthetic streams from multiple networks', 'Test reconnect on mobile network switches', 'Alert on spikes in early disconnects'],
      q: ['What should a synthetic streaming check measure?', ['Only HTTP 200', 'TTFT, token cadence and completion', 'CPU', 'Disk'], 1, 'Streaming can be “up” but broken.'],
      t: [['python synthetic.py --stream', 'regions 4 · ttft p95 0.61s · completed 100% ✓']] }],
  ],
});

QD(22, {
  cat: 'Data & Pipelines', tab: 'Batch<br>Inference', host: 'batch-lab',
  title: 'Run LLM Batch Inference Over 10 Million Documents',
  sub: 'Classify and summarize 10M documents in a week, on budget, with retries and no duplicated work.',
  bubble: 'Big jobs need<br>good plumbing!', note: 'This tests throughput math, batch APIs, rate limits, idempotency, checkpointing and cost.',
  cards: [
    ['Understand the problem like a business owner', [
      ['talk', 'We need summaries and tags for our whole 10M-document archive.', 'Can it be done in a week, and what will it cost?'],
      ['checks', 'Key questions to ask:', ['Deadline?', 'Tokens per document?', 'Quality bar?', 'Budget?'], 'yellow'],
    ], { w: ['Throughput and cost math up front'],
      a: ['10M docs × ~1,500 tokens in + 150 out', 'Deadline 7 days → ~17 docs/second sustained', 'Quality bar: 95% tag accuracy on a sample', 'Budget decides model and API choice'],
      q: ['10M docs in 7 days needs roughly how many docs per second?', ['1.7', '17', '170', '1,700'], 1, '10,000,000 / (7 × 86,400) ≈ 16.5 per second.'],
      t: [['python plan.py --docs 10000000 --days 7 --in 1500 --out 150', `required rate    16.5 docs/s
tokens in        15.0B
tokens out       1.5B
→ check provider TPM limits and batch API pricing`]] }],
    ['Design the pipeline', [
      ['flow', [['i-db', 'Source'], ['i-gear', 'Chunk into jobs'], ['i-cloud', 'Queue'], ['i-robot', 'Workers'], ['i-db', 'Results']]],
      ['checks', null, ['Jobs of ~1,000 docs', 'Workers pull, process, ack', 'Results written idempotently']],
    ], { w: ['Queue-based fan-out'],
      a: ['Split into batches tracked in a jobs table', 'Workers pull from a queue and respect rate limits', 'Upsert results by document ID', 'Failed items go to a retry/dead-letter queue'],
      q: ['Why write results with upserts keyed by document ID?', ['Faster disks', 'Retries won’t create duplicates', 'Smaller files', 'Required by SQL'], 1, 'Idempotent writes make retries safe.'],
      t: [['psql -c "SELECT status, count(*) FROM jobs GROUP BY 1;"', ` status  | count
---------+------
 done    | 6,412
 running |    40
 queued  | 3,531
 failed  |    17`]] }],
    ['Use batch APIs and rate limits wisely', [
      ['code', `provider batch API: ~50% cheaper, results within 24h
online API: fast, rate-limited (TPM/RPM)
plan: 90% via batch API, 10% online for retries/urgent`],
      ['checks', null, ['Batch API for non-urgent work', 'Token-aware rate limiting', 'Backoff on 429s']],
    ], { w: ['Cost-efficient APIs'],
      a: ['Batch endpoints are typically much cheaper and don’t hit online limits', 'Submit files of requests; poll for completion', 'Use online API only for urgent retries', 'Respect tokens-per-minute with a token bucket'],
      q: ['Work doesn’t need answers for 24 hours. Best API?', ['Real-time API at max speed', 'The provider’s batch API at lower cost', 'Manual copy-paste', 'A browser extension'], 1, 'Batch APIs trade latency for price.'],
      t: [['python batch_submit.py --file part_0042.jsonl', 'submitted 50,000 requests · batch_id b_91f · status validating']] }],
    ['Deploy with checkpoints', [
      ['steps', 'Resilience:', ['Track each batch’s status', 'Resume from last completed batch', 'Retry failures with backoff', 'Dead-letter after 3 tries']],
      ['tiles', [['18/s', 'throughput'], ['0.2%', 'failed'], ['5.8d', 'ETA'], ['0', 'duplicates']]],
    ], { w: ['Restartability'],
      a: ['Jobs table is the source of truth', 'Crashes resume without redoing done work', 'Dead-letter queue reviewed by a human', 'Progress dashboard with ETA'],
      q: ['Workers crash at 60% done. Ideal restart?', ['Start from zero', 'Resume only unfinished jobs using the jobs table', 'Guess where it stopped', 'Give up'], 1, 'Checkpoints save time and money.'],
      t: [['python progress.py', 'done 6,412,000 / 10,000,000 (64.1%) · rate 18.2/s · ETA 2d 06h']] }],
    ['Investigate a throughput collapse', [
      ['alert', 'Throughput dropped from 18/s to 2/s overnight.'],
      ['steps', 'Debugging steps:', ['Check 429/error rates', 'Check token usage per request', 'Check worker health', 'Fix and rebalance']],
    ], { w: ['Rate-limit diagnosis'],
      a: ['429s jumped: a batch of huge documents hit TPM limits', 'Workers retried immediately (no backoff) and made it worse', 'Fix: truncate/chunk long docs, exponential backoff with jitter', 'Throughput back to 17/s'],
      q: ['Workers get 429s and retry instantly. Effect?', ['Faster finish', 'A retry storm that keeps you rate-limited', 'Nothing', 'Lower cost'], 1, 'Backoff with jitter is essential.'],
      t: [['python errors.py --last 1h', '429 rate 61% · avg tokens/request 14,200 (normal 1,600) · retries without delay ✗']] }],
    ['Think about cost, security and reliability', [
      ['pillars', [['i-money', 'Cost', ['Batch API pricing', 'Truncate to needed text', 'Small model + sample QA']],
        ['i-shield', 'Security', ['Data stays in region', 'Encrypted buckets', 'Least-privilege workers']],
        ['i-gear', 'Reliability', ['Idempotent writes', 'Backoff + jitter', 'Dead-letter queue']]]],
    ], { w: ['Cost per document'],
      a: ['Only send the parts of documents you need', 'Small model for tagging; spot-check with a strong model', 'Workers have read on source, write on results only', 'Track cost per 1,000 docs'],
      q: ['Cheapest big lever for a 10M-document job?', ['More workers', 'Send fewer tokens (truncate/extract relevant parts) and use batch pricing', 'Faster disks', 'Bigger model'], 1, 'Tokens drive cost.'],
      t: [['python cost.py --model small --batch', 'tokens 9.2B (after trimming) · est $2,300 · vs $9,800 online large']] }],
    ['Communicate and lead', [
      ['people', 'The archive will be done in about 6 days for roughly $2,300, with a 95% accuracy check on a sample before we publish tags.'],
      ['checks', null, ['Share ETA and cost', 'Daily progress updates', 'Quality sample before release']],
    ], { w: ['Project-style reporting'],
      a: ['Up-front estimate with assumptions', 'Daily dashboard with ETA', 'Quality gate on a random sample', 'Clear plan for failures'],
      q: ['Before publishing 10M generated tags, you should…', ['Ship immediately', 'Check accuracy on a random sample against human labels', 'Ask the model', 'Count them'], 1, 'Sampling catches systematic errors.'],
      t: [['python qa_sample.py --n 500', 'tag accuracy 95.8% ✓ · summary faithfulness 0.96 ✓']] }],
    ['Drive continuous improvement', [
      ['tiles', [['95.8%', 'tag accuracy'], ['$0.23', 'per 1k docs'], ['6d', 'runtime'], ['17', 'dead-letters']]],
      ['checks', null, ['Incremental runs for new docs', 'Reprocess only changed docs', 'Reusable pipeline template']],
    ], { w: ['From one-off to platform'],
      a: ['New documents processed daily via the same pipeline', 'Hash content to skip unchanged docs', 'Template reused by other teams', 'Version prompts so reprocessing is traceable'],
      q: ['A prompt improves. Reprocess everything?', ['Always', 'Only if evals show meaningful gain worth the cost; track prompt version per result', 'Never', 'Randomly'], 1, 'Reprocessing must be justified by value.'],
      t: [['python delta.py --since yesterday', 'new docs 12,410 · changed 1,022 · unchanged skipped 9.98M']] }],
  ],
});

QD(23, {
  cat: 'RAG & Retrieval', tab: 'Embedding<br>Migration', host: 'embed-lab',
  title: 'Choose and Migrate Embedding Models Safely',
  sub: 'A better embedding model is out. Prove it helps, then switch 20M vectors without downtime.',
  bubble: 'Measure, then<br>migrate!', note: 'This tests embedding evaluation, dimensions, dual indexing, cutover and rollback.',
  cards: [
    ['Understand the problem like a business owner', [
      ['talk', 'A vendor says their new embedding model is 15% better.', 'Should we switch, and what would it take?'],
      ['checks', 'Key questions to ask:', ['Better on OUR queries?', 'Cost to re-embed?', 'Storage change (dims)?', 'Downtime allowed?'], 'yellow'],
    ], { w: ['Skepticism of benchmark claims'],
      a: ['Public benchmarks may not match your domain', 'Re-embedding 20M chunks has a real cost', 'Dims 768 → 3,072 quadruples storage', 'Zero downtime required'],
      q: ['A model tops a public leaderboard. Enough to switch?', ['Yes', 'No — evaluate on your own queries and documents', 'Only if it’s cheap', 'Only if bigger'], 1, 'Domain fit matters more than leaderboards.'],
      t: [['python size.py --vectors 20000000 --dims 768,3072', '768 dims ≈ 61 GB · 3072 dims ≈ 246 GB (float32)']] }],
    ['Evaluate candidates on your data', [
      ['table', [['Model', 'Recall@10', 'Cost', 'Dims'], ['current', '0.81', '$', '768'], ['candidate A', '0.87', '$$', '3072'], ['candidate B', '0.86', '$', '1024']]],
      ['checks', null, ['Labeled query → relevant chunk pairs', 'Recall@k and MRR', 'Latency and storage']],
    ], { w: ['Retrieval evaluation'],
      a: ['Build 1,000 labeled query → relevant chunk pairs', 'Measure recall@10 and MRR for each model', 'Candidate B: nearly as good, a third of the storage', 'Check multilingual queries if needed'],
      q: ['Candidate A recall 0.87 (3,072 dims), B 0.86 (1,024 dims). Likely pick?', ['A, always highest', 'B: near-equal quality at much lower storage and cost', 'Neither', 'The current model'], 1, 'Weigh small quality gains against big cost.'],
      t: [['python eval_embed.py --models current,A,B', 'current r@10 0.81 · A 0.87 · B 0.86 · mrr A 0.71 B 0.70']] }],
    ['Plan the migration', [
      ['flow', [['i-db', 'Old index'], ['i-gear', 'Backfill new'], ['i-db', 'New index'], ['i-search', 'Shadow compare'], ['i-bolt', 'Cutover']]],
      ['checks', null, ['Dual-write new docs', 'Backfill in background', 'Never mix models in one index']],
    ], { w: ['Zero-downtime migration pattern'],
      a: ['New docs embedded with both models (dual-write)', 'Backfill old docs into a new index', 'Shadow traffic: compare results offline', 'Switch reads via alias; keep old index for rollback'],
      q: ['Why build a separate new index instead of updating vectors in place?', ['It’s faster', 'Mixed models in one index break similarity; separate index allows clean cutover and rollback', 'Required by law', 'Cheaper always'], 1, 'Vectors from different models aren’t comparable.'],
      t: [['python backfill.py --status', 'embedded 14.2M / 20M · rate 2,100/s · ETA 46m · dual-write ✓']] }],
    ['Cut over and roll back safely', [
      ['steps', 'Cutover:', ['Shadow test for 3 days', 'Switch 10% of reads', 'Check quality metrics', 'Move to 100%, keep old index 2 weeks']],
      ['code', 'POST /_aliases {"actions":[{"add":{"index":"docs_v2","alias":"docs"}}]}'],
    ], { w: ['Gradual cutover'],
      a: ['Alias swap makes cutover instant', 'Gradual traffic split with metrics', 'Old index kept for quick rollback', 'Delete old only after metrics hold'],
      q: ['After cutover, when can you delete the old index?', ['Immediately', 'After metrics stay healthy for an agreed period', 'Never', 'Before cutover'], 1, 'Keep a rollback path until you’re sure.'],
      t: [['python split.py --new 10', 'reads → docs_v2 10% · thumbs-down v2 5.4% vs v1 5.9%']] }],
    ['Investigate worse results after switch', [
      ['alert', 'Short keyword queries got worse after migration.'],
      ['steps', 'Debugging steps:', ['Slice metrics by query type', 'Check query embedding uses new model', 'Check instruction prefixes', 'Fix and re-test']],
    ], { w: ['Embedding-specific gotchas'],
      a: ['Queries were still embedded with the OLD model in one service', 'Also: new model expects a “query:” prefix', 'Fix both; recall back to 0.86', 'Add a test that query and doc models match'],
      q: ['Results got worse after migration. A common bug?', ['Too many GPUs', 'Queries embedded with a different model (or missing prefixes) than documents', 'Fonts', 'Too much RAM'], 1, 'Query and document embeddings must match.'],
      t: [['python check_models.py', 'doc model B · query model current ✗ (service: search-api v1.8)']] }],
    ['Think about cost, security and reliability', [
      ['pillars', [['i-money', 'Cost', ['Re-embed cost', 'Storage per dim', 'Matryoshka truncation']],
        ['i-shield', 'Security', ['Vendor data terms', 'Self-host option', 'Same ACL metadata']],
        ['i-gear', 'Reliability', ['Rollback index', 'Version stamp on vectors', 'Backfill throttling']]]],
    ], { w: ['Total migration cost'],
      a: ['Cost = re-embedding + extra storage + engineering time', 'Some models allow shorter vectors with little loss', 'Stamp every vector with model version', 'Throttle backfill so production search stays fast'],
      q: ['Why stamp each vector with the model version?', ['For fun', 'To detect and prevent mixing models and to support migrations', 'It’s required', 'To save space'], 1, 'Versions make mixed indexes detectable.'],
      t: [['python cost.py --reembed 20000000 --tokens 300', 'tokens 6B · est $120 embed + 2× storage during migration']] }],
    ['Communicate and lead', [
      ['people', 'Model B lifts recall from 0.81 to 0.86 on our own queries for about $120, with a one-click rollback.'],
      ['checks', null, ['Report gains on your data', 'Show migration plan and rollback', 'Timeline and risks']],
    ], { w: ['Data-backed proposals'],
      a: ['Gains measured on internal eval, not vendor claims', 'Cost and storage impact', 'Rollback plan', 'Downstream effects (cache invalidation)'],
      q: ['What should the migration proposal lead with?', ['Vendor marketing', 'Measured gain on our queries and the cost/risk plan', 'Model architecture', 'Its name'], 1, 'Decisions need your own evidence.'],
      t: [['cat migration_plan.md', 'gain r@10 +0.05 · cost ~$120 · duration 2 days · rollback alias swap']] }],
    ['Drive continuous improvement', [
      ['tiles', [['0.86', 'recall@10'], ['1,024', 'dims'], ['$120', 'migration'], ['0', 'downtime']]],
      ['checks', null, ['Keep the retrieval eval set fresh', 'Re-evaluate new models twice a year', 'Make migration a runbook']],
    ], { w: ['Repeatable process'],
      a: ['Retrieval eval set grows from real queries', 'Semi-annual model review', 'Migration runbook with scripts', 'Track recall over time'],
      q: ['How often should you re-check embedding model options?', ['Never', 'Periodically (e.g. twice a year) using your eval set', 'Daily', 'Only when broken'], 1, 'The field moves fast; check on a schedule.'],
      t: [['python eval_embed.py --scheduled', 'next review 2027-04 · eval set 1,240 pairs']] }],
  ],
});

QD(24, {
  cat: 'RAG & Retrieval', tab: 'Retrieval<br>Quality', host: 'rerank-lab',
  title: 'Improve Retrieval Quality With Hybrid Search and Reranking',
  sub: 'Your RAG answers are wrong because the right chunk isn’t retrieved. Measure and fix retrieval.',
  bubble: 'Bad retrieval,<br>bad answers!', note: 'This tests retrieval metrics, chunking, hybrid search, rerankers, query rewriting and cost.',
  cards: [
    ['Understand the problem like a business owner', [
      ['talk', 'Our assistant gives wrong answers even though the info is in our docs.', 'Is it the model or the search?'],
      ['checks', 'Key questions to ask:', ['Is the right chunk retrieved?', 'Where does it rank?', 'Which query types fail?', 'Latency budget for retrieval?'], 'yellow'],
    ], { w: ['Isolate retrieval failures'],
      a: ['Label 300 questions with the chunk that answers them', 'Measure: is it in top 5? top 20?', '60% of wrong answers had the right chunk missing from top 5', 'Retrieval budget: 200ms'],
      q: ['How do you know if retrieval or generation is the problem?', ['Ask the model', 'Check whether the answering chunk was in the retrieved context', 'Read logs randomly', 'Change prompts'], 1, 'Labeled relevant chunks separate the two.'],
      t: [['python diagnose.py --set qa_300', 'answer chunk in top5 64% · in top20 89% · not found 11%']] }],
    ['Fix chunking first', [
      ['table', [['Chunking', 'Recall@5'], ['500 chars fixed', '0.58'], ['heading-aware 600 tok', '0.66'], ['+ title/section prefix', '0.71']]],
      ['checks', null, ['Split on structure', 'Add document title to chunks', 'Keep tables intact']],
    ], { w: ['Chunking impact'],
      a: ['Structure-aware splits keep ideas together', 'Prefix chunks with document and section titles', 'Don’t split tables mid-row', 'Measure each change on the eval set'],
      q: ['Cheap improvement that often helps retrieval?', ['Bigger LLM', 'Prefix each chunk with its document title and section heading', 'Remove metadata', 'Smaller chunks of 20 tokens'], 1, 'Context in chunks helps both vector and keyword search.'],
      t: [['python chunk_eval.py --strategies fixed,heading,heading+prefix', 'r@5 0.58 · 0.66 · 0.71']] }],
    ['Add hybrid search and a reranker', [
      ['flow', [['i-search', 'Query'], ['i-doc', 'BM25 top 50'], ['i-brain', 'Vector top 50'], ['i-gear', 'Fuse'], ['i-bars', 'Rerank → top 5']]],
      ['checks', null, ['Recall stage: cast a wide net', 'Precision stage: cross-encoder', 'Keep latency in budget']],
    ], { w: ['Two-stage retrieval'],
      a: ['Stage 1: hybrid retrieval of ~50–100 candidates for recall', 'Stage 2: cross-encoder reranker picks the best 5', 'Recall@5: 0.71 → 0.84', 'Reranker adds ~80ms on GPU'],
      q: ['Why use a cross-encoder reranker after vector search?', ['It’s cheaper than vector search', 'It scores query and chunk together, giving more accurate ordering of a small candidate set', 'It replaces the database', 'It writes answers'], 1, 'Cross-encoders are accurate but too slow for the full corpus.'],
      t: [['python rerank_eval.py', 'hybrid r@5 0.76 → +rerank 0.84 · added p95 82ms']] }],
    ['Rewrite and route queries', [
      ['prompt', 'Query rewrite', 'User: “and for contractors?” → Rewritten: “parental leave policy for contractors”'],
      ['checks', null, ['Resolve follow-up questions with chat history', 'Expand acronyms', 'Route by metadata (country, product)']],
    ], { w: ['Query understanding'],
      a: ['Rewrite follow-ups into standalone questions', 'Expand internal acronyms from a glossary', 'Extract filters (country, product) for metadata filtering', 'Multi-query for broad questions, then fuse'],
      q: ['A user asks “what about Germany?” after a question on leave. Best retrieval query?', ['“what about Germany?”', 'A rewritten standalone query: “parental leave policy Germany”', 'Just “Germany”', 'No retrieval'], 1, 'Follow-ups need context to retrieve well.'],
      t: [['python rewrite.py --history h_12 "what about Germany?"', '→ "parental leave policy for employees in Germany" · filter country=DE']] }],
    ['Investigate a retrieval regression', [
      ['alert', 'Recall@5 fell from 0.84 to 0.70 after a docs sync.'],
      ['steps', 'Debugging steps:', ['Diff index stats before/after', 'Check chunk counts per source', 'Re-run eval by source', 'Fix sync and add checks']],
    ], { w: ['Index health checks'],
      a: ['Confluence sync created duplicate chunks for 3k pages', 'Duplicates crowded out other results', 'Dedupe by content hash; add sync validation', 'Recall back to 0.84'],
      q: ['Recall dropped after a sync and top results look repeated. Likely cause?', ['Model change', 'Duplicate chunks flooding the index', 'Latency', 'GPU'], 1, 'Duplicates crowd out diverse relevant chunks.'],
      t: [['python index_stats.py --diff yesterday', 'chunks +38% (confluence) · duplicate hash rate 27% ✗']] }],
    ['Think about cost, security and reliability', [
      ['pillars', [['i-money', 'Cost', ['Rerank only top 50', 'Cache rewrites', 'CPU reranker if fast enough']],
        ['i-shield', 'Security', ['ACL filter before rerank', 'No cross-tenant candidates']],
        ['i-gear', 'Reliability', ['Reranker timeout → hybrid order', 'Eval in CI', 'Index validation']]]],
    ], { w: ['Retrieval reliability'],
      a: ['Permission filters applied before candidates leave the store', 'If reranker times out, use fused order', 'Retrieval eval runs on every pipeline change', 'Track candidate count and empty results'],
      q: ['Where must permission filtering happen in a reranking pipeline?', ['After the LLM answers', 'Before candidates are reranked or sent anywhere', 'Only in the UI', 'Nowhere'], 1, 'Unauthorized chunks must never enter the pipeline.'],
      t: [['python fallback_test.py --reranker-timeout', 'reranker 40ms timeout → served fused order ✓ r@5 0.76']] }],
    ['Communicate and lead', [
      ['people', 'Better retrieval fixed most wrong answers. Recall went from 0.58 to 0.84 and answer accuracy rose 14 points.'],
      ['checks', null, ['Show each change’s impact', 'Explain latency added', 'Prioritize next steps by gain']],
    ], { w: ['Showing step-by-step gains'],
      a: ['Waterfall chart: chunking +0.13, hybrid +0.05, rerank +0.08', 'Answer accuracy +14 points', 'Latency +82ms within budget', 'Next: query rewriting for follow-ups'],
      q: ['Best way to justify retrieval work to product?', ['Technical jargon', 'Link retrieval gains to answer accuracy and user outcomes', 'Lines of code', 'Model names'], 1, 'Connect technical metrics to user impact.'],
      t: [['python waterfall.py', 'baseline 0.58 → chunking 0.71 → hybrid 0.76 → rerank 0.84']] }],
    ['Drive continuous improvement', [
      ['tiles', [['0.84', 'recall@5'], ['+14', 'accuracy pts'], ['82ms', 'rerank'], ['300', 'labeled qs']]],
      ['checks', null, ['Mine failed queries', 'Grow labeled set', 'Try fine-tuned reranker on your data']],
    ], { w: ['Retrieval flywheel'],
      a: ['Thumbs-down traces reveal missing chunks', 'Label new failures monthly', 'With enough labels, fine-tune the reranker on your domain', 'Track recall by source and topic'],
      q: ['When does fine-tuning a reranker make sense?', ['Day one', 'Once you have enough labeled query-chunk pairs from your domain and evals show a gap', 'Never', 'When latency is high'], 1, 'Domain labels unlock reranker tuning.'],
      t: [['python labels.py --count', 'labeled pairs 3,940 · enough to try reranker fine-tune ✓']] }],
  ],
});

QD(25, {
  cat: 'RAG & Retrieval', tab: 'GraphRAG', host: 'graph-lab',
  title: 'Combine a Knowledge Graph With an LLM (GraphRAG)',
  sub: 'Questions like “Which suppliers of our top products had incidents last year?” need connected facts, not just similar text.',
  bubble: 'Connect the<br>dots!', note: 'This tests when graphs beat vector search, entity extraction, graph queries and hybrid retrieval.',
  cards: [
    ['Understand the problem like a business owner', [
      ['talk', 'Our RAG bot fails on questions that connect several facts.', 'Would a knowledge graph help, or is that overkill?'],
      ['checks', 'Key questions to ask:', ['Which questions fail today?', 'Is there structured data already?', 'How often do relations change?', 'Who maintains the graph?'], 'yellow'],
    ], { w: ['Justify a graph by question types'],
      a: ['Failing: multi-hop questions (supplier → product → incident)', 'Much of the data already exists in ERP tables', 'Relations change daily', 'Ownership: data platform team'],
      q: ['When does a knowledge graph clearly help RAG?', ['Simple FAQ lookups', 'Multi-hop questions connecting entities across documents', 'Single-document summaries', 'Spell checking'], 1, 'Graphs shine at relationships and multi-hop reasoning.'],
      t: [['python failing_q.py --type', 'multi-hop 41% of failures · aggregation 23% · simple lookup 9%']] }],
    ['Design the graph', [
      ['flow', [['i-doc', 'Docs + DB'], ['i-llm', 'Extract entities'], ['i-gear', 'Resolve duplicates'], ['i-db', 'Graph DB'], ['i-search', 'Query']]],
      ['code', '(:Supplier)-[:SUPPLIES]->(:Product)-[:HAD]->(:Incident {year:2025})'],
    ], { w: ['Schema and entity resolution'],
      a: ['Small schema: Supplier, Product, Incident, Customer', 'Import structured data directly; LLM-extract only from text', 'Entity resolution merges “Acme Inc” and “ACME”', 'Each edge stores its source document'],
      q: ['Structured supplier data exists in the ERP. How to load it?', ['Have an LLM read it', 'Import it directly; use LLM extraction only for unstructured text', 'Ignore it', 'Retype it'], 1, 'Don’t use LLMs for data you already have structured.'],
      t: [['python ingest_graph.py', 'nodes 82,114 · edges 391,220 · merged duplicates 4,180 · from text 18%']] }],
    ['Answer with graph + text', [
      ['steps', 'Flow:', ['LLM turns question into a graph query', 'Validate and run read-only', 'Fetch supporting text chunks', 'Answer with both, citing sources']],
      ['code', `MATCH (s:Supplier)-[:SUPPLIES]->(p:Product)-[:HAD]->(i:Incident)
WHERE p.rank <= 10 AND i.year = 2025
RETURN s.name, count(i)`],
    ], { w: ['Text-to-graph-query safely'],
      a: ['Few-shot examples of Cypher for your schema', 'Validate: read-only, schema-valid, limits', 'Combine graph results with retrieved document text', 'Fallback to vector RAG if graph query fails'],
      q: ['Generated graph queries should be…', ['Run with admin rights', 'Validated, read-only and limited before running', 'Ignored', 'Run twice'], 1, 'Same safety rules as text-to-SQL.'],
      t: [['python graph_ask.py "suppliers of top 10 products with 2025 incidents"', 'Acme Parts 3 · Nordic Steel 2 · BluePack 1  (sources: incident reports #41, #77, #102)']] }],
    ['Deploy and keep it fresh', [
      ['flow', [['i-db', 'ERP changes'], ['i-gear', 'CDC'], ['i-db', 'Graph'], ['i-doc', 'New docs'], ['i-llm', 'Extract']]],
      ['checks', null, ['Stream structured updates', 'Extract from new docs nightly', 'Track edge freshness']],
    ], { w: ['Keeping graph and sources in sync'],
      a: ['CDC for structured updates', 'Nightly extraction for new documents', 'Edges carry “as of” dates', 'Delete edges when sources are deleted'],
      q: ['A source document is deleted. What about edges extracted from it?', ['Keep them', 'Remove or re-verify them, since each edge tracks its source', 'Duplicate them', 'Nothing'], 1, 'Provenance enables correct deletion.'],
      t: [['python freshness.py', 'edges older than 30d without source refresh: 2.1%']] }],
    ['Investigate wrong multi-hop answers', [
      ['alert', 'Graph answer listed a supplier we stopped using in 2023.'],
      ['steps', 'Debugging steps:', ['Inspect the path returned', 'Check edge dates/status', 'Fix query to filter active edges', 'Add eval case']],
    ], { w: ['Temporal correctness'],
      a: ['SUPPLIES edge had no end date', 'Model of time was missing from the schema', 'Add valid_from/valid_to on edges; filter active', 'Add time-based eval questions'],
      q: ['Graph returned outdated relationships. Fix?', ['Bigger model', 'Model time on edges (valid_from/valid_to) and filter in queries', 'Delete the graph', 'Cache more'], 1, 'Relationships change over time.'],
      t: [['python path.py --explain q_88', 'Nordic Steel -[SUPPLIES since 2019, until: null ✗]-> Pump X (contract ended 2023)']] }],
    ['Think about cost, security and reliability', [
      ['pillars', [['i-money', 'Cost', ['Extract once, reuse', 'Only extract from text', 'Small model for extraction']],
        ['i-shield', 'Security', ['Graph-level access rules', 'Sensitive edges hidden', 'Audit queries']],
        ['i-gear', 'Reliability', ['Query timeouts', 'Fallback to vector RAG', 'Extraction evals']]]],
    ], { w: ['Graph governance'],
      a: ['Extraction cost is one-off per document', 'Access control on node/edge types', 'Timeouts on expensive traversals', 'Measure extraction precision/recall'],
      q: ['Why limit traversal depth and time?', ['Style', 'Unbounded graph traversals can be extremely slow and costly', 'They’re illegal', 'For colors'], 1, 'Deep traversals explode in cost.'],
      t: [['python extract_eval.py --n 200', 'entity precision 0.93 · recall 0.88 · relation precision 0.86']] }],
    ['Communicate and lead', [
      ['people', 'The graph handles connected questions our search couldn’t. Simple questions still use regular RAG, which is cheaper and faster.'],
      ['checks', null, ['Use the graph only where needed', 'Show the before/after on multi-hop', 'Name the data owner']],
    ], { w: ['Avoiding over-engineering'],
      a: ['Router sends multi-hop questions to graph path', 'Before/after: multi-hop accuracy 38% → 81%', 'Data platform team owns schema', 'Clear cost of upkeep'],
      q: ['Should every question go through the graph?', ['Yes', 'No — route only questions that need relationships; use simpler RAG for the rest', 'Never', 'Random'], 1, 'Use the expensive path only where it helps.'],
      t: [['python router_stats.py', 'graph path 14% of questions · multi-hop accuracy 81%']] }],
    ['Drive continuous improvement', [
      ['tiles', [['81%', 'multi-hop acc'], ['0.93', 'entity precision'], ['14%', 'routed to graph'], ['2.1%', 'stale edges']]],
      ['checks', null, ['Grow schema carefully', 'Eval on multi-hop set', 'Review entity merges']],
    ], { w: ['Schema evolution'],
      a: ['Add entity types only when questions need them', 'Multi-hop eval set grows from failures', 'Review risky entity merges', 'Monitor extraction quality'],
      q: ['When should you add a new entity type to the schema?', ['Whenever someone suggests it', 'When real questions need it and you can populate it reliably', 'Never', 'Weekly'], 1, 'Schema growth should follow needs.'],
      t: [['python schema_requests.py', 'requested: Contract (17 failing questions) → planned']] }],
  ],
});

QD(26, {
  cat: 'Agents', tab: 'Voice<br>Agent', host: 'voice-lab',
  title: 'Design a Voice AI Agent for Phone Support',
  sub: 'Callers talk to an AI agent that books appointments. It must respond in under a second and handle interruptions.',
  bubble: 'Every 100ms<br>counts!', note: 'This tests STT/LLM/TTS pipelines, latency budgets, turn-taking, telephony and fallbacks.',
  cards: [
    ['Understand the problem like a business owner', [
      ['talk', 'Our call center misses 30% of calls at peak.', 'Can an AI agent answer and book appointments naturally?'],
      ['checks', 'Key questions to ask:', ['Top call reasons?', 'Languages/accents?', 'When to transfer to a human?', 'Recording consent rules?'], 'yellow'],
    ], { w: ['Scope by call reasons'],
      a: ['Top reasons: booking (45%), rescheduling (20%), hours (10%)', 'English + Spanish', 'Transfer on request, anger, or complex medical questions', 'Announce recording and AI at call start'],
      q: ['What should a voice agent say at the start of the call?', ['Nothing special', 'That it’s an AI assistant and how recording/consent works', 'A joke', 'The menu of all services'], 1, 'Transparency and consent rules apply.'],
      t: [['python call_reasons.py --last 30d', 'booking 45% · reschedule 20% · hours 10% · billing 12% · other 13%']] }],
    ['Design the voice pipeline', [
      ['flow', [['i-chat', 'Caller audio'], ['i-doc', 'Streaming STT'], ['i-llm', 'LLM'], ['i-bolt', 'Streaming TTS'], ['i-chat', 'Audio out']]],
      ['checks', null, ['Stream every stage', 'Voice activity detection', 'Barge-in support']],
    ], { w: ['Streaming pipeline design'],
      a: ['Streaming speech-to-text gives partial transcripts', 'LLM starts on end-of-turn detection', 'TTS starts speaking the first sentence immediately', 'Barge-in: stop TTS when the caller speaks'],
      q: ['Why stream TTS from the first sentence?', ['Cheaper voices', 'The caller hears a response sooner instead of waiting for the full answer', 'Better grammar', 'Required by phones'], 1, 'Streaming each stage cuts perceived latency.'],
      t: [['python voice_trace.py --call c_31', 'stt final 180ms · llm first token 320ms · tts first audio 140ms · total 640ms ✓']] }],
    ['Budget the latency', [
      ['tiles', [['~200ms', 'end-of-turn'], ['~300ms', 'LLM first token'], ['~150ms', 'TTS first audio'], ['<800ms', 'target']]],
      ['checks', null, ['Small fast model for turns', 'Co-locate services', 'Prefetch likely data']],
    ], { w: ['Voice latency budget'],
      a: ['Target under ~800ms from caller stop to agent speech', 'Fast model for dialogue; tools for data', 'Run STT/LLM/TTS in the same region', 'Say short fillers (“Let me check”) during tool calls'],
      q: ['A tool lookup takes 2s. How do you keep the call natural?', ['Silence', 'Say a short filler like “Let me check that for you” while it runs', 'Hang up', 'Repeat the question'], 1, 'Fillers mask necessary waits.'],
      t: [['python budget.py', 'vad 200 · stt 90 · llm 320 · tts 150 · network 60 = 820ms (target 800) ~']] }],
    ['Deploy on telephony', [
      ['flow', [['i-chat', 'Phone network'], ['i-cloud', 'Telephony provider'], ['i-gear', 'Media stream (WebSocket)'], ['i-robot', 'Agent service']]],
      ['checks', null, ['Bidirectional audio stream', 'Warm transfer to humans', 'Call recording per policy']],
    ], { w: ['Telephony integration'],
      a: ['Telephony provider forwards audio over a WebSocket media stream', 'Agent service handles turns and tools', 'Warm transfer passes a summary to the human', 'Recordings stored per retention policy'],
      q: ['On transfer to a human, what should be passed along?', ['Nothing', 'A short summary of the call and collected details', 'The raw audio only', 'The model weights'], 1, 'Callers hate repeating themselves.'],
      t: [['python transfer.py --call c_77 --dry-run', 'summary: "Wants to reschedule Thu 3pm dental cleaning; DOB verified" → queue: front desk']] }],
    ['Investigate awkward conversations', [
      ['alert', 'Callers complain the agent talks over them.'],
      ['steps', 'Debugging steps:', ['Listen to flagged calls', 'Check VAD thresholds', 'Check barge-in handling', 'Tune and A/B test']],
    ], { w: ['Turn-taking tuning'],
      a: ['End-of-turn detection fired on short pauses', 'Barge-in didn’t stop TTS fast enough', 'Raise silence threshold slightly; stop TTS within 100ms of speech', 'Interruptions per call dropped 60%'],
      q: ['The agent interrupts callers mid-sentence. First thing to tune?', ['The voice', 'End-of-turn / silence detection thresholds', 'The model size', 'Call recording'], 1, 'Turn detection controls interruptions.'],
      t: [['python turns.py --flagged 50', 'premature turn end 38/50 · avg pause trigger 300ms → try 550ms']] }],
    ['Think about cost, security and reliability', [
      ['pillars', [['i-money', 'Cost', ['Per-minute STT/TTS costs', 'Short replies', 'Small model for dialogue']],
        ['i-shield', 'Security', ['Verify identity before details', 'Redact PII in transcripts', 'Consent logging']],
        ['i-gear', 'Reliability', ['Fallback to human queue', 'Regional failover', 'Monitor call drops']]]],
    ], { w: ['Voice-specific risks'],
      a: ['Cost per minute = telephony + STT + LLM + TTS', 'Identity verification before sharing appointment details', 'If AI pipeline fails, route straight to human queue', 'Track dropped calls and transfers'],
      q: ['The LLM provider is down during calls. Best behavior?', ['Silence', 'Route calls to the human queue or voicemail with a clear message', 'Hang up', 'Loop music forever'], 1, 'Always have a human fallback.'],
      t: [['python cost.py --minutes 120000', 'telephony $1.2k · stt $1.4k · llm $0.9k · tts $1.6k → $0.043/min']] }],
    ['Communicate and lead', [
      ['people', 'The agent answers every call instantly and handles 55% end to end. Missed calls dropped from 30% to 2%.'],
      ['checks', null, ['Report containment and CSAT', 'Share call examples', 'Explain transfer rules']],
    ], { w: ['Contact-center metrics'],
      a: ['Containment: 55% resolved without a human', 'Missed calls 30% → 2%', 'CSAT unchanged vs humans', 'Clear transfer triggers'],
      q: ['Key metric for a voice agent’s business value?', ['Tokens', 'Containment rate with stable CSAT', 'Voice pitch', 'Model size'], 1, 'Automation only counts if callers stay satisfied.'],
      t: [['python report.py --voice', 'calls 18k · contained 55% · transferred 41% · dropped 4% · csat 4.3']] }],
    ['Drive continuous improvement', [
      ['tiles', [['55%', 'contained'], ['640ms', 'response'], ['4.3', 'CSAT'], ['$0.043', 'per min']]],
      ['checks', null, ['Review transferred calls', 'Add intents with data', 'Test accents and noise']],
    ], { w: ['Voice evals'],
      a: ['Simulated calls with varied accents and background noise', 'Review transfers to find new automatable intents', 'Track word error rate by language', 'A/B test voices and phrasing'],
      q: ['How do you test robustness of a voice agent?', ['Only quiet office tests', 'Simulated calls with different accents, noise and interruptions', 'Text-only tests', 'Ask the model'], 1, 'Real calls are noisy and messy.'],
      t: [['python sim_calls.py --n 200 --noise mixed', 'task success 86% · wer en 6.1% es 8.4%']] }],
  ],
});

QD(27, {
  cat: 'Data & Pipelines', tab: 'Multimodal', host: 'vision-lab',
  title: 'Design a Multimodal Assistant for Images and Documents',
  sub: 'Field technicians send photos of equipment and manuals. Answer “What’s wrong and how do I fix it?”',
  bubble: 'Pictures are<br>data too!', note: 'This tests vision models, image preprocessing, multimodal retrieval, cost and safety.',
  cards: [
    ['Understand the problem like a business owner', [
      ['talk', 'Technicians waste time searching 500-page manuals on site.', 'Could they snap a photo and get the fix steps?'],
      ['checks', 'Key questions to ask:', ['Photo quality in the field?', 'Which equipment models?', 'Safety-critical steps?', 'Offline needs?'], 'yellow'],
    ], { w: ['Field constraints'],
      a: ['Phone photos, often dark or blurry', '40 equipment models, manuals as PDFs with diagrams', 'Electrical safety steps must be exact', 'Poor signal in basements: compress images'],
      q: ['Repair steps involve high voltage. What must the assistant do?', ['Improvise', 'Quote exact safety steps from the manual and cite them', 'Skip safety', 'Ask the technician to guess'], 1, 'Safety-critical info must be grounded and exact.'],
      t: [['python photo_stats.py --sample 500', 'blurry 18% · dark 22% · avg size 3.8MB · models identified by label 61%']] }],
    ['Design the multimodal pipeline', [
      ['flow', [['i-web', 'Photo'], ['i-gear', 'Preprocess'], ['i-llm', 'Vision model: identify'], ['i-search', 'Retrieve manual pages'], ['i-chat', 'Steps + cites']]],
      ['checks', null, ['Identify model + error code from photo', 'Retrieve pages incl. diagrams', 'Answer with page references']],
    ], { w: ['Combining vision and retrieval'],
      a: ['Vision model reads label, error code, visible damage', 'Retrieve manual sections by model + error code', 'Index manual pages as images and text', 'Answer with steps and page citations'],
      q: ['Why still retrieve the manual if the vision model “knows” the equipment?', ['It doesn’t matter', 'Grounding in the official manual gives exact, current, citable steps', 'To use more tokens', 'Vision models can’t read'], 1, 'Model knowledge may be wrong or outdated.'],
      t: [['python identify.py photo_221.jpg', 'model HX-400 (label, conf 0.94) · error E17 on display · visible: corroded terminal']] }],
    ['Preprocess images', [
      ['steps', 'Before the model:', ['Fix rotation (EXIF)', 'Resize to model limits', 'Enhance dark images', 'Ask for a retake if unreadable']],
      ['checks', null, ['Fewer pixels = fewer tokens', 'Blur detection', 'Crop to region of interest']],
    ], { w: ['Image hygiene and cost'],
      a: ['Downscale large photos; image tokens cost money', 'Detect blur and ask for a retake instead of guessing', 'Auto-rotate and enhance contrast', 'Crop labels for better OCR'],
      q: ['A photo is too blurry to read the label. Best response?', ['Guess the model', 'Ask the technician to retake it, with tips', 'Use the most common model', 'Answer generally'], 1, 'Guessing on bad input causes wrong advice.'],
      t: [['python preprocess.py photo_309.jpg', 'blur score 0.71 ✗ → "Please retake closer to the label, with flash on"']] }],
    ['Deploy on mobile', [
      ['flow', [['i-web', 'Mobile app'], ['i-cloud', 'Upload (compressed)'], ['i-gear', 'API'], ['i-db', 'Manual index']]],
      ['checks', null, ['Compress before upload', 'Offline cache of top manuals', 'Async processing with push result']],
    ], { w: ['Edge constraints'],
      a: ['Client-side compression to ~300KB', 'Offline cache of manuals for assigned equipment', 'Async request + push notification on poor networks', 'Store photos with retention limits'],
      q: ['Signal is weak on site. Practical design?', ['Upload 8MB raw photos', 'Compress on device, upload async, cache key manuals offline', 'Require WiFi', 'Do nothing'], 1, 'Design for the real environment.'],
      t: [['python upload_stats.py', 'avg upload 290KB · p95 upload time 2.1s on 3G']] }],
    ['Investigate wrong part identification', [
      ['alert', 'Assistant confused HX-400 and HX-410 models (different wiring).'],
      ['steps', 'Debugging steps:', ['Collect misidentified photos', 'Check label read confidence', 'Require confirmation when similar', 'Add eval images']],
    ], { w: ['Confirmations on ambiguous cases'],
      a: ['Labels differ by one digit; low OCR confidence', 'Ask technician to confirm model when confidence < 0.9', 'Use serial number lookup when available', 'Add 50 look-alike photos to evals'],
      q: ['Two models look almost identical but wire differently. What should the assistant do?', ['Pick one', 'Ask the user to confirm the exact model before giving wiring steps', 'Show both steps mixed', 'Refuse forever'], 1, 'Confirm when mistakes are dangerous.'],
      t: [['python confusions.py', 'HX-400↔HX-410 confusion 7% · conf < 0.9 in 92% of those → ask to confirm']] }],
    ['Think about cost, security and reliability', [
      ['pillars', [['i-money', 'Cost', ['Downscale images', 'Small model for ID', 'Cache manual answers']],
        ['i-shield', 'Safety', ['Exact safety steps', 'People/faces blurred', 'No advice beyond manual']],
        ['i-gear', 'Reliability', ['Retake prompts', 'Offline manuals', 'Human expert escalation']]]],
    ], { w: ['Safety and privacy in images'],
      a: ['Image size is the biggest cost driver', 'Blur faces/people captured in photos before storage', 'Safety steps quoted verbatim', 'Escalate unknown faults to a senior technician'],
      q: ['Photos sometimes include customers’ faces. What should happen?', ['Store them as is', 'Blur or avoid storing faces; keep only what’s needed', 'Share them', 'Ignore'], 1, 'Minimize personal data in images.'],
      t: [['python cost.py --images 30000 --res 1024', '$0.004/image (vs $0.015 at full res)']] }],
    ['Communicate and lead', [
      ['people', 'Technicians find the right fix steps in about 30 seconds instead of 15 minutes, and safety steps always cite the manual.'],
      ['checks', null, ['Time saved per job', 'Safety approach', 'Feedback loop with technicians']],
    ], { w: ['Value for field teams'],
      a: ['Time to find fix: 15 min → 30 sec', 'First-time fix rate up 9%', 'Safety review approved by EHS team', 'Technician feedback in app'],
      q: ['Who should sign off on safety-related outputs?', ['Only engineers', 'The safety/EHS team with domain experts', 'Nobody', 'The model'], 1, 'Domain experts own safety.'],
      t: [['python report.py --field', 'jobs 4,120 · avg lookup 31s · first-time fix +9%']] }],
    ['Drive continuous improvement', [
      ['tiles', [['93%', 'model ID'], ['31s', 'time to steps'], ['+9%', 'first-time fix'], ['$0.004', 'per image']]],
      ['checks', null, ['Photo eval set per model', 'Add new manuals quickly', 'Learn from escalations']],
    ], { w: ['Multimodal evals'],
      a: ['Eval set of labeled field photos per equipment model', 'New manuals indexed within a day', 'Escalated cases reviewed for new knowledge', 'Track ID accuracy by lighting/blur'],
      q: ['Best eval data for a field photo assistant?', ['Stock photos', 'Real field photos labeled with the correct model and fault', 'Text only', 'Synthetic cartoons'], 1, 'Real conditions are what matter.'],
      t: [['python eval_photos.py --set field_600', 'model ID 93.1% · fault ID 84.0% · dark photos 79%']] }],
  ],
});

QD(28, {
  cat: 'LLM System Design', tab: 'LLM<br>Recommender', host: 'recs-lab',
  title: 'Use LLMs to Improve Recommendations',
  sub: 'A streaming app wants recommendations that explain themselves and handle new titles, without breaking latency.',
  bubble: 'Classic ML +<br>LLM magic!', note: 'This tests when to use LLMs vs classic recsys, candidate generation, ranking, cold start and cost.',
  cards: [
    ['Understand the problem like a business owner', [
      ['talk', 'New shows get no views because nobody has watched them yet.', 'Can LLMs help recommend new titles and explain why?'],
      ['checks', 'Key questions to ask:', ['Current recsys performance?', 'Latency per page load?', 'Where do LLMs add value?', 'Success metric?'], 'yellow'],
    ], { w: ['LLMs as a complement, not a replacement'],
      a: ['Existing collaborative filtering works well for popular titles', 'Problem: cold start for new titles and new users', 'Page load budget: 100ms for recommendations', 'Metric: watch time from recommendations'],
      q: ['Should an LLM replace the whole recommender?', ['Yes', 'Usually no — use it where classic methods are weak (cold start, explanations, content understanding)', 'Only on weekends', 'Always for speed'], 1, 'Classic recsys is cheap and fast at scale.'],
      t: [['python recs_stats.py', 'new titles (<7d) share of views 2% · CTR on new 0.4% vs 3.1% overall']] }],
    ['Design the hybrid recommender', [
      ['flow', [['i-db', 'User history'], ['i-gear', 'Candidates (CF + content)'], ['i-bars', 'Ranker'], ['i-llm', 'Explain (offline)'], ['i-web', 'UI']]],
      ['checks', null, ['LLM enriches item metadata offline', 'Content embeddings for new titles', 'Fast ranker online']],
    ], { w: ['Offline vs online LLM use'],
      a: ['Offline: LLM generates tags, themes, moods for each title', 'Content embeddings let new titles match users immediately', 'Online ranker uses these features (fast)', 'Explanations pre-generated per (user segment, title)'],
      q: ['Where should the LLM run to keep page loads under 100ms?', ['On every page load', 'Mostly offline to enrich items and pre-compute explanations', 'In the browser', 'Never'], 1, 'Offline enrichment avoids LLM latency online.'],
      t: [['python enrich.py --title "Night Harbor"', 'themes: noir, family secrets · mood: tense · similar: [Dark Bay, The Pier]']] }],
    ['Solve cold start', [
      ['steps', 'New title flow:', ['LLM writes structured metadata from synopsis', 'Embed metadata', 'Match to users with similar taste vectors', 'Explore with a small traffic share']],
      ['checks', null, ['Exploration budget', 'Track early engagement', 'Blend into CF once data exists']],
    ], { w: ['Exploration vs exploitation'],
      a: ['Content-based features make new titles recommendable on day one', 'Give new titles a small exploration share', 'Once watch data arrives, CF takes over', 'Monitor that exploration doesn’t hurt overall engagement'],
      q: ['Why reserve a small share of slots for new titles?', ['Random fun', 'Exploration gathers data so good new titles can be discovered', 'To hide popular titles', 'For ads'], 1, 'Without exploration, new items never get data.'],
      t: [['python cold_start.py --title nh_001', 'day-1 impressions 120k (explore 5%) · CTR 2.6% ✓ promoted']] }],
    ['Deploy explanations safely', [
      ['bot', 'Because you watched', '“Because you liked tense family mysteries like Dark Bay.”'],
      ['checks', null, ['Explanations from real signals', 'Templates + LLM phrasing', 'No sensitive inferences']],
    ], { w: ['Faithful explanations'],
      a: ['Explanation must reflect actual ranking reasons', 'LLM phrases them from structured reasons', 'Avoid sensitive inferences (health, religion)', 'Cache explanations by segment'],
      q: ['An explanation says “Because you’re pregnant…”. Problem?', ['Fine', 'Sensitive inference; never surface such guesses', 'Grammar', 'Too short'], 1, 'Explanations must avoid sensitive attributes.'],
      t: [['python explain_check.py --sample 1000', 'faithful to signals 98% · sensitive terms 0 ✓']] }],
    ['Investigate an engagement drop', [
      ['alert', 'Watch time from recommendations fell 5% after LLM metadata launch.'],
      ['steps', 'Debugging steps:', ['Check A/B segments', 'Inspect metadata quality', 'Find bad tag patterns', 'Fix and re-run test']],
    ], { w: ['Debugging feature quality'],
      a: ['LLM tagged many dramas as “comedy” due to ironic synopses', 'Wrong tags matched wrong users', 'Fix with constrained tag list + validation sample', 'Watch time recovered +3% above baseline'],
      q: ['LLM-generated tags hurt recommendations. Best fix?', ['Remove all tags', 'Constrain tags to a fixed list and validate on a labeled sample', 'Use more tags', 'Ignore'], 1, 'Constrained outputs and validation improve quality.'],
      t: [['python tag_audit.py --n 300', 'tag precision 0.71 (free text) → 0.90 (fixed taxonomy)']] }],
    ['Think about cost, security and reliability', [
      ['pillars', [['i-money', 'Cost', ['Enrich once per title', 'Batch API offline', 'No LLM in hot path']],
        ['i-shield', 'Trust', ['No sensitive inferences', 'User controls (not interested)', 'Kids profiles rules']],
        ['i-gear', 'Reliability', ['Fallback to CF', 'Feature freshness checks', 'A/B before rollout']]]],
    ], { w: ['Responsible recommendations'],
      a: ['Enrichment cost scales with catalog, not users', 'Kids profiles: strict content rules', 'If features are missing, fall back to CF only', 'All changes A/B tested'],
      q: ['Why is offline enrichment cheap at scale?', ['It’s free', 'Cost scales with the number of titles, not page views', 'It uses no tokens', 'It skips QA'], 1, 'Titles are far fewer than impressions.'],
      t: [['python cost.py --titles 40000', 'enrichment $160 one-off · daily new titles $3']] }],
    ['Communicate and lead', [
      ['people', 'New titles now get discovered: their share of views went from 2% to 7%, and overall watch time is up 3%.'],
      ['checks', null, ['A/B results', 'Creator/business impact', 'Explain the hybrid approach']],
    ], { w: ['Framing hybrid systems'],
      a: ['LLMs where they help; classic ML where it’s strong', 'A/B: watch time +3%, new title views ×3.5', 'Costs stay low (offline)', 'Next: personalized explanations'],
      q: ['A stakeholder asks why not “just ask the LLM what to recommend”. Answer?', ['Agree', 'Latency, cost and accuracy at scale favor classic ranking; LLM adds content understanding offline', 'Say it’s impossible', 'Ignore'], 1, 'Explain the tradeoffs clearly.'],
      t: [['python ab.py --exp llm_meta_v2', 'watch time +3.1% (CI +1.4…+4.8) · new title share 2% → 7%']] }],
    ['Drive continuous improvement', [
      ['tiles', [['+3%', 'watch time'], ['7%', 'new title share'], ['0.90', 'tag precision'], ['$3', 'daily cost']]],
      ['checks', null, ['Taxonomy reviews', 'Exploration tuning', 'Diversity metrics']],
    ], { w: ['Beyond accuracy'],
      a: ['Track diversity and novelty, not just CTR', 'Tune exploration share', 'Quarterly taxonomy review with editors', 'Monitor filter bubbles'],
      q: ['Why track diversity of recommendations?', ['It’s required', 'Pure accuracy can trap users in narrow content and hurt long-term engagement', 'For speed', 'It’s cheaper'], 1, 'Long-term satisfaction needs variety.'],
      t: [['python diversity.py', 'intra-list diversity 0.42 → 0.47 · novelty +12%']] }],
  ],
});

QD(29, {
  cat: 'Models & Training', tab: 'Self-host<br>Models', host: 'gpu-lab',
  title: 'Self-Host an Open Model in Production',
  sub: 'For privacy and cost reasons you must run an open-weights model in your own cloud. Serve it fast and reliably.',
  bubble: 'Your GPUs,<br>your rules!', note: 'This tests model sizing, quantization, vLLM serving, batching, autoscaling and cost vs APIs.',
  cards: [
    ['Understand the problem like a business owner', [
      ['talk', 'Legal won’t let customer data leave our cloud.', 'Can we run our own model, and will it be good and affordable?'],
      ['checks', 'Key questions to ask:', ['Quality needed vs API models?', 'Traffic (tokens/sec)?', 'Latency targets?', 'Team to operate GPUs?'], 'yellow'],
    ], { w: ['Build vs buy for inference'],
      a: ['Need: summarization + extraction; open 8B–70B models can be enough', 'Peak 400 requests/min, ~1k tokens each', 'P95 first token < 1s', 'Platform team can run Kubernetes + GPUs'],
      q: ['Main reasons to self-host an open model?', ['It’s always cheaper', 'Data control, customization, and predictable cost at high steady volume', 'It’s easier', 'It’s always better quality'], 1, 'Self-hosting trades ops work for control.'],
      t: [['python compare_quality.py --set tasks_300', 'api-large 0.91 · open-70B 0.88 · open-8B 0.79 · open-8B-lora 0.86']] }],
    ['Size the model and GPUs', [
      ['code', `weights memory ≈ params × bytes
  70B × 2 bytes (fp16) ≈ 140 GB → 2× 80GB GPUs
  70B × 0.5 bytes (4-bit) ≈ 35 GB → 1× 80GB GPU
+ KV cache for concurrent requests`],
      ['checks', null, ['Weights + KV cache must fit', 'Quantization trades quality', 'Benchmark on your tasks']],
    ], { w: ['GPU memory math'],
      a: ['Weights: params × bytes per param', 'KV cache grows with context length × concurrent sequences', '4-bit/8-bit quantization cuts memory with small quality loss', 'Validate quantized quality on your evals'],
      q: ['How much memory do 70B parameters need in fp16 (weights only)?', ['14 GB', '70 GB', '140 GB', '700 GB'], 2, '70B × 2 bytes ≈ 140 GB.'],
      t: [['python gpu_size.py --params 70e9 --dtype int4 --ctx 8192 --concurrency 32', 'weights 35 GB · kv cache ~26 GB · total ~61 GB → 1× 80GB GPU ✓']] }],
    ['Serve with an inference engine', [
      ['flow', [['i-web', 'Requests'], ['i-gear', 'vLLM / TGI'], ['i-bolt', 'Continuous batching'], ['i-cloud', 'GPU nodes']]],
      ['checks', null, ['Continuous batching', 'Paged KV cache', 'OpenAI-compatible endpoint']],
    ], { w: ['Throughput techniques'],
      a: ['Use a serving engine like vLLM: continuous batching + paged attention', 'Batching raises throughput dramatically vs one-at-a-time', 'Expose an OpenAI-compatible API so apps don’t change', 'Tune max concurrent sequences vs latency'],
      q: ['What does continuous batching do?', ['Waits for a full batch', 'Adds and removes requests from the running batch every step, keeping GPUs busy', 'Runs one request at a time', 'Disables streaming'], 1, 'It boosts throughput without long waits.'],
      t: [['python bench_serve.py --concurrency 1,32', 'c=1  42 tok/s total · c=32 1,180 tok/s total · p95 ttft 610ms']] }],
    ['Deploy and autoscale', [
      ['checks', null, ['Kubernetes GPU node pool', 'Scale on queue depth / tokens per sec', 'Warm pools (model load takes minutes)', 'Pin model + engine versions']],
      ['tiles', [['3–8', 'GPU pods'], ['4 min', 'cold start'], ['1,180', 'tok/s per GPU'], ['99.9%', 'uptime']]],
    ], { w: ['GPU operations'],
      a: ['Model load takes minutes: keep warm replicas', 'Scale on pending requests, not CPU', 'Store weights on fast local/NVMe or cached image', 'Canary new model/engine versions'],
      q: ['Why keep warm GPU replicas instead of scaling from zero?', ['Fashion', 'Loading large models takes minutes, so cold starts would break latency', 'GPUs are free', 'Kubernetes requires it'], 1, 'Cold starts are long for big models.'],
      t: [['kubectl get pods -l app=llm', 'llm-0 Running · llm-1 Running · llm-2 Running · llm-3 Pending (scaling)']] }],
    ['Investigate an out-of-memory crash', [
      ['alert', 'Pods crash with CUDA OOM during peak.'],
      ['steps', 'Debugging steps:', ['Check context lengths at crash', 'Check concurrency setting', 'Check KV cache config', 'Cap and reject gracefully']],
    ], { w: ['KV cache limits'],
      a: ['A few 32k-token requests filled the KV cache', 'Limit max context per request', 'Lower max concurrent sequences / set GPU memory utilization', 'Return 429 instead of crashing'],
      q: ['OOM happens when long-context requests spike. Fix?', ['Bigger font', 'Cap context length and concurrency so KV cache fits; queue or reject overflow', 'Restart nightly', 'Remove batching'], 1, 'KV cache size must be bounded.'],
      t: [['kubectl logs llm-2 --previous | tail -2', 'CUDA out of memory: tried to allocate 2.1 GiB\nactive seqs 41 · max ctx in batch 32,768']] }],
    ['Think about cost, security and reliability', [
      ['pillars', [['i-money', 'Cost', ['Utilization is everything', 'Reserved/spot mix', 'Smaller tuned model']],
        ['i-shield', 'Security', ['Data stays in VPC', 'Model license check', 'Supply-chain: verify weights']],
        ['i-gear', 'Reliability', ['Multi-node', 'Health checks with real inference', 'Fallback API for non-sensitive']]]],
    ], { w: ['Self-host cost truths'],
      a: ['Idle GPUs are expensive: high utilization makes self-hosting pay off', 'Check license terms for commercial use', 'Verify weight checksums from trusted sources', 'Non-sensitive traffic can overflow to an API'],
      q: ['When is self-hosting usually cheaper than an API?', ['Always', 'At high, steady utilization of the GPUs', 'At very low traffic', 'Never'], 1, 'Low utilization wastes expensive GPUs.'],
      t: [['python tco.py --gpus 4 --util 0.65', 'self-host $0.38/1M tok · api $1.10/1M tok · break-even util ~28%']] }],
    ['Communicate and lead', [
      ['people', 'Our 8B model with a LoRA adapter hits 0.86 quality at a third of the API cost, and no data leaves our cloud.'],
      ['checks', null, ['Quality vs API', 'Total cost incl. people', 'On-call plan for GPUs']],
    ], { w: ['Honest TCO'],
      a: ['Include engineering and on-call time in total cost', 'Quality gap vs API on your tasks', 'Plan for model upgrades', 'Hybrid option for non-sensitive workloads'],
      q: ['What’s often forgotten in self-hosting cost estimates?', ['GPU price', 'Engineering, on-call and upgrade effort', 'Electricity', 'Nothing'], 1, 'People cost is real.'],
      t: [['cat tco.md', 'gpus $14k/mo · eng 0.5 FTE · total $0.52/1M tok vs api $1.10']] }],
    ['Drive continuous improvement', [
      ['tiles', [['65%', 'GPU util'], ['610ms', 'p95 TTFT'], ['0.86', 'quality'], ['−53%', 'cost vs API']]],
      ['checks', null, ['Benchmark new open models', 'Speculative decoding', 'Right-size quantization']],
    ], { w: ['Serving optimizations'],
      a: ['Try speculative decoding for latency', 'Evaluate new open models quarterly', 'Tune quantization per task', 'Track utilization and queue time'],
      q: ['What does speculative decoding do?', ['Guesses user input', 'A small draft model proposes tokens that the big model verifies, speeding generation', 'Removes batching', 'Lowers quality on purpose'], 1, 'It speeds decoding when drafts are often right.'],
      t: [['python bench_serve.py --speculative', 'tok/s per request +38% · quality unchanged']] }],
  ],
});

QD(30, {
  cat: 'Models & Training', tab: 'GPU Cost<br>Planning', host: 'capacity-lab',
  title: 'Plan GPU Capacity and Inference Cost',
  sub: 'Forecast traffic, size GPU capacity and set a budget for next year’s AI features.',
  bubble: 'Numbers before<br>GPUs!', note: 'This tests throughput math, utilization, peak planning, reserved vs on-demand, and unit economics.',
  cards: [
    ['Understand the problem like a business owner', [
      ['talk', 'Finance needs next year’s AI infrastructure budget.', 'How many GPUs, and how sure are we?'],
      ['checks', 'Key questions to ask:', ['Traffic forecast and peaks?', 'Tokens per request?', 'Latency SLO?', 'API vs self-host mix?'], 'yellow'],
    ], { w: ['Forecasting inputs'],
      a: ['Today 2M requests/day; forecast 3× by year end', 'Peak/average ratio 4×', '~1,200 tokens in, 300 out per request', 'P95 first token < 1s'],
      q: ['Which input most changes GPU needs?', ['Logo color', 'Peak tokens per second, not daily averages', 'Number of engineers', 'Office size'], 1, 'Capacity is sized for peaks.'],
      t: [['python forecast.py --now 2e6 --growth 3', 'requests/day end of year 6.0M · peak factor 4']] }],
    ['Do the throughput math', [
      ['code', `out tokens/day  = 6M × 300 = 1.8B
avg out tok/s   = 1.8B / 86,400 ≈ 20,800
peak (×4)       ≈ 83,000 tok/s
per GPU (bench) ≈ 2,500 tok/s at SLO
GPUs at peak    ≈ 34  (+ headroom 20% → 41)`],
      ['checks', null, ['Benchmark at your SLO', 'Add headroom', 'Count prefill too']],
    ], { w: ['Back-of-envelope capacity'],
      a: ['Use benchmarked throughput at your latency SLO, not max throughput', 'Size for peak plus 20–30% headroom', 'Long prompts add prefill cost — include input tokens', 'Revisit with real data monthly'],
      q: ['83,000 tok/s at peak, 2,500 tok/s per GPU. About how many GPUs before headroom?', ['3', '34', '340', '3,400'], 1, '83,000 / 2,500 ≈ 33.2 → 34.'],
      t: [['python capacity.py --peak 83000 --per-gpu 2500 --headroom 0.2', 'gpus needed 34 · with headroom 41']] }],
    ['Choose purchase options', [
      ['table', [['Option', 'Price', 'Best for'], ['Reserved / committed', 'lowest', 'baseline load'], ['On-demand', 'high', 'peaks'], ['Spot', 'cheap, can vanish', 'batch jobs'], ['API', 'per token', 'spiky / low volume']]],
      ['checks', null, ['Reserve the baseline', 'On-demand/API for peaks', 'Spot for batch']],
    ], { w: ['Blended capacity strategy'],
      a: ['Commit to baseline (e.g. 18 GPUs) at a discount', 'Burst with on-demand or overflow to API', 'Batch jobs on spot with checkpoints', 'Review commitments quarterly'],
      q: ['Best way to cover predictable baseline load?', ['Spot only', 'Reserved/committed capacity', 'On-demand only', 'Nothing'], 1, 'Commitments are cheapest for steady load.'],
      t: [['python blend.py --baseline 18 --peak 41', 'reserved 18 · on-demand avg 9 · api overflow 3% → $71k/mo']] }],
    ['Deploy cost controls', [
      ['flow', [['i-monitor', 'Usage metrics'], ['i-money', 'Cost per feature'], ['i-siren', 'Budget alerts'], ['i-gear', 'Autoscale policy']]],
      ['checks', null, ['Tag costs by feature/team', 'Unit cost dashboards', 'Scale down at night']],
    ], { w: ['FinOps for AI'],
      a: ['Tag every request with feature and team', 'Track cost per request and per active user', 'Scheduled scale-down off peak', 'Alerts at budget thresholds'],
      q: ['Most useful cost metric for product decisions?', ['Total cloud bill', 'Cost per request or per active user for each feature', 'GPU temperature', 'Pod count'], 1, 'Unit economics guide decisions.'],
      t: [['python unit_cost.py --by feature', 'summarize $0.0011/req · chat $0.0042/req · search $0.0003/req']] }],
    ['Investigate a budget overrun', [
      ['alert', 'Inference costs 40% over budget this month.'],
      ['steps', 'Debugging steps:', ['Break down by feature', 'Check tokens per request trend', 'Check utilization', 'Fix the biggest driver']],
    ], { w: ['Cost root cause'],
      a: ['Chat feature added full history to every prompt: tokens/request ×2.6', 'Utilization fine; demand changed', 'Fix: summarize history, cap context', 'Back within budget next month'],
      q: ['Costs rose but traffic is flat. Check first?', ['Number of users', 'Tokens per request (prompt growth)', 'Office rent', 'Logo'], 1, 'Prompt bloat is a common hidden cost driver.'],
      t: [['python tokens_trend.py --feature chat', 'avg input tokens 1,200 → 3,150 since release 4.2']] }],
    ['Think about cost, security and reliability', [
      ['pillars', [['i-money', 'Cost', ['Right-size models', 'Caching', 'Quantization']],
        ['i-shield', 'Risk', ['GPU supply shortages', 'Vendor lock-in', 'Multi-region']],
        ['i-gear', 'Reliability', ['Headroom for failures', 'N+1 capacity', 'Load shedding']]]],
    ], { w: ['Capacity risk'],
      a: ['GPU supply can be tight: reserve early for launches', 'N+1 capacity so one node failure doesn’t breach SLO', 'Load shedding for low-priority traffic at peak', 'Keep an API fallback contract'],
      q: ['At peak you’re at 100% capacity. What should you shed first?', ['Paying users’ chat', 'Low-priority background work (batch jobs, prefetch)', 'Health checks', 'Logging everything'], 1, 'Protect user-facing, high-value traffic.'],
      t: [['python shed.py --simulate', 'drop batch 100% · defer prefetch → frees 6 GPUs at peak']] }],
    ['Communicate and lead', [
      ['people', 'Budget: about $850k for the year, assuming 3× growth. If growth is 5×, here is the plan and what it costs.'],
      ['checks', null, ['Assumptions written down', 'Scenarios: low/base/high', 'Levers to cut cost']],
    ], { w: ['Budget with scenarios'],
      a: ['Base, low and high scenarios with drivers', 'Commit only to baseline', 'List levers: routing, caching, quantization', 'Monthly review vs forecast'],
      q: ['Finance asks for one exact number. Best response?', ['Make one up', 'Give a base number with clear assumptions plus low/high scenarios', 'Refuse', 'Double it'], 1, 'Uncertainty should be shown, not hidden.'],
      t: [['python scenarios.py', 'low $610k · base $850k · high $1.29M (5× growth)']] }],
    ['Drive continuous improvement', [
      ['tiles', [['$0.0019', 'avg per request'], ['68%', 'GPU util'], ['18', 'reserved GPUs'], ['−22%', 'unit cost YoY']]],
      ['checks', null, ['Monthly forecast vs actual', 'Unit-cost targets per feature', 'Optimize top spenders']],
    ], { w: ['Unit cost trends'],
      a: ['Compare forecast vs actual monthly and adjust', 'Set unit-cost targets per feature', 'Optimize the top 3 spenders each quarter', 'Report savings'],
      q: ['Best long-term health metric for AI infra spend?', ['Total spend only', 'Unit cost trend (cost per request/user) as usage grows', 'Number of GPUs', 'Vendor count'], 1, 'Growing usage with falling unit cost is healthy.'],
      t: [['python forecast_vs_actual.py', 'oct forecast $68k · actual $66.4k · ✓ within 3%']] }],
  ],
});
