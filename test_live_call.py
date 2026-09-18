import urllib.request
import json
import io
from PIL import Image

img = Image.new('RGB', (224, 224), color=(210, 110, 30))
img_byte_arr = io.BytesIO()
img.save(img_byte_arr, format='JPEG')
file_bytes = img_byte_arr.getvalue()

boundary = '----WebKitFormBoundaryTest'
lines = [
    '--' + boundary,
    'Content-Disposition: form-data; name="file"; filename="test.jpg"',
    'Content-Type: image/jpeg',
    '',
    ''
]
part1 = '\r\n'.join(lines[:-1]).encode('utf-8') + b'\r\n'
part2 = b'\r\n--' + boundary.encode('utf-8') + b'--\r\n'
data_body = part1 + file_bytes + part2

req = urllib.request.Request(
    'http://localhost:8000/api/pipeline/analyze',
    data=data_body,
    headers={'Content-Type': 'multipart/form-data; boundary=' + boundary},
    method='POST'
)

res = urllib.request.urlopen(req)
data = json.loads(res.read().decode())

print('=== LIVE ENDPOINT VERIFICATION ===')
print('Status Code:', res.status)
print('Blank Filter (Stage 1):', data['stages']['blank_filter'])
print('Species Gate (Stage 2):', data['stages']['species_gate'])
print('Stripe Re-ID Model (Stage 3):', data['stages']['stripe_reid'])
print('Classification (Stage 4):', data['stages']['classification'])
print('Final Outcome:', data['final']['outcome'])
