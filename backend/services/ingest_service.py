"""
SD-Card Ingestion Watcher
Detects removable camera-trap memory cards, stages them safely, and feeds
the existing triage pipeline. Designed for the deployed single-machine setup:
a daemon thread inside the FastAPI process polls psutil every few seconds
(watchdog cannot see drive arrival), and ingestion only starts after an
operator confirms the station assignment in the UI — never autorun.
"""
import hashlib
import os
import shutil
import threading
import time
from datetime import datetime
from pathlib import Path

import psutil
from database import BACKEND_DIR, CameraStation

# ── Tunables ───────────────────────────────────────────────────────────────────
POLL_SECONDS        = 4.0
STAGING_ROOT        = BACKEND_DIR / "data" / "ingest"
VALID_IMAGE_EXTS    = {".jpg", ".jpeg", ".png", ".bmp"}
VALID_VIDEO_EXTS    = {".avi", ".mp4", ".mov"}
# Camera cards are FAT-family. NTFS would catch internal drives / Google Drive
# desktop mounts that happen to expose files at the root.
CAMERA_FS_TYPES     = {"vfat", "fat", "fat32", "exfat", "msdos", "tfat"}
INGESTED_HASHES_FILE = STAGING_ROOT / "ingested_hashes.txt"

STAGING_ROOT.mkdir(parents=True, exist_ok=True)

# ── Watcher state (shared with the API layer) ──────────────────────────────────


class DetectedCard:
    def __init__(self, mount: str, label: str, fs_type: str, image_count: int,
                 video_count: int, total_bytes: int):
        self.mount = mount
        self.label = label
        self.fs_type = fs_type
        self.image_count = image_count
        self.video_count = video_count
        self.total_bytes = total_bytes
        self.detected_at = datetime.utcnow().isoformat()

    def to_dict(self):
        return {
            "mount": self.mount,
            "label": self.label,
            "fs_type": self.fs_type,
            "image_count": self.image_count,
            "video_count": self.video_count,
            "total_mb": round(self.total_bytes / (1024 * 1024), 1),
            "detected_at": self.detected_at,
        }


class IngestJob:
    """One confirmed card-import run. Progress is readable by the API."""

    def __init__(self, job_id: str, station_id: str, mount: str, files: list):
        self.job_id = job_id
        self.station_id = station_id
        self.mount = mount
        self.files = files
        self.started_at = datetime.utcnow()
        self.stage = "copying"          # copying -> triaging -> done | error
        self.total_files = len(files)
        self.copied_files = 0
        self.skipped_files = 0          # already ingested (hash dedup)
        self.blank_files = 0
        self.retained_files = 0
        self.saved_mb = 0.0
        self.error = None
        self.finished_at = None
        self._lock = threading.Lock()

    def snapshot(self) -> dict:
        with self._lock:
            return {
                "job_id": self.job_id,
                "station_id": self.station_id,
                "mount": self.mount,
                "started_at": self.started_at.isoformat(),
                "finished_at": self.finished_at.isoformat() if self.finished_at else None,
                "stage": self.stage,
                "total_files": self.total_files,
                "copied_files": self.copied_files,
                "skipped_files": self.skipped_files,
                "blank_files": self.blank_files,
                "retained_files": self.retained_files,
                "saved_mb": round(self.saved_mb, 2),
                "error": self.error,
            }

    def _update(self, **kwargs):
        with self._lock:
            for k, v in kwargs.items():
                setattr(self, k, v)


# ── Module state ───────────────────────────────────────────────────────────────

_state_lock = threading.Lock()
_pending_cards: dict[str, DetectedCard] = {}   # mount -> card
_known_mounts: set[str] = set()
_active_job: IngestJob | None = None
_watcher_thread: threading.Thread | None = None


def _load_ingested_hashes() -> set[str]:
    if INGESTED_HASHES_FILE.exists():
        return set(INGESTED_HASHES_FILE.read_text(encoding="utf-8").split())
    return set()


def _record_ingested_hash(h: str):
    INGESTED_HASHES_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(INGESTED_HASHES_FILE, "a", encoding="utf-8") as f:
        f.write(h + "\n")


def _looks_like_camera_card(mount: Path) -> bool:
    """A camera card has a DCIM folder, or a folder of images/videos at depth ≤2.

    Google Drive's virtual mount exposes a drive letter with loose files at the
    root, so depth-1 loose files alone are NOT enough — require either DCIM or
    a dedicated media folder (typical trap layouts: DCIM/100MEDIA, Reconyx DCIM).
    """
    if (mount / "DCIM").is_dir():
        return True
    level = [mount]
    for depth in range(2):
        next_level = []
        for d in level:
            try:
                for child in d.iterdir():
                    if child.is_file() and child.suffix.lower() in (VALID_IMAGE_EXTS | VALID_VIDEO_EXTS):
                        # Loose media at the card root is normal for some traps,
                        # but only when nothing else dominates the root (drive-like roots
                        # like Google Drive have system folders + a couple of stray files).
                        if depth == 0:
                            return False  # root-level loose media → not a trap layout; keep scanning
                        return True
                    if child.is_dir() and child.name not in {
                        "$RECYCLE.BIN", "System Volume Information", "My Drive",
                        "Other computers", "lost+found", ".Trash-1000",
                    }:
                        next_level.append(child)
            except (PermissionError, OSError):
                continue
        level = next_level
    return False


def _scan_card(mount: Path) -> tuple[list[Path], int, int]:
    """Walk the card recursively; return (image files, video count, total bytes)."""
    images, videos, total = [], 0, 0
    for root, _dirs, names in os.walk(mount):
        for name in names:
            p = Path(root) / name
            ext = p.suffix.lower()
            try:
                if ext in VALID_IMAGE_EXTS:
                    images.append(p)
                    total += p.stat().st_size
                elif ext in VALID_VIDEO_EXTS:
                    videos += 1
                    total += p.stat().st_size
            except OSError:
                continue
    return images, videos, total


def _watch_loop():
    global _active_job
    while True:
        try:
            current = set()
            for part in psutil.disk_partitions(all=True):
                mount = part.mountpoint
                current.add(mount)
                if mount in _known_mounts:
                    continue
                if part.fstype and part.fstype.lower() not in CAMERA_FS_TYPES:
                    continue
                # Skip the fixed system filesystems we always see
                if part.opts and ("cdrom" in part.opts or "fixed" in part.opts):
                    continue
                try:
                    m = Path(mount)
                    if m == Path.cwd() or mount in ("/", "/boot", "/boot/efi"):
                        continue
                    if not m.is_dir() or not _looks_like_camera_card(m):
                        _known_mounts.add(mount)
                        continue
                    images, videos, total = _scan_card(m)
                    if images:
                        with _state_lock:
                            _pending_cards[mount] = DetectedCard(
                                mount=mount,
                                label=part.device or mount,
                                fs_type=part.fstype or "",
                                image_count=len(images),
                                video_count=videos,
                                total_bytes=total,
                            )
                except Exception as e:
                    print(f"[WARN] ingest watcher: skipping {mount}: {e}")
                _known_mounts.add(mount)

            # Cards that vanished (removed) drop out of pending
            with _state_lock:
                for gone in set(_pending_cards) - current:
                    del _pending_cards[gone]
        except Exception as e:
            print(f"[WARN] ingest watcher loop error: {e}")
        time.sleep(POLL_SECONDS)


def start_watcher():
    """Start the card-detection daemon thread once (idempotent)."""
    global _watcher_thread
    if _watcher_thread is not None and _watcher_thread.is_alive():
        return
    _watcher_thread = threading.Thread(target=_watch_loop, name="sd-card-watcher", daemon=True)
    _watcher_thread.start()
    print("[INFO] SD-card ingest watcher started (poll every {:.0f}s)".format(POLL_SECONDS))


def get_pending_cards() -> list[dict]:
    with _state_lock:
        return [c.to_dict() for c in _pending_cards.values()]


def get_active_job() -> dict | None:
    with _state_lock:
        return _active_job.snapshot() if _active_job else None


def _exif_timestamp(path: Path) -> datetime | None:
    """EXIF DateTimeOriginal via Pillow, falling back to file mtime."""
    try:
        from PIL import Image

        img = Image.open(path)
        exif = img.getexif()
        raw = exif.get(36867) or exif.get(306)  # DateTimeOriginal | DateTime
        if raw:
            return datetime.strptime(str(raw), "%Y:%m:%d %H:%M:%S")
    except Exception:
        pass
    try:
        return datetime.fromtimestamp(path.stat().st_mtime)
    except OSError:
        return None


def _sha256(path: Path) -> str | None:
    h = hashlib.sha256()
    try:
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(1 << 20), b""):
                h.update(chunk)
        return h.hexdigest()
    except OSError:
        return None


def start_ingest(mount: str, station_id: str, db_session_factory) -> dict:
    """
    Confirm-and-run: copy the card to staging (hash-dedup, EXIF rename),
    then triage the staged images and identify retained animals.
    Runs in a background thread; progress via get_active_job().
    """
    global _active_job
    with _state_lock:
        if _active_job is not None and _active_job.stage not in ("done", "error"):
            active = _active_job.snapshot()
            raise RuntimeError(f"Another import is already running (stage: {active['stage']})")
        card = _pending_cards.get(mount)
        if card is None:
            raise RuntimeError("Card not detected. Re-insert it and wait a few seconds.")

    images, _videos, _total = _scan_card(Path(mount))
    if not images:
        raise RuntimeError("No images found on the card.")

    job = IngestJob(
        job_id=f"{station_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
        station_id=station_id,
        mount=mount,
        files=images,
    )
    with _state_lock:
        _active_job = job

    def _run():
        try:
            ingested_hashes = _load_ingested_hashes()
            batch_dir = STAGING_ROOT / job.job_id
            batch_dir.mkdir(parents=True, exist_ok=True)
            staged: list[Path] = []

            # ── Stage 1: copy + hash-dedup + EXIF rename ──
            for src in job.files:
                digest = _sha256(src)
                if digest is None:
                    continue
                if digest in ingested_hashes:
                    job._update(skipped_files=job.skipped_files + 1)
                    continue
                ts = _exif_timestamp(src)
                stamp = ts.strftime("%Y%m%d_%H%M%S") if ts else datetime.utcnow().strftime("%Y%m%d_%H%M%S")
                dest = batch_dir / f"{station_id}_{stamp}_{digest[:8]}{src.suffix.lower()}"
                try:
                    shutil.copy2(src, dest)
                except OSError as e:
                    job._update(error=f"copy failed on {src.name}: {e}", stage="error")
                    return
                ingested_hashes.add(digest)
                _record_ingested_hash(digest)
                staged.append(dest)
                job._update(copied_files=job.copied_files + 1)

            if not staged:
                job._update(stage="done", finished_at=datetime.utcnow())
                return

            # ── Stage 2: triage (blank filtering) on staged files ──
            job._update(stage="triaging")
            from services.triage_service import run_triage
            result = run_triage(str(batch_dir))

            # Retained/quarantined files now live in the shared dirs;
            # identify each retained image and record captures.
            retained_names = {e["file"] for e in result["log"] if e["status"] == "retained"}
            job._update(
                blank_files=result["blanks_removed"],
                retained_files=result["retained"],
                saved_mb=result["saved_mb"],
            )

            # ── Stage 3: identify retained tigers, persist batch ──
            from database import Capture, IngestBatch, ReviewQueue, SessionLocal, Tiger
            from services.identification_service import identify_tiger

            db = db_session_factory()
            try:
                station = db.query(CameraStation).filter(CameraStation.station_id == station_id).first()
                # A confirmed import must retain the selected real station's
                # coordinates.  Keep a conservative fallback for legacy/manual
                # station IDs that are not in the PTR workbook.
                latitude = station.latitude if station else 21.78
                longitude = station.longitude if station else 79.44
                zone = station.zone if station and station.zone else "unclassified"
                for name in retained_names:
                    staged_path = str(batch_dir / name)
                    if not os.path.exists(staged_path):
                        continue
                    idb = identify_tiger(staged_path, db)
                    status = idb.get("status")
                    top = idb.get("top_match") or {}
                    if status == "auto_matched":
                        tiger = db.query(Tiger).filter(Tiger.tiger_id == top.get("tiger_id")).first()
                        if tiger:
                            db.add(Capture(
                                tiger_id=top["tiger_id"],
                                image_path=staged_path,
                                station_id=station_id,
                                latitude=latitude, longitude=longitude,
                                timestamp=_exif_timestamp(Path(staged_path)) or datetime.utcnow(),
                                confidence=top.get("confidence", 0.9),
                                zone=zone,
                                flank_side=idb.get("flank_side", "Unknown"),
                                source_dataset="sd_card_ingest",
                                source_filename=name,
                                source_grid_id=station.grid_id if station else None,
                            ))
                            tiger.total_captures = db.query(Capture).filter(
                                Capture.tiger_id == top["tiger_id"]
                            ).count() + 1
                    # ambiguous/new_individual already sit in ReviewQueue via identify_tiger
                db.add(IngestBatch(
                    job_id=job.job_id,
                    station_id=station_id,
                    total_files=job.total_files,
                    copied_files=job.copied_files,
                    skipped_duplicates=job.skipped_files,
                    blanks=job.blank_files,
                    retained=job.retained_files,
                    saved_mb=job.saved_mb,
                ))
                # Alert engine must see the new captures
                from services.alert_service import run_alert_engine
                run_alert_engine(db)
                db.commit()
            finally:
                db.close()

            job._update(stage="done", finished_at=datetime.utcnow())
        except Exception as e:
            job._update(error=str(e), stage="error")
            print(f"[ERROR] ingest job {job.job_id}: {e}")

    threading.Thread(target=_run, name=f"ingest-{job.job_id}", daemon=True).start()
    return job.snapshot()
