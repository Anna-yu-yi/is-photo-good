import urllib.request
import os
import json
import time

PHOTOS_DIR = r'd:\photo-curator-app\memai-app\photos'
os.makedirs(PHOTOS_DIR, exist_ok=True)

def fetch_photo_list(page=1, limit=100):
    url = f'https://picsum.photos/v2/list?page={page}&limit={limit}'
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print(f'Failed to fetch list: {e}')
        return []

def download_image(photo_id, filename, width=800, height=600):
    url = f'https://picsum.photos/id/{photo_id}/{width}/{height}'
    filepath = os.path.join(PHOTOS_DIR, filename)
    if os.path.exists(filepath):
        print(f'  Skip {filename} (exists)')
        return True
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=20) as resp:
            with open(filepath, 'wb') as f:
                f.write(resp.read())
        size_kb = os.path.getsize(filepath) / 1024
        print(f'  Downloaded {filename} ({size_kb:.0f}KB)')
        return True
    except Exception as e:
        print(f'  Failed {filename}: {e}')
        return False

print('Fetching photo list from picsum.photos...')
all_photos = []
for page in range(1, 6):
    photos = fetch_photo_list(page=page, limit=100)
    all_photos.extend(photos)
    print(f'  Page {page}: got {len(photos)} photos')
    time.sleep(0.5)

print(f'Total available: {len(all_photos)}')

# Shuffle deterministically
import random
random.seed(42)
random.shuffle(all_photos)

# Pick diverse IDs
selected = all_photos[:80]

print('\nDownloading photos...')
success = 0
for i, p in enumerate(selected):
    photo_id = p['id']
    filename = f'photo_{i+1:03d}.jpg'
    if download_image(photo_id, filename):
        success += 1
    time.sleep(0.3)

print(f'\nDone! Downloaded {success}/{len(selected)} photos')
print(f'Total size: {sum(os.path.getsize(os.path.join(PHOTOS_DIR, f)) for f in os.listdir(PHOTOS_DIR) if f.endswith(".jpg")) / 1024 / 1024:.1f} MB')
