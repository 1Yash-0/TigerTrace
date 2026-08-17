import urllib.request
import json
import sys

# Ensure UTF-8 output handling in console
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

queries = [
    'Show all registered tigers',
    'Tell me about Choti Tara',
    'Where was PTR-T01 detected?',
    'Show movement history of PTR-T01',
    'What is T-01 home range?',
    'Which tigers overlap?',
    'Show high severity alerts',
    'Which tigers entered the buffer zone?',
    'Which tigers have not been seen recently?',
    'Which stations are near villages?',
    'Give me a summary of this monitoring cycle',
    'How many blank images were removed?',
    'How many images need review?',
    'Camera station health check',
    'Is the system working?',
    'What can you do?'
]

print("=== STARTING CHATBOT EVALUATION ===")
passed = 0
for q in queries:
    req = urllib.request.Request(
        'http://localhost:8000/api/chat',
        data=json.dumps({'message': q}).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200, f"Status code {resp.status}"
        data = json.loads(resp.read().decode('utf-8'))
        intent = data.get('intent')
        success = data.get('success')
        assert success is True
        assert intent != "UNKNOWN", f"Query '{q}' classified as UNKNOWN"
        passed += 1
        actions = [a['label'] for a in data.get('actions', [])]
        first_line = data.get('answer', '').split('\n')[0]
        print(f"[PASS] {q}")
        print(f"       Intent: {intent} | Mode: {data.get('mode')} | Actions: {actions}")
        print(f"       Answer: {first_line[:90]}...")
        print("-" * 65)

# Also test history endpoint
h_req = urllib.request.Request('http://localhost:8000/api/chat/history')
with urllib.request.urlopen(h_req) as h_resp:
    h_data = json.loads(h_resp.read().decode('utf-8'))
    print(f"Verified {len(h_data)} chat history records stored in database.")

print(f"\n=== ALL {passed}/{len(queries)} CONSERVATION INTELLIGENCE TESTS PASSED! ===")
