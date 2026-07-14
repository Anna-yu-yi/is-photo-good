import json
from datetime import datetime

with open('d:/photo-curator-app/memai-app/js/photos_data.js', 'r', encoding='utf-8') as f:
    content = f.read()

start = content.find('[')
end = content.rfind(']') + 1
photos_json = content[start:end]
photos = json.loads(photos_json)

# 使用完整评分逻辑
WEIGHTS = {'memory': 0.40, 'scarcity': 0.15, 'info': 0.20, 'quality': 0.25}

def score_photo(photo):
    analysis = photo.get('analysis', {})
    created = datetime.strptime(photo['created_at'], '%Y-%m-%d')
    years = (datetime.now() - created).days / 365.0
    
    # Memory score
    memory = 20
    if analysis.get('is_qr_code') or (analysis.get('qr_score', 0) > 0.7 and analysis.get('detected_type') == 'screenshot'):
        memory -= 30
    
    type_bonus = {
        'portrait': 12, 'family': 18, 'landscape': 20, 'pet': 12,
        'food': 8, 'urban': 12, 'document': -5, 'screenshot': -15
    }
    memory += type_bonus.get(analysis.get('detected_type'), 0)
    
    if analysis.get('is_event'): memory += 12
    
    tags = analysis.get('scene_tags', [])
    event_tags = {'travel': 8, 'wedding': 15, 'graduation': 12, 'birthday': 8}
    for tag in event_tags:
        if tag in tags: memory += event_tags[tag]; break
    
    if analysis.get('person_count'):
        pc = analysis['person_count']
        if pc >= 5: memory += 8
        elif pc >= 3: memory += 5
        elif pc == 1: memory += 3
    
    if analysis.get('detected_type') == 'screenshot':
        st = analysis.get('screenshot_type', 'app')
        penalties = {'qr_code': -35, 'verify_code': -30, 'weather': -30, 'live_stream': -25,
                     'video': -20, 'chat': -15, 'app': -12, 'ppt': -8, 'document': -5, 'text': -20}
        memory += penalties.get(st, -18)
    
    if analysis.get('is_blurry'):
        cl = analysis.get('clarity_score', 0)
        is_landscape = analysis.get('detected_type') == 'landscape'
        if cl < 0.05: memory -= 18 if is_landscape else 30
        elif cl < 0.1: memory -= 12 if is_landscape else 22
        elif cl < 0.15: memory -= 7 if is_landscape else 15
        elif cl < 0.2: memory -= 4 if is_landscape else 8
    
    memory = max(5, min(40, memory))
    
    # Scarcity
    scarcity = 10
    if not analysis.get('is_screenshot'):
        if years >= 3: scarcity += 8
        elif years >= 2: scarcity += 5
        elif years >= 1: scarcity += 2
    if analysis.get('detected_type') == 'screenshot': scarcity = max(0, scarcity - 10)
    scarcity = max(0, min(15, scarcity))
    
    # Info
    info = 8 + analysis.get('text_density', 0) * 10
    if analysis.get('is_important_info'): info += 15
    if analysis.get('is_document'): info += 10
    if analysis.get('is_temp_info'): info -= 15
    
    if analysis.get('detected_type') == 'screenshot':
        st = analysis.get('screenshot_type', '')
        if st == 'document': info += 8
        elif st == 'ppt': info += 5
        elif st == 'qr_code': info -= 25
        elif st == 'verify_code': info -= 30
        elif st == 'video': info -= 18
        elif st == 'chat': info -= 12
        elif st == 'app': info -= 10
        elif st == 'text': info -= 20
        else: info -= 15
    
    info = max(0, min(20, info))
    
    # Quality
    clarity = analysis.get('clarity_score', 0.5)
    brightness = analysis.get('brightness', 0.5)
    contrast = analysis.get('contrast', 0.5)
    saturation = analysis.get('saturation', 0.5)
    quality = clarity * 15
    if brightness < 0.3: quality -= 4
    elif brightness > 0.92: quality -= 3
    if contrast < 0.2: quality -= 3
    elif contrast > 0.8: quality -= 2
    if saturation < 0.08: quality -= 3
    elif saturation > 0.92: quality -= 2
    if analysis.get('is_blurry'): quality -= 8
    if analysis.get('detected_type') == 'screenshot': quality = min(quality, 14)
    quality = max(3, min(25, quality))
    
    # Total adjustment
    total_adj = 0
    is_qr = analysis.get('is_qr_code') or (analysis.get('qr_score', 0) > 0.7 and analysis.get('detected_type') == 'screenshot')
    if is_qr: total_adj -= 40
    
    type_adj = {'portrait': 12, 'family': 16, 'landscape': 18, 'pet': 12,
                'food': 8, 'urban': 10, 'document': -8, 'screenshot': -20}
    total_adj += type_adj.get(analysis.get('detected_type'), 0)
    
    if analysis.get('is_blurry'):
        cl = analysis.get('clarity_score', 0)
        if cl < 0.05: total_adj -= 35
        elif cl < 0.1: total_adj -= 28
        elif cl < 0.15: total_adj -= 20
        elif cl < 0.2: total_adj -= 12
        else: total_adj -= 5
    
    if analysis.get('is_screenshot') and not analysis.get('is_important_info'):
        st = analysis.get('screenshot_type', '')
        penalties = {'qr_code': -35, 'verify_code': -30, 'video': -18,
                     'chat': -15, 'app': -12, 'text': -20, 'edited': -10}
        total_adj += penalties.get(st, -15)
    
    if analysis.get('is_event'): total_adj += 8
    
    for et in ['wedding', 'graduation', 'birthday', 'anniversary', 'party']:
        if et in tags: total_adj += 5; break
    
    if analysis.get('person_count', 0) >= 2: total_adj += 5
    if analysis.get('is_temp_info'): total_adj -= 15
    if analysis.get('is_important_info'): total_adj += 15
    
    final_memory = max(0, min(40, memory + total_adj * WEIGHTS['memory']))
    final_scarcity = max(0, min(15, scarcity + total_adj * WEIGHTS['scarcity']))
    final_info = max(0, min(20, info + total_adj * WEIGHTS['info']))
    final_quality = max(0, min(25, quality + total_adj * WEIGHTS['quality']))
    
    return round(final_memory + final_scarcity + final_info + final_quality)

def classify(score):
    if score >= 50: return 'keep'
    elif score >= 30: return 'review'
    else: return 'clean'

# 分析weather截图的分类
weather_photos = []
for photo in photos:
    if photo.get('analysis', {}).get('is_duplicate'): continue
    a = photo.get('analysis', {})
    if a.get('screenshot_type') == 'weather':
        score = score_photo(photo)
        cat = classify(score)
        weather_photos.append((photo, score, cat))

weather_photos.sort(key=lambda x: -x[1])

print(f"=== Weather截图分类分析（共{len(weather_photos)}张） ===\n")
keep_count = sum(1 for _, _, c in weather_photos if c == 'keep')
review_count = sum(1 for _, _, c in weather_photos if c == 'review')
clean_count = sum(1 for _, _, c in weather_photos if c == 'clean')
print(f"保留: {keep_count}, 待复核: {review_count}, 建议删除: {clean_count}\n")

print("所有weather截图（按分数排序）:")
for photo, score, cat in weather_photos:
    a = photo['analysis']
    print(f"  {photo['photo_id']:6s} | score={score:3d} | cat={cat:8s} | "
          f"bright={a['brightness']:.3f} | sat={a['saturation']:.3f} | "
          f"blue={a['blue_ratio']:.3f} | edge={a['edge_density']:.3f}")
    print(f"         clip: {a.get('clip_label', '')}")

# 分析live_stream截图中可能漏检的天气截图
print("\n\n=== Live_stream截图中可能漏检的天气截图 ===")
ls_photos = []
for photo in photos:
    if photo.get('analysis', {}).get('is_duplicate'): continue
    a = photo.get('analysis', {})
    if a.get('screenshot_type') == 'live_stream':
        # 检查是否有天气特征
        blue = a.get('blue_ratio', 0)
        sat = a.get('saturation', 0)
        bright = a.get('brightness', 0)
        edge = a.get('edge_density', 0)
        
        # 计算天气特征分
        ws = 0
        if sat < 0.15: ws += 35
        elif sat < 0.25: ws += 25
        elif sat < 0.35: ws += 10
        if blue > 0.15: ws += 25
        elif blue > 0.08: ws += 15
        if bright > 0.35 and bright < 0.75: ws += 15
        if edge > 0.1 and edge < 0.4: ws += 15
        
        if ws >= 40:  # 低于检测阈值但仍有天气特征
            score = score_photo(photo)
            cat = classify(score)
            ls_photos.append((photo, score, cat, ws))

ls_photos.sort(key=lambda x: -x[3])
print(f"疑似漏检数量: {len(ls_photos)}")
for photo, score, cat, ws in ls_photos[:15]:
    a = photo['analysis']
    print(f"  {photo['photo_id']:6s} | weather_score={ws:3d} | score={score:3d} | cat={cat} | "
          f"bright={a['brightness']:.3f} | sat={a['saturation']:.3f} | blue={a['blue_ratio']:.3f}")
    print(f"         clip: {a.get('clip_label', '')}")
