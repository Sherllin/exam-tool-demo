SHELL := /bin/zsh

.PHONY: setup dev test build verify

setup:
	cd backend && uv sync
	cd frontend && corepack pnpm install

dev:
	@echo "Starting FastAPI at http://127.0.0.1:8000 and Next.js at http://127.0.0.1:3002"
	@trap 'kill $$backend_pid $$frontend_pid 2>/dev/null || true' INT TERM EXIT; \
	(cd backend && uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000) & backend_pid=$$!; \
	(cd frontend && corepack pnpm dev) & frontend_pid=$$!; \
	wait $$backend_pid $$frontend_pid

test:
	cd backend && uv run pytest -q
	cd frontend && corepack pnpm test --run

build:
	cd frontend && corepack pnpm typecheck
	cd frontend && corepack pnpm build

verify: test build
