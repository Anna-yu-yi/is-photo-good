import re
import json

with open('d:/photo-curator-app/memai-app/js/photos_data.js', 'r', encoding='utf-8') as f:
    content = f.read()

start = content.find('[')
end = content.rfind(']') + 1
photos_json = content[start:end]
photos = json.loads(photos_json)

# 找出qr_score高但实际不是二维码的照片
print("=== QR误判分析（qr_score > 0.5但实际是风景/城市照）===")
qr_misjudge = []
for photo in photos:
    a = photo.get('analysis', {})
    qr = a.get('qr_score', 0)
    dt = a.get('detected_type', '')
    if qr > 0.5 and dt in ['landscape', 'urban', 'food', 'pet', 'portrait', 'family']:
        qr_misjudge.append((photo, qr))

print(f"被误判为二维码的真实照片: {len(qr_misjudge)} 张")
qr_misjudge.sort(key=lambda x: -x[1])
for photo, qr in qr_misjudge[:20]:
    a = photo['analysis']
    print(f"  {photo['photo_id']}: qr_score={qr:.3f}, type={a['detected_type']}, "
          f"clarity={a['clarity_score']:.3f}, edge_density={a.get('edge_density', 0):.3f}")
    print(f"    clip: {a.get('clip_label', '')}")
    print(f"    is_qr_code={a.get('is_qr_code', False)}")

# 检查is_qr_code=true的照片
print("\n\n=== is_qr_code=True的照片 ===")
qr_true = []
for photo in photos:
    a = photo.get('analysis', {})
    if a.get('is_qr_code'):
        qr_true.append(photo)

print(f"真正被标记为二维码的照片: {len(qr_true)} 张")
for photo in qr_true[:10]:
    a = photo['analysis']
    print(f"  {photo['photo_id']}: type={a['detected_type']}, qr_score={a.get('qr_score', 0):.3f}, "
          f"clip: {a.get('clip_label', '')}")

# 检查风景照中的qr_score分布
print("\n\n=== 风景照qr_score分布 ===")
landscape_qr = []
for photo in photos:
    a = photo.get('analysis', {})
    if a.get('detected_type') == 'landscape':
        landscape_qr.append(a.get('qr_score', 0))

print(f"风景照总数: {len(landscape_qr)}")
print(f"qr_score > 0.5: {sum(1 for q in landscape_qr if q > 0.5)}")
print(f"qr_score > 0.3: {sum(1 for q in landscape_qr if q > 0.3)}")
print(f"平均qr_score: {sum(landscape_qr)/len(landscape_qr):.3f}")

# 检查城市照中的qr_score分布
print("\n\n=== 城市照qr_score分布 ===")
urban_qr = []
for photo in photos:
    a = photo.get('analysis', {})
    if a.get('detected_type') == 'urban':
        urban_qr.append(a.get('qr_score', 0))

print(f"城市照总数: {len(urban_qr)}")
print(f"qr_score > 0.5: {sum(1 for q in urban_qr if q > 0.5)}")
print(f"qr_score > 0.3: {sum(1 for q in urban_qr if q > 0.3)}")
print(f"平均qr_score: {sum(urban_qr)/len(urban_qr):.3f}")

# 详细查看p0046和p0001和p0029
print("\n\n=== 重点关注照片详情 ===")
for pid in ['p0046', 'p0001', 'p0029']:
    for photo in photos:
        if photo['photo_id'] == pid:
            a = photo['analysis']
            print(f"\n{pid}:")
            print(f"  detected_type: {a.get('detected_type')}")
            print(f"  type_confidence: {a.get('type_confidence')}")
            print(f"  clip_label: {a.get('clip_label')}")
            print(f"  is_screenshot: {a.get('is_screenshot')}")
            print(f"  screenshot_type: {a.get('screenshot_type')}")
            print(f"  is_qr_code: {a.get('is_qr_code')}")
            print(f"  qr_score: {a.get('qr_score')}")
            print(f"  clarity_score: {a.get('clarity_score')}")
            print(f"  is_blurry: {a.get('is_blurry')}")
            print(f"  edge_density: {a.get('edge_density')}")
            print(f"  high_contrast_ratio: {a.get('high_contrast_ratio')}")
            print(f"  color_entropy: {a.get('color_entropy')}")
            print(f"  texture_complexity: {a.get('texture_complexity')}")
            print(f"  scene_tags: {a.get('scene_tags')}")
            break
