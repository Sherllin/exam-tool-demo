# 考试工具 Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a runnable Next.js and FastAPI exam-tool demo that implements the PRD-first print configuration and class-average comparison flows with an optional LLM title suggestion.

**Architecture:** A Next.js App Router frontend calls a FastAPI backend through a `/api` rewrite. FastAPI serves deterministic demo data and an OpenAI-compatible title-suggestion adapter with explicit local fallback; the frontend keeps the single current print configuration in page state.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, native CSS, Vitest, Testing Library, FastAPI, Pydantic, httpx, pytest, uv

**Spec:** `docs/superpowers/specs/2026-08-27-exam-tool-demo-design.md`

## Global Constraints

- PRD V1.0 overrides conflicting Figma behavior.
- Do not add saved templates, multiple templates, rankings, trends, charts, automatic diagnosis, or English-essay grading.
- Label all seeded records as demo data and keep the real-customer-sample dependency visible.
- LLM suggestions never change scores and must have an explicit local fallback.
- Use native CSS and project components; do not add Tailwind.

---

### Task 1: FastAPI contracts and demo data

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/tests/test_api.py`
- Create: `backend/app/models.py`
- Create: `backend/app/demo_data.py`
- Create: `backend/app/main.py`

**Interfaces:**
- Produces: `GET /api/health`, `GET /api/dashboard`, `GET /api/exams/{exam_id}/print-data`, and `GET /api/exams/{exam_id}/class-averages`.

- [x] Write API tests that assert the health response, supported print fields, student-score integrity, class-average columns, and exam/grade isolation.
- [x] Run `uv run pytest tests/test_api.py -q` from `backend/` and confirm collection fails because `app.main` does not exist.
- [x] Implement Pydantic response models, one deterministic demo dataset, and the four routes.
- [x] Run `uv run pytest tests/test_api.py -q` and confirm all tests pass.

### Task 2: LLM title suggestion adapter

**Files:**
- Create: `backend/tests/test_llm.py`
- Create: `backend/app/settings.py`
- Create: `backend/app/llm.py`
- Modify: `backend/app/main.py`
- Create: `backend/.env.example`

**Interfaces:**
- Consumes: `TitleSuggestionRequest(exam_name, grade, document_type)`.
- Produces: `POST /api/llm/title-suggestion` returning `{title, source, message}` where source is `provider` or `fallback`.

- [x] Write tests for missing-configuration fallback, successful compatible-provider parsing, malformed upstream fallback, and API response shape.
- [x] Run the focused tests and confirm failure because `app.llm` does not exist.
- [x] Implement environment settings, async httpx adapter, response sanitization, timeout handling, and the API route.
- [x] Run all backend tests and confirm they pass.

### Task 3: Frontend behavior and API client

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/vitest.config.ts`
- Create: `frontend/src/__tests__/setup.ts`
- Create: `frontend/src/__tests__/print-config.test.ts`
- Create: `frontend/src/lib/types.ts`
- Create: `frontend/src/lib/print-config.ts`
- Create: `frontend/src/lib/api.ts`

**Interfaces:**
- Produces: `moveField(fields, fieldId, direction)`, `toggleField(fields, fieldId)`, typed API functions, and shared response types.

- [x] Write tests that assert moving fields, hiding fields, and retaining at least one visible field.
- [x] Install dependencies and run the focused test, confirming it fails because `print-config.ts` does not exist.
- [x] Implement the minimal immutable field helpers and typed fetch wrapper.
- [x] Run the focused test and confirm it passes.

### Task 4: PRD-first pages and Figma-aligned shell

**Files:**
- Create: `frontend/src/__tests__/pages.test.tsx`
- Create: `frontend/src/app/layout.tsx`
- Create: `frontend/src/app/page.tsx`
- Create: `frontend/src/app/print/page.tsx`
- Create: `frontend/src/app/comparison/page.tsx`
- Create: `frontend/src/app/globals.css`
- Create: `frontend/src/components/app-shell.tsx`
- Create: `frontend/src/components/dashboard.tsx`
- Create: `frontend/src/components/print-designer.tsx`
- Create: `frontend/src/components/average-table.tsx`
- Create: `frontend/next.config.ts`

**Interfaces:**
- Consumes: typed backend responses and print-config helpers.
- Produces: three navigable, responsive pages and browser-print output.

- [x] Write component tests for dashboard links, print application behavior, LLM source labeling, and total/subject average table columns.
- [x] Run the tests and confirm failure because the page components do not exist.
- [x] Implement the shell and pages using semantic Grid/Flex CSS, accessible controls, loading/error states, and print styles.
- [x] Run frontend tests and TypeScript checking; fix only implementation defects.

### Task 5: Project operation and end-to-end verification

**Files:**
- Create: `Makefile`
- Create: `README.md`
- Create: `.gitignore`

**Interfaces:**
- Produces: `make setup`, `make dev`, and `make test` workflows.

- [x] Add documented setup, LLM configuration, scope limits, and startup commands.
- [x] Run `uv run pytest -q`, `pnpm test --run`, `pnpm exec tsc --noEmit`, and `pnpm build`.
- [x] Start FastAPI and Next.js, verify `/api/health`, then smoke-test all three pages and their navigation at runtime.
- [x] Review the spec line by line against the UI and API, ensuring no out-of-scope feature is presented as delivered.
