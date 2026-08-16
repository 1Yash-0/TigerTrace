"""
Persistent Embedding Gallery for Tiger Re-ID.

The gallery stores L2-normalized 256-dim embedding vectors alongside individual_id labels.
It grows across pipeline runs — new enrollments are appended and saved to disk.
A per-identity centroid (mean embedding) is computed for fairer cosine retrieval.

Storage layout:
  data/gallery/tiger_gallery.npz        — compressed numpy array of all embeddings
  data/gallery/tiger_gallery_index.json — list of individual_ids matching row order
"""

import os
import json
import numpy as np
from pathlib import Path
from typing import Optional


GALLERY_DIR = Path("data/gallery")
EMBEDDINGS_PATH = GALLERY_DIR / "tiger_gallery.npz"
INDEX_PATH = GALLERY_DIR / "tiger_gallery_index.json"


class PersistentGallery:
    """
    Manages a growing on-disk gallery of tiger embeddings for cosine Re-ID retrieval.

    Usage:
        gallery = PersistentGallery()
        gallery.load()
        # ... run pipeline ...
        match_id, dist, decision = gallery.query(q_embedding)
        gallery.enroll(new_id, q_embedding)
        gallery.save()
    """

    def __init__(self, gallery_dir: str = "data/gallery"):
        self.gallery_dir = Path(gallery_dir)
        self.embeddings_path = self.gallery_dir / "tiger_gallery.npz"
        self.index_path = self.gallery_dir / "tiger_gallery_index.json"

        self._embeddings: Optional[np.ndarray] = None   # shape (N, 256)
        self._ids: list[str] = []
        self._dirty = False

    def load(self) -> int:
        """Load gallery from disk. Returns number of embeddings loaded."""
        self.gallery_dir.mkdir(parents=True, exist_ok=True)

        if self.embeddings_path.exists() and self.index_path.exists():
            data = np.load(self.embeddings_path)
            self._embeddings = data["embeddings"].astype(np.float32)
            with open(self.index_path, "r") as f:
                self._ids = json.load(f)
            assert len(self._ids) == len(self._embeddings), \
                "Gallery index/embedding size mismatch — delete data/gallery/ and rebuild."
            print(f"[Gallery] Loaded {len(self._ids)} embeddings ({len(set(self._ids))} individuals) from disk.")
        else:
            self._embeddings = np.empty((0, 256), dtype=np.float32)
            self._ids = []
            print("[Gallery] No existing gallery found — starting fresh.")

        return len(self._ids)

    def save(self):
        """Persist gallery to disk only if changed."""
        if not self._dirty:
            return
        self.gallery_dir.mkdir(parents=True, exist_ok=True)
        np.savez_compressed(self.embeddings_path, embeddings=self._embeddings)
        with open(self.index_path, "w") as f:
            json.dump(self._ids, f)
        print(f"[Gallery] Saved {len(self._ids)} embeddings to disk.")
        self._dirty = False

    @property
    def size(self) -> int:
        return len(self._ids)

    @property
    def num_individuals(self) -> int:
        return len(set(self._ids))

    def seed_from_atrw(self, manifest_csv: str, reid_net, device: str = "cpu",
                        n_per_identity: int = 5):
        """
        Populate gallery with embeddings from ATRW training crops.
        Called once on first run; subsequent runs just load from disk.

        Args:
            manifest_csv: path to data/atrw/manifests/atrw_all.csv
            reid_net: loaded TigerReIDNet in eval mode
            device: 'cpu' or 'cuda'
            n_per_identity: max crops per identity to average (reduces over-representation)
        """
        import torch
        import torchvision.transforms as T
        import pandas as pd
        from PIL import Image

        tf = T.Compose([
            T.Resize((256, 128)),
            T.ToTensor(),
            T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])

        df = pd.read_csv(manifest_csv)
        df_train = df[df["split"] == "train"]

        # Sample up to n_per_identity per tiger for balanced gallery
        sampled = (df_train
                   .groupby("identity_id", group_keys=False)
                   .apply(lambda g: g.sample(min(len(g), n_per_identity), random_state=42)))

        added = 0
        with torch.no_grad():
            for _, row in sampled.iterrows():
                p = os.path.join("data/atrw/reid/train", row["filename"])
                if not os.path.exists(p):
                    continue
                try:
                    im = Image.open(p).convert("RGB")
                    t = tf(im).unsqueeze(0).to(device)
                    feat = reid_net(t).cpu().numpy().astype(np.float32)   # (1, 256)
                    individual_id = f"TIGER_{row['identity_id']}"
                    self._append_embedding(feat[0], individual_id)
                    added += 1
                except Exception:
                    pass

        self._dirty = True
        print(f"[Gallery] Seeded from ATRW: {added} embeddings across {self.num_individuals} individuals.")

    def _append_embedding(self, embedding: np.ndarray, individual_id: str):
        """Internal: append one embedding row."""
        embedding = embedding.astype(np.float32).reshape(1, -1)
        if self._embeddings is None or len(self._embeddings) == 0:
            self._embeddings = embedding
        else:
            self._embeddings = np.vstack([self._embeddings, embedding])
        self._ids.append(individual_id)
        self._dirty = True

    def enroll(self, individual_id: str, embedding: np.ndarray):
        """Add a new crop embedding to the gallery (new or existing individual)."""
        self._append_embedding(embedding, individual_id)

    def get_centroid_gallery(self) -> tuple[np.ndarray, list[str]]:
        """
        Returns a deduplicated gallery where each individual is represented
        by the mean (centroid) of all their embeddings — L2-renormalized.
        Fairer than raw gallery for cosine retrieval.
        """
        if self._embeddings is None or len(self._embeddings) == 0:
            return np.empty((0, 256), dtype=np.float32), []

        unique_ids = list(dict.fromkeys(self._ids))  # preserve order, dedupe
        centroids = []
        for uid in unique_ids:
            mask = np.array([i == uid for i in self._ids])
            mean_emb = self._embeddings[mask].mean(axis=0)
            norm = np.linalg.norm(mean_emb)
            if norm > 1e-8:
                mean_emb = mean_emb / norm
            centroids.append(mean_emb)

        return np.stack(centroids, axis=0).astype(np.float32), unique_ids

    def query(self, q_embedding: np.ndarray,
              auto_match_dist: float = 0.35,
              margin_min: float = 0.08,
              quality_score: float = 1.0,
              quality_min: float = 0.60) -> tuple[str, float, str]:
        """
        Query the gallery using centroid-based cosine retrieval.

        Returns:
            (assigned_id, top1_distance, decision)
            decision: 'AUTO_MATCH' | 'REVIEW_AMBIGUOUS' | 'AUTO_ENROLL_NEW'
        """
        centroids, unique_ids = self.get_centroid_gallery()

        if len(centroids) == 0:
            return "PENCH_UNK_NOGALLERY", 1.0, "AUTO_ENROLL_NEW"

        # Cosine similarity via dot product (embeddings are L2-normalized)
        q = q_embedding.astype(np.float32).reshape(1, -1)
        # Re-normalize query
        norm = np.linalg.norm(q)
        if norm > 1e-8:
            q = q / norm

        sims = (q @ centroids.T).flatten()   # (num_individuals,)
        dists = 1.0 - sims
        order = np.argsort(dists)

        top1_idx = int(order[0])
        top1_dist = float(dists[top1_idx])
        top1_id = unique_ids[top1_idx]

        margin = float(dists[order[1]] - top1_dist) if len(order) > 1 else 0.0

        if top1_dist < auto_match_dist and margin > margin_min and quality_score > quality_min:
            decision = "AUTO_MATCH"
            assigned_id = top1_id
        elif top1_dist < 0.50:
            decision = "REVIEW_AMBIGUOUS"
            assigned_id = top1_id
        else:
            decision = "AUTO_ENROLL_NEW"
            assigned_id = None   # caller should generate a new ID

        return assigned_id or top1_id, top1_dist, decision

    def __repr__(self):
        return (f"PersistentGallery({self.size} embeddings, "
                f"{self.num_individuals} individuals, "
                f"dirty={self._dirty})")


if __name__ == "__main__":
    g = PersistentGallery()
    g.load()
    print(g)
