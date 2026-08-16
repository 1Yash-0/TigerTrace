"""
ResNet-18 Metric Learning Backbone for Tiger Flank Stripe Re-Identification.
- Standard ResNet-18 with BNNeck (Batch Normalization Neck)
- 256-dimensional L2-normalized embedding for cosine similarity retrieval.
- Classification head for auxiliary identity supervision during training.
"""

import os
import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.models as models

class TigerReIDNet(nn.Module):
    def __init__(self, num_classes=107, embedding_dim=256, pretrained=True):
        super(TigerReIDNet, self).__init__()
        self.embedding_dim = embedding_dim
        
        weights = models.ResNet18_Weights.DEFAULT if pretrained else None
        base_resnet = models.resnet18(weights=weights)
        
        # Remove original avgpool and fc
        self.conv1 = base_resnet.conv1
        self.bn1 = base_resnet.bn1
        self.relu = base_resnet.relu
        self.maxpool = base_resnet.maxpool
        self.layer1 = base_resnet.layer1
        self.layer2 = base_resnet.layer2
        self.layer3 = base_resnet.layer3
        self.layer4 = base_resnet.layer4
        
        self.global_pool = nn.AdaptiveAvgPool2d((1, 1))
        
        # Embedding projection
        self.bottleneck = nn.Sequential(
            nn.Linear(512, embedding_dim, bias=False),
            nn.BatchNorm1d(embedding_dim)
        )
        
        # BNNeck for metric learning
        self.bnneck = nn.BatchNorm1d(embedding_dim)
        self.bnneck.bias.requires_grad_(False)  # no bias shift
        
        # Classifier for training
        self.classifier = nn.Linear(embedding_dim, num_classes, bias=False) if num_classes > 0 else nn.Identity()

    def forward(self, x, return_logits=False):
        x = self.conv1(x)
        x = self.bn1(x)
        x = self.relu(x)
        x = self.maxpool(x)
        
        x = self.layer1(x)
        x = self.layer2(x)
        x = self.layer3(x)
        x = self.layer4(x)
        
        x = self.global_pool(x)
        feat_512 = torch.flatten(x, 1)
        
        feat_proj = self.bottleneck(feat_512)
        norm_embedding = F.normalize(feat_proj, p=2, dim=1)
        
        if return_logits and hasattr(self, 'classifier'):
            bn_feat = self.bnneck(feat_proj)
            logits = self.classifier(bn_feat)
            return norm_embedding, logits
            
        return norm_embedding

def export_reid_to_onnx(model, output_path="models/exported/reid/tiger_reid.onnx", input_size=(1, 3, 256, 128)):
    import torch.export
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    model.eval()
    dummy_input = torch.randn(*input_size)
    batch_dim = torch.export.Dim("batch", min=1, max=64)
    try:
        onnx_program = torch.onnx.export(
            model,
            (dummy_input,),
            dynamo=True,
            dynamic_shapes={"x": {0: batch_dim}},
        )
        onnx_program.save(output_path)
    except Exception:
        # Fallback: static export (batch=1 only) - still fully usable for inference
        onnx_program = torch.onnx.export(
            model,
            (dummy_input,),
            dynamo=True,
        )
        onnx_program.save(output_path)
    print(f"Tiger Re-ID backbone exported to ONNX: {output_path}")

if __name__ == "__main__":
    net = TigerReIDNet(num_classes=107)
    x = torch.randn(2, 3, 256, 128)
    emb, logits = net(x, return_logits=True)
    print("Embedding shape:", emb.shape, "Logits shape:", logits.shape)
    export_reid_to_onnx(net)
