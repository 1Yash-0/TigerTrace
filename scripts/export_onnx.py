"""Export both trained models to ONNX format."""
import torch
import os
import sys
sys.path.insert(0, '.')
from src.classification.tiger_classifier import TigerClassifier, export_to_onnx
from src.reid.backbone import TigerReIDNet, export_reid_to_onnx

print('--- Exporting Tiger Species Classifier ---')
clf = TigerClassifier(num_classes=2, pretrained=False)
clf.load_state_dict(torch.load(
    'models/checkpoints/classifier/best_tiger_classifier.pth',
    map_location='cpu', weights_only=True
))
clf.eval()
export_to_onnx(clf, 'models/exported/classifier/tiger_classifier.onnx')
clf_size = os.path.getsize('models/exported/classifier/tiger_classifier.onnx') / 1e6
print(f'Classifier ONNX size: {clf_size:.1f} MB')

print()
print('--- Exporting Tiger Re-ID Backbone ---')
reid = TigerReIDNet(num_classes=107, embedding_dim=256, pretrained=False)
reid.load_state_dict(torch.load(
    'models/checkpoints/reid/best_atrw_reid.pth',
    map_location='cpu', weights_only=True
))
reid.eval()
export_reid_to_onnx(reid, 'models/exported/reid/tiger_reid.onnx')
reid_size = os.path.getsize('models/exported/reid/tiger_reid.onnx') / 1e6
print(f'Re-ID ONNX size: {reid_size:.1f} MB')
print()
print('SUCCESS: Both ONNX exports complete.')
