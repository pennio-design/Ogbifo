# Ogbifọ Architecture

## 1. Overview

Ogbifọ is a Yoruba‑first language intelligence platform for African low‑resource languages. It ingests speech, generates transcripts and translations, routes uncertain output to human reviewers, and exposes the resulting data through exports, search, and APIs.

The architecture is optimized for:

- Yoruba‑first accuracy and evaluation, not generic “any language” claims. [cite:127]
- Human‑in‑the‑loop validation as a core loop, not an afterthought. [cite:127]
- Localized African data management and retrieval with strong metadata filtering.
- AI‑native integrations via an optional Model Context Protocol (MCP) server. [cite:272]

---

## 2. Goals and Constraints

### 2.1 Goals

- Provide reliable speech transcription and translation for Yoruba, then expand to other African languages only when evaluation and reviewer capacity exist. [cite:127]
- Turn human review work into reusable datasets, glossaries, and evaluation assets.
- Make it easy for human users and AI agents to interact with Ogbifọ via HTTP APIs and MCP tools/resources. [cite:272][cite:267]
- Allow localized deployment where data sovereignty requires it.

### 2.2 Constraints

- Sensitive audio and text must stay within controlled infrastructure.
- Human validation is required for low‑confidence segments and high‑risk content.
- Real‑world audio (noisy, multi‑speaker, dialectal) is expected; the system cannot assume lab‑clean speech. [cite:127]
- Vector DB must support rich metadata filtering across language, dialect, region, project, source type, and review status. [cite:277]

---

## 3. Context and Scope

### 3.1 System Context

**External actors:**

- **Researchers / media teams / NGOs / enterprises:** Upload audio, review transcripts/translations, export data.
- **Linguists / reviewers:** Work through review queues, maintain glossaries and evaluation sets.
- **Developers / AI agents:** Use APIs or MCP tools to run jobs, fetch outputs, run evaluations.

**External systems (optional integrations):**

- Storage provider (S3‑compatible).
- Authentication provider (OIDC / SSO).
- ASR and MT providers (e.g., managed speech and translation APIs).
- Analytics/monitoring (Grafana, Prometheus, etc.).

### 3.2 In‑scope

- Batch transcription and translation jobs.
- Human review workflows.
- Search and retrieval across localized corpora.
- Admin metrics and evaluation harness.
- Optional MCP server for AI‑native access.

Out‑of‑scope for v1:

- Consumer social features.
- General‑purpose “any language” support.

---

## 4. Solution Overview

Ogbifọ is structured into three vertical layers:

1. **Product layer**
   - Web app (React/Next.js + TypeScript).
   - REST/JSON API gateway.
   - Review UI, search UI, exports, admin dashboards.

2. **Language intelligence layer**
   - ASR orchestrator: manages Yoruba and other language transcription pipelines.
   - Translation orchestrator: segment‑aligned translation.
   - Quality service: confidence scoring, glossary checks, named‑entity checks.
   - Evaluation harness.

3. **Data and retrieval layer**
   - PostgreSQL for transactional data.
   - Object storage for audio and exports.
   - Vector database (Qdrant by default) for semantic + metadata retrieval. [cite:277]
   - Analytics store for metrics and evaluation results.

An optional **MCP server** exposes core capabilities (tools/resources/prompts) for AI clients and editors without needing a separate connector. [cite:272][cite:267]

---

## 5. Logical Architecture

### 5.1 Services

- **API Gateway**
  - Handles auth, routing, rate limiting, and audit logging.
  - Exposes versioned HTTP APIs (`/v1/...`).

- **User & Workspace Service**
  - Manages workspaces, users, roles, and permissions.

- **Project & Media Service**
  - Projects: logical grouping of jobs and assets.
  - Media: metadata and lifecycle for uploaded audio.

- **Job Orchestration Service**
  - Creates and manages transcription, translation, export, and evaluation jobs.
  - Publishes tasks to a message queue (e.g., Redis, RabbitMQ).

- **ASR Orchestrator**
  - Validates job parameters and sends audio to ASR providers.
  - Writes `transcript_segment` rows with timestamps, text, and confidence.

- **Translation Orchestrator**
  - Reads transcript segments and calls MT providers (Yoruba↔English first).
  - Writes `translation_segment` rows aligned to source segments.

- **Quality & Review Service**
  - Assigns confidence thresholds and reason codes.
  - Creates `review_item` records for low‑confidence or policy‑sensitive segments.
  - Powers reviewer UI and APIs.

- **Export Service**
  - Generates TXT, JSON, CSV, SRT, VTT outputs.
  - Stores export artifacts and exposes download URLs.

- **Search & Retrieval Service**
  - Indexes segments into Qdrant with rich metadata payloads.
  - Exposes search APIs combining vector similarity and metadata filters. [cite:277]

- **Evaluation & Analytics Service**
  - Runs benchmark evaluations against fixed gold datasets.
  - Stores `evaluation_run` data and aggregates metrics.
  - Drives admin dashboards. [cite:127]

- **MCP Server (optional)**
  - Exposes high‑value operations as MCP tools/resources:
    - Tools: `create_transcription_job`, `create_translation_job`, `resolve_review_item`, `create_export`, `search_segments`, `run_benchmark`.
    - Resources: job status, transcripts, translations, benchmark reports, glossaries.
  - Communicates via stdio or HTTP transports as per MCP spec. [cite:272][cite:267]

---

## 6. Data Model (Conceptual)

### 6.1 Core Entities

- **workspace**
  - `id`, `name`, `settings`, `created_at`.

- **user**
  - `id`, `workspace_id`, `email`, `role`, `created_at`.

- **project**
  - `id`, `workspace_id`, `name`, `description`, `created_at`.

- **media_asset**
  - `id`, `project_id`, `workspace_id`, `storage_key`, `filename`, `duration_seconds`, `format`, `channels`, `uploaded_by`, `uploaded_at`.

- **job**
  - `id`, `workspace_id`, `project_id`, `media_asset_id?`, `type` (`transcription`, `translation`, `export`, `evaluation`), `status`, `error_code?`, `created_at`, `started_at`, `completed_at`, `parameters` (JSONB).

- **transcript_segment**
  - `id`, `job_id`, `media_asset_id`, `index`, `start_ms`, `end_ms`, `speaker_label?`, `text`, `confidence`, `language`.

- **translation_segment**
  - `id`, `job_id`, `source_segment_id`, `source_language`, `target_language`, `text`, `confidence`.

- **review_item**
  - `id`, `workspace_id`, `source_segment_type` (`transcript`/`translation`), `source_segment_id`, `reason_code` (`low_confidence`, `glossary_mismatch`, etc.), `status` (`pending`, `resolved`, `escalated`), `created_at`.

- **review_decision**
  - `id`, `review_item_id`, `reviewer_id`, `original_text`, `revised_text`, `decision` (`approved`, `edited`, `rejected`), `notes`, `created_at`.

- **glossary_term**
  - `id`, `workspace_id`, `source_language`, `target_language`, `source_term`, `target_term`, `domain`, `status`.

- **export_asset**
  - `id`, `job_id`, `workspace_id`, `format`, `storage_key`, `created_at`, `expires_at?`.

- **evaluation_run**
  - `id`, `workspace_id`, `benchmark_id`, `model_config`, `metrics` (JSONB), `created_at`.

### 6.2 Vector Schema

In Qdrant, each point should look like:

- **Vector**
  - Embedding of segment text (source, target, or combined).

- **Payload (metadata)**
  - `workspace_id`
  - `project_id`
  - `media_asset_id`
  - `segment_id`
  - `language`
  - `dialect?`
  - `region?`
  - `source_type` (interview, broadcast, call center, etc.)
  - `review_status` (`pending`, `approved`)
  - `contains_code_switch`
  - `terminology_domain`
  - `created_at`

This enables filters like “Yoruba segments from project X, region Y, approved review status, domain = health”. [cite:277]

---

## 7. Interface Design

### 7.1 HTTP API (Representative Endpoints)

- `POST /v1/media/uploads`
  - Returns signed URL for upload and creates `media_asset`.

- `POST /v1/jobs/transcription`
  - Body: `media_asset_id`, `source_language | auto`, `options`.
  - Returns `job_id`.

- `GET /v1/jobs/:id`
  - Returns job status and metadata.

- `GET /v1/jobs/:id/transcript`
  - Returns transcript segments.

- `POST /v1/jobs/translation`
  - Body: `source_job_id`, `target_language`, options.
  - Returns translation `job_id`.

- `GET /v1/jobs/:id/translation`
  - Returns translation segments aligned with transcript segments.

- `GET /v1/review-items`
  - Filters: `status`, `language`, `project_id`, `reason_code`.

- `POST /v1/review-items/:id/resolve`
  - Body: `decision`, `revised_text`, `notes`.

- `POST /v1/exports`
  - Body: `job_id`, `format`.
  - Returns `export_job_id`.

- `GET /v1/exports/:id`
  - Returns export status and download URL when ready.

- `GET /v1/search`
  - Query: `q`, filters.
  - Returns ranked segments via hybrid retrieval.

- `POST /v1/evaluations`
  - Trigger benchmark run for configured dataset/model.

- `GET /v1/admin/metrics`
  - Returns operational and quality metrics.

### 7.2 MCP Interface (Optional)

MCP tools (examples): [cite:272][cite:267]

- `create_transcription_job`
- `get_job_status`
- `get_transcript`
- `create_translation_job`
- `get_translation`
- `list_review_items`
- `resolve_review_item`
- `search_segments`
- `run_benchmark`
- `get_benchmark_report`

MCP resources (examples):

- `resource://jobs/{id}`
- `resource://transcripts/{job_id}`
- `resource://translations/{job_id}`
- `resource://benchmarks/{run_id}`
- `resource://glossaries/{workspace_id}`

---

## 8. Process View (Key Flows)

### 8.1 Ingestion & Transcription

1. User uploads audio via signed URL.
2. Media service creates `media_asset` and validates file.
3. User or API creates a transcription job.
4. Job orchestrator enqueues an ASR task.
5. ASR worker fetches audio, calls ASR provider, and writes `transcript_segment` rows.
6. Quality service computes confidence and creates `review_item`s where needed.
7. Job status transitions from `queued → processing → completed` or `failed`.

### 8.2 Translation

1. User or system creates translation job referencing a completed transcription job.
2. Translation worker reads transcript segments and calls MT provider.
3. Translation segments are stored aligned to source segments.
4. Quality service scores segments and flags them for review as needed.

### 8.3 Human Review

1. Review service lists `review_item`s for reviewers.
2. Reviewer opens an item, sees source audio/segment, current output, confidence, and glossary hints.
3. Reviewer approves or edits text and submits `review_decision`.
4. Review service updates `review_item.status` and segment text accordingly.
5. Corrections feed into evaluation and potential training datasets.

### 8.4 Search & Retrieval

1. Indexer reads approved or in‑review segments and pushes them to Qdrant with metadata payloads.
2. Search API performs vector similarity with filters for language, region, project, review state, etc. [cite:277]
3. Client receives ranked results with snippets and timestamps.

### 8.5 Evaluation

1. Evaluation run is created referencing a fixed benchmark dataset (Yoruba audio with gold transcripts/translations). [cite:127]
2. Worker runs ASR/MT on the benchmark and computes metrics (WER, CER, entity accuracy, etc.).
3. Results are stored in `evaluation_run` and surfaced in admin dashboards.

---

## 9. Deployment View

### 9.1 Recommended Stack

- **Frontend:** Next.js/React, TypeScript.
- **Backend:** Node.js/TypeScript services; Python for ML/ASR/MT wrappers.
- **Database:** PostgreSQL.
- **Queue:** Redis/RabbitMQ.
- **Object Storage:** S3‑compatible.
- **Vector DB:** Qdrant (self‑hosted or managed). [cite:277][cite:268]
- **Monitoring:** Prometheus + Grafana, or equivalent.

### 9.2 Environments

- `dev`: rapid iteration, mock providers allowed.
- `staging`: full integration with real providers and Qdrant.
- `prod`: hardened, audited, with data retention and security policies enforced.

---

## 10. Quality Scenarios

- **Performance**
  - Transcription and translation jobs scale horizontally with worker processes.
  - Search latency kept low using Qdrant’s ANN + payload filtering. [cite:277]

- **Reliability**
  - All jobs idempotent; retries do not corrupt state.
  - Workers checkpoint progress for large jobs.

- **Security**
  - Workspace RBAC; per‑resource permission checks.
  - Signed URLs for uploads/downloads.
  - Encryption at rest for DB and object storage.

- **Maintainability**
  - Service boundaries follow domain concepts.
  - Shared domain logic extracted into libraries.

- **Evolution**
  - ASR/MT provider abstraction for swapping models or vendors.
  - Vector DB abstraction for potential future backends.

---

## 11. Architectural Decisions (ADR‑style)

- **ADR‑001: API‑first architecture**
  - All UI and external integrations use the same API.
- **ADR‑002: Yoruba‑first rollout**
  - Start with Yoruba; add languages one‑by‑one with evaluation.
- **ADR‑003: Qdrant as primary vector DB**
  - Choose Qdrant for strong payload filtering and performance on localized RAG/search. [cite:277][cite:268]
- **ADR‑004: Human‑in‑the‑loop as permanent**
  - Human review is a standing subsystem; not removed even as models improve. [cite:127]
- **ADR‑005: Optional MCP server**
  - Add MCP server to expose tools/resources directly to AI clients; keep it thin and stateless over core services. [cite:272][cite:267]

---

## 12. Open Questions

- How will evaluation datasets be governed with communities and language experts?
- What thresholds and policies will decide when a language is “supported” beyond experimental use?
- How will pricing and quotas be structured across workspaces?
- When to move from “review everything” to risk‑based review?
