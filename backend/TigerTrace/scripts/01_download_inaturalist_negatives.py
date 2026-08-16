"""
Fast multi-threaded downloader for research-grade iNaturalist images of Pench confuser species.
Downloads real negatives for tiger classifier in parallel with ThreadPoolExecutor.
"""

import os
import time
import csv
import requests
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from tqdm import tqdm

# --- Target species: (folder_name, taxon_id, target_count) ---
# Taxon IDs verified via iNaturalist /v1/taxa API on 2026-08-16
SPECIES = [
    ("leopard",    41963,  400),   # Panthera pardus     (14k obs)
    ("sambar",     75053,  300),   # Rusa unicolor       (7.4k obs)
    ("chital",     42166,  300),   # Axis axis           (9.7k obs)
    ("wild_boar",  42134,  200),   # Sus scrofa          (70k obs)
    ("sloth_bear", 41651,  200),   # Melursus ursinus    (1.3k obs)
    ("gaur",       74111,  100),   # Bos gaurus          (2.7k obs)
]

BASE_URL = "https://api.inaturalist.org/v1/observations"
OUT_BASE = Path("data/negatives")
MANIFEST_PATH = OUT_BASE / "negatives_manifest.csv"

def get_photo_urls(taxon_id: int, n: int) -> list[dict]:
    """Fetch up to n research-grade photo URLs for a taxon from iNaturalist API."""
    results = []
    page = 1
    per_page = min(200, n)

    headers = {"User-Agent": "WildlifeClassifierResearch/1.0"}
    while len(results) < n:
        params = {
            "taxon_id": taxon_id,
            "quality_grade": "research",
            "photos": "true",
            "per_page": per_page,
            "page": page,
            "order": "votes",
            "order_by": "votes",
        }
        try:
            r = requests.get(BASE_URL, params=params, headers=headers, timeout=20)
            r.raise_for_status()
            data = r.json()
        except Exception as e:
            print(f"  API error page {page}: {e}")
            break

        obs_list = data.get("results", [])
        if not obs_list:
            break

        for obs in obs_list:
            if len(results) >= n:
                break
            photos = obs.get("photos", [])
            if not photos:
                continue
            photo = photos[0]
            url = photo.get("url", "")
            if not url:
                continue
            url_medium = url.replace("square", "medium")
            results.append({
                "obs_id": obs.get("id"),
                "photo_id": photo.get("id"),
                "url": url_medium,
                "license": photo.get("license_code", "unknown"),
            })

        if len(obs_list) < per_page:
            break

        page += 1
        time.sleep(0.2)

    return results

def download_single_item(item, species_name, species_dir):
    fname = f"{species_name}_{item['obs_id']}_{item['photo_id']}.jpg"
    dest = species_dir / fname
    if dest.exists() and dest.stat().st_size > 1000:
        return {
            "filepath": str(dest.as_posix()),
            "species": species_name,
            "label": 1,
            "obs_id": item["obs_id"],
            "photo_id": item["photo_id"],
            "license": item["license"],
        }
    try:
        r = requests.get(item["url"], timeout=15, headers={"User-Agent": "WildlifeResearch/1.0"})
        if r.status_code == 200 and len(r.content) > 1000:
            with open(dest, "wb") as f:
                f.write(r.content)
            return {
                "filepath": str(dest.as_posix()),
                "species": species_name,
                "label": 1,
                "obs_id": item["obs_id"],
                "photo_id": item["photo_id"],
                "license": item["license"],
            }
    except Exception:
        pass
    return None

def main():
    OUT_BASE.mkdir(parents=True, exist_ok=True)
    manifest_rows = []

    print("=" * 60)
    print("DOWNLOADING CONFUSER SPECIES FOR TIGER CLASSIFIER")
    print("=" * 60)

    for species_name, taxon_id, target in SPECIES:
        species_dir = OUT_BASE / species_name
        species_dir.mkdir(parents=True, exist_ok=True)

        print(f"\n[{species_name.upper()}] Querying iNaturalist API for {target} records...")
        photo_data = get_photo_urls(taxon_id, n=target)
        print(f"  Found {len(photo_data)} observations. Downloading images in parallel...")

        downloaded = 0
        with ThreadPoolExecutor(max_workers=16) as executor:
            futures = [
                executor.submit(download_single_item, pd, species_name, species_dir)
                for pd in photo_data
            ]
            for fut in tqdm(as_completed(futures), total=len(futures), desc=f"Downloading {species_name}"):
                res = fut.result()
                if res is not None:
                    manifest_rows.append(res)
                    downloaded += 1

        print(f"  Successfully saved {downloaded} images for {species_name}.")

    if manifest_rows:
        with open(MANIFEST_PATH, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["filepath", "species", "label", "obs_id", "photo_id", "license"])
            writer.writeheader()
            writer.writerows(manifest_rows)

    print("\n" + "=" * 60)
    print(f"DOWNLOAD COMPLETE: {len(manifest_rows)} total negatives downloaded.")
    print(f"Manifest written to: {MANIFEST_PATH}")
    print("=" * 60)

if __name__ == "__main__":
    main()
