"""
Modal deployment for the TigerTrace backend — free tier ($30/month credits).

Why Modal: the backend needs ~1 GB RAM to hold the ONNX models in memory.
Render free (512 MB) OOM-kills, and HF Docker Spaces are now paid. Modal's
free credits cover 2 vCPU / 2 GB containers, which run the real models with
~1-3 s per identification.

Weights stay PRIVATE: they are fetched at image build time from your private
Hugging Face repo using a Modal secret. The image is private to your Modal
workspace.

One-time setup:
  1. pip install modal && modal token new        (login via GitHub)
  2. modal dashboard -> Secrets -> Create secret, name it `tigertrace-models`:
       MODEL_BASE_URL = https://huggingface.co/<user>/tigertrace-models/resolve/main
       MODEL_TOKEN    = <your HF read token>
  3. modal deploy modal_app.py

Modal prints the public URL (https://<workspace>--....modal.run). Verify with
<url>/api/health — all three models_present flags must be true. Point Vercel's
NEXT_PUBLIC_API_URL at that URL.

Or wire auto-deploy via .github/workflows/deploy-modal.yml with a MODAL_TOKEN
secret in the GitHub repo.
"""

import modal

app = modal.App("tigertrace-backend")

# Secret must exist in the Modal dashboard (see docstring) and contain
# MODEL_BASE_URL + MODEL_TOKEN for the private Hugging Face weights repo.
_model_secret = modal.Secret.from_name("tigertrace-models")

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("git", "curl")
    # Clone the public app repo and install its (torch-free) requirements.
    .run_commands(
        "git clone --depth 1 https://github.com/1Yash-0/TigerTrace.git /app",
        "cd /app/backend && pip install --no-cache-dir -r requirements.txt",
    )
    # Public MDV6 detector: download + md5-verify at build (no secret needed).
    .run_commands(
        "mkdir -p /app/backend/TigerTrace/models/pretrained"
        " && curl -L --fail --retry 3 -o /app/backend/TigerTrace/models/pretrained/MDV6-yolov9-c.onnx"
        " 'https://zenodo.org/api/records/15398270/files/MDV6-yolov9-c.onnx/content'"
        " && echo '3db7988385714066c1515dde6ab56e4c  /app/backend/TigerTrace/models/pretrained/MDV6-yolov9-c.onnx' | md5sum -c -"
    )
    # Private trained weights: build.sh downloads + md5-verifies them with the
    # MODEL_TOKEN from the secret. Baked into the image -> no download at
    # cold start, ~1-2 min deploys, fast wakeups.
    .run_commands(
        "cd /app/backend && bash build.sh",
        secrets=_model_secret,
    )
    .env(
        {
            # Ephemeral disk: the gallery self-seeds from
            # backend/seed/pench_ai_seed.db on every cold start.
            "DATABASE_PATH": "/tmp/tigertrace/pench_ai.db",
            "IMAGE_DIR": "/tmp/tigertrace/images",
        }
    )
)


@app.function(
    image=image,
    secrets=[_model_secret],
    memory=2048,   # MB — 355 MB Re-ID + 101 MB detector + stack, with headroom
    cpu=2,
    timeout=300,
    scaledown_window=600,  # stay warm 10 min after the last request
)
@modal.asgi_app()
def backend():
    import os
    import sys

    sys.path.insert(0, "/app/backend")
    os.chdir("/app/backend")
    from main import app as fastapi_app  # noqa: E402

    return fastapi_app
