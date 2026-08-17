"""
Loss functions for Tiger Metric Learning:
1. Batch-Hard Triplet Loss
2. Cross-Entropy Loss with Label Smoothing
"""

import torch
import torch.nn as nn
import torch.nn.functional as F

class BatchHardTripletLoss(nn.Module):
    def __init__(self, margin=0.3):
        super(BatchHardTripletLoss, self).__init__()
        self.margin = margin

    def forward(self, embeddings, labels):
        # Euclidean distance matrix between embeddings
        # dist_mat[i, j] = ||emb_i - emb_j||_2
        dist_mat = torch.cdist(embeddings, embeddings, p=2)
        
        N = dist_mat.size(0)
        # mask for positive pairs: same label, different instance
        is_pos = labels.expand(N, N).eq(labels.expand(N, N).t())
        is_neg = labels.expand(N, N).ne(labels.expand(N, N).t())
        
        # Hardest positive (maximum distance among positives)
        dist_ap, _ = torch.max(dist_mat * is_pos.float(), dim=1)
        
        # Hardest negative (minimum distance among negatives)
        dist_mat_neg = dist_mat + 1e5 * (~is_neg).float()
        dist_an, _ = torch.min(dist_mat_neg, dim=1)
        
        # Triplet loss with margin
        loss = F.relu(dist_ap - dist_an + self.margin)
        return loss.mean()

class CrossEntropyLabelSmooth(nn.Module):
    def __init__(self, num_classes, epsilon=0.1):
        super(CrossEntropyLabelSmooth, self).__init__()
        self.num_classes = num_classes
        self.epsilon = epsilon
        self.logsoftmax = nn.LogSoftmax(dim=-1)

    def forward(self, inputs, targets):
        log_probs = self.logsoftmax(inputs)
        targets_one_hot = torch.zeros_like(log_probs).scatter_(1, targets.unsqueeze(1), 1)
        smooth_targets = (1 - self.epsilon) * targets_one_hot + self.epsilon / self.num_classes
        loss = (-smooth_targets * log_probs).mean(0).sum()
        return loss
