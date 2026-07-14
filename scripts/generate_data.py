import json
import os
import random
import hashlib
from datetime import datetime, timedelta
from PIL import Image
import numpy as np
import torch

os.environ['HF_HUB_OFFLINE'] = '1'
os.environ['TRANSFORMERS_OFFLINE'] = '1'

from transformers import CLIPProcessor, CLIPModel

random.seed(42)

# ========================
# CLIP 零样本分类
# ========================

print('Loading CLIP model (openai/clip-vit-base-patch32)...')
_clip_model = CLIPModel.from_pretrained('openai/clip-vit-base-patch32')
_clip_processor = CLIPProcessor.from_pretrained('openai/clip-vit-base-patch32')
_clip_model.eval()
print('CLIP model loaded.')

# 零样本分类标签（CLIP用英文prompt效果更好）
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

# CLIP标签到内部scene_type的映射
CLIP_TO_SCENE = {
    0: 'food',
    1: 'portrait',
    2: 'family',
    3: 'landscape',
    4: 'pet',
    5: 'screenshot',
    6: 'screenshot',   # QR code → screenshot
    7: 'urban',
    8: 'screenshot',   # receipt/ticket → screenshot
    9: 'screenshot',   # document → screenshot
    10: 'general',     # blurry
    11: 'urban',       # car/vehicle
    12: 'landscape',   # flowers/plants
    13: 'screenshot',  # live stream → screenshot
}

# CLIP子类型（用于screenshot_type和更精确的分类）
CLIP_TO_SUBTYPE = {
    5: 'app',
    6: 'qr_code',
    8: 'receipt',
    9: 'document',
    13: 'live_stream',
}

def classify_with_clip(image_path):
    """使用CLIP模型对图片进行零样本分类，返回(top_label_idx, probabilities, scene_type, confidence)"""
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
        print(f'  Warning: CLIP failed for {image_path}: {e}')
        return -1, None, 'general', 0.1

TOTAL = 265

def random_date(years_back=3):
    end = datetime.now()
    start = end - timedelta(days=years_back * 365)
    delta = end - start
    random_days = random.randint(0, delta.days)
    return (start + timedelta(days=random_days)).strftime('%Y-%m-%d')

def random_resolution():
    options = [
        (4032, 3024), (3024, 4032),
        (3264, 2448), (2448, 3264),
        (4032, 2268), (2268, 4032),
        (1280, 720), (720, 1280),
        (1080, 2340), (1170, 2532),
        (1284, 2778), (1242, 2688),
    ]
    return random.choice(options)

def random_file_size(w, h):
    base = w * h * 0.3
    size = int(base * random.uniform(0.8, 1.4))
    return max(50000, size)

def generate_dhash(image_path, hash_size=8):
    """计算图片的差异哈希（Difference Hash）"""
    try:
        img = Image.open(image_path)
        img = img.resize((hash_size + 1, hash_size), Image.LANCZOS).convert('L')
        pixels = np.array(img)
        
        hash_bits = ''
        for row in range(hash_size):
            for col in range(hash_size):
                hash_bits += '1' if pixels[row, col] > pixels[row, col + 1] else '0'
        
        return hash_bits
    except Exception as e:
        print(f'  Warning: dhash failed for {image_path}: {e}')
        return '0' * 64

def generate_ahash(image_path, hash_size=8):
    """计算图片的平均哈希（Average Hash）"""
    try:
        img = Image.open(image_path)
        img = img.resize((hash_size, hash_size), Image.LANCZOS).convert('L')
        pixels = np.array(img)
        
        avg = np.mean(pixels)
        hash_bits = ''
        for row in range(hash_size):
            for col in range(hash_size):
                hash_bits += '1' if pixels[row, col] > avg else '0'
        
        return hash_bits
    except Exception as e:
        print(f'  Warning: ahash failed for {image_path}: {e}')
        return '0' * 64

def hamming_distance(hash1, hash2):
    """计算两个哈希的汉明距离"""
    if len(hash1) != len(hash2):
        return 64
    return sum(c1 != c2 for c1, c2 in zip(hash1, hash2))

def calculate_similarity(image_path1, image_path2):
    """综合多种哈希计算相似度，返回 True 表示是重复图片"""
    dhash1 = generate_dhash(image_path1)
    dhash2 = generate_dhash(image_path2)
    dhash_dist = hamming_distance(dhash1, dhash2)
    
    ahash1 = generate_ahash(image_path1)
    ahash2 = generate_ahash(image_path2)
    ahash_dist = hamming_distance(ahash1, ahash2)
    
    return dhash_dist <= 5 and ahash_dist <= 8

# ========================
# 精细图像分析
# ========================

def analyze_image(image_path):
    try:
        img = Image.open(image_path)
    except Exception as e:
        print(f'  Warning: cannot open {image_path}: {e}')
        return None

    img.thumbnail((300, 300), Image.LANCZOS)
    img_rgb = img.convert('RGB')
    arr = np.array(img_rgb, dtype=np.float64)
    h, w = arr.shape[:2]

    if h < 10 or w < 10:
        return None

    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]

    # --- 基础颜色特征 ---
    r_mean = float(np.mean(r))
    g_mean = float(np.mean(g))
    b_mean = float(np.mean(b))

    gray = 0.299 * r + 0.587 * g + 0.114 * b
    brightness = float(np.mean(gray) / 255.0)
    contrast = float(np.std(gray) / 128.0)
    contrast = min(1.0, max(0.0, contrast))

    # --- 饱和度 ---
    max_rgb = np.max(arr, axis=2)
    min_rgb = np.min(arr, axis=2)
    saturation = float(np.mean((max_rgb - min_rgb) / (max_rgb + 1e-6)))
    saturation = min(1.0, max(0.0, saturation))

    # --- 边缘密度 (水平+垂直) ---
    gx = np.abs(np.diff(gray, axis=1))
    gy = np.abs(np.diff(gray, axis=0))
    edge_magnitude = np.sqrt(gx[:min(gx.shape[0], gy.shape[0]), :min(gx.shape[1], gy.shape[1])] ** 2 +
                              gy[:min(gx.shape[0], gy.shape[0]), :min(gx.shape[1], gy.shape[1])] ** 2)
    edge_density = float(np.mean(edge_magnitude > 25))
    edge_density_h = float(np.mean(gx > 20))
    edge_density_v = float(np.mean(gy > 20))

    # --- 清晰度 (Laplacian) ---
    laplacian = np.abs(
        gray[1:-1, 1:-1] * 4
        - gray[:-2, 1:-1]
        - gray[2:, 1:-1]
        - gray[1:-1, :-2]
        - gray[1:-1, 2:]
    )
    clarity_raw = float(np.var(laplacian))
    clarity = min(1.0, clarity_raw / 6000.0)

    # --- 颜色通道比例 ---
    total_pixels = h * w
    r_ratio = float(np.sum(r > 100) / total_pixels)
    g_ratio = float(np.sum(g > 100) / total_pixels)
    b_ratio = float(np.sum(b > 100) / total_pixels)

    # --- 肤色检测 (多阈值组合) ---
    skin_mask1 = (r > 95) & (g > 40) & (b > 20) & (r > g) & (r > b)
    skin_mask2 = ((r.astype(int) - g.astype(int)) > 15) & ((g.astype(int) - b.astype(int)) > 10)
    #  tightened: must also have R >= B (skin tends to have R >= B, not blue sky)
    skin_mask3 = (r > 160) & (g > 110) & (b > 90) & (r >= b - 10) & (r > g - 20)
    skin_mask = (skin_mask1 & skin_mask2) | skin_mask3
    skin_ratio = float(np.sum(skin_mask) / total_pixels)

    # --- 肤色区域分析 ---
    if skin_ratio > 0.05:
        skin_pixels = arr[skin_mask]
        skin_r_mean = float(np.mean(skin_pixels[:, 0]))
        skin_g_mean = float(np.mean(skin_pixels[:, 1]))
        skin_b_mean = float(np.mean(skin_pixels[:, 2]))
        skin_std = float(np.std(skin_pixels))
    else:
        skin_r_mean = 0
        skin_g_mean = 0
        skin_b_mean = 0
        skin_std = 0

    # --- 暖色调检测 ---
    warm_mask = (r > g) & (g > b) & (r > 120) & ((r - b) > 30)
    warm_ratio = float(np.sum(warm_mask) / total_pixels)

    # --- 冷色调检测 ---
    cool_mask = (b > g) & (g > r) & (b > 100) & ((b - r) > 20)
    cool_ratio = float(np.sum(cool_mask) / total_pixels)

    # --- 绿色检测 ---
    green_mask = (g > r) & (g > b) & (g > 80) & ((g - r) > 10) & ((g - b) > 10)
    green_ratio = float(np.sum(green_mask) / total_pixels)

    # --- 蓝色检测 ---
    blue_mask = (b > r) & (b > g) & (b > 100) & ((b - r) > 15) & ((b - g) > 5)
    blue_ratio = float(np.sum(blue_mask) / total_pixels)

    # --- 红色检测 ---
    red_mask = (r > g) & (r > b) & (r > 120) & ((r - g) > 20)
    red_ratio = float(np.sum(red_mask) / total_pixels)

    # --- 黄色检测 (美食) ---
    yellow_mask = (r > 150) & (g > 150) & (b < 100) & (abs(r - g) < 50)
    yellow_ratio = float(np.sum(yellow_mask) / total_pixels)

    # --- 高对比度区域 ---
    high_contrast_ratio = float(np.sum((gray > 200) | (gray < 50)) / total_pixels)

    # --- 中间色调区域 ---
    mid_tone_ratio = float(np.sum((gray >= 80) & (gray <= 180)) / total_pixels)

    # --- 高光区域 ---
    highlight_ratio = float(np.sum(gray > 220) / total_pixels)

    # --- 阴影区域 ---
    shadow_ratio = float(np.sum(gray < 40) / total_pixels)

    # --- 纹理复杂度 ---
    texture_complexity = float(np.std(edge_magnitude) / 50.0)
    texture_complexity = min(1.0, max(0.0, texture_complexity))

    # --- 颜色直方图峰值 ---
    hist_r = np.histogram(r, bins=16, range=(0, 256))[0]
    hist_g = np.histogram(g, bins=16, range=(0, 256))[0]
    hist_b = np.histogram(b, bins=16, range=(0, 256))[0]
    color_entropy = -np.sum((hist_r / total_pixels) * np.log2((hist_r / total_pixels) + 1e-10)) / 4.0
    color_entropy = min(1.0, max(0.0, color_entropy))

    # --- 二维码检测 ---
    qr_score = 0
    if edge_density > 0.35: qr_score += 25
    if high_contrast_ratio > 0.25: qr_score += 25
    if color_entropy < 0.4: qr_score += 20
    if clarity > 0.8: qr_score += 15
    if texture_complexity > 0.5: qr_score += 15
    
    # 自然特征排除：有明显绿色/蓝色/暖色调且颜色丰富的，不太可能是二维码
    natural_color_ratio = green_ratio + blue_ratio + warm_ratio
    has_natural_colors = natural_color_ratio > 0.2 and saturation > 0.15
    if has_natural_colors:
        qr_score = max(0, qr_score - 40)
    
    # 风景纹理排除：纹理复杂度适中且有自然颜色分布的
    if green_ratio > 0.1 and texture_complexity > 0.15 and texture_complexity < 0.6:
        qr_score = max(0, qr_score - 20)
    
    is_qr_code = qr_score >= 70

    # --- 宽高比 ---
    orig_w, orig_h = Image.open(image_path).size
    aspect_ratio = round(orig_w / orig_h, 2)

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
        'skin_r_mean': round(skin_r_mean, 1),
        'skin_g_mean': round(skin_g_mean, 1),
        'skin_b_mean': round(skin_b_mean, 1),
        'warm_ratio': round(warm_ratio, 3),
        'cool_ratio': round(cool_ratio, 3),
        'green_ratio': round(green_ratio, 3),
        'blue_ratio': round(blue_ratio, 3),
        'red_ratio': round(red_ratio, 3),
        'yellow_ratio': round(yellow_ratio, 3),
        'r_ratio': round(r_ratio, 3),
        'g_ratio': round(g_ratio, 3),
        'b_ratio': round(b_ratio, 3),
        'high_contrast_ratio': round(high_contrast_ratio, 3),
        'mid_tone_ratio': round(mid_tone_ratio, 3),
        'highlight_ratio': round(highlight_ratio, 3),
        'shadow_ratio': round(shadow_ratio, 3),
        'texture_complexity': round(texture_complexity, 3),
        'color_entropy': round(color_entropy, 3),
        'qr_score': round(qr_score / 100.0, 3),
        'is_qr_code': is_qr_code,
        'aspect_ratio': aspect_ratio,
        'is_wide': aspect_ratio > 1.5,
        'is_portrait': aspect_ratio < 0.75,
        'height': h,
        'width': w,
    }

def detect_scene_type(features):
    s = features
    scores = {}

    # --- 人像检测 ---
    portrait_score = 0
    if s['skin_ratio'] > 0.15: portrait_score += 40
    elif s['skin_ratio'] > 0.08: portrait_score += 25
    elif s['skin_ratio'] > 0.04: portrait_score += 10

    if s['skin_ratio'] > 0.05:
        skin_color_match = (s['skin_r_mean'] > 180 and s['skin_r_mean'] < 250 and
                           s['skin_g_mean'] > 120 and s['skin_g_mean'] < 200 and
                           s['skin_b_mean'] > 80 and s['skin_b_mean'] < 160)
        if skin_color_match: portrait_score += 25

    if s['saturation'] > 0.25 and s['saturation'] < 0.7: portrait_score += 10
    if s['contrast'] > 0.3: portrait_score += 10
    if s['edge_density'] < 0.35: portrait_score += 10
    if s['texture_complexity'] > 0.3: portrait_score += 5
    scores['portrait'] = portrait_score

    # --- 家庭合照检测 ---
    family_score = 0
    if s['skin_ratio'] > 0.1: family_score += 30
    elif s['skin_ratio'] > 0.06: family_score += 20

    if s['skin_ratio'] > 0.08 and s['skin_ratio'] < 0.3: family_score += 25
    if s['brightness'] > 0.4 and s['brightness'] < 0.8: family_score += 15
    if s['contrast'] > 0.25: family_score += 10
    if s['saturation'] > 0.2: family_score += 10
    if s['mid_tone_ratio'] > 0.5: family_score += 10
    scores['family'] = family_score

    # --- 风景检测 ---
    landscape_score = 0
    if s['green_ratio'] > 0.15: landscape_score += 25
    elif s['green_ratio'] > 0.08: landscape_score += 15
    if s['blue_ratio'] > 0.15: landscape_score += 25
    elif s['blue_ratio'] > 0.08: landscape_score += 15

    if s['blue_ratio'] > 0.1 or s['green_ratio'] > 0.1:
        landscape_score += 20

    if s['saturation'] > 0.2: landscape_score += 10
    if s['contrast'] > 0.3: landscape_score += 10
    if s['edge_density'] < 0.3: landscape_score += 10
    if s['texture_complexity'] > 0.4: landscape_score += 10
    scores['landscape'] = landscape_score

    # --- 美食检测 ---
    food_score = 0
    if s['warm_ratio'] > 0.15: food_score += 35
    elif s['warm_ratio'] > 0.08: food_score += 20
    if s['yellow_ratio'] > 0.06: food_score += 25
    elif s['yellow_ratio'] > 0.03: food_score += 12
    if s['red_ratio'] > 0.08: food_score += 20
    elif s['red_ratio'] > 0.04: food_score += 10

    if s['saturation'] > 0.35: food_score += 25
    elif s['saturation'] > 0.25: food_score += 15

    if s['brightness'] > 0.45: food_score += 15
    if s['contrast'] > 0.3: food_score += 15
    if s['texture_complexity'] > 0.25: food_score += 15

    # 排除条件：高边缘密度不太可能是美食（可能是城市）
    if s['edge_density'] > 0.35: food_score -= 20
    scores['food'] = food_score

    # --- 城市/建筑检测 ---
    urban_score = 0
    if s['edge_density'] > 0.25: urban_score += 25
    elif s['edge_density'] > 0.15: urban_score += 15

    if s['edge_density_h'] > 0.2 or s['edge_density_v'] > 0.2: urban_score += 20

    if s['saturation'] < 0.4: urban_score += 20
    elif s['saturation'] < 0.6: urban_score += 10

    if s['blue_ratio'] > 0.1: urban_score += 15
    if s['high_contrast_ratio'] > 0.15: urban_score += 10
    if s['texture_complexity'] > 0.4: urban_score += 10
    scores['urban'] = urban_score

    # --- 宠物检测 ---
    pet_score = 0
    if s['skin_ratio'] < 0.1: pet_score += 20
    if s['green_ratio'] < 0.15: pet_score += 15

    if s['saturation'] > 0.25 and s['saturation'] < 0.7: pet_score += 25
    if s['contrast'] > 0.3: pet_score += 15
    if s['edge_density'] > 0.15 and s['edge_density'] < 0.4: pet_score += 20
    if s['texture_complexity'] > 0.3: pet_score += 15

    if (s['warm_ratio'] > 0.1 or s['cool_ratio'] > 0.1): pet_score += 10
    scores['pet'] = pet_score

    # --- 截图检测 ---
    screenshot_score = 0
    
    if s['edge_density'] > 0.4: screenshot_score += 25
    elif s['edge_density'] > 0.3: screenshot_score += 15

    if s['saturation'] < 0.18: screenshot_score += 30
    elif s['saturation'] < 0.25: screenshot_score += 15

    if s['brightness'] > 0.75: screenshot_score += 20
    elif s['brightness'] > 0.65: screenshot_score += 10

    if s['clarity_score'] > 0.85: screenshot_score += 15

    if s['high_contrast_ratio'] > 0.3: screenshot_score += 15
    if s['highlight_ratio'] > 0.15: screenshot_score += 10

    if s['edge_density_h'] > 0.35 and s['edge_density_v'] > 0.35:
        screenshot_score += 20

    if s.get('qr_score', 0) > 0.6:
        screenshot_score += 40
    elif s.get('qr_score', 0) > 0.4:
        screenshot_score += 20

    # --- 屏幕拍照检测（手机拍屏幕）---
    # 必须有文字/界面边缘才可能是屏幕拍照，排除纯模糊的风景
    has_screen_edges = s['edge_density'] > 0.15
    has_grid_pattern = s['edge_density_h'] > 0.1 and s['edge_density_v'] > 0.1
    
    if has_screen_edges and s['clarity_score'] < 0.25 and s['brightness'] > 0.55:
        screenshot_score += 35
    elif has_screen_edges and s['clarity_score'] < 0.35 and s['brightness'] > 0.5:
        screenshot_score += 20
    
    if has_screen_edges and s['clarity_score'] < 0.3 and s.get('text_density', 0) > 0.05:
        screenshot_score += 25

    if has_screen_edges and s['clarity_score'] < 0.3 and s['highlight_ratio'] > 0.1:
        screenshot_score += 15
    
    # --- 天气截图检测特征 ---
    # 天气截图：有大量蓝色但饱和度不高 + 有文字边缘 + 中等亮度
    weather_like = (s['blue_ratio'] > 0.15 and s['saturation'] < 0.35 and 
                    s['edge_density'] > 0.15 and s['edge_density'] < 0.35)
    if weather_like:
        screenshot_score += 25
        # 如果颜色分布均匀（不像真风景的自然渐变），再加
        if s['color_entropy'] < 0.6:
            screenshot_score += 15

    # --- 强排除：真实自然风景 ---
    # 自然风景特征：大量绿色/蓝色 + 低边缘密度 + 没有规则网格
    natural_scenery = (s['green_ratio'] + s['blue_ratio'] > 0.35 and 
                       s['edge_density'] < 0.18 and not has_grid_pattern and
                       s['texture_complexity'] > 0.12)
    if natural_scenery:
        screenshot_score -= 40

    # 高蓝绿色占比 + 自然纹理 + 低饱和度 → 很可能是真实天空/水面风景
    sky_water_scene = (s['blue_ratio'] > 0.25 and s['green_ratio'] + s['blue_ratio'] > 0.3 and
                       s['saturation'] < 0.35 and s['texture_complexity'] > 0.15)
    if sky_water_scene and not has_grid_pattern:
        screenshot_score -= 30

    # 排除条件：如果有明显的肤色，不太可能是截图
    # 但如果是二维码、屏幕拍照或天气类，即使有蓝色/绿色背景也认为是截图
    if s.get('qr_score', 0) < 0.5 and s['clarity_score'] >= 0.3 and not weather_like:
        if s['skin_ratio'] > 0.1: screenshot_score -= 30
        if s['green_ratio'] > 0.15: screenshot_score -= 25
        if s['blue_ratio'] > 0.15: screenshot_score -= 20
        if s['warm_ratio'] > 0.15: screenshot_score -= 15

    screenshot_score = max(0, screenshot_score)
    scores['screenshot'] = screenshot_score

    # --- 通用 ---
    scores['general'] = 10

    max_type = max(scores, key=scores.get)
    max_score = scores[max_type]

    total_score = sum(scores.values())
    confidence = round(max_score / (total_score + 1e-6), 3)

    return max_type, max_score, confidence, scores

def detect_screenshot_type(features):
    s = features
    high_freq = s.get('edge_density', 0)
    brightness = s.get('brightness', 0.5)
    saturation = s.get('saturation', 0.5)
    edge_h = s.get('edge_density_h', 0)
    edge_v = s.get('edge_density_v', 0)
    qr_score = s.get('qr_score', 0)
    is_qr_code = s.get('is_qr_code', False)
    yellow_ratio = s.get('yellow_ratio', 0)
    warm_ratio = s.get('warm_ratio', 0)
    clarity = s.get('clarity_score', 0.5)

    if is_qr_code or qr_score > 0.6:
        return 'qr_code', True, False

    # 直播截图特征：有人物 + 高UI边缘密度 + 有文字弹幕区域 + 特定亮度模式
    # 直播界面通常：人物占上半部分 + 下半部分有弹幕/礼物/输入框
    live_stream_score = 0
    # 有人物/肤色区域
    if s.get('skin_ratio', 0) > 0.05:
        live_stream_score += 20
    # 高边缘密度（UI元素多）
    if high_freq > 0.15 and high_freq < 0.45:
        live_stream_score += 25
    # 有水平文字线条（弹幕）
    if edge_h > 0.1:
        live_stream_score += 20
    # 中等亮度（屏幕亮度）
    if brightness > 0.3 and brightness < 0.8:
        live_stream_score += 15
    # 有一定饱和度（直播画面色彩丰富）
    if saturation > 0.15 and saturation < 0.6:
        live_stream_score += 10
    # 有垂直UI元素（侧边栏、按钮等）
    if edge_v > 0.08:
        live_stream_score += 10

    if live_stream_score >= 65:
        return 'live_stream', True, False

    # 天气截图特征：低饱和度 + 偏蓝色/灰色调 + 有UI边缘 + 中等亮度
    weather_score = 0
    # 低饱和度（天气界面通常颜色不鲜艳，这是最强特征）
    if saturation < 0.15: weather_score += 35
    elif saturation < 0.25: weather_score += 25
    elif saturation < 0.35: weather_score += 10
    # 蓝色背景（天气应用常见，强特征）
    if s.get('blue_ratio', 0) > 0.12: weather_score += 30
    elif s.get('blue_ratio', 0) > 0.06: weather_score += 15
    # 冷色调（灰蓝天气背景）
    if s.get('cool_ratio', 0) > 0.15: weather_score += 15
    # 中等亮度
    if brightness > 0.35 and brightness < 0.75: weather_score += 10
    # 有文字/UI边缘（天气信息、温度数字等）
    if high_freq > 0.08 and high_freq < 0.35: weather_score += 10
    # 低色熵（天气界面颜色单一）
    if s.get('color_entropy', 0.5) < 0.35: weather_score += 10
    # 暖色排除：暖色比例过高的不太可能是天气截图
    if warm_ratio > 0.35:
        weather_score -= 20
    elif warm_ratio > 0.2:
        weather_score -= 10
    # 高饱和度排除：饱和度>0.4的排除
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
        if s['skin_ratio'] > 0.1 and s['skin_ratio'] < 0.25:
            tags.append('couple')
        if random.random() < 0.3:
            tags.append('friends')
        if random.random() < 0.2:
            tags.append('selfie')

    elif scene_type == 'family':
        tags = ['family', 'people', 'gathering']
        if s['skin_ratio'] > 0.15:
            tags.append('group')
        if random.random() < 0.4:
            tags.append('birthday')
        if random.random() < 0.3:
            tags.append('party')
        if random.random() < 0.2:
            tags.append('wedding')

    elif scene_type == 'landscape':
        tags = ['nature', 'travel', 'landscape']
        if s['green_ratio'] > 0.15:
            tags.append('mountain')
        if s['blue_ratio'] > 0.15:
            tags.append('sea')
            tags.append('sky')
        if s['brightness'] > 0.7:
            tags.append('sunny')
        if s['brightness'] < 0.4:
            tags.append('sunset')
        if s['blue_ratio'] > 0.2 and s['green_ratio'] < 0.05:
            tags.append('beach')
        if s['yellow_ratio'] > 0.05:
            tags.append('sunset')

    elif scene_type == 'food':
        tags = ['food', 'dining']
        if s['warm_ratio'] > 0.2:
            tags.append('restaurant')
        if s['yellow_ratio'] > 0.08:
            tags.append('dessert')
        if s['red_ratio'] > 0.1:
            tags.append('meal')
        if s['brightness'] > 0.6:
            tags.append('delicious')

    elif scene_type == 'urban':
        tags = ['urban', 'architecture', 'city']
        if s['brightness'] < 0.4:
            tags.append('night')
        if s['edge_density'] > 0.3:
            tags.append('building')
        if s['blue_ratio'] > 0.1:
            tags.append('skyline')

    elif scene_type == 'pet':
        tags = ['animal', 'pet']
        if s['warm_ratio'] > 0.15:
            tags.append('dog')
        elif s['cool_ratio'] > 0.1:
            tags.append('cat')
        else:
            tags.append(random.choice(['cat', 'dog']))
        tags.append('cute')

    elif scene_type == 'screenshot':
        tags = ['document', 'screen']

    else:
        tags = ['general']

    return tags

def generate():
    photos = []
    photo_id_counter = 1

    photo_eg_path = r'd:\photo-curator-app\memai-app\photo_eg'
    all_files = sorted([f for f in os.listdir(photo_eg_path) if f.lower().endswith(('.jpg', '.jpeg', '.png'))])

    print(f'Found {len(all_files)} images in photo_eg folder')
    print('Analyzing real image content...')

    dhashes = []
    ahashes = []

    for i, filename in enumerate(all_files, 1):
        image_path = os.path.join(photo_eg_path, filename)

        features = analyze_image(image_path)
        if features is None:
            features = {
                'clarity_score': 0.5, 'is_blurry': False,
                'brightness': 0.5, 'contrast': 0.4, 'saturation': 0.4,
                'edge_density': 0.2, 'edge_density_h': 0.2, 'edge_density_v': 0.2,
                'skin_ratio': 0.05, 'skin_r_mean': 0, 'skin_g_mean': 0, 'skin_b_mean': 0,
                'warm_ratio': 0.1, 'cool_ratio': 0.05, 'green_ratio': 0.1,
                'blue_ratio': 0.1, 'red_ratio': 0.05, 'yellow_ratio': 0.03,
                'r_ratio': 0.3, 'g_ratio': 0.3, 'b_ratio': 0.3,
                'high_contrast_ratio': 0.1, 'mid_tone_ratio': 0.5,
                'highlight_ratio': 0.05, 'shadow_ratio': 0.05,
                'texture_complexity': 0.3, 'color_entropy': 0.5,
                'aspect_ratio': 1.0, 'is_wide': False, 'is_portrait': False,
                'height': 100, 'width': 100,
            }

        dhash = generate_dhash(image_path)
        ahash = generate_ahash(image_path)
        dhashes.append(dhash)
        ahashes.append(ahash)

        # ====== CLIP零样本分类（主力分类器）======
        clip_idx, clip_probs, scene_type, confidence = classify_with_clip(image_path)
        raw_score = int(confidence * 100)

        # CLIP标签索引映射到子类型
        clip_subtype = CLIP_TO_SUBTYPE.get(clip_idx, None)

        # 截图判断策略：CLIP做主，传统特征辅助检测二维码和直播截图
        # 但需要保护风景照：当CLIP风景/花朵标签概率 > 0.12 且有自然风景特征时，不判为截图
        traditional_type, trad_raw, trad_conf, trad_scores = detect_scene_type(features)

        # 风景保护检测：CLIP识别出风景/花朵/城市且有自然特征
        clip_landscape_prob = 0
        clip_urban_prob = 0
        clip_flower_prob = 0
        if clip_probs is not None and len(clip_probs) > 12:
            clip_landscape_prob = float(clip_probs[3])  # landscape
            clip_urban_prob = float(clip_probs[7])      # city/building
            clip_flower_prob = float(clip_probs[12])    # flowers/plants

        # 自然风景特征：绿色/蓝色多、边缘密度适中偏低、饱和度中等
        has_natural_features = (
            features['green_ratio'] + features['blue_ratio'] > 0.15 and
            features['edge_density'] < 0.3 and
            features['texture_complexity'] > 0.05 and
            not features.get('is_qr_code', False)
        )

        # 强风景信号：CLIP风景概率高 或 传统风景得分高
        strong_landscape_signal = (
            clip_landscape_prob > 0.1 or
            clip_flower_prob > 0.08 or
            clip_urban_prob > 0.1 or
            trad_scores.get('landscape', 0) > 35 or
            trad_scores.get('urban', 0) > 35
        )

        # 排除截图的风景保护条件
        landscape_protection = strong_landscape_signal and has_natural_features

        # 天气截图检测（优先于风景保护）：蓝色UI界面容易被CLIP误判为landscape
        # 用传统特征检测，如果检测出weather则强制为screenshot
        weather_check = detect_screenshot_type(features)
        is_weather_screenshot = (weather_check[0] == 'weather')

        if clip_probs is not None and len(clip_probs) > 13 and clip_probs[13] > 0.2:
            is_screenshot = True
            scene_type = 'screenshot'
            clip_subtype = 'live_stream'
        elif clip_probs is not None and clip_probs[5] > 0.7 and not landscape_protection:
            # 只有在没有强风景信号时才采信CLIP的截图判断
            is_screenshot = True
            scene_type = 'screenshot'
        elif clip_idx == 6:  # QR code
            is_screenshot = True
            scene_type = 'screenshot'
        elif features.get('qr_score', 0) > 0.6 and features.get('is_qr_code', False):
            is_screenshot = True
            scene_type = 'screenshot'
        elif is_weather_screenshot:
            # 天气截图优先：即使CLIP认为是landscape/urban，也强制纠正为screenshot
            is_screenshot = True
            scene_type = 'screenshot'
            clip_subtype = 'weather'
        elif landscape_protection and not features.get('qr_score', 0) > 0.5:
            # 有强风景信号 → 直接判为风景/城市
            is_screenshot = False
            if clip_landscape_prob > clip_urban_prob:
                scene_type = 'landscape'
            else:
                scene_type = 'urban'
            confidence = max(clip_landscape_prob, clip_urban_prob)
        else:
            is_screenshot = False
            # CLIP给了screenshot但置信度不够 → fallback
            if scene_type == 'screenshot':
                if trad_conf > 0.3 and traditional_type != 'screenshot':
                    scene_type = traditional_type
                    confidence = trad_conf
                else:
                    scene_type = 'general'
                    confidence = max(confidence, 0.3)

        # 对general类用传统特征fallback（但排除截图）
        if scene_type == 'general' and not is_screenshot:
            if trad_conf > 0.3 and traditional_type != 'screenshot' and traditional_type != 'general':
                scene_type = traditional_type
                confidence = trad_conf

        # 模糊图片标记（风景照模糊判定更宽松）
        if clip_idx == 10:
            features['is_blurry'] = True
        elif scene_type == 'landscape' or strong_landscape_signal:
            # 风景照的模糊阈值更严格（朦胧感不是模糊）
            features['is_blurry'] = features['clarity_score'] < 0.02
        else:
            features['is_blurry'] = features['clarity_score'] < 0.04

        scene_tags = generate_scene_tags(scene_type, features)

        if scene_type in ('portrait', 'family'):
            if features['skin_ratio'] > 0.25:
                person_count = 1
            elif features['skin_ratio'] > 0.12:
                person_count = random.randint(2, 4)
            elif features['skin_ratio'] > 0.06:
                person_count = random.randint(1, 3)
            else:
                person_count = random.randint(1, 2)
        else:
            person_count = 0

        is_event = False
        if scene_type in ('family', 'portrait'):
            is_event = random.random() < 0.35
        elif scene_type == 'landscape':
            is_event = random.random() < 0.15
        elif scene_type == 'food':
            is_event = random.random() < 0.1

        screenshot_type = None
        is_temp_info = False
        is_important_info = False
        text_density = round(random.uniform(0.02, 0.15), 3)

        if is_screenshot:
            # 先用传统特征检测截图子类型（天气截图只能用传统方法检测）
            trad_subtype, trad_temp, trad_important = detect_screenshot_type(features)
            
            # 如果传统方法检测出天气截图，强制使用（CLIP没有天气标签）
            if trad_subtype == 'weather':
                screenshot_type = 'weather'
                is_temp_info = True
                is_important_info = False
            # 否则优先使用CLIP子类型
            elif clip_subtype:
                screenshot_type = clip_subtype
                is_temp_info = clip_subtype in ('qr_code', 'receipt', 'weather')
                is_important_info = clip_subtype == 'document'
            else:
                screenshot_type = trad_subtype
                is_temp_info = trad_temp
                is_important_info = trad_important
            text_density = round(features['edge_density'] * 0.6 + 0.05, 3)

        # QR code特殊标记
        is_qr_code = (clip_idx == 6) or features.get('is_qr_code', False)

        w, h = random_resolution()
        analysis = {
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
            'hash': dhash,
            'aspect_ratio': features['aspect_ratio'],
            'is_wide': features['is_wide'],
            'is_portrait': features['is_portrait'],
            'detected_type': scene_type,
            'type_confidence': confidence,
            'type_raw_score': raw_score,
            'skin_ratio': features['skin_ratio'],
            'warm_ratio': features['warm_ratio'],
            'green_ratio': features['green_ratio'],
            'blue_ratio': features['blue_ratio'],
            'red_ratio': features['red_ratio'],
            'yellow_ratio': features['yellow_ratio'],
            'clip_label': CLIP_LABELS[clip_idx] if clip_idx >= 0 else 'unknown',
        }

        ext = os.path.splitext(filename)[1]
        file_name = 'IMG_%04d%s' % (photo_id_counter, ext)

        photos.append({
            'photo_id': 'p%04d' % photo_id_counter,
            'file_name': file_name,
            'file_size_bytes': random_file_size(w, h),
            'created_at': random_date(years_back=3),
            'width': w,
            'height': h,
            'photo_url': 'photo_eg/' + filename,
            'analysis': analysis,
        })
        photo_id_counter += 1

        if i % 50 == 0:
            print(f'  Analyzed {i}/{len(all_files)} images...')

    print(f'  Analyzed all {len(all_files)} images.')

    # 使用双重哈希验证找重复组
    print('Finding duplicate groups based on real similarity...')
    duplicate_groups = []
    used_indices = set()
    
    for i in range(len(all_files)):
        if i in used_indices:
            continue
        
        similar = [i]
        for j in range(i + 1, len(all_files)):
            if j in used_indices:
                continue
            dhash_dist = hamming_distance(dhashes[i], dhashes[j])
            ahash_dist = hamming_distance(ahashes[i], ahashes[j])
            if dhash_dist <= 5 and ahash_dist <= 8:
                similar.append(j)
        
        if len(similar) >= 2:
            for idx in similar:
                used_indices.add(idx)
            duplicate_groups.append(similar)
    
    print(f'  Found {len(duplicate_groups)} real duplicate groups')

    while len(photos) < TOTAL:
        src_photo = random.choice(photos[:len(all_files)])
        new_photo = src_photo.copy()
        new_photo['photo_id'] = 'p%04d' % photo_id_counter
        new_photo['file_name'] = 'IMG_%04d%s' % (photo_id_counter, os.path.splitext(src_photo['file_name'])[1])
        new_photo['created_at'] = random_date(years_back=3)
        new_photo['analysis'] = src_photo['analysis'].copy()
        new_photo['analysis']['hash'] = generate_dhash(os.path.join(photo_eg_path, os.path.basename(src_photo['photo_url'])))
        photos.append(new_photo)
        photo_id_counter += 1

    photos = photos[:TOTAL]

    # 为重复组设置标记
    for group_idx, group in enumerate(duplicate_groups):
        for file_idx in group:
            if file_idx < len(photos):
                photos[file_idx]['analysis']['hash'] = 'dup_group_' + str(group_idx)
                photos[file_idx]['analysis']['is_duplicate'] = True
                photos[file_idx]['analysis']['duplicate_group_id'] = 'dup_group_' + str(group_idx)
                photos[file_idx]['analysis']['duplicate_count'] = len(group)

    for idx, p in enumerate(photos):
        if 'is_duplicate' not in p['analysis']:
            p['analysis']['is_duplicate'] = False
            p['analysis']['duplicate_group_id'] = None
            p['analysis']['duplicate_count'] = 0
        p['idx'] = idx

    out_path = r'd:\photo-curator-app\memai-app\js\photos_data.js'
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write('(function(global) {\n')
        f.write('  "use strict";\n')
        f.write('  global.PHOTOS_DATA = ')
        json.dump(photos, f, ensure_ascii=False)
        f.write(';\n')
        f.write('})(window);\n')

    blurry = sum(1 for p in photos if p['analysis']['is_blurry'])
    screenshot = sum(1 for p in photos if p['analysis']['is_screenshot'])
    duplicate = sum(1 for p in photos if p['analysis']['is_duplicate'])

    scene_counts = {}
    for p in photos:
        st = p['analysis'].get('detected_type', 'general')
        scene_counts[st] = scene_counts.get(st, 0) + 1

    print(f'Generated photos_data.js')
    print(f'  Total photos: {len(photos)}')
    print(f'  Real photos from photo_eg: {len(all_files)}')
    print(f'  Blurry: {blurry}')
    print(f'  Screenshots: {screenshot}')
    print(f'  Duplicates: {duplicate}')
    print(f'  Scene type distribution (real analysis):')
    for t, c in sorted(scene_counts.items(), key=lambda x: -x[1]):
        print(f'    {t}: {c} ({c/len(photos)*100:.1f}%)')
    file_size_kb = os.path.getsize(out_path) / 1024
    print(f'  File size: {file_size_kb:.1f} KB')

if __name__ == '__main__':
    generate()
