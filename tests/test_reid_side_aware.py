"""
Automated unit and integration test for tigertrace_ptr_v2_side_aware.onnx Re-ID and matching pipeline.
"""

import os
import sys
import numpy as np
from PIL import Image

# Ensure project root & backend are in sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)


def test_reid_extractor():
    print("\n--- 1. Testing TigerReIDExtractor ---")
    from src.reid.extractor import TigerReIDExtractor

    extractor = TigerReIDExtractor()
    print(f"Model loaded successfully from: {extractor.model_path}")
    assert os.path.exists(extractor.model_path), f"Model path does not exist: {extractor.model_path}"

    # Create dummy RGB image
    dummy_img = Image.new("RGB", (300, 300), color=(180, 100, 50))
    result = extractor.extract(dummy_img)

    assert "embedding" in result, "Missing 'embedding' in result"
    assert "flank_side" in result, "Missing 'flank_side' in result"
    assert "flank_name" in result, "Missing 'flank_name' in result"
    assert "flank_confidence" in result, "Missing 'flank_confidence' in result"

    emb = np.array(result["embedding"], dtype=np.float32)
    assert emb.shape == (512,), f"Expected shape (512,), got {emb.shape}"
    norm = np.linalg.norm(emb)
    assert np.isclose(norm, 1.0, atol=1e-5), f"Embedding not unit normalized: norm={norm}"

    assert result["flank_side"] in ("A", "B"), f"Invalid flank_side: {result['flank_side']}"
    assert result["flank_name"] in ("Left", "Right"), f"Invalid flank_name: {result['flank_name']}"
    assert 0.0 <= result["flank_confidence"] <= 1.0, f"Invalid flank_confidence: {result['flank_confidence']}"

    probs = result["flank_probabilities"]
    prob_sum = probs["A"] + probs["B"]
    assert np.isclose(prob_sum, 1.0, atol=1e-5), f"Flank probabilities do not sum to 1.0: {prob_sum}"

    print(f"Extractor output verified: 512-D L2-norm={norm:.6f}, Flank={result['flank_name']} ({result['flank_side']}), Conf={result['flank_confidence']:.4f}")
    return extractor, emb


def test_persistent_gallery():
    print("\n--- 2. Testing PersistentGallery with Flank Routing ---")
    from src.reid.gallery import PersistentGallery

    temp_dir = os.path.join(PROJECT_ROOT, "data", "test_gallery")
    gallery = PersistentGallery(gallery_dir=temp_dir, dim=512)
    gallery.load()

    # Generate distinct synthetic embeddings
    rng = np.random.default_rng(42)
    v1 = rng.standard_normal(512).astype(np.float32)
    v1 /= np.linalg.norm(v1)

    v2 = rng.standard_normal(512).astype(np.float32)
    v2 /= np.linalg.norm(v2)

    # Enroll T1 (Left flank) and T2 (Right flank)
    gallery.enroll("PTR-T01", v1, flank="Left")
    gallery.enroll("PTR-T02", v2, flank="Right")

    assert gallery.size == 2
    assert gallery.num_individuals == 2

    # Query with exact match v1 (Left flank)
    match_id, dist, decision = gallery.query(v1, q_flank="Left")
    sim = 1.0 - dist
    print(f"Query exact T1 (Left): match={match_id}, sim={sim:.4f}, decision={decision}")
    assert match_id == "PTR-T01"
    assert decision == "AUTO_MATCH"
    assert np.isclose(sim, 1.0, atol=1e-4)

    # Query with v1 but opposing flank (Right flank) -> penalty applied
    match_id_cross, dist_cross, decision_cross = gallery.query(v1, q_flank="Right")
    sim_cross = 1.0 - dist_cross
    print(f"Query T1 with cross-flank (Right): match={match_id_cross}, sim={sim_cross:.4f}, decision={decision_cross}")
    assert np.isclose(sim_cross, 1.0 - 0.22, atol=1e-4), f"Expected penalized similarity {1.0 - 0.22}, got {sim_cross}"

    # Query random unknown vector -> should be new individual
    v_unknown = rng.standard_normal(512).astype(np.float32)
    v_unknown /= np.linalg.norm(v_unknown)
    match_unk, dist_unk, dec_unk = gallery.query(v_unknown, q_flank="Left")
    sim_unk = 1.0 - dist_unk
    print(f"Query random unknown vector: match={match_unk}, sim={sim_unk:.4f}, decision={dec_unk}")
    assert dec_unk == "AUTO_ENROLL_NEW"
    assert sim_unk < 0.55

    # Cleanup temp test files
    import shutil
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)
    print("PersistentGallery tests passed successfully.")


def test_backend_services():
    print("\n--- 3. Testing Backend Services Integration ---")
    from services.onnx_models import reid_extract, reid_embedding
    from services.identification_service import gallery_best_cosines, identify_tiger

    dummy_img = Image.new("RGB", (224, 224), color=(200, 120, 40))
    temp_img_path = os.path.join(PROJECT_ROOT, "temp_test_tiger.jpg")
    dummy_img.save(temp_img_path)

    try:
        # Test reid_extract
        ext_res = reid_extract(temp_img_path)
        assert ext_res is not None, "reid_extract returned None"
        assert len(ext_res["embedding"]) == 512, f"Expected 512-D, got {len(ext_res['embedding'])}"
        assert ext_res["flank_side"] in ("A", "B")
        print(f"reid_extract verified: dim={len(ext_res['embedding'])}, flank={ext_res['flank_name']}")

        # Test identify_tiger
        ident_res = identify_tiger(temp_img_path)
        assert "status" in ident_res
        assert "top_match" in ident_res
        assert "flank_side" in ident_res
        assert "flank_code" in ident_res
        print(f"identify_tiger result: status={ident_res['status']}, top_match={ident_res['top_match']}, flank={ident_res['flank_side']}")

    finally:
        if os.path.exists(temp_img_path):
            os.remove(temp_img_path)

    print("Backend services integration tests passed successfully.")


if __name__ == "__main__":
    test_reid_extractor()
    test_persistent_gallery()
    test_backend_services()
    print("\n==========================================")
    print("ALL RE-ID INTEGRATION TESTS PASSED (100%)!")
    print("==========================================")
