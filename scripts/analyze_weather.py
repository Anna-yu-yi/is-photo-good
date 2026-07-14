import json

with open('d:/photo-curator-app/memai-app/js/photos_data.js', 'r', encoding='utf-8') as f:
    content = f.read()

start = content.find('[')
end = content.rfind(']') + 1
photos_json = content[start:end]
photos = json.loads(photos_json)

# 找出所有截图类型照片
screenshots = []
for photo in photos:
    a = photo.get('analysis', {})
    if a.get('detected_type') == 'screenshot' and not a.get('is_duplicate'):
        screenshots.append({
            'id': photo['photo_id'],
            'filename': photo['file_name'],
            'sub_type': a.get('screenshot_type', 'unknown'),
            'brightness': a.get('brightness', 0),
            'saturation': a.get('saturation', 0),
            'blue_ratio': a.get('blue_ratio', 0),
            'yellow_ratio': a.get('yellow_ratio', 0),
            'warm_ratio': a.get('warm_ratio', 0),
            'edge_density': a.get('edge_density', 0),
            'clarity': a.get('clarity_score', 0),
            'clip': a.get('clip_label', ''),
            'qr_score': a.get('qr_score', 0),
        })

# 按子类型分组
from collections import defaultdict
by_type = defaultdict(list)
for s in screenshots:
    by_type[s['sub_type']].append(s)

print(f"截图总数: {len(screenshots)}")
print("\n=== 截图子类型分布 ===")
for sub_type, items in sorted(by_type.items(), key=lambda x: -len(x[1])):
    print(f"  {sub_type or 'None':15s}: {len(items):3d} 张")

# 分析app类型截图的特征（可能是未检测出的天气截图）
print("\n\n=== APP类型截图详细分析（可能是天气截图） ===")
app_screenshots = by_type.get('app', [])
print(f"APP类型截图总数: {len(app_screenshots)}")

# 按天气特征排序
weather_like_scores = []
for s in app_screenshots:
    # 计算天气特征分
    weather_score = 0
    if s['saturation'] < 0.2: weather_score += 30
    elif s['saturation'] < 0.3: weather_score += 15
    if s['yellow_ratio'] > 0.03: weather_score += 25
    if s['warm_ratio'] > 0.1: weather_score += 20
    if 0.45 < s['brightness'] < 0.75: weather_score += 20
    if 0.15 < s['edge_density'] < 0.35: weather_score += 15
    
    weather_like_scores.append((s, weather_score))

weather_like_scores.sort(key=lambda x: -x[1])

print("\n最像天气截图的APP类型截图（前20张）:")
for s, score in weather_like_scores[:20]:
    print(f"  {s['id']:6s} | weather_score={score:3d} | bright={s['brightness']:.3f} | "
          f"sat={s['saturation']:.3f} | blue={s['blue_ratio']:.3f} | yellow={s['yellow_ratio']:.3f} | "
          f"warm={s['warm_ratio']:.3f} | edge={s['edge_density']:.3f}")
    print(f"         clip: {s['clip']}")

# 真正被标记为weather的截图
print("\n\n=== 真正标记为WEATHER的截图 ===")
weather_screenshots = by_type.get('weather', [])
print(f"Weather类型截图总数: {len(weather_screenshots)}")
for s in weather_screenshots:
    print(f"  {s['id']:6s} | bright={s['brightness']:.3f} | sat={s['saturation']:.3f} | "
          f"blue={s['blue_ratio']:.3f} | yellow={s['yellow_ratio']:.3f} | "
          f"warm={s['warm_ratio']:.3f} | edge={s['edge_density']:.3f}")
    print(f"         clip: {s['clip']}")

# 找出可能漏检的天气截图：蓝色背景 + 低饱和度 + 有边缘
print("\n\n=== 疑似漏检的天气截图（app类型中蓝色>0.15且饱和度<0.3的） ===")
missed_weather = []
for s in app_screenshots:
    if s['blue_ratio'] > 0.15 and s['saturation'] < 0.35 and s['edge_density'] > 0.1:
        missed_weather.append(s)

print(f"疑似漏检数量: {len(missed_weather)}")
for s in missed_weather[:15]:
    print(f"  {s['id']:6s} | bright={s['brightness']:.3f} | sat={s['saturation']:.3f} | "
          f"blue={s['blue_ratio']:.3f} | edge={s['edge_density']:.3f}")
    print(f"         clip: {s['clip']}")
