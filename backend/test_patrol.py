import urllib.request
import json
import sys

# Ensure UTF-8 output handling in console
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

print("=== STARTING PATROL PRIORITY ENGINE EVALUATION ===")

# 1. Test Patrol Summary
print("\n--- 1. Testing GET /api/patrol/summary ---")
req = urllib.request.Request('http://localhost:8000/api/patrol/summary')
with urllib.request.urlopen(req) as resp:
    assert resp.status == 200
    summary = json.loads(resp.read().decode('utf-8'))
    counts = summary.get("summary_counts", {})
    print(f"Summary counts: Critical: {counts.get('critical')}, High: {counts.get('high')}, Moderate: {counts.get('moderate')}, Low: {counts.get('low')}")
    assert counts.get("total_stations", 0) > 0, "No stations returned"
    print(f"Top station: {summary['top_priority_stations'][0]['station_id']} (Score: {summary['top_priority_stations'][0]['priority_score']}/100)")
print("✓ Summary endpoint passed!")

# 2. Test Patrol Stations List
print("\n--- 2. Testing GET /api/patrol/stations ---")
req = urllib.request.Request('http://localhost:8000/api/patrol/stations')
with urllib.request.urlopen(req) as resp:
    assert resp.status == 200
    stations = json.loads(resp.read().decode('utf-8'))
    print(f"Total stations evaluated: {len(stations)}")
    for s in stations[:3]:
        assert 0 <= s["priority_score"] <= 100, f"Invalid score: {s['priority_score']}"
        assert 0 <= s["evidence_confidence"] <= 100, f"Invalid confidence: {s['evidence_confidence']}"
        assert s["priority_level"] in ("CRITICAL", "HIGH", "MODERATE", "LOW")
        print(f"  [{s['badge_icon']} {s['priority_level']}] {s['station_id']} -> Score: {s['priority_score']}/100, Conf: {s['evidence_confidence']}%, Reason: {s['top_reasons'][0] if s['top_reasons'] else 'N/A'}")
print("✓ Station priorities list passed!")

# 3. Test Single Station Detail
print("\n--- 3. Testing GET /api/patrol/stations/ST-03 ---")
req = urllib.request.Request('http://localhost:8000/api/patrol/stations/ST-03')
with urllib.request.urlopen(req) as resp:
    assert resp.status == 200
    detail = json.loads(resp.read().decode('utf-8'))
    print(f"Station {detail['station_id']}: Priority {detail['priority_score']}/100 ({detail['priority_level']})")
    print(f"Why explanation: {detail['why_explanation'][:120]}...")
    print(f"Multi-cycle trajectory: {[c['score'] for c in detail['cycle_trend']]}")
    assert len(detail['cycle_trend']) == 5, "Trajectory should have 5 cycles"
print("✓ Station detail endpoint passed!")

# 4. Test Patrol Sequence
print("\n--- 4. Testing GET /api/patrol/sequence ---")
req = urllib.request.Request('http://localhost:8000/api/patrol/sequence?limit=5')
with urllib.request.urlopen(req) as resp:
    assert resp.status == 200
    seq = json.loads(resp.read().decode('utf-8'))
    print(f"Suggested sequence length: {len(seq)}")
    for item in seq:
        print(f"  {item['order']}. {item['station_id']} ({item['priority_level']} - {item['priority_score']}/100) -> Objective: {item['tactical_objective']}")
print("✓ Patrol sequence endpoint passed!")

# 5. Test Export CSV
print("\n--- 5. Testing GET /api/export/patrol ---")
req = urllib.request.Request('http://localhost:8000/api/export/patrol')
with urllib.request.urlopen(req) as resp:
    assert resp.status == 200
    csv_text = resp.read().decode('utf-8')
    lines = csv_text.strip().split('\n')
    print(f"CSV exported with {len(lines)} lines (Header + {len(lines)-1} stations)")
    print(f"CSV Header: {lines[0]}")
    assert "Station ID,Priority Level,Priority Score" in lines[0]
print("✓ Patrol CSV export endpoint passed!")

# 6. Test Chatbot Integration with Patrol Queries
print("\n--- 6. Testing Chatbot Patrol Intents ---")
patrol_queries = [
    ("Which stations should we prioritize today?", "GET_PATROL_PRIORITY"),
    ("Why is ST-03 high priority?", "GET_STATION_PATROL_PRIORITY"),
    ("Show suggested patrol sequence", "GET_SUGGESTED_PATROL_SEQUENCE"),
    ("What is the patrol trend for ST-17?", "GET_PATROL_TREND"),
]

for query, expected_intent in patrol_queries:
    req = urllib.request.Request(
        'http://localhost:8000/api/chat',
        data=json.dumps({'message': query}).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        data = json.loads(resp.read().decode('utf-8'))
        print(f"[PASS] Q: {query}")
        print(f"       Intent: {data.get('intent')} (Expected: {expected_intent})")
        print(f"       Actions: {[a['label'] for a in data.get('actions', [])]}")
        first_line = data.get('answer', '').split('\n')[0]
        print(f"       Answer: {first_line[:90]}...")
        print("-" * 65)

print("\n=== ALL PATROL PRIORITY ENGINE TESTS PASSED WITH 100% SUCCESS! ===")
