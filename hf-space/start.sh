#!/usr/bin/env bash
# Runtime entrypoint for the TigerTrace Hugging Face Space (free tier).
# Fetches the two PRIVATE trained weights with the HF_TOKEN secret, seeds the
# gallery database on first boot, then starts uvicorn on the Space port.
set -euo pipefail
cd "$(dirname "$0")"

if [ -z "${MODEL_BASE_URL:-}" ]; then
    echo "[start] FATAL: MODEL_BASE_URL is not set. Add a Space secret:"
    echo "        MODEL_BASE_URL=https://huggingface.co/<user>/<weights-repo>/resolve/main"
    exit 1
fi

# build.sh downloads with `Authorization: Bearer $MODEL_TOKEN`; the Space
# secret is named HF_TOKEN, so map it.
export MODEL_TOKEN="${MODEL_TOKEN:-${HF_TOKEN:-}}"
if [ -z "${MODEL_TOKEN:-}" ]; then
    echo "[start] FATAL: HF_TOKEN secret is missing — private weights are not downloadable."
    exit 1
fi

# Ephemeral disk on the free tier; the gallery self-seeds from
# backend/seed/pench_ai_seed.db on every boot (see backend/database.py).
export DATABASE_PATH="${DATABASE_PATH:-/tmp/tigertrace/pench_ai.db}"
export IMAGE_DIR="${IMAGE_DIR:-/tmp/tigertrace/images}"

bash build.sh

exec python -m uvicorn main:app --host 0.0.0.0 --port "${PORT:-7860}" --workers 1
