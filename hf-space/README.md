---
title: TigerTrace Backend
emoji: 🐅
colorFrom: yellow
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---

# TigerTrace Backend — free private deployment (Hugging Face Space)

This Space runs the full TigerTrace FastAPI backend on the **free** HF tier
(2 vCPU / 16 GB RAM — comfortably fits the 355 MB Re-ID model; no OOM).

Model weights are **not** in this Space and **not** public: at container start,
`start.sh` downloads them from your **private** Hugging Face model repo using
the `HF_TOKEN` secret. Only the Space code and the public GitHub repo are
public.

## Files
- `Dockerfile` — clones the public TigerTrace repo, installs deps, pre-fetches
  the public MDV6 detector (Zenodo, md5-verified).
- `start.sh` — fetches the two private trained weights (md5-verified), seeds
  the SQLite gallery from the repo on first boot, then starts uvicorn on 7860.

## Required secrets (Space -> Settings -> Secrets)
| Secret | Value |
|---|---|
| `HF_TOKEN` | a **read** access token of an account with access to the private weights repo |
| `MODEL_BASE_URL` | `https://huggingface.co/<your-user>/<your-weights-repo>/resolve/main` |

## Notes
- SQLite lives on the ephemeral Space disk and re-seeds from
  `backend/seed/pench_ai_seed.db` on every restart — the registered gallery
  always comes back, but captures/enrollments made online are lost on restart
  (persistent storage is a paid option).
- Cold starts re-download ~370 MB of private weights (~2-4 min).
