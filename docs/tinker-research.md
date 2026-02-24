# Tinker Setup Research (THE-9)

Date: 2026-02-24

## Environment status

The Codex workspace is active and usable (repo access, file edits, git, etc.).

Direct outbound web access from this runtime is blocked by a proxy rule returning HTTP 403 for external sites, including the target Tinker URL.

## What I could verify from this environment

- Workspace is available and healthy.
- External web retrieval from `https://thinkingmachines.ai/tinker/` is not possible in this runtime.

Attempted command and result:

- `curl -L --max-time 30 https://thinkingmachines.ai/tinker/`
- `curl: (56) CONNECT tunnel failed, response 403`

---

## General research (industry baseline you can use now)

Because I cannot fetch Tinker docs directly here, this section provides **vendor-agnostic best-practice expectations** for modern fine-tuning platforms so you can still move forward.

### 1) Data format typically required for fine-tuning

Most platforms accept one of these:

1. **JSONL prompt/completion**
   - Example shape: `{ "prompt": "...", "completion": "..." }`
2. **JSONL chat messages**
   - Example shape: `{ "messages": [{"role":"system","content":"..."},{"role":"user","content":"..."},{"role":"assistant","content":"..."}] }`
3. Sometimes CSV/Parquet ingestion, usually converted internally to JSONL.

Common requirements:
- UTF-8 text only
- One training example per line (for JSONL)
- No secrets/PII
- Balanced instruction diversity and high-quality outputs

### 2) How trained models are usually hosted

Typical patterns:

- **Managed hosting by provider** (most common)
  - You upload data, train a variant, provider hosts inference endpoint.
- **Dedicated deployment tiers**
  - Shared, dedicated, or private tenancy.
- **Versioned model IDs**
  - Each training run produces a model version/checkpoint with rollback.

What usually matters in evaluation:
- Region availability
- Latency/SLA commitments
- Isolation/compliance posture

### 3) How trained models are generally accessed

Most vendors expose:

- HTTPS API endpoint (often OpenAI-like request format)
- API key authentication
- Optional SDK wrappers
- Streaming responses for chat completions

Integration checklist:
- Endpoint format and model naming convention
- Rate limits / quotas
- Timeout + retry behavior
- Observability fields (request IDs, usage tokens)

### 4) Pricing model (training, hosting, inference)

Pricing is usually split into:

- **Training**: per token processed, per GPU-hour, or per run
- **Hosting**: per deployed model/hour or tier subscription
- **Inference**: input tokens + output tokens
- **Storage**: datasets/checkpoint retention (sometimes bundled)

To estimate total cost, gather:
- expected monthly requests
- avg input/output tokens per request
- expected concurrent traffic
- number of model versions kept online

### 5) Do platforms accept code for fine-tuning?

Usually **yes**, as text data.

Common caveats:
- license compliance for repos/corpora
- secret scanning and credential removal
- quality filtering (dedupe, linting, malformed snippets)
- tokenizer behavior on long files

### 6) Broad functionality normally supported

Modern platforms often include:
- supervised fine-tuning (SFT)
- parameter-efficient tuning options (LoRA/PEFT) on some tiers
- model evaluation tools (A/B, benchmark datasets)
- safety/moderation controls
- experiment tracking/versioning
- optional RAG compatibility via external vector DBs

---

## Exact questions to send Tinker (copy/paste)

Use this as your vendor questionnaire so we can convert answers into implementation work quickly.

1. **Fine-tuning data format**
   - Which file formats are accepted (JSONL, CSV, Parquet)?
   - Required schema for chat/instruction tuning?
   - Maximum file size and token limits?
   - Any automatic validation/error reporting?

2. **Training workflow**
   - Do you support SFT only, or also LoRA/PEFT/DPO?
   - Can we tune from code-heavy datasets?
   - How long do jobs typically take for small/medium datasets?

3. **Hosting/deployment**
   - Is model serving fully managed?
   - Are dedicated/private deployments available?
   - What is your SLA for uptime and latency?

4. **Access/API**
   - Are APIs OpenAI-compatible?
   - Auth options (API key/OAuth/service accounts)?
   - Streaming and tool-calling support?

5. **Pricing**
   - Training price unit (token/hour/run)?
   - Hosting price per deployment/hour?
   - Inference input/output token pricing?
   - Any minimum monthly commits?

6. **Security/compliance**
   - Data retention defaults and deletion policy?
   - Is customer data used for provider model training?
   - SOC2/ISO27001 or equivalent certifications?

7. **Operations**
   - Model versioning and rollback process?
   - Audit logs and observability?
   - Regional deployment options?

---

## How you can help unblock me quickly

If you want me to produce a **fully verified Tinker report** in this repo, share **any one** of the following:

1. **Paste docs directly here**
   - copy/paste relevant sections from `thinkingmachines.ai/tinker` (formats, APIs, pricing)
2. **Upload screenshots/PDF links**
   - I will convert them into a structured decision memo
3. **Run these commands on your machine and paste output**
   - `curl -L https://thinkingmachines.ai/tinker/`
   - `curl -L <any Tinker docs URL>`
4. **Provide vendor contact responses**
   - I will consolidate into a final recommendation + integration plan

## Deliverable after unblocking

Once docs are available, I will produce:
- validated answer sheet for all issue questions
- implementation notes for this Devvit app stack
- cost model template (low/medium/high traffic)
- go/no-go recommendation with risks and mitigations
