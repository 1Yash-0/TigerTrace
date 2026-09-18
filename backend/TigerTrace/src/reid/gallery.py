"""
Persistent Embedding Gallery for Tiger Re-ID.

The gallery stores L2-normalized 512-dim embedding vectors alongside individual_id labels
and flank orientation (Side A/Left vs Side B/Right).
It grows across pipeline runs — new enrollments are appended and saved to disk.
A per-identity centroid (mean embedding) is computed for fairer cosine retrieval.

Storage layout:
  data/gallery/tiger_gallery.npz        — compressed numpy array of all embeddings (N, 512)
  data/gallery/tiger_gallery_index.json — list of individual_ids & flank metadata
"""

import os
import json
import numpy as np
from pathlib import Path
from typing import Optional, Tuple, List, Union, Dict, Any


GALLERY_DIR = Path("data/gallery")
EMBEDDINGS_PATH = GALLERY_DIR / "tiger_gallery.npz"
INDEX_PATH = GALLERY_DIR / "tiger_gallery_index.json"

FLANK_MISMATCH_PENALTY = 0.22


def _normalize_flank(flank: Optional[str]) -> str:
    """Normalize flank identifiers to 'Left', 'Right', or 'Unknown'."""
    if not flank:
        return "Unknown"
    f = str(flank).strip().upper()
    if f in ("A", "LEFT", "L"):
        return "Left"
    if f in ("B", "RIGHT", "R"):
        return "Right"
    return "Unknown"


class PersistentGallery:
    """
    Manages a growing on-disk gallery of 512-D tiger embeddings for side-aware cosine Re-ID retrieval.

    Usage:
        gallery = PersistentGallery()
        gallery.load()
        match_id, dist, decision = gallery.query(q_embedding, q_flank="Left")
        gallery.enroll(new_id, q_embedding, flank="Left")
        gallery.save()
    """

    def __init__(self, gallery_dir: str = "data/gallery", dim: int = 512):
        self.gallery_dir = Path(gallery_dir)
        self.embeddings_path = self.gallery_dir / "tiger_gallery.npz"
        self.index_path = self.gallery_dir / "tiger_gallery_index.json"
        self.dim = dim

        self._embeddings: Optional[np.ndarray] = None   # shape (N, dim)
        self._ids: List[str] = []
        self._flanks: List[str] = []
        self._dirty = False

    def load(self) -> int:
        """Load gallery from disk. Returns number of embeddings loaded."""
        self.gallery_dir.mkdir(parents=True, exist_ok=True)

        if self.embeddings_path.exists() and self.index_path.exists():
            data = np.load(self.embeddings_path)
            loaded_emb = data["embeddings"].astype(np.float32)
            
            with open(self.index_path, "r") as f:
                index_data = json.load(f)

            # Support both list of ids and list of dicts/tuples with flank metadata
            if isinstance(index_data, list):
                if index_data and isinstance(index_data[0], dict):
                    self._ids = [item.get("id", item.get("individual_id", "Unknown")) for item in index_data]
                    self._flanks = [_normalize_flank(item.get("flank", "Unknown")) for item in index_data]
                else:
                    self._ids = [str(item) for item in index_data]
                    self._flanks = ["Unknown"] * len(self._ids)
            else:
                self._ids = []
                self._flanks = []

            if len(self._ids) == len(loaded_emb) and loaded_emb.shape[1] == self.dim:
                self._embeddings = loaded_emb
                print(f"[Gallery] Loaded {len(self._ids)} embeddings ({len(set(self._ids))} individuals) from disk.")
            else:
                print(f"[Gallery] Dimension or count mismatch (expected dim={self.dim}, found {loaded_emb.shape if len(loaded_emb) else 'empty'}) — resetting gallery.")
                self._embeddings = np.empty((0, self.dim), dtype=np.float32)
                self._ids = []
                self._flanks = []
        else:
            self._embeddings = np.empty((0, self.dim), dtype=np.float32)
            self._ids = []
            self._flanks = []
            print("[Gallery] No existing gallery found — starting fresh.")

        return len(self._ids)

    def save(self):
        """Persist gallery to disk only if changed."""
        if not self._dirty:
            return
        self.gallery_dir.mkdir(parents=True, exist_ok=True)
        np.savez_compressed(self.embeddings_path, embeddings=self._embeddings)
        
        index_payload = [
            {"id": tid, "flank": flk}
            for tid, flk in zip(self._ids, self._flanks)
        ]
        with open(self.index_path, "w") as f:
            json.dump(index_payload, f, indent=2)
        print(f"[Gallery] Saved {len(self._ids)} embeddings to disk.")
        self._dirty = False

    @property
    def size(self) -> int:
        return len(self._ids)

    @property
    def num_individuals(self) -> int:
        return len(set(self._ids))

    def _append_embedding(self, embedding: np.ndarray, individual_id: str, flank: str = "Unknown"):
        """Internal: append one embedding row."""
        embedding = embedding.astype(np.float32).reshape(1, -1)
        if self._embeddings is None or len(self._embeddings) == 0:
            self._embeddings = embedding
        else:
            self._embeddings = np.vstack([self._embeddings, embedding])
        self._ids.append(individual_id)
        self._flanks.append(_normalize_flank(flank))
        self._dirty = True

    def enroll(self, individual_id: str, embedding: np.ndarray, flank: str = "Unknown"):
        """Add a new crop embedding to the gallery (new or existing individual)."""
        # Ensure L2 normalization
        vec = np.asarray(embedding, dtype=np.float32).flatten()
        norm = np.linalg.norm(vec)
        if norm > 1e-8:
            vec = vec / norm
        self._append_embedding(vec, individual_id, flank)

    def get_centroid_gallery(self) -> Tuple[np.ndarray, List[str], List[str]]:
        """
        Returns a deduplicated gallery where each individual is represented
        by the mean (centroid) of all their embeddings — L2-renormalized.
        Returns: (centroids, unique_ids, dominant_flanks)
        """
        if self._embeddings is None or len(self._embeddings) == 0:
            return np.empty((0, self.dim), dtype=np.float32), [], []

        unique_ids = list(dict.fromkeys(self._ids))  # preserve order, dedupe
        centroids = []
        dominant_flanks = []

        for uid in unique_ids:
            indices = [idx for idx, i in enumerate(self._ids) if i == uid]
            mean_emb = self._embeddings[indices].mean(axis=0)
            norm = np.linalg.norm(mean_emb)
            if norm > 1e-8:
                mean_emb = mean_emb / norm
            centroids.append(mean_emb)

            flanks_for_uid = [self._flanks[idx] for idx in indices if self._flanks[idx] != "Unknown"]
            dom_flank = flanks_for_uid[0] if flanks_for_uid else "Unknown"
            dominant_flanks.append(dom_flank)

        return np.stack(centroids, axis=0).astype(np.float32), unique_ids, dominant_flanks

    def query(self, q_embedding: np.ndarray,
              q_flank: str = "Unknown",
              auto_match_dist: float = 0.30,   # dist <= 0.30 <=> similarity >= 0.70
              ambiguous_dist: float = 0.45,    # dist <= 0.45 <=> similarity >= 0.55
              margin_min: float = 0.05,
              quality_score: float = 1.0,
              quality_min: float = 0.50) -> Tuple[str, float, str]:
        """
        Query the gallery using centroid-based flank-routed cosine retrieval.

        Returns:
            (assigned_id, top1_distance, decision)
            decision: 'AUTO_MATCH' | 'REVIEW_AMBIGUOUS' | 'AUTO_ENROLL_NEW'
        """
        centroids, unique_ids, gallery_flanks = self.get_centroid_gallery()

        if len(centroids) == 0:
            return "PENCH_UNK_NOGALLERY", 1.0, "AUTO_ENROLL_NEW"

        # Cosine similarity via dot product (embeddings are unit L2-normalized)
        q = q_embedding.astype(np.float32).reshape(1, -1)
        norm = np.linalg.norm(q)
        if norm > 1e-8:
            q = q / norm

        raw_sims = (q @ centroids.T).flatten()   # (num_individuals,)
        q_flank_norm = _normalize_flank(q_flank)

        # Apply Flank Routing Strategy with soft penalty
        routed_sims = np.zeros_like(raw_sims)
        for i, (sim, g_flank) in enumerate(zip(raw_sims, gallery_flanks)):
            if q_flank_norm != "Unknown" and g_flank != "Unknown":
                if q_flank_norm == g_flank:
                    routed_sims[i] = sim
                else:
                    routed_sims[i] = sim - FLANK_MISMATCH_PENALTY
            elif q_flank_norm == "Unknown" or g_flank == "Unknown":
                routed_sims[i] = sim - (FLANK_MISMATCH_PENALTY * 0.5)
            else:
                routed_sims[i] = sim

        dists = 1.0 - routed_sims
        order = np.argsort(dists)

        top1_idx = int(order[0])
        top1_dist = float(dists[top1_idx])
        top1_sim = float(routed_sims[top1_idx])
        top1_id = unique_ids[top1_idx]

        margin = float(dists[order[1]] - top1_dist) if len(order) > 1 else 0.0

        # Decision Thresholds per Specification:
        # >= 0.70 similarity (top1_dist <= 0.30): AUTO_MATCH
        # 0.55 - 0.70 similarity (top1_dist <= 0.45): REVIEW_AMBIGUOUS
        # < 0.55 similarity (top1_dist > 0.45): AUTO_ENROLL_NEW
        if top1_sim >= 0.70 and quality_score >= quality_min and margin >= margin_min:
            decision = "AUTO_MATCH"
            assigned_id = top1_id
        elif top1_sim >= 0.55:
            decision = "REVIEW_AMBIGUOUS"
            assigned_id = top1_id
        else:
            decision = "AUTO_ENROLL_NEW"
            assigned_id = None

        return assigned_id or top1_id, top1_dist, decision

    def __repr__(self):
        return (f"PersistentGallery({self.size} embeddings, "
                f"{self.num_individuals} individuals, dim={self.dim}, "
                f"dirty={self._dirty})")


if __name__ == "__main__":
    g = PersistentGallery()
    g.load()
    print(g)

