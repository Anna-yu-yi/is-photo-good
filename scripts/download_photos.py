import urllib.request
import os

photos_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'photos')
os.makedirs(photos_dir, exist_ok=True)

photo_list = [
    ('mountain_01.jpg', 101),
    ('sea_sunset_01.jpg', 102),
    ('forest_01.jpg', 103),
    ('sunset_sky_01.jpg', 104),
    ('snow_mountain_01.jpg', 105),
    ('lake_nature_01.jpg', 106),
    ('park_nature_01.jpg', 107),
    ('city_architecture_01.jpg', 108),
    ('couple_travel_01.jpg', 109),
    ('wedding_01.jpg', 110),
    ('graduation_01.jpg', 111),
    ('family_gathering_01.jpg', 112),
    ('friends_party_01.jpg', 113),
    ('birthday_party_01.jpg', 114),
    ('portrait_01.jpg', 115),
    ('food_dining_01.jpg', 116),
    ('food_gourmet_01.jpg', 117),
    ('coffee_dessert_01.jpg', 118),
    ('pet_01.jpg', 119),
    ('street_01.jpg', 120),
    ('indoor_01.jpg', 121),
    ('screenshot_chat_01.jpg', 122),
    ('screenshot_code_01.jpg', 123),
    ('screenshot_express_01.jpg', 124),
    ('screenshot_memo_01.jpg', 125),
    ('screenshot_social_01.jpg', 126),
    ('screenshot_verify_01.jpg', 127),
    ('blurry_scenery_01.jpg', 128),
    ('blurry_indoor_01.jpg', 129),
    ('blurry_people_01.jpg', 130),
]

print(f'Downloading {len(photo_list)} photos...')
for i, (filename, pic_id) in enumerate(photo_list):
    url = f'https://picsum.photos/id/{pic_id}/800/800'
    filepath = os.path.join(photos_dir, filename)
    try:
        urllib.request.urlretrieve(url, filepath)
        size = os.path.getsize(filepath)
        print(f'  [{i+1}/{len(photo_list)}] {filename} - {size} bytes')
    except Exception as e:
        print(f'  [{i+1}/{len(photo_list)}] {filename} - FAILED: {e}')

print('Done!')
