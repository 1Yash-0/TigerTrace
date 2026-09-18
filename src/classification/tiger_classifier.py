"""
Tiger Species Classifier Architecture.
- Backbone: MobileNetV3-Large (pretrained on ImageNet)
- Input: 224x224 cropped bounding boxes (with 15% contextual padding)
- Output: Tiger vs Other Fauna (P(tiger))
- Exportable to lightweight ONNX for offline CPU deployment.
"""

import os
import torch
import torch.nn as nn
import torchvision.models as models

class TigerClassifier(nn.Module):
    def __init__(self, num_classes=2, pretrained=True, dropout=0.2):
        super(TigerClassifier, self).__init__()
        weights = models.MobileNet_V3_Large_Weights.DEFAULT if pretrained else None
        base_model = models.mobilenet_v3_large(weights=weights)
        
        self.features = base_model.features
        self.avgpool = base_model.avgpool
        
        in_features = base_model.classifier[0].in_features
        self.classifier = nn.Sequential(
            nn.Linear(in_features, 512),
            nn.Hardswish(),
            nn.Dropout(p=dropout),
            nn.Linear(512, num_classes)
        )

    def forward(self, x):
        x = self.features(x)
        x = self.avgpool(x)
        x = torch.flatten(x, 1)
        x = self.classifier(x)
        return x

def export_to_onnx(model, output_path="models/exported/classifier/tiger_classifier.onnx", input_size=(1, 3, 224, 224)):
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
        # Fallback: static export (batch=1 only)
        onnx_program = torch.onnx.export(
            model,
            (dummy_input,),
            dynamo=True,
        )
        onnx_program.save(output_path)
    print(f"Tiger classifier successfully exported to ONNX: {output_path}")

if __name__ == "__main__":
    m = TigerClassifier()
    print("TigerClassifier initialized successfully.")
    export_to_onnx(m, "models/exported/classifier/tiger_classifier_init.onnx")
