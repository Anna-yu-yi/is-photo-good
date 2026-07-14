import os
import json
import base64
import io
import tempfile
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from PIL import Image
import numpy as np
import torch

os.environ['HF_HUB_OFFLINE'] = '1'
os.environ['TRANSFORMERS_OFFLINE'] = '1'

from transformers import CLIPProcessor, CLIPModel

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

print('Loading CLIP model...')
_clip_model = CLIPModel.from_pretrained('openai/clip-vit-base-patch32')
_clip_processor = CLIPProcessor.from_pretrained('openai/clip-vit-base-patch32')
_clip_model.eval()
print('CLIP model loaded.')

CLIP_LABELS = [
    'a photo of food or meal or dish',
    'a photo of a person or people or portrait',
    'a photo of a family or group of people',
    'a photo of a landscape or scenery or nature',
    'a photo of a pet or cat or dog or animal',
    'a screenshot of an app or phone screen',
    'a photo of a QR code',
    'a photo of a city or building or architecture',
    'a photo of a receipt or ticket or invoice',
    'a photo of a document or text or note',
    'a blurry or unclear photo',
    'a photo of a car or vehicle',
    'a photo of flowers or plants',
    'a screenshot of a live stream or live broadcast with comments and gifts',
]

CLIP_TO_SCENE = {
    0: 'food',
    1: 'portrait',
    2: 'family',
    3: 'landscape',
    4: 'pet',
    5: 'screenshot',
    6: 'screenshot',
    7: 'urban',
    8: 'screenshot',
    9: 'screenshot',
    10: 'general',
    11: 'urban',
    12: 'landscape',
    13: 'screenshot',
}

CLIP_TO_SUBTYPE = {
    5: 'app',
    6: 'qr_code',
    8: 'receipt',
    9: 'document',
    13: 'live_stream',
}


def classify_with_clip(image_path):
    try:
        image = Image.open(image_path).convert('RGB')
        inputs = _clip_processor(text=CLIP_LABELS, images=image, return_tensors='pt', padding=True)
        with torch.no_grad():
            outputs = _clip_model(**inputs)
        logits_per_image = outputs.logits_per_image
        probs = logits_per_image.softmax(dim=1).cpu().numpy()[0]

        top_idx = int(np.argmax(probs))
        top_prob = float(probs[top_idx])
        scene_type = CLIP_TO_SCENE[top_idx]
        confidence = round(top_prob, 3)

        return top_idx, probs, scene_type, confidence
    except Exception as e:
        print(f'CLIP error: {e}')
        return -1, None, 'general', 0.1


def analyze_image_features(image_path):
    try:
        img = Image.open(image_path)
    except Exception:
        return None

    img.thumbnail((300, 300), Image.LANCZOS)
    img_rgb = img.convert('RGB')
    arr = np.array(img_rgb, dtype=np.float64)
    h, w = arr.shape[:2]

    if h < 10 or w < 10:
        return None

    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]

    gray = 0.299 * r + 0.587 * g + 0.114 * b
    brightness = float(np.mean(gray) / 255.0)
    contrast = float(np.std(gray) / 128.0)
    contrast = min(1.0, max(0.0, contrast))

    max_rgb = np.max(arr, axis=2)
    min_rgb = np.min(arr, axis=2)
    saturation = float(np.mean((max_rgb - min_rgb) / (max_rgb + 1e-6)))
    saturation = min(1.0, max(0.0, saturation))

    gx = np.abs(np.diff(gray, axis=1))
    gy = np.abs(np.diff(gray, axis=0))
    edge_magnitude = np.sqrt(gx[:min(gx.shape[0], gy.shape[0]), :min(gx.shape[1], gy.shape[1])] ** 2 +
                              gy[:min(gx.shape[0], gy.shape[0]), :min(gx.shape[1], gy.shape[1])] ** 2)
    edge_density = float(np.mean(edge_magnitude > 25))
    edge_density_h = float(np.mean(gx > 20))
    edge_density_v = float(np.mean(gy > 20))

    laplacian = np.abs(
        gray[1:-1, 1:-1] * 4
        - gray[:-2, 1:-1]
        - gray[2:, 1:-1]
        - gray[1:-1, :-2]
        - gray[1:-1, 2:]
    )
    clarity_raw = float(np.var(laplacian))
    clarity = min(1.0, clarity_raw / 6000.0)

    total_pixels = h * w
    skin_mask1 = (r > 95) & (g > 40) & (b > 20) & (r > g) & (r > b)
    skin_mask2 = ((r.astype(int) - g.astype(int)) > 15) & ((g.astype(int) - b.astype(int)) > 10)
    skin_mask3 = (r > 160) & (g > 110) & (b > 90) & (r >= b - 10) & (r > g - 20)
    skin_mask = (skin_mask1 & skin_mask2) | skin_mask3
    skin_ratio = float(np.sum(skin_mask) / total_pixels)

    warm_mask = (r > g) & (g > b) & (r > 120) & ((r - b) > 30)
    warm_ratio = float(np.sum(warm_mask) / total_pixels)

    green_mask = (g > r) & (g > b) & (g > 80) & ((g - r) > 10) & ((g - b) > 10)
    green_ratio = float(np.sum(green_mask) / total_pixels)

    blue_mask = (b > r) & (b > g) & (b > 100) & ((b - r) > 15) & ((b - g) > 5)
    blue_ratio = float(np.sum(blue_mask) / total_pixels)

    red_mask = (r > g) & (r > b) & (r > 120) & ((r - g) > 20)
    red_ratio = float(np.sum(red_mask) / total_pixels)

    yellow_mask = (r > 150) & (g > 150) & (b < 100) & (abs(r - g) < 50)
    yellow_ratio = float(np.sum(yellow_mask) / total_pixels)

    texture_complexity = float(np.std(edge_magnitude) / 50.0)
    texture_complexity = min(1.0, max(0.0, texture_complexity))

    qr_score = 0
    if edge_density > 0.35: qr_score += 25
    high_contrast_ratio = float(np.sum((gray > 200) | (gray < 50)) / total_pixels)
    if high_contrast_ratio > 0.25: qr_score += 25
    color_entropy = 0.5
    if color_entropy < 0.4: qr_score += 20
    if clarity > 0.8: qr_score += 15
    if texture_complexity > 0.5: qr_score += 15

    natural_color_ratio = green_ratio + blue_ratio + warm_ratio
    has_natural_colors = natural_color_ratio > 0.2 and saturation > 0.15
    if has_natural_colors:
        qr_score = max(0, qr_score - 40)
    if green_ratio > 0.1 and texture_complexity > 0.15 and texture_complexity < 0.6:
        qr_score = max(0, qr_score - 20)

    is_qr_code = qr_score >= 70

    orig_w, orig_h = Image.open(image_path).size
    aspect_ratio = round(orig_w / orig_h, 2)

    dhash = generate_dhash(image_path)

    return {
        'clarity_score': round(clarity, 3),
        'is_blurry': clarity < 0.04,
        'brightness': round(brightness, 3),
        'contrast': round(contrast, 3),
        'saturation': round(saturation, 3),
        'edge_density': round(edge_density, 3),
        'edge_density_h': round(edge_density_h, 3),
        'edge_density_v': round(edge_density_v, 3),
        'skin_ratio': round(skin_ratio, 3),
        'warm_ratio': round(warm_ratio, 3),
        'green_ratio': round(green_ratio, 3),
        'blue_ratio': round(blue_ratio, 3),
        'red_ratio': round(red_ratio, 3),
        'yellow_ratio': round(yellow_ratio, 3),
        'high_contrast_ratio': round(high_contrast_ratio, 3),
        'texture_complexity': round(texture_complexity, 3),
        'qr_score': round(qr_score / 100.0, 3),
        'is_qr_code': is_qr_code,
        'aspect_ratio': aspect_ratio,
        'is_wide': aspect_ratio > 1.5,
        'is_portrait': aspect_ratio < 0.75,
        'hash': dhash,
    }


def generate_dhash(image_path, hash_size=8):
    try:
        img = Image.open(image_path)
        img = img.resize((hash_size + 1, hash_size), Image.LANCZOS).convert('L')
        pixels = np.array(img)
        hash_bits = ''
        for row in range(hash_size):
            for col in range(hash_size):
                hash_bits += '1' if pixels[row, col] > pixels[row, col + 1] else '0'
        return hash_bits
    except Exception:
        return '0' * 64


def detect_screenshot_type(features):
    s = features
    high_freq = s.get('edge_density', 0)
    brightness = s.get('brightness', 0.5)
    saturation = s.get('saturation', 0.5)
    edge_h = s.get('edge_density_h', 0)
    edge_v = s.get('edge_density_v', 0)
    qr_score = s.get('qr_score', 0)
    is_qr_code = s.get('is_qr_code', False)
    warm_ratio = s.get('warm_ratio', 0)

    if is_qr_code or qr_score > 0.6:
        return 'qr_code', True, False

    live_stream_score = 0
    if s.get('skin_ratio', 0) > 0.05:
        live_stream_score += 20
    if high_freq > 0.15 and high_freq < 0.45:
        live_stream_score += 25
    if edge_h > 0.1:
        live_stream_score += 20
    if brightness > 0.3 and brightness < 0.8:
        live_stream_score += 15
    if saturation > 0.15 and saturation < 0.6:
        live_stream_score += 10
    if edge_v > 0.08:
        live_stream_score += 10

    if live_stream_score >= 65:
        return 'live_stream', True, False

    weather_score = 0
    if saturation < 0.15: weather_score += 35
    elif saturation < 0.25: weather_score += 25
    elif saturation < 0.35: weather_score += 10
    if s.get('blue_ratio', 0) > 0.12: weather_score += 30
    elif s.get('blue_ratio', 0) > 0.06: weather_score += 15
    if brightness > 0.35 and brightness < 0.75: weather_score += 10
    if high_freq > 0.08 and high_freq < 0.35: weather_score += 10
    if warm_ratio > 0.35:
        weather_score -= 20
    elif warm_ratio > 0.2:
        weather_score -= 10
    if saturation > 0.4:
        weather_score -= 30

    if weather_score >= 60:
        return 'weather', True, False

    if high_freq > 0.35 and saturation < 0.15:
        return 'document', False, True
    elif high_freq > 0.3 and brightness > 0.7:
        if edge_h > 0.3 or edge_v > 0.3:
            return 'chat', True, False
        else:
            return 'app', True, False
    elif brightness > 0.75 and saturation < 0.1:
        return 'qr_code', True, False
    elif brightness > 0.6 and saturation < 0.2:
        return 'verify_code', True, False
    elif high_freq > 0.25 and brightness > 0.55:
        return 'ppt', False, True
    else:
        return 'app', True, False


def generate_scene_tags(scene_type, features):
    tags = []
    s = features

    if scene_type == 'portrait':
        tags = ['portrait', 'person']
        if s['skin_ratio'] > 0.25:
            tags.append('closeup')
    elif scene_type == 'family':
        tags = ['family', 'people', 'gathering']
    elif scene_type == 'landscape':
        tags = ['nature', 'travel', 'landscape']
        if s['green_ratio'] > 0.15:
            tags.append('mountain')
        if s['blue_ratio'] > 0.15:
            tags.append('sea', 'sky')
    elif scene_type == 'food':
        tags = ['food', 'dining']
    elif scene_type == 'urban':
        tags = ['urban', 'architecture', 'city']
    elif scene_type == 'pet':
        tags = ['animal', 'pet']
    elif scene_type == 'screenshot':
        tags = ['document', 'screen']
    else:
        tags = ['general']

    return tags


def analyze_photo(image_data):
    with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as f:
        f.write(image_data)
        tmp_path = f.name

    try:
        features = analyze_image_features(tmp_path)
        if features is None:
            return None

        clip_idx, clip_probs, scene_type, confidence = classify_with_clip(tmp_path)
        clip_subtype = CLIP_TO_SUBTYPE.get(clip_idx, None)

        clip_landscape_prob = 0
        clip_urban_prob = 0
        clip_flower_prob = 0
        if clip_probs is not None and len(clip_probs) > 12:
            clip_landscape_prob = float(clip_probs[3])
            clip_urban_prob = float(clip_probs[7])
            clip_flower_prob = float(clip_probs[12])

        has_natural_features = (
            features['green_ratio'] + features['blue_ratio'] > 0.15 and
            features['edge_density'] < 0.3 and
            features['texture_complexity'] > 0.05 and
            not features.get('is_qr_code', False)
        )

        strong_landscape_signal = (
            clip_landscape_prob > 0.1 or
            clip_flower_prob > 0.08 or
            clip_urban_prob > 0.1
        )

        landscape_protection = strong_landscape_signal and has_natural_features

        weather_check = detect_screenshot_type(features)
        is_weather_screenshot = (weather_check[0] == 'weather')

        is_screenshot = False

        if clip_probs is not None and len(clip_probs) > 13 and clip_probs[13] > 0.2:
            is_screenshot = True
            scene_type = 'screenshot'
            clip_subtype = 'live_stream'
        elif clip_probs is not None and clip_probs[5] > 0.7 and not landscape_protection:
            is_screenshot = True
            scene_type = 'screenshot'
        elif clip_idx == 6:
            is_screenshot = True
            scene_type = 'screenshot'
        elif features.get('qr_score', 0) > 0.6 and features.get('is_qr_code', False):
            is_screenshot = True
            scene_type = 'screenshot'
        elif is_weather_screenshot:
            is_screenshot = True
            scene_type = 'screenshot'
            clip_subtype = 'weather'
        elif landscape_protection and not features.get('qr_score', 0) > 0.5:
            is_screenshot = False
            if clip_landscape_prob > clip_urban_prob:
                scene_type = 'landscape'
            else:
                scene_type = 'urban'
            confidence = max(clip_landscape_prob, clip_urban_prob)
        else:
            is_screenshot = False
            if scene_type == 'screenshot':
                scene_type = 'general'
                confidence = max(confidence, 0.3)

        if scene_type == 'landscape' or strong_landscape_signal:
            features['is_blurry'] = features['clarity_score'] < 0.02
        elif clip_idx == 10:
            features['is_blurry'] = True

        scene_tags = generate_scene_tags(scene_type, features)

        screenshot_type = None
        is_temp_info = False
        is_important_info = False
        text_density = 0.05

        if is_screenshot:
            trad_subtype, trad_temp, trad_important = detect_screenshot_type(features)
            if trad_subtype == 'weather':
                screenshot_type = 'weather'
                is_temp_info = True
            elif clip_subtype:
                screenshot_type = clip_subtype
                is_temp_info = clip_subtype in ('qr_code', 'receipt', 'weather')
                is_important_info = clip_subtype == 'document'
            else:
                screenshot_type = trad_subtype
                is_temp_info = trad_temp
                is_important_info = trad_important
            text_density = round(features['edge_density'] * 0.6 + 0.05, 3)

        is_qr_code = (clip_idx == 6) or features.get('is_qr_code', False)

        if scene_type in ('portrait', 'family'):
            person_count = 1 if features['skin_ratio'] > 0.25 else 2
        else:
            person_count = 0

        is_event = scene_type in ('family', 'portrait')

        result = {
            'clarity_score': features['clarity_score'],
            'is_blurry': features['is_blurry'],
            'brightness': features['brightness'],
            'contrast': features['contrast'],
            'saturation': features['saturation'],
            'edge_density': features['edge_density'],
            'is_screenshot': is_screenshot,
            'qr_score': 1.0 if is_qr_code else features.get('qr_score', 0),
            'is_qr_code': is_qr_code,
            'scene_tags': scene_tags,
            'person_count': person_count,
            'is_event': is_event,
            'screenshot_type': screenshot_type,
            'is_temp_info': is_temp_info,
            'is_important_info': is_important_info,
            'text_density': text_density,
            'hash': features['hash'],
            'aspect_ratio': features['aspect_ratio'],
            'is_wide': features['is_wide'],
            'is_portrait': features['is_portrait'],
            'detected_type': scene_type,
            'type_confidence': confidence,
            'type_raw_score': int(confidence * 100),
            'skin_ratio': features['skin_ratio'],
            'warm_ratio': features['warm_ratio'],
            'green_ratio': features['green_ratio'],
            'blue_ratio': features['blue_ratio'],
            'red_ratio': features['red_ratio'],
            'yellow_ratio': features['yellow_ratio'],
            'clip_label': CLIP_LABELS[clip_idx] if clip_idx >= 0 else 'unknown',
            'is_duplicate': False,
            'duplicate_group_id': None,
            'duplicate_count': 0,
        }

        return result
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


@app.route('/api/analyze', methods=['POST'])
def api_analyze():
    try:
        data = request.get_json()
        if not data or 'images' not in data:
            return jsonify({'error': 'No images provided'}), 400

        images = data['images']
        results = {}

        for i, img_data in enumerate(images):
            try:
                if img_data.startswith('data:image'):
                    base64_data = img_data.split(',')[1]
                else:
                    base64_data = img_data
                image_bytes = base64.b64decode(base64_data)
                result = analyze_photo(image_bytes)
                if result:
                    results[str(i)] = result
                else:
                    results[str(i)] = {'error': 'Analysis failed'}
            except Exception as e:
                results[str(i)] = {'error': str(e)}

        return jsonify({'results': results})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/health', methods=['GET'])
def api_health():
    return jsonify({'status': 'ok', 'model': 'clip-vit-base-patch32'})


@app.route('/')
def index():
    return send_from_directory('.', 'index.html')


@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('.', path)


if __name__ == '__main__':
    print('Starting MemAI server on port 8000...')
    app.run(host='0.0.0.0', port=8000, debug=False)
