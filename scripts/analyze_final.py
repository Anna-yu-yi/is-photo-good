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
    
    scarcity = 10
    if not analysis.get('is_screenshot'):
        if years >= 3: scarcity += 8
        elif years >= 2: scarcity += 5
        elif years >= 1: scarcity += 2
    if analysis.get('detected_type') == 'screenshot': scarcity = max(0, scarcity - 10)
    scarcity = max(0, min(15, scarcity))
    
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

# 检查所有截图类型的分类
categories = {'keep': [], 'review': [], 'clean': []}

for photo in photos:
    if photo.get('analysis', {}).get('is_duplicate'): continue
    a = photo.get('analysis', {})
    if a.get('detected_type') == 'screenshot':
        score = score_photo(photo)
        cat = classify(score)
        categories[cat].append({
            'id': photo['photo_id'],
            'sub_type': a.get('screenshot_type', 'unknown'),
            'score': score,
            'clip': a.get('clip_label', '')
        })

print("=== 截图类型分类统计 ===")
print(f"截图总数: {sum(len(v) for v in categories.values())}")
for cat in ['keep', 'review', 'clean']:
    print(f"\n{cat.upper()}: {len(categories[cat])} 张")
    # 按子类型统计
    sub_types = {}
    for p in categories[cat]:
        st = p['sub_type']
        sub_types[st] = sub_types.get(st, 0) + 1
    for st, count in sorted(sub_types.items(), key=lambda x: -x[1]):
        print(f"  {st}: {count}")

# 如果有截图在保留中，打印出来
if categories['keep']:
    print("\n\n=== ⚠️ 被误分到保留的截图 ===")
    for p in categories['keep']:
        print(f"  {p['id']:6s} | score={p['score']:3d} | sub_type={p['sub_type']:12s} | clip: {p['clip']}")

if categories['review']:
    print("\n\n=== ⚠️ 被误分到待复核的截图 ===")
    for p in categories['review']:
        print(f"  {p['id']:6s} | score={p['score']:3d} | sub_type={p['sub_type']:12s} | clip: {p['clip']}")

# 检查是否有被CLIP识别为landscape/urban但实际是天气截图的照片在保留中
print("\n\n=== 检查是否有天气特征的非截图类型在保留中 ===")
for photo in photos:
    if photo.get('analysis', {}).get('is_duplicate'): continue
    a = photo.get('analysis', {})
    if a.get('detected_type') not in ['screenshot']:
        score = score_photo(photo)
        cat = classify(score)
        if cat == 'keep':
            # 检查是否有天气特征
            blue = a.get('blue_ratio', 0)
            sat = a.get('saturation', 0)
            edge = a.get('edge_density', 0)
            if blue > 0.1 and sat < 0.3 and edge > 0.08:
                print(f"  {photo['photo_id']:6s} | type={a['detected_type']:12s} | score={score:3d} | "
                      f"blue={blue:.3f} | sat={sat:.3f} | edge={edge:.3f}")
                print(f"         clip: {a.get('clip_label', '')}")

print("\n\n=== 整体分类统计 ===")
all_cats = {'keep': [], 'review': [], 'clean': []}
for photo in photos:
    if photo.get('analysis', {}).get('is_duplicate'): continue
    score = score_photo(photo)
    cat = classify(score)
    all_cats[cat].append(photo['photo_id'])

total = sum(len(v) for v in all_cats.values())
for cat in ['keep', 'review', 'clean']:
    print(f"{cat.upper()}: {len(all_cats[cat])} 张 ({len(all_cats[cat])/total*100:.1f}%)")
