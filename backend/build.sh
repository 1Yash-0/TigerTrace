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
    local auth=()
    [ -n "${MODEL_TOKEN:-}" ] && auth=(-H "Authorization: Bearer ${MODEL_TOKEN}")
    curl -L --fail --retry 3 --silent --show-error "${auth[@]}" -o "$dest" "$url"
    if md5_ok "$dest" "$md5"; then
        echo "[build] $(basename "$dest"): downloaded and verified"
    else
        echo "[build] FATAL: $(basename "$dest") md5 mismatch — deleting bad file" >&2
        rm -f "$dest"
        exit 1
    fi
}

# 1. MDV6-yolov9-c detector — public weights, hosted by Microsoft on Zenodo.
fetch "TigerTrace/models/pretrained/MDV6-yolov9-c.onnx" \
    "3db7988385714066c1515dde6ab56e4c" \
    "https://zenodo.org/api/records/15398270/files/MDV6-yolov9-c.onnx/content"

# 2+3. Trained TigerTrace weights (Re-ID Swin + species classifier).
# Hosted as GitHub Release assets (tag models-v1). Override MODEL_BASE_URL and,
# for private hosting, set MODEL_TOKEN to a bearer token with read access.
MODEL_BASE_URL="${MODEL_BASE_URL:-https://github.com/1Yash-0/TigerTrace/releases/download/models-v1}"

fetch "../models/tigertrace_ptr_v2_side_aware/tigertrace_ptr_v2_side_aware.onnx" \
    "c616592eb5271062b8214578f714eb42" \
    "$MODEL_BASE_URL/tigertrace_ptr_v2_side_aware.onnx"

fetch "TigerTrace/models/exported/classifier/tiger_classifier.onnx" \
    "7b2d9d1c55c97e6344c37d65bd4160a9" \
    "$MODEL_BASE_URL/tiger_classifier.onnx"

echo "[build] All model weights verified. Ready to start."
