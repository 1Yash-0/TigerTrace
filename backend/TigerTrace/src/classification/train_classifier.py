"""
Training script for MobileNetV3-Large Tiger Species Classifier.
- Uses ATRW tiger crops as Class 0 (Tiger) and real Pench confuser fauna (Leopard, Sambar, Chital, Boar, Sloth Bear, Gaur) as Class 1 (Other Fauna).
- Fast training with PyTorch CUDA (RTX 4060).
- Checkpointing and automatic ONNX model export with full evaluation metrics.
"""

import os
import glob
import random
import numpy as np
import pandas as pd
from PIL import Image
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
import torchvision.transforms as T
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
from tqdm import tqdm

from src.classification.tiger_classifier import TigerClassifier, export_to_onnx

class TigerCropDataset(Dataset):
    def __init__(self, samples, transform=None):
        self.samples = samples  # list of (filepath, label)
        self.transform = transform

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, label = self.samples[idx]
        try:
            img = Image.open(path).convert("RGB")
        except Exception:
            img = Image.new("RGB", (224, 224), (128, 128, 128))
            
        if self.transform:
            img = self.transform(img)
        return img, torch.tensor(label, dtype=torch.long)

def build_dataset_samples(atrw_dir="data/atrw", negatives_dir="data/negatives"):
    # 1. Tiger crops from Re-ID train
    tiger_imgs = glob.glob(os.path.join(atrw_dir, "reid", "train", "*.jpg"))
    tiger_samples = [(p, 0) for p in tiger_imgs]
    
    # 2. Real negative animal samples from data/negatives
    neg_samples = []
    manifest_path = os.path.join(negatives_dir, "negatives_manifest.csv")
    if os.path.exists(manifest_path):
        df_neg = pd.read_csv(manifest_path)
        for _, r in df_neg.iterrows():
            if os.path.exists(r["filepath"]):
                neg_samples.append((r["filepath"], 1))
    else:
        # Fallback to scanning negative subdirectories directly
        for ext in ("*.jpg", "*.jpeg", "*.png"):
            for p in glob.glob(os.path.join(negatives_dir, "**", ext), recursive=True):
                neg_samples.append((p, 1))

    # Also add background crops if negatives are fewer than 500
    if len(neg_samples) < 500:
        det_imgs = glob.glob(os.path.join(atrw_dir, "detection", "trainval", "*.jpg"))[:300]
        bg_dir = "data/interim/crops/negatives"
        os.makedirs(bg_dir, exist_ok=True)
        for idx, dp in enumerate(det_imgs):
            out_p = os.path.join(bg_dir, f"neg_{idx}.jpg")
            if not os.path.exists(out_p):
                try:
                    with Image.open(dp) as im:
                        w, h = im.size
                        crop = im.crop((0, 0, min(w, 300), min(h, 300)))
                        crop.save(out_p)
                except Exception:
                    continue
            if os.path.exists(out_p):
                neg_samples.append((out_p, 1))
                
    all_samples = tiger_samples + neg_samples
    print(f"Dataset prepared: {len(tiger_samples)} Tiger crops (Class 0), {len(neg_samples)} Non-Tiger crops (Class 1)")
    return all_samples

def train_classifier(epochs=12, batch_size=32, lr=3e-4, device="cuda"):
    device = "cuda" if torch.cuda.is_available() and device == "cuda" else "cpu"
    print("=" * 65)
    print(f"TRAINING TIGER SPECIES CLASSIFIER (MobileNetV3-Large)")
    print(f"Device: {device.upper()} | Epochs: {epochs} | Batch Size: {batch_size}")
    print("=" * 65)
    
    samples = build_dataset_samples()
    train_samples, val_samples = train_test_split(
        samples, test_size=0.2, random_state=42, stratify=[s[1] for s in samples]
    )
    
    train_tf = T.Compose([
        T.Resize((224, 224)),
        T.RandomHorizontalFlip(),
        T.RandomRotation(15),
        T.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.15),
        T.ToTensor(),
        T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    val_tf = T.Compose([
        T.Resize((224, 224)),
        T.ToTensor(),
        T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    train_loader = DataLoader(TigerCropDataset(train_samples, transform=train_tf), batch_size=batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(TigerCropDataset(val_samples, transform=val_tf), batch_size=batch_size, shuffle=False, num_workers=0)
    
    # Class weights for slight imbalance handling
    n_pos = sum(1 for s in train_samples if s[1] == 0)
    n_neg = sum(1 for s in train_samples if s[1] == 1)
    weight = torch.tensor([1.0, max(1.0, n_pos / max(1, n_neg))], device=device)
    criterion = nn.CrossEntropyLoss(weight=weight)
    
    model = TigerClassifier(num_classes=2, pretrained=True).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)
    
    best_val_f1 = 0.0
    best_ckpt_path = "models/checkpoints/classifier/best_tiger_classifier.pth"
    os.makedirs(os.path.dirname(best_ckpt_path), exist_ok=True)
    
    for epoch in range(1, epochs + 1):
        model.train()
        train_loss, correct, total = 0.0, 0, 0
        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item() * len(labels)
            preds = torch.argmax(outputs, dim=1)
            correct += (preds == labels).sum().item()
            total += len(labels)
            
        scheduler.step()
        train_acc = correct / total
        
        # Validation
        model.eval()
        val_loss = 0.0
        val_preds, val_targets = [], []
        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                loss = criterion(outputs, labels)
                val_loss += loss.item() * len(labels)
                preds = torch.argmax(outputs, dim=1)
                val_preds.extend(preds.cpu().numpy())
                val_targets.extend(labels.cpu().numpy())
                
        val_acc = (np.array(val_preds) == np.array(val_targets)).mean()
        report = classification_report(val_targets, val_preds, target_names=["Tiger", "Other"], output_dict=True, zero_division=0)
        tiger_rec = report["Tiger"]["recall"]
        other_rec = report["Other"]["recall"]
        macro_f1 = report["macro avg"]["f1-score"]
        
        print(f"Epoch [{epoch:02d}/{epochs:02d}] Train Loss: {train_loss/total:.4f} Acc: {train_acc*100:.2f}% | Val Acc: {val_acc*100:.2f}% [Tiger Recall: {tiger_rec*100:.1f}%, Other Recall: {other_rec*100:.1f}%, Macro-F1: {macro_f1*100:.1f}%]")
        
        if macro_f1 >= best_val_f1:
            best_val_f1 = macro_f1
            torch.save(model.state_dict(), best_ckpt_path)
            
    print(f"\nTraining Complete! Best Validation Macro-F1: {best_val_f1*100:.2f}%")
    print(f"Saved best checkpoint to: {best_ckpt_path}")
    
    # Export to ONNX for CPU offline inference
    model.load_state_dict(torch.load(best_ckpt_path, map_location="cpu", weights_only=True))
    export_to_onnx(model.to("cpu"), "models/exported/classifier/tiger_classifier.onnx")

if __name__ == "__main__":
    train_classifier(epochs=12, batch_size=32, lr=3e-4)
