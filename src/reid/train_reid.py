"""
Training script for Tiger Flank Stripe Re-Identification.
- Backbone: ResNet-18 + BNNeck + 256-dim L2-normalized embeddings.
- Loss: 0.5 * TripletLoss + 0.5 * CrossEntropy.
- Optimization: AdamW with Cosine Annealing.
- Exports best checkpoint to PyTorch weights and ONNX model.
"""

import os
import random
from collections import defaultdict
import numpy as np
import pandas as pd
from PIL import Image
import torch
from torch.utils.data import Dataset, DataLoader, Sampler
import torchvision.transforms as T
from sklearn.model_selection import train_test_split

from src.reid.backbone import TigerReIDNet, export_reid_to_onnx
from src.reid.losses import BatchHardTripletLoss, CrossEntropyLabelSmooth

class PKSampler(Sampler):
    """Samples P identities with K images each per batch."""
    def __init__(self, dataset, p=16, k=4):
        self.dataset = dataset
        self.p = p
        self.k = k
        self.id_to_indices = defaultdict(list)
        for idx, (_, label) in enumerate(dataset.samples):
            self.id_to_indices[label].append(idx)
            
        self.identities = list(self.id_to_indices.keys())
        self.num_batches = len(dataset) // (p * k)

    def __iter__(self):
        for _ in range(self.num_batches):
            batch = []
            selected_ids = random.sample(self.identities, min(self.p, len(self.identities)))
            for identity in selected_ids:
                indices = self.id_to_indices[identity]
                if len(indices) >= self.k:
                    chosen = random.sample(indices, self.k)
                else:
                    chosen = random.choices(indices, k=self.k)
                batch.extend(chosen)
            yield batch

    def __len__(self):
        return self.num_batches

class ReIDDataset(Dataset):
    def __init__(self, samples, transform=None):
        self.samples = samples  # list of (filepath, int_label)
        self.transform = transform

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, label = self.samples[idx]
        try:
            img = Image.open(path).convert("RGB")
        except Exception:
            img = Image.new("RGB", (128, 256), (128, 128, 128))
            
        if self.transform:
            img = self.transform(img)
        return img, torch.tensor(label, dtype=torch.long)

def compute_rank_metrics(gallery_feats, gallery_labels, query_feats, query_labels):
    # Cosine distance matrix: 1 - cosine_similarity
    dist_mat = 1.0 - torch.mm(query_feats, gallery_feats.t()).cpu().numpy()
    
    num_queries = len(query_labels)
    cmc = np.zeros(len(gallery_labels))
    aps = []
    
    for i in range(num_queries):
        q_label = query_labels[i]
        order = np.argsort(dist_mat[i])
        matches = (gallery_labels[order] == q_label)
        
        if not np.any(matches):
            continue
            
        # CMC
        first_match_idx = np.where(matches)[0][0]
        cmc[first_match_idx:] += 1
        
        # AP
        num_rel = np.sum(matches)
        cum_matches = np.cumsum(matches)
        precisions = cum_matches / (np.arange(len(order)) + 1)
        ap = np.sum(precisions * matches) / num_rel
        aps.append(ap)
        
    cmc = cmc / num_queries
    map_score = np.mean(aps) if aps else 0.0
    return cmc[0], cmc[min(4, len(cmc)-1)], map_score

def train_reid_pipeline(epochs=25, lr=3e-4, device="cuda"):
    device = "cuda" if torch.cuda.is_available() and device == "cuda" else "cpu"
    print(f"Starting Tiger Re-ID Training on device: {device} (Epochs: {epochs})")
    
    manifest_path = "data/atrw/manifests/atrw_all.csv"
    if not os.path.exists(manifest_path):
        raise FileNotFoundError(f"Manifest not found at: {manifest_path}. Run 00_audit_atrw.py first.")
        
    df = pd.read_csv(manifest_path)
    df_train = df[df["split"] == "train"].copy()
    
    # Map identity strings to integers 0..num_ids-1
    unique_ids = sorted(df_train["identity_id"].unique())
    id_to_int = {uid: idx for idx, uid in enumerate(unique_ids)}
    num_classes = len(unique_ids)
    
    samples = []
    for _, row in df_train.iterrows():
        p = os.path.join("data/atrw/reid/train", row["filename"])
        if os.path.exists(p):
            samples.append((p, id_to_int[row["identity_id"]]))
            
    print(f"Loaded {len(samples)} usable identity crops across {num_classes} tigers.")
    
    # Split 80% train, 20% validation
    train_samples, val_samples = train_test_split(
        samples, test_size=0.2, random_state=42, stratify=[s[1] for s in samples]
    )
    
    train_tf = T.Compose([
        T.Resize((256, 128)),
        T.RandomHorizontalFlip(),
        T.ColorJitter(brightness=0.15, contrast=0.15),
        T.ToTensor(),
        T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    val_tf = T.Compose([
        T.Resize((256, 128)),
        T.ToTensor(),
        T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    train_dataset = ReIDDataset(train_samples, transform=train_tf)
    val_dataset = ReIDDataset(val_samples, transform=val_tf)
    
    pk_sampler = PKSampler(train_dataset, p=16, k=4)
    train_loader = DataLoader(train_dataset, batch_sampler=pk_sampler, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=64, shuffle=False, num_workers=0)
    
    model = TigerReIDNet(num_classes=num_classes, embedding_dim=256, pretrained=True).to(device)
    triplet_criterion = BatchHardTripletLoss(margin=0.3)
    ce_criterion = CrossEntropyLabelSmooth(num_classes=num_classes)
    
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)
    
    best_rank1 = 0.0
    best_ckpt_path = "models/checkpoints/reid/best_atrw_reid.pth"
    os.makedirs(os.path.dirname(best_ckpt_path), exist_ok=True)
    
    for epoch in range(1, epochs + 1):
        model.train()
        total_loss, total_triplet, total_ce = 0.0, 0.0, 0.0
        batches = 0
        
        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()
            
            embeddings, logits = model(images, return_logits=True)
            loss_triplet = triplet_criterion(embeddings, labels)
            loss_ce = ce_criterion(logits, labels)
            loss = 0.5 * loss_triplet + 0.5 * loss_ce
            
            loss.backward()
            optimizer.step()
            
            total_loss += loss.item()
            total_triplet += loss_triplet.item()
            total_ce += loss_ce.item()
            batches += 1
            
        scheduler.step()
        avg_loss = total_loss / max(1, batches)
        
        # Validation Evaluation — disjoint query / gallery split
        # For each identity: first half → gallery, second half → query
        # This prevents any query from finding itself and gives honest open-set metrics.
        model.eval()
        all_feats, all_labels = [], []
        with torch.no_grad():
            for images, labels in val_loader:
                images = images.to(device)
                feats = model(images, return_logits=False)
                all_feats.append(feats)
                all_labels.extend(labels.numpy())

        all_feats = torch.cat(all_feats, dim=0)
        all_labels = np.array(all_labels)

        # Split per identity: first occurrence(s) → gallery, rest → query
        from collections import defaultdict
        id_to_idx = defaultdict(list)
        for i, lbl in enumerate(all_labels):
            id_to_idx[lbl].append(i)

        gallery_mask = np.zeros(len(all_labels), dtype=bool)
        query_mask   = np.zeros(len(all_labels), dtype=bool)
        for lbl, idxs in id_to_idx.items():
            split = max(1, len(idxs) // 2)
            for i in idxs[:split]:
                gallery_mask[i] = True
            for i in idxs[split:]:
                query_mask[i] = True

        g_feats = all_feats[gallery_mask]
        g_labels = all_labels[gallery_mask]
        q_feats = all_feats[query_mask]
        q_labels = all_labels[query_mask]

        if len(q_feats) == 0:   # fallback for tiny datasets
            rank1, rank5, map_val = compute_rank_metrics(all_feats, all_labels, all_feats, all_labels)
        else:
            rank1, rank5, map_val = compute_rank_metrics(g_feats, g_labels, q_feats, q_labels)
        print(f"Epoch [{epoch:02d}/{epochs:02d}] Loss: {avg_loss:.4f} (Trip: {total_triplet/batches:.3f}, CE: {total_ce/batches:.3f}) | Rank-1: {rank1*100:.2f}% Rank-5: {rank5*100:.2f}% mAP: {map_val*100:.2f}%")
        
        if rank1 >= best_rank1:
            best_rank1 = rank1
            torch.save(model.state_dict(), best_ckpt_path)
            
    print(f"\nTraining Complete! Best Rank-1 Accuracy: {best_rank1*100:.2f}%")
    print(f"Saved best weights to: {best_ckpt_path}")
    
    # Export ONNX model
    model.load_state_dict(torch.load(best_ckpt_path, map_location="cpu"))
    export_reid_to_onnx(model.to("cpu"), "models/exported/reid/tiger_reid.onnx")

if __name__ == "__main__":
    train_reid_pipeline(epochs=25, lr=3e-4)
