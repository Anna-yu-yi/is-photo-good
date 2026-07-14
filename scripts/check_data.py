import json

with open(r'd:\photo-curator-app\memai-app\js\photos_data.js', 'r', encoding='utf-8') as f:
    content = f.read()
    start = content.find('=') + 1
    end = content.rfind(';')
    data = json.loads(content[start:end])

print(f'Total photos: {len(data)}')
print()
print('First 3 photos:')
for i in range(min(3, len(data))):
    p = data[i]
    print(f"\nPhoto {i+1}:")
    print(f"  photo_id: {p['photo_id']}")
    print(f"  photo_url: {p['photo_url']}")
    print(f"  scene_tags: {p['analysis'].get('scene_tags', [])}")
    print(f"  is_screenshot: {p['analysis'].get('is_screenshot', False)}")
    print(f"  screenshot_type: {p['analysis'].get('screenshot_type', '')}")
    print(f"  clarity_score: {p['analysis'].get('clarity_score', 0)}")
    print(f"  is_blurry: {p['analysis'].get('is_blurry', False)}")
    print(f"  hash: {p['analysis'].get('hash', '')[:20]}...")
