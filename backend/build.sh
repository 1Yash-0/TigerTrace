#!/usr/bin/env bash
# TigerTrace backend build (Render / any Linux host).
# Installs Python deps and fetches the three ONNX weights the API requires.
# All downloads are md5-verified; the build FAILS if any weight is missing or
# corrupt — a deploy without real weights would only be able to return 503s.
set -euo pipefail
cd "$(dirname "$0")"

echo "[build] Installing Python dependencies..."
pip install --no-cache-dir -r requirements.txt

md5_ok() { [ "$(md5sum "$1" | cut -d' ' -f1)" = "$2" ]; }

fetch() {
    # fetch <dest> <md5> <url>
    local dest="$1" md5="$2" url="$3"
    if [ -f "$dest" ] && md5_ok "$dest" "$md5"; then
        echo "[build] $(basename "$dest"): already present, checksum ok"
        return 0
    fi
    mkdir -p "$(dirname "$dest")"
    echo "[build] Downloading $(basename "$dest") ..."
    if [ -n "${MODEL_TOKEN:-}" ]; then
        # Private weights (Hugging Face etc.): resolve the authenticated URL
        # first, then download WITHOUT the token header — forwarding it to the
        # CDN would invalidate HF's pre-signed redirect URL.
        local redirect
        redirect=$(curl -sS -o /dev/null -w '%{redirect_url}' \
            -H "Authorization: Bearer ${MODEL_TOKEN}" "$url" || true)
        if [ -n "$redirect" ]; then
            curl -L --fail --retry 3 --silent --show-error -o "$dest" "$redirect"
        else
            curl -L --fail --retry 3 --silent --show-error \
                -H "Authorization: Bearer ${MODEL_TOKEN}" -o "$dest" "$url"
        fi
    else
        curl -L --fail --retry 3 --silent --show-error -o "$dest" "$url"
    fi
    if md5_ok "$dest" "$md5"; then
        echo "[build] $(basename "$dest"): downloaded and verified"
    else
        echo "[build] FATAL: $(basename "$dest") md5 mismatch or download failed" >&2
        if [ -n "${MODEL_TOKEN:-}" ]; then
            echo "[build]        MODEL_TOKEN was set — verify the token is valid and has read access to:" >&2
            echo "[build]        $url" >&2
        fi
        rm -f "$dest"
        exit 1
    fi
}

# 1. MDV6-yolov9-c detector — public weights, hosted by Microsoft on Zenodo.
fetch "TigerTrace/models/pretrained/MDV6-yolov9-c.onnx" \
    "3db7988385714066c1515dde6ab56e4c" \
    "https://zenodo.org/api/records/15398270/files/MDV6-yolov9-c.onnx/content"

# 2+3. Trained TigerTrace weights (Re-ID Swin + species classifier).
# Hosted on a private Hugging Face repo (or GitHub release). Override
# MODEL_BASE_URL and, for private hosting, set MODEL_TOKEN / HF_TOKEN.
# On 512 MB hosts set REID_ONNX_FILENAME=tigertrace_ptr_v2_side_aware_int8.onnx
# and upload that file to the weights repo instead of the 355 MB original.
MODEL_BASE_URL="${MODEL_BASE_URL:-https://github.com/1Yash-0/TigerTrace/releases/download/models-v1}"
REID_FILENAME="${REID_ONNX_FILENAME:-tigertrace_ptr_v2_side_aware.onnx}"
case "$REID_FILENAME" in
    *_int8.onnx) REID_MD5="8c972069fb62b4ad39f92bb147f8f137" ;;
    *)           REID_MD5="c616592eb5271062b8214578f714eb42" ;;
esac

fetch "../models/tigertrace_ptr_v2_side_aware/$REID_FILENAME" \
    "$REID_MD5" \
    "$MODEL_BASE_URL/$REID_FILENAME"

fetch "TigerTrace/models/exported/classifier/tiger_classifier.onnx" \
    "7b2d9d1c55c97e6344c37d65bd4160a9" \
    "$MODEL_BASE_URL/tiger_classifier.onnx"

echo "[build] All model weights verified. Ready to start."
