(function(global) {
  'use strict';

  // CLIP识别结果 → 精准解释模板
  var CLIP_TEMPLATES = {
    'a photo of food or meal or dish': [
      '美食照片，菜品色泽诱人，记录了舌尖上的美好时刻。',
      '一顿不错的饭菜，画面精致，是用餐时刻的味觉记忆。',
      '好吃的！这张美食照片拍得不错，值得回味的味道。',
      '餐桌上的佳肴，让人看了就想吃，是生活中小确幸的记录。'
    ],
    'a photo of a person or people or portrait': [
      '人像照片，记录了人物的精彩瞬间，有纪念意义。',
      '这张人物照拍得不错，表情自然，是值得保留的个人记录。',
      '人物特写，画面质量可以，记录了某个重要时刻。',
      '人像摄影，光线和构图都不错，是有情感价值的照片。'
    ],
    'a photo of a family or group of people': [
      '家庭合照，温馨的画面记录了团聚时光，很有纪念意义。',
      '一家人的合影，笑容满面，是珍贵的家庭回忆。',
      '亲友聚会的合照，记录了欢聚时刻，值得珍藏。',
      '合照中的每个人都很开心，这是值得留住的幸福瞬间。'
    ],
    'a photo of a landscape or scenery or nature': [
      '风景照片，自然风光优美，画面大气，是旅行的美好记录。',
      '大自然的美景，视野开阔，让人心旷神怡，值得保留。',
      '旅行中的风景照，光影和色彩都不错，是珍贵的旅途记忆。',
      '自然风景照，山水相映，记录了大自然的壮美瞬间。'
    ],
    'a photo of a pet or cat or dog or animal': [
      '宠物照片，毛孩子很可爱，是生活中的温馨陪伴。',
      '萌宠的日常瞬间，看着就让人心情愉悦，很有情感价值。',
      '可爱的小动物，画面生动，记录了和毛孩子的温馨时光。',
      '宠物照，呆萌又治愈，是生活中值得珍藏的小美好。'
    ],
    'a screenshot of an app or phone screen': [
      '手机截图，信息价值较低，属于临时性内容，可以考虑清理。',
      'App界面截图，屏幕内容通常不需要长期保存。',
      '手机屏幕截图，占空间但记忆价值不高，建议定期清理。'
    ],
    'a screenshot of a live stream or live broadcast with comments and gifts': [
      '直播截图，有弹幕和礼物特效，属于临时娱乐内容，看完就可以删了。',
      '直播间截图，信息时效性很短，没有长期保存的必要。',
      '直播画面截图，弹幕和互动内容都是实时的，建议清理。',
      '这是直播录屏截图，内容属于临时观看，不建议长期占用空间。'
    ],
    'a photo of a QR code': [
      '二维码图片，临时信息，用完就没用了，直接删了吧。',
      '二维码截图，没有任何长期保存价值，建议立即清理。',
      '扫码用的二维码，时效性极短，强烈建议删除。'
    ],
    'a photo of a city or building or architecture': [
      '城市建筑照片，记录了都市风貌，有一定的旅行纪念价值。',
      '建筑摄影，线条和结构感强，是城市人文的记录。',
      '街头的建筑风景，画面有设计感，值得保留。'
    ],
    'a photo of a receipt or ticket or invoice': [
      '票据/收据照片，报销凭证类信息，用完就可以清理。',
      '小票/发票截图，临时性信息，时效过了就没什么用了。',
      '票据类图片，短期有用但长期无价值，建议定期清理。'
    ],
    'a photo of a document or text or note': [
      '文档/文字类图片，包含一定信息，可以看情况保留。',
      '文字内容截图，信息密度高但记忆价值一般。',
      '文本/笔记类图片，建议将重要内容整理到备忘录后清理。'
    ],
    'a blurry or unclear photo': [
      '模糊不清的照片，画面质量差，保存价值很低，建议清理。',
      '这张照片拍糊了，主体不清晰，没什么保留的必要。',
      '画质很差的照片，什么都看不清，直接删了吧。'
    ],
    'a photo of a car or vehicle': [
      '车辆照片，如果是自己的爱车有一定纪念意义，否则价值一般。',
      '汽车/交通工具的照片，记录了出行相关画面。'
    ],
    'a photo of flowers or plants': [
      '花草植物的照片，画面清新，记录了自然之美，看着让人放松。',
      '花卉/绿植照，色彩好看，是生活中的小美好。',
      '植物特写，拍得不错，生机盎然的画面值得保留。'
    ]
  };

  var TEMPLATES = {
    'scene_travel+scene_mountain': [
      '这是一张旅行风景照，山峦起伏，画面构图完整，记录了旅途中的美好瞬间。',
      '旅途中的山景照片，自然风光优美，画面质量不错，值得保留的回忆。',
      '爬山时拍下的风景照，视野开阔，景色壮丽，是旅行中的珍贵记录。'
    ],
    'scene_travel+scene_sea': [
      '海边旅行照，蔚蓝的海面和天空，画面清新明亮，充满夏日气息。',
      '度假时的海边风景，阳光和海水让人放松，是美好的度假回忆。',
      '海边日落景色，光影很美，画面质量高，值得收藏的旅行瞬间。'
    ],
    'scene_travel+scene_sunset': [
      '旅行中的日落美景，暖色调光影很美，画面氛围感强。',
      '黄昏时分拍下的日落照片，色彩层次丰富，是旅途的精彩瞬间。',
      '海边/山顶日落，天空渐变色彩漂亮，画面质量不错。'
    ],
    'scene_family+scene_gathering': [
      '家庭聚会合照，多人入镜，记录了温馨的家庭时光，很有纪念意义。',
      '一家人团聚的照片，充满幸福感，是珍贵的家庭回忆。',
      '家庭聚餐时的合影，每个人都在笑，氛围很好，值得保留。'
    ],
    'scene_friends+scene_party': [
      '和朋友聚会的照片，大家玩得很开心，记录了欢乐的友情时光。',
      '派对上的合影，笑容灿烂，是青春和友谊的美好见证。',
      '朋友聚会的欢乐瞬间，多人入镜，充满活力和回忆价值。'
    ],
    'scene_graduation+scene_ceremony': [
      '毕业照，人生重要时刻的记录，非常有纪念意义，强烈建议保留。',
      '毕业典礼的照片，是青春的见证，价值很高的回忆。',
      '毕业季的合影，同学和老师都在，是人生阶段的重要纪念。'
    ],
    'scene_wedding+scene_ceremony': [
      '婚礼照片，人生大事的记录，极其珍贵的回忆，务必保留。',
      '婚礼现场的合照，幸福的瞬间，最高级别的记忆价值。',
      '结婚典礼的照片，记录了人生最重要的时刻之一。'
    ],
    'scene_birthday+scene_party': [
      '生日派对照片，记录了特别的日子，有温度的回忆。',
      '庆生的合影，蛋糕和蜡烛，满满的仪式感。',
      '生日聚会的瞬间，朋友们在一起，很有纪念意义。'
    ],
    'scene_couple+scene_travel': [
      '情侣旅行合照，两人同框，记录了甜蜜的旅行时光。',
      '度假时的双人照，风景和人都很美，浪漫的回忆。',
      '旅途中的合影，两人都很开心，是值得珍藏的瞬间。'
    ],
    'scene_food+scene_dining': [
      '美食照片，看起来很诱人，记录了用餐的美好时刻。',
      '餐桌上的佳肴，色泽诱人，是探店或旅行中的味觉回忆。',
      '精致的食物摆盘，画面不错，记录了一次不错的用餐体验。'
    ],
    'scene_pet+animal': [
      '宠物照片，毛孩子很可爱，是生活中的温馨记录。',
      '家里宠物的日常照，萌萌的，很有情感价值。',
      '宠物的精彩瞬间，记录了陪伴的美好时光。'
    ],
    'scene_document+id_card': [
      '证件照片，包含重要个人信息，有较高的实用价值，建议保留备份。',
      '身份证件的照片，属于重要资料，虽然记忆价值不高但实用性强。',
      '证件类图片，信息重要，建议妥善保存。'
    ],
    'scene_document+receipt': [
      '发票/收据照片，属于临时信息，过了报销期通常就没用了。',
      '票据类照片，时效性强，报销完成后可考虑清理。',
      '账单凭证类图片，信息价值有限，建议定期清理。'
    ],
    'scene_document+ticket': [
      '门票/车票照片，出行凭证，有一定的纪念意义但信息价值一般。',
      '票据类图片，如果不是特别有纪念意义的行程可以考虑清理。',
      '交通/门票凭证，记录了一次出行，但保存价值因人而异。'
    ],
    'screenshot+screenshot_chat': [
      '聊天记录截图，内容为对话信息，记忆价值较低，占用空间。',
      '社交软件截图，属于临时信息，通常不需要长期保存。',
      '聊天截图，信息时效性强，重要内容建议单独收藏而非保留全部截图。'
    ],
    'screenshot+screenshot_social': [
      '社交平台截图，娱乐类内容为主，记忆价值不高。',
      '社交媒体截图，刷到的有趣内容，但保存意义不大。',
      '网页/App截图，属于碎片化信息，建议定期清理。'
    ],
    'screenshot+screenshot_memo': [
      '备忘录/笔记截图，包含实用信息，有一定参考价值。',
      '记录类截图，信息有用，属于有价值的信息类图片。',
      '笔记截图，内容重要性较高，建议保留或整理到笔记应用。'
    ],
    'screenshot+screenshot_code': [
      '代码截图，技术类内容，对开发者有一定参考价值。',
      '编程相关截图，信息密度高，属于有价值的技术资料。',
      '代码/配置截图，实用性强，可以保留但建议整理归档。'
    ],
    'screenshot+screenshot_verify_code': [
      '验证码截图，完全是临时信息，用完即弃，强烈建议清理。',
      '验证码图片，时效性极短，没有任何长期保存价值。',
      '验证码类截图，占空间且毫无用处，直接删除即可。'
    ],
    'screenshot+screenshot_weather': [
      '天气截图，信息时效性极强，看完就可以删了。',
      '天气预报截图，每天都在变，没有长期保存的必要。',
      '天气类截图，属于临时信息，占空间还没什么用。',
      '实时天气截图，过了当天就没有参考价值了。'
    ],
    'screenshot+screenshot_live_stream': [
      '直播截图，有弹幕和礼物特效，属于临时娱乐内容，看完就可以删了。',
      '直播间截图，信息时效性很短，没有长期保存的必要。',
      '直播画面截图，弹幕和互动内容都是实时的，建议清理。',
      '这是直播录屏截图，内容属于临时观看，不建议长期占用空间。'
    ],
    'screenshot+screenshot_express': [
      '快递信息截图，物流信息是临时的，收到货后就没用了。',
      '快递单/物流截图，时效性强，建议确认收货后清理。',
      '包裹信息截图，短期有用但长期无价值。'
    ],
    'duplicate+screenshot': [
      '重复的截图，内容与其他照片重复，保留一张即可。',
      '这张截图在相册中有重复，建议清理多余的副本。',
      '存在相同或高度相似的截图，无需重复保存。'
    ],
    'duplicate+scene_travel': [
      '重复的旅行照片，同一场景连续拍摄了多张，建议保留最好的一张。',
      '这张照片属于重复组，相似照片有多张，精选一张保留即可。',
      '旅途中的连拍照片，内容相近，可清理多余的以节省空间。'
    ],
    'duplicate+scene_people': [
      '重复的人物合照，同一场景拍了多张，建议保留表情最好的那张。',
      '合影连拍中的一张，有多张相似照片，精选一张即可。',
      '聚会时的连拍照片，内容高度相似，无需全部保留。'
    ],
    'blurry+scene_travel': [
      '模糊的风景照，画面不够清晰，影响观感，建议清理。',
      '这张旅行照片拍糊了，画面质量较差，保存价值不高。',
      '失焦的风景照片，虽然是旅行记录但画质不佳。'
    ],
    'blurry+scene_people': [
      '模糊的人物照，主体不够清晰，画面质量低，建议清理。',
      '拍糊了的合照，人脸不够清晰，保留价值有限。',
      '失焦的人物照片，画质差，不建议长期保存。'
    ],
    'blurry+screenshot': [
      '模糊的截图，信息难以辨认，实用性大打折扣。',
      '不够清晰的截图，内容看不清，保留意义不大。',
      '画质差的截图，信息价值大幅降低。'
    ],
    'scene_nature+scene_park': [
      '公园自然风景照，绿意盎然，画面清新舒适。',
      '城市公园的景色，日常生活中的小确幸。',
      '散步时拍下的自然风光，宁静美好的日常记录。'
    ],
    'scene_city+scene_street': [
      '城市街景照片，记录了城市的日常风貌。',
      '街头随拍，有生活气息，是城市生活的记录。',
      '城市街道的照片，建筑和人流构成了日常风景。'
    ],
    'scene_plant+nature': [
      '植物照片，绿意盎然，画面清新，是生活中的小美好。',
      '花花草草的特写，拍得不错，记录了自然之美。',
      '绿植照片，生机勃勃，看着让人心情愉悦。'
    ],
    'scene_indoor+room': [
      '室内环境照片，记录了生活空间，日常感强。',
      '房间/室内场景，属于生活记录类，价值一般。',
      '室内随拍，画面普通，记忆价值不高。'
    ],
    'scene_night+city': [
      '城市夜景照片，灯光璀璨，氛围感不错。',
      '夜晚的城市景色，霓虹闪烁，有独特的美感。',
      '夜景随拍，光影效果还可以，记录了城市的夜晚。'
    ],
    'scene_portrait+single': [
      '单人人像照，构图不错，是个人状态的记录。',
      '自拍/单人照，画面质量可以，有一定纪念意义。',
      '人物特写，表情自然，是不错的个人记录。'
    ],
    'scene_architecture+travel': [
      '建筑摄影，旅行中的特色建筑，记录了当地的风貌。',
      '旅途中的地标建筑，很有代表性，值得保留的旅行记忆。',
      '城市建筑照片，设计感强，是旅行中的人文记录。'
    ]
  };

  var OPENERS = [
    '这是一张',
    '从内容来看，这是',
    '分析显示，这张照片是',
    '综合判断，这是',
    'AI 识别到这是'
  ];

  var ENDINGS_KEEP = [
    '整体来说很有保留价值。',
    '建议继续保留这张照片。',
    '是值得珍藏的回忆。',
    '保留价值较高，建议保留。',
    '很有意义，建议收藏。'
  ];

  var ENDINGS_REVIEW = [
    '是否保留可以再斟酌一下。',
    '价值一般，你可以自己决定。',
    '可以根据实际情况判断是否保留。',
    '记忆价值中等，建议复核后决定。',
    '是否保留取决于你的个人偏好。'
  ];

  var ENDINGS_CLEAN = [
    '建议清理以释放存储空间。',
    '可以考虑删除，释放手机空间。',
    '保存价值较低，建议清理。',
    '没什么保留的必要，删了吧。',
    '占空间且价值不高，建议清理掉。'
  ];

  function findTemplate(photo) {
    var tags = photo.reason_tags || [];
    var analysis = photo.analysis || {};
    var detectedType = photo.detected_type || analysis.detected_type || '';
    var screenshotType = analysis.screenshot_type || '';
    var clipLabel = analysis.clip_label || '';

    // 优先使用CLIP精准模板
    if (clipLabel && CLIP_TEMPLATES[clipLabel]) {
      var templates = CLIP_TEMPLATES[clipLabel];
      return templates[Math.floor(Math.random() * templates.length)];
    }

    var keys = [];

    if (detectedType === 'screenshot' || analysis.is_screenshot) {
      var type = screenshotType || 'app';
      if (analysis.is_duplicate) {
        keys.push('duplicate+screenshot');
      } else {
        keys.push('screenshot+screenshot_' + type);
      }
      keys.push('screenshot+screenshot_app');
    } else if (analysis.is_duplicate) {
      if (detectedType === 'landscape' || tags.indexOf('scene_travel') !== -1) {
        keys.push('duplicate+scene_travel');
      } else if (detectedType === 'portrait' || detectedType === 'family' || analysis.person_count >= 2) {
        keys.push('duplicate+scene_people');
      } else {
        keys.push('duplicate+scene_travel');
      }
    } else if (analysis.is_blurry && detectedType !== 'screenshot') {
      if (detectedType === 'landscape' || tags.indexOf('scene_travel') !== -1) {
        keys.push('blurry+scene_travel');
      } else if (detectedType === 'portrait' || analysis.person_count >= 1) {
        keys.push('blurry+scene_people');
      } else {
        keys.push('blurry+scene_travel');
      }
    } else {
      var sceneTags = [];
      var sceneOrder = ['scene_wedding', 'scene_graduation', 'scene_travel', 'scene_family', 'scene_friends',
                        'scene_couple', 'scene_birthday', 'scene_gathering', 'scene_party', 'scene_ceremony',
                        'scene_mountain', 'scene_sea', 'scene_sunset', 'scene_nature', 'scene_park',
                        'scene_food', 'scene_pet', 'scene_document', 'scene_architecture',
                        'scene_city', 'scene_street', 'scene_plant', 'scene_indoor', 'scene_night',
                        'scene_portrait'];
      
      if (detectedType === 'portrait') {
        keys.push('scene_portrait+single');
      } else if (detectedType === 'family') {
        keys.push('scene_family+scene_gathering');
      } else if (detectedType === 'food') {
        keys.push('scene_food+scene_dining');
      } else if (detectedType === 'pet') {
        keys.push('scene_pet+animal');
      } else if (detectedType === 'landscape') {
        keys.push('scene_travel+scene_mountain');
      }
      
      for (var i = 0; i < sceneOrder.length; i++) {
        if (tags.indexOf(sceneOrder[i]) !== -1) {
          sceneTags.push(sceneOrder[i]);
          if (sceneTags.length >= 2) break;
        }
      }
      if (sceneTags.length >= 2) {
        keys.push(sceneTags[0] + '+' + sceneTags[1].replace('scene_', ''));
      }
      if (sceneTags.length === 1) {
        keys.push(sceneTags[0] + '+default');
      }
    }

    for (var k = 0; k < keys.length; k++) {
      if (TEMPLATES[keys[k]]) {
        var templates = TEMPLATES[keys[k]];
        return templates[Math.floor(Math.random() * templates.length)];
      }
    }

    return generateFallback(photo);
  }

  function generateFallback(photo) {
    var analysis = photo.analysis || {};
    var score = photo.score || 50;
    var detectedType = photo.detected_type || analysis.detected_type || '';
    var screenshotType = analysis.screenshot_type || '';

    if (detectedType === 'screenshot' || analysis.is_screenshot) {
      if (screenshotType === 'weather') {
        return '天气截图，信息时效性很强，没有长期保存的必要。';
      }
      if (screenshotType === 'qr_code') {
        return '二维码截图，属于临时信息，用完就可以删除。';
      }
      if (analysis.is_blurry) {
        return '这是一张模糊的截图，内容不太清晰，保存价值不高。';
      }
      return '这是一张截图，包含屏幕内容，记忆价值相对较低。';
    }
    if (analysis.is_duplicate) {
      return '这是一张重复照片，与相册中其他照片内容相似。';
    }
    if (analysis.is_blurry) {
      if (detectedType === 'portrait') {
        return '这张人物照片拍糊了，主体不够清晰。';
      }
      if (detectedType === 'food') {
        return '这张美食照片画面比较模糊，影响观感。';
      }
      return '这张照片画面比较模糊，影响整体观感。';
    }
    if (detectedType === 'food') {
      return '这是一张美食照片，记录了用餐时的画面。';
    }
    if (detectedType === 'pet') {
      return '这是一张宠物照片，记录了毛孩子的日常。';
    }
    if (detectedType === 'portrait') {
      return '这是一张人像照片，记录了人物的瞬间。';
    }
    if (score >= 70) {
      return '这张照片整体质量不错，有一定的保留价值。';
    }
    if (score >= 40) {
      return '这是一张普通照片，价值中等，可以自行判断是否保留。';
    }
    return '这张照片的保留价值相对较低。';
  }

  function addDetails(text, photo) {
    var analysis = photo.analysis || {};
    var date = photo.created_at ? Utils.formatDateShort(photo.created_at) : '';
    var dupCount = analysis.duplicate_count || 0;

    if (analysis.is_duplicate && dupCount > 1) {
      text += '但相册中存在 ' + (dupCount) + ' 张相似重复照片，建议保留其中质量最好的一张。';
    }

    if (date && !analysis.is_screenshot && photo.score >= 60) {
      if (Math.random() > 0.5) {
        text = text.replace(/这是一张/, '拍摄于 ' + date + '，这是一张');
      }
    }

    return text;
  }

  function addEnding(text, category) {
    var endings;
    if (category === 'keep') endings = ENDINGS_KEEP;
    else if (category === 'review') endings = ENDINGS_REVIEW;
    else endings = ENDINGS_CLEAN;

    if (Math.random() > 0.3) {
      text += endings[Math.floor(Math.random() * endings.length)];
    }
    return text;
  }

  function explainPhoto(photo) {
    var core = findTemplate(photo);
    var category = photo.category || (photo.score >= 80 ? 'keep' : photo.score >= 40 ? 'review' : 'clean');
    var withDetails = addDetails(core, photo);
    var final = addEnding(withDetails, category);
    return final;
  }

  function batchExplain(photos) {
    return photos.map(function(p) {
      return Object.assign({}, p, {
        explanation: explainPhoto(p)
      });
    });
  }

  global.ExplanationEngine = {
    explainPhoto: explainPhoto,
    batchExplain: batchExplain,
    _templates: TEMPLATES
  };

})(window);
