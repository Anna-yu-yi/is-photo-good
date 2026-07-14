import re
import json
from datetime import datetime

with open('d:/photo-curator-app/memai-app/js/photos_data.js', 'r', encoding='utf-8') as f:
    content = f.read()

start = content.find('[')
end = content.rfind(']') + 1
photos_json = content[start:end]
photos = json.loads(photos_json)

print(f"总照片数: {len(photos)}")

# 使用更接近真实scoring_engine.js的评分逻辑
WEIGHTS = {'memory': 0.40, 'scarcity': 0.15, 'info': 0.20, 'quality': 0.25}

def detect_photo_type(analysis):
    if analysis.get('detected_type'):
        return {'type': analysis['detected_type'], 'subType': analysis.get('screenshot_type', ''), 'confidence': analysis.get('type_confidence', 0.5)}
    return {'type': 'general', 'subType': '', 'confidence': 0}

def calc_memory_score(analysis):
    score = 20
    max_score = 40
    tags = analysis.get('scene_tags', [])
    
    photo_type = detect_photo_type(analysis)
    type = photo_type['type']
    sub_type = photo_type['subType']
    
    is_qr_code = analysis.get('is_qr_code') or (analysis.get('qr_score', 0) > 0.7 and type == 'screenshot')
    if is_qr_code:
        score -= 30
    
    type_bonus = {
        'portrait': 12, 'family': 18, 'landscape': 20, 'pet': 12,
        'food': 8, 'urban': 12, 'document': -5, 'screenshot': -15
    }
    score += type_bonus.get(type, 0)
    
    if analysis.get('is_event'):
        score += 12
    
    event_tags = {'travel': 8, 'wedding': 15, 'graduation': 12, 'birthday': 8,
                  'anniversary': 10, 'party': 6, 'ceremony': 10}
    for tag in event_tags:
        if tag in tags:
            score += event_tags[tag]
            break
    
    people_tags = {'friends': 6, 'couple': 8, 'family': 10}
    for pt in people_tags:
        if pt in tags:
            score += people_tags[pt]
            break
    
    scene_tags = {'mountain': 4, 'sea': 5, 'sunset': 6, 'beach': 4}
    for st in scene_tags:
        if st in tags:
            score += scene_tags[st]
            break
    
    if analysis.get('person_count'):
        pc = analysis['person_count']
        if pc >= 5: score += 8
        elif pc >= 3: score += 5
        elif pc == 1: score += 3
    
    if type == 'screenshot':
        screenshot_penalty = {
            'qr_code': -35, 'verify_code': -30, 'weather': -30, 'live_stream': -25,
            'video': -20, 'chat': -15, 'app': -12, 'ppt': -8, 'document': -5, 'text': -20, 'edited': -10
        }
        score += screenshot_penalty.get(sub_type, -18)
    
    if analysis.get('is_blurry'):
        clarity = analysis.get('clarity_score', 0)
        is_landscape = type == 'landscape'
        if clarity < 0.05:
            score -= 18 if is_landscape else 30
        elif clarity < 0.1:
            score -= 12 if is_landscape else 22
        elif clarity < 0.15:
            score -= 7 if is_landscape else 15
        elif clarity < 0.2:
            score -= 4 if is_landscape else 8
        else:
            score -= 2 if is_landscape else 4
    
    return round(max(5, min(score, max_score)) * 10) / 10

def calc_scarcity_score(analysis, years):
    score = 10
    max_score = 15
    
    if not analysis.get('is_screenshot'):
        if years >= 3: score += 8
        elif years >= 2: score += 5
        elif years >= 1: score += 2
    
    if analysis.get('detected_type') == 'screenshot':
        score = max(0, score - 10)
    
    return round(max(0, min(score, max_score)) * 10) / 10

def calc_info_score(analysis):
    score = 8
    max_score = 20
    density = analysis.get('text_density', 0)
    
    score += density * 10
    
    if analysis.get('is_important_info'): score += 15
    if analysis.get('is_document'): score += 10
    if analysis.get('doc_type') in ['id_card', 'ticket']: score += 8
    
    if analysis.get('is_temp_info'): score -= 15
    
    photo_type = detect_photo_type(analysis)
    type = photo_type['type']
    sub_type = analysis.get('screenshot_type', '')
    
    if type == 'screenshot':
        screenshot_info_bonus = {'document': 8, 'ppt': 5}
        screenshot_info_penalty = {
            'qr_code': -25, 'verify_code': -30, 'video': -18,
            'chat': -12, 'app': -10, 'text': -20, 'edited': -12
        }
        score += screenshot_info_bonus.get(sub_type, 0)
        score += screenshot_info_penalty.get(sub_type, -15)
    
    if type == 'document':
        score += 8
    
    return round(max(0, min(score, max_score)) * 10) / 10

def calc_quality_score(analysis):
    clarity = analysis.get('clarity_score', 0.5)
    brightness = analysis.get('brightness', 0.5)
    contrast = analysis.get('contrast', 0.5)
    saturation = analysis.get('saturation', 0.5)
    
    score = clarity * 15
    
    if brightness < 0.3: score -= 4
    elif brightness > 0.92: score -= 3
    
    if contrast < 0.2: score -= 3
    elif contrast > 0.8: score -= 2
    
    if saturation < 0.08: score -= 3
    elif saturation > 0.92: score -= 2
    
    if analysis.get('is_blurry'):
        score -= 8
    
    photo_type = detect_photo_type(analysis)
    if photo_type['type'] == 'screenshot':
        score = min(score, 14)
        if not analysis.get('is_blurry') and clarity > 0.85:
            score = max(score, 12)
    
    return round(max(3, min(score, 25)) * 10) / 10

def score_photo(photo):
    analysis = photo.get('analysis', {})
    created = datetime.strptime(photo['created_at'], '%Y-%m-%d')
    years = (datetime.now() - created).days / 365.0
    
    memory = calc_memory_score(analysis)
    scarcity = calc_scarcity_score(analysis, years)
    info = calc_info_score(analysis)
    quality = calc_quality_score(analysis)
    
    photo_type = detect_photo_type(analysis)
    detected_type = photo_type['type']
    
    total_adjustment = 0
    
    is_qr_code = analysis.get('is_qr_code') or (analysis.get('qr_score', 0) > 0.7 and detected_type == 'screenshot')
    if is_qr_code:
        total_adjustment -= 40
    
    type_adjustments = {
        'portrait': 12, 'family': 16, 'landscape': 18, 'pet': 12,
        'food': 8, 'urban': 10, 'document': -8, 'screenshot': -20
    }
    total_adjustment += type_adjustments.get(detected_type, 0)
    
    if analysis.get('is_blurry'):
        clarity_adj = analysis.get('clarity_score', 0)
        if clarity_adj < 0.05:
            total_adjustment -= 35
        elif clarity_adj < 0.1:
            total_adjustment -= 28
        elif clarity_adj < 0.15:
            total_adjustment -= 20
        elif clarity_adj < 0.2:
            total_adjustment -= 12
        else:
            total_adjustment -= 5
    
    if analysis.get('is_screenshot') and not analysis.get('is_important_info'):
        screenshot_penalty = {
            'qr_code': -35, 'verify_code': -30, 'video': -18,
            'chat': -15, 'app': -12, 'text': -20, 'edited': -10
        }
        total_adjustment += screenshot_penalty.get(analysis.get('screenshot_type', ''), -15)
    
    if analysis.get('is_event'):
        total_adjustment += 8
    
    event_tags = ['wedding', 'graduation', 'birthday', 'anniversary', 'party']
    scene_tags = analysis.get('scene_tags', [])
    for et in event_tags:
        if et in scene_tags:
            total_adjustment += 5
            break
    
    if analysis.get('person_count', 0) >= 2:
        total_adjustment += 5
    
    if analysis.get('is_temp_info'):
        total_adjustment -= 15
    
    if analysis.get('is_important_info'):
        total_adjustment += 15
    
    memory_adj = total_adjustment * WEIGHTS['memory']
    scarcity_adj = total_adjustment * WEIGHTS['scarcity']
    info_adj = total_adjustment * WEIGHTS['info']
    quality_adj = total_adjustment * WEIGHTS['quality']
    
    final_memory = max(0, min(40, memory + memory_adj))
    final_scarcity = max(0, min(15, scarcity + scarcity_adj))
    final_info = max(0, min(20, info + info_adj))
    final_quality = max(0, min(25, quality + quality_adj))
    
    total = round(final_memory + final_scarcity + final_info + final_quality)
    total = max(0, min(100, total))
    
    return total

def classify(score):
    if score >= 50: return 'keep'
    elif score >= 30: return 'review'
    else: return 'clean'

# 统计
categories = {'keep': [], 'review': [], 'clean': []}
type_by_category = {'keep': {}, 'review': {}, 'clean': {}}

for photo in photos:
    if photo.get('analysis', {}).get('is_duplicate', False):
        continue
    
    analysis = photo.get('analysis', {})
    detected_type = analysis.get('detected_type', 'general')
    score = score_photo(photo)
    cat = classify(score)
    
    categories[cat].append((photo, score))
    
    if detected_type not in type_by_category[cat]:
        type_by_category[cat][detected_type] = 0
    type_by_category[cat][detected_type] += 1

print("=== 新分类统计 ===")
total_non_dup = sum(len(v) for v in categories.values())
print(f"非重复照片总数: {total_non_dup}")
for cat in ['keep', 'review', 'clean']:
    print(f"\n{cat.upper()}: {len(categories[cat])} 张 ({len(categories[cat])/total_non_dup*100:.1f}%)")
    for t, count in sorted(type_by_category[cat].items(), key=lambda x: -x[1]):
        print(f"  {t}: {count}")

# 检查建议删除中分数最高的
categories['clean'].sort(key=lambda x: -x[1])
print("\n\n=== 建议删除中分数最高的20张（最可能误判）===")
for photo, score in categories['clean'][:20]:
    a = photo['analysis']
    dt = a.get('detected_type', '?')
    qr = a.get('qr_score', 0)
    print(f"{photo['photo_id']:6s} | score={score:3d} | type={dt:12s} | clarity={a['clarity_score']:.3f} | "
          f"blurry={a.get('is_blurry', False)} | qr={qr:.3f}")
    print(f"       clip: {a.get('clip_label', '')}")

# 检查二维码误判情况
print("\n\n=== QR分数>0.5但非截图类型的照片 ===")
qr_mis = []
for photo in photos:
    if photo.get('analysis', {}).get('is_duplicate', False):
        continue
    a = photo['analysis']
    qr = a.get('qr_score', 0)
    dt = a.get('detected_type', '')
    if qr > 0.5 and dt not in ['screenshot', 'document']:
        qr_mis.append((photo, qr))

print(f"数量: {len(qr_mis)}")
for photo, qr in qr_mis[:10]:
    a = photo['analysis']
    print(f"  {photo['photo_id']}: qr={qr:.3f}, type={a['detected_type']}, clip={a.get('clip_label', '')}")
