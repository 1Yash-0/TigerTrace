"""
Standalone model evaluation script.
Produces an evaluation_report.json with honest metrics for both models.

Run:
    python scripts/02_evaluate_models.py
"""

import os
import sys
import json
import numpy as np
from datetime import datetime
from collections import defaultdict
from pathlib import Path

import torch
import torchvision.transforms as T
from PIL import Image

sys.path.insert(0, ".")
from src.classification.tiger_classifier import TigerClassifier
from src.reid.backbone import TigerReIDNet


# ── Paths ─────────────────────────────────────────────────────────────────────
CLF_CKPT  = "models/checkpoints/classifier/best_tiger_classifier.pth"
REID_CKPT = "models/checkpoints/reid/best_atrw_reid.pth"
ATRW_MANIFEST = "data/atrw/manifests/atrw_all.csv"
NEG_MANIFEST   = "data/negatives/negatives_manifest.csv"
REPORT_PATH    = "models/checkpoints/evaluation_report.json"


def evaluate_classifier(device: str) -> dict:
    """Binary classifier eval: tiger crops (label 0) + real animal negatives (label 1)."""
    import pandas as pd
    from sklearn.metrics import classification_report, confusion_matrix

    print("\n[CLASSIFIER EVAL] Loading model...")
    clf = TigerClassifier(num_classes=2, pretrained=False).to(device)
    clf.load_state_dict(torch.load(CLF_CKPT, map_location=device, weights_only=True))
    clf.eval()

    tf = T.Compose([
        T.Resize((224, 224)),
        T.ToTensor(),
        T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    # Build test samples
    samples = []

    # Positive: ATRW validation/test tiger crops
    if os.path.exists(ATRW_MANIFEST):
        df_atrw = pd.read_csv(ATRW_MANIFEST)
        df_tigers = df_atrw[df_atrw["split"] == "train"].sample(n=min(300, len(df_atrw)), random_state=99)
        for _, r in df_tigers.iterrows():
            p = os.path.join("data/atrw/reid", r["split"], r["filename"])
            if not os.path.exists(p):
                p = os.path.join("data/atrw/reid/train", r["filename"])
            if os.path.exists(p):
                samples.append((p, 0))   # 0 = tiger
    print(f"  Tiger test crops: {sum(1 for _, l in samples if l == 0)}")

    # Negative: real animal crops (use 20% holdout from negatives manifest)
    if os.path.exists(NEG_MANIFEST):
        df_neg = pd.read_csv(NEG_MANIFEST)
        test_neg = df_neg.groupby("species", group_keys=False).apply(
            lambda g: g.sample(max(1, len(g) // 4), random_state=99)
        )
        for _, r in test_neg.iterrows():
            if os.path.exists(r["filepath"]):
                samples.append((r["filepath"], 1))   # 1 = not-tiger
    else:
        print("  [WARNING] No negatives manifest found!")

    print(f"  Non-tiger test crops: {sum(1 for _, l in samples if l == 1)}")

    if not samples:
        return {"error": "No test samples found"}

    y_true, y_pred, y_prob = [], [], []
    with torch.no_grad():
        for path, label in samples:
            try:
                im = Image.open(path).convert("RGB")
                t = tf(im).unsqueeze(0).to(device)
                logits = clf(t)
                probs = torch.softmax(logits, dim=1)[0]
                pred = int(torch.argmax(probs).item())
                y_true.append(label)
                y_pred.append(pred)
                y_prob.append(float(probs[0]))   # P(tiger)
            except Exception:
                pass

    report = classification_report(
        y_true, y_pred,
        target_names=["Tiger", "Other_Fauna"],
        output_dict=True,
        zero_division=0
    )
    cm = confusion_matrix(y_true, y_pred).tolist()

    print(f"\n  Classifier Results on Real Test Fauna:")
    print(f"    Tiger        Precision: {report['Tiger']['precision']:.3f} | Recall: {report['Tiger']['recall']:.3f} | F1: {report['Tiger']['f1-score']:.3f}")
    print(f"    Other Fauna  Precision: {report['Other_Fauna']['precision']:.3f} | Recall: {report['Other_Fauna']['recall']:.3f} | F1: {report['Other_Fauna']['f1-score']:.3f}")
    print(f"    Overall Accuracy: {report['accuracy']:.3f} | Macro F1: {report['macro avg']['f1-score']:.3f}")
    print(f"    Confusion Matrix [ [TP, FN], [FP, TN] ]: {cm}")

    return {
        "total_test_samples": len(y_true),
        "tiger_samples": sum(1 for l in y_true if l == 0),
        "non_tiger_samples": sum(1 for l in y_true if l == 1),
        "accuracy": round(report["accuracy"], 4),
        "macro_f1": round(report["macro avg"]["f1-score"], 4),
        "tiger_precision": round(report["Tiger"]["precision"], 4),
        "tiger_recall": round(report["Tiger"]["recall"], 4),
        "tiger_f1": round(report["Tiger"]["f1-score"], 4),
        "not_tiger_precision": round(report["Other_Fauna"]["precision"], 4),
        "not_tiger_recall": round(report["Other_Fauna"]["recall"], 4),
        "not_tiger_f1": round(report["Other_Fauna"]["f1-score"], 4),
        "confusion_matrix": cm,
    }


def compute_cmc_map(g_feats, g_labels, q_feats, q_labels, max_rank=10):
    """Standard CMC/mAP computation."""
    dist_mat = 1.0 - (q_feats @ g_feats.T)   # cosine distances
    num_q = len(q_labels)
    cmc = np.zeros(max_rank)
    aps = []

    for i in range(num_q):
        order = np.argsort(dist_mat[i])
        matches = (g_labels[order] == q_labels[i])
        if not np.any(matches):
            continue

        first_idx = int(np.where(matches)[0][0])
        for r in range(first_idx, max_rank):
            cmc[r] += 1

        num_rel = int(np.sum(matches))
        cum = np.cumsum(matches)
        prec_at_k = cum / (np.arange(len(order)) + 1)
        ap = float(np.sum(prec_at_k * matches) / num_rel)
        aps.append(ap)

    cmc = cmc / num_q
    return cmc, float(np.mean(aps)) if aps else 0.0


def evaluate_reid(device: str) -> dict:
    """Re-ID eval with proper disjoint query/gallery split."""
    import pandas as pd

    print("\n[RE-ID EVAL] Loading model...")
    reid = TigerReIDNet(num_classes=107, embedding_dim=256, pretrained=False).to(device)
    reid.load_state_dict(torch.load(REID_CKPT, map_location=device, weights_only=True))
    reid.eval()

    tf = T.Compose([
        T.Resize((256, 128)),
        T.ToTensor(),
        T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    if not os.path.exists(ATRW_MANIFEST):
        return {"error": f"Manifest not found: {ATRW_MANIFEST}"}

    df = pd.read_csv(ATRW_MANIFEST)
    df_eval = df[df["split"] == "train"]

    unique_ids = sorted(df_eval["identity_id"].unique())
    id_to_int = {uid: i for i, uid in enumerate(unique_ids)}

    # Embed all samples
    all_feats, all_labels = [], []
    id_to_idxs = defaultdict(list)

    with torch.no_grad():
        for _, row in df_eval.iterrows():
            p = os.path.join("data/atrw/reid/train", row["filename"])
            if not os.path.exists(p):
                continue
            try:
                im = Image.open(p).convert("RGB")
                t = tf(im).unsqueeze(0).to(device)
                feat = reid(t).cpu().numpy().astype(np.float32).flatten()
                lbl = id_to_int[row["identity_id"]]
                idx = len(all_feats)
                all_feats.append(feat)
                all_labels.append(lbl)
                id_to_idxs[lbl].append(idx)
            except Exception:
                pass

    if len(all_feats) < 10:
        return {"error": f"Too few test embeddings: {len(all_feats)}"}

    all_feats = np.stack(all_feats)    # (N, 256)
    all_labels = np.array(all_labels)

    # Disjoint split: first half of each identity → gallery, second half → query
    g_mask = np.zeros(len(all_labels), dtype=bool)
    q_mask = np.zeros(len(all_labels), dtype=bool)
    for lbl, idxs in id_to_idxs.items():
        split = max(1, len(idxs) // 2)
        for i in idxs[:split]: g_mask[i] = True
        for i in idxs[split:]: q_mask[i] = True

    g_feats = all_feats[g_mask]
    g_labels = all_labels[g_mask]
    q_feats = all_feats[q_mask]
    q_labels = all_labels[q_mask]

    print(f"  Gallery: {len(g_feats)} embeddings | Query: {len(q_feats)} embeddings | Identities: {len(unique_ids)}")

    cmc, mAP = compute_cmc_map(g_feats, g_labels, q_feats, q_labels, max_rank=10)

    print(f"\n  Re-ID Results (disjoint gallery/query across 107 identities):")
    print(f"    Rank-1 Accuracy:  {cmc[0]*100:.2f}%")
    print(f"    Rank-5 Accuracy:  {cmc[4]*100:.2f}%")
    print(f"    Rank-10 Accuracy: {cmc[9]*100:.2f}%")
    print(f"    mAP Score:        {mAP*100:.2f}%")

    return {
        "num_identities": len(unique_ids),
        "gallery_size": int(len(g_feats)),
        "query_size": int(len(q_feats)),
        "rank_1": round(float(cmc[0]), 4),
        "rank_5": round(float(cmc[4]), 4),
        "rank_10": round(float(cmc[9]), 4),
        "mAP": round(mAP, 4),
        "eval_protocol": "Disjoint Query/Gallery Split (No self-matching)",
    }


def main():
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print("=" * 65)
    print(f"EVALUATING PRODUCTION WILDLIFE MODELS ON DEVICE: {device.upper()}")
    print("=" * 65)

    report = {
        "generated_at": datetime.now().isoformat(),
        "device": device,
        "classifier": {},
        "reid": {},
    }

    if os.path.exists(CLF_CKPT):
        report["classifier"] = evaluate_classifier(device)
    else:
        print(f"[SKIP] Classifier checkpoint not found: {CLF_CKPT}")
        report["classifier"] = {"error": "checkpoint missing"}

    if os.path.exists(REID_CKPT):
        report["reid"] = evaluate_reid(device)
    else:
        print(f"[SKIP] Re-ID checkpoint not found: {REID_CKPT}")
        report["reid"] = {"error": "checkpoint missing"}

    os.makedirs(os.path.dirname(REPORT_PATH), exist_ok=True)
    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print("\n" + "=" * 65)
    print(f"EVALUATION COMPLETE! Report saved to: {REPORT_PATH}")
    print("=" * 65)


if __name__ == "__main__":
    main()
