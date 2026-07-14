(function(global) {
  'use strict';

  var WEIGHTS = {
    memory: 0.40,
    scarcity: 0.15,
    info: 0.20,
    quality: 0.25
  };

  function analyzePhoto(photo) {
    return photo.analysis || {};
  }

  function detectPhotoType(analysis) {
    // 优先使用预计算的类型（基于真实图像分析）
    if (analysis.detected_type) {
      var type = analysis.detected_type;
      var subType = '';
      var confidence = analysis.type_confidence || 0.5;
      var screenshotType = analysis.screenshot_type || '';
      var sceneTags = analysis.scene_tags || [];
      var personCount = analysis.person_count || 0;

      if (type === 'screenshot' && screenshotType) {
        subType = screenshotType;
      } else if (type === 'screenshot') {
        subType = 'app';
      }

      if (type === 'portrait') {
        if (personCount >= 2) subType = 'couple';
        else if (personCount === 1) subType = 'single';
        else subType = 'group';
      }

      if (type === 'landscape') {
        if (sceneTags.indexOf('mountain') !== -1) subType = 'mountain';
        else if (sceneTags.indexOf('sea') !== -1 || sceneTags.indexOf('beach') !== -1) subType = 'sea';
        else if (sceneTags.indexOf('sunset') !== -1) subType = 'sunset';
        else if (sceneTags.indexOf('nature') !== -1) subType = 'nature';
      }

      return { type: type, subType: subType, confidence: confidence };
    }

    // 回退到基于 scene_tags 的判断
    var type = 'general';
    var subType = '';
    var confidence = 0;

    var clarity = analysis.clarity_score || 0.5;
    var brightness = analysis.brightness || 0.5;
    var saturation = analysis.saturation || 0.5;
    var contrast = analysis.contrast || 0.5;
    var edgeDensity = analysis.edge_density || 0.3;
    var isScreenshot = analysis.is_screenshot || false;
    var screenshotType = analysis.screenshot_type || '';
    var sceneTags = analysis.scene_tags || [];
    var aspectRatio = analysis.aspect_ratio || 1;
    var personCount = analysis.person_count || 0;

    var scores = {};

    scores.screenshot = isScreenshot ? 90 : 
                       edgeDensity > 0.4 && saturation < 0.25 ? 70 :
                       edgeDensity > 0.3 && saturation < 0.3 ? 50 :
                       brightness > 0.8 && saturation < 0.2 ? 40 : 10;

    scores.portrait = sceneTags.indexOf('portrait') !== -1 ? 85 :
                     sceneTags.indexOf('person') !== -1 ? 80 :
                     personCount >= 1 ? 70 :
                     (sceneTags.indexOf('selfie') !== -1 || sceneTags.indexOf('couple') !== -1) ? 75 :
                     saturation > 0.3 && saturation < 0.7 && contrast > 0.35 ? 40 : 15;

    scores.family = sceneTags.indexOf('family') !== -1 ? 90 :
                    sceneTags.indexOf('gathering') !== -1 && personCount >= 2 ? 80 :
                    sceneTags.indexOf('people') !== -1 && personCount >= 3 ? 70 :
                    personCount >= 4 ? 60 : 10;

    scores.food = sceneTags.indexOf('food') !== -1 ? 85 :
                  sceneTags.indexOf('dining') !== -1 ? 75 :
                  saturation > 0.5 && saturation < 0.9 ? 60 :
                  brightness > 0.6 && contrast > 0.4 ? 40 : 15;

    scores.landscape = sceneTags.indexOf('landscape') !== -1 ? 85 :
                       sceneTags.indexOf('nature') !== -1 ? 80 :
                       sceneTags.indexOf('travel') !== -1 ? 75 :
                       sceneTags.indexOf('mountain') !== -1 || sceneTags.indexOf('sea') !== -1 ? 70 :
                       aspectRatio > 1.5 && saturation > 0.25 ? 50 :
                       brightness > 0.4 && brightness < 0.8 && contrast > 0.3 ? 35 : 15;

    scores.urban = sceneTags.indexOf('urban') !== -1 ? 75 :
                   sceneTags.indexOf('architecture') !== -1 ? 70 :
                   sceneTags.indexOf('city') !== -1 ? 65 :
                   edgeDensity > 0.3 && saturation > 0.2 && saturation < 0.5 ? 40 : 15;

    scores.pet = sceneTags.indexOf('pet') !== -1 ? 85 :
                 sceneTags.indexOf('animal') !== -1 ? 80 :
                 sceneTags.indexOf('cat') !== -1 || sceneTags.indexOf('dog') !== -1 ? 75 :
                 saturation > 0.4 && contrast > 0.35 ? 40 : 15;

    scores.document = sceneTags.indexOf('document') !== -1 ? 80 :
                      isScreenshot && (screenshotType === 'document' || screenshotType === 'ppt') ? 75 :
                      edgeDensity > 0.35 && saturation < 0.3 ? 50 : 10;

    var maxScore = 0;
    var maxType = 'general';
    for (var key in scores) {
      if (scores[key] > maxScore) {
        maxScore = scores[key];
        maxType = key;
      }
    }

    type = maxType;
    confidence = maxScore;

    if (type === 'screenshot') {
      if (screenshotType) {
        subType = screenshotType;
      } else if (edgeDensity > 0.45) {
        subType = 'document';
      } else if (saturation < 0.15) {
        subType = 'text';
      } else {
        subType = 'app';
      }
    }

    if (type === 'portrait') {
      if (personCount >= 2) subType = 'couple';
      else if (personCount === 1) subType = 'single';
      else subType = 'group';
    }

    if (type === 'landscape') {
      if (sceneTags.indexOf('mountain') !== -1) subType = 'mountain';
      else if (sceneTags.indexOf('sea') !== -1 || sceneTags.indexOf('beach') !== -1) subType = 'sea';
      else if (sceneTags.indexOf('sunset') !== -1) subType = 'sunset';
      else if (sceneTags.indexOf('nature') !== -1) subType = 'nature';
    }

    return { type: type, subType: subType, confidence: confidence };
  }

  function calcMemoryScore(analysis) {
    var score = 20;
    var maxScore = 40;
    var tags = analysis.scene_tags || [];

    var photoType = detectPhotoType(analysis);
    var type = photoType.type;
    var subType = photoType.subType;

    var isQrCode = analysis.is_qr_code || (analysis.qr_score > 0.7 && type === 'screenshot');
    if (isQrCode) {
      score -= 30;
    }

    var typeBonus = {
      portrait: 12,
      family: 18,
      landscape: 20,
      pet: 12,
      food: 8,
      urban: 12,
      document: -5,
      screenshot: -15
    };

    score += typeBonus[type] || 0;

    if (analysis.is_event) score += 12;

    var eventTags = {
      'travel': 8, 'wedding': 15, 'graduation': 12, 'birthday': 8,
      'anniversary': 10, 'party': 6, 'ceremony': 10
    };
    for (var tag in eventTags) {
      if (tags.indexOf(tag) !== -1) {
        score += eventTags[tag];
        break;
      }
    }

    var peopleTags = { 'friends': 6, 'couple': 8, 'family': 10 };
    for (var pt in peopleTags) {
      if (tags.indexOf(pt) !== -1) {
        score += peopleTags[pt];
        break;
      }
    }

    var sceneTags = { 'mountain': 4, 'sea': 5, 'sunset': 6, 'beach': 4 };
    for (var st in sceneTags) {
      if (tags.indexOf(st) !== -1) {
        score += sceneTags[st];
        break;
      }
    }

    if (analysis.person_count) {
      if (analysis.person_count >= 5) score += 8;
      else if (analysis.person_count >= 3) score += 5;
      else if (analysis.person_count === 1) score += 3;
    }

    if (type === 'screenshot') {
      var screenshotPenalty = {
        'qr_code': -35, 'verify_code': -30, 'weather': -30, 'live_stream': -25,
        'video': -20, 'chat': -15, 'app': -12, 'ppt': -8, 'document': -5, 'text': -20, 'edited': -10
      };
      score += screenshotPenalty[subType] || -18;
    }

    if (analysis.is_blurry) {
      var clarity = analysis.clarity_score || 0;
      var isLandscape = type === 'landscape';
      if (clarity < 0.05) {
        score -= isLandscape ? 18 : 30;
      } else if (clarity < 0.1) {
        score -= isLandscape ? 12 : 22;
      } else if (clarity < 0.15) {
        score -= isLandscape ? 7 : 15;
      } else if (clarity < 0.2) {
        score -= isLandscape ? 4 : 8;
      } else {
        score -= isLandscape ? 2 : 4;
      }
    }

    return Math.round(Math.max(5, Math.min(score, maxScore)) * 10) / 10;
  }

  function calcScarcityScore(analysis, years) {
    var score = 10;
    var maxScore = 15;

    if (!analysis.is_screenshot) {
      if (years >= 3) score += 8;
      else if (years >= 2) score += 5;
      else if (years >= 1) score += 2;
    }

    var photoType = detectPhotoType(analysis);
    if (photoType.type === 'screenshot') {
      score = Math.max(0, score - 10);
    }

    return Math.round(Math.max(0, Math.min(score, maxScore)) * 10) / 10;
  }

  function calcInfoScore(analysis) {
    var score = 8;
    var maxScore = 20;
    var density = analysis.text_density || 0;

    score += density * 10;

    if (analysis.is_important_info) score += 15;
    if (analysis.is_document) score += 10;
    if (analysis.doc_type === 'id_card' || analysis.doc_type === 'ticket') score += 8;

    if (analysis.is_temp_info) score -= 15;

    var photoType = detectPhotoType(analysis);
    var type = photoType.type;
    var subType = photoType.subType;

    if (type === 'screenshot') {
      var screenshotInfoBonus = { 'document': 8, 'ppt': 5 };
      var screenshotInfoPenalty = {
        'qr_code': -25, 'verify_code': -30, 'video': -18,
        'chat': -12, 'app': -10, 'text': -20, 'edited': -12
      };
      score += screenshotInfoBonus[subType] || 0;
      score += screenshotInfoPenalty[subType] || -15;
    }

    if (type === 'document') {
      score += 8;
    }

    return Math.round(Math.max(0, Math.min(score, maxScore)) * 10) / 10;
  }

  function calcQualityScore(analysis) {
    var clarity = analysis.clarity_score || 0.5;
    var brightness = analysis.brightness || 0.5;
    var contrast = analysis.contrast || 0.5;
    var saturation = analysis.saturation || 0.5;

    var score = clarity * 15;

    if (brightness < 0.3) score -= 4;
    else if (brightness > 0.92) score -= 3;

    if (contrast < 0.2) score -= 3;
    else if (contrast > 0.8) score -= 2;

    if (saturation < 0.08) score -= 3;
    else if (saturation > 0.92) score -= 2;

    if (analysis.is_blurry) {
      score -= 8;
    }

    var photoType = detectPhotoType(analysis);
    if (photoType.type === 'screenshot') {
      score = Math.min(score, 14);
      if (!analysis.is_blurry && clarity > 0.85) {
        score = Math.max(score, 12);
      }
    }

    return Math.round(Math.max(3, Math.min(score, 25)) * 10) / 10;
  }

  function scorePhoto(photo, preferences) {
    var analysis = analyzePhoto(photo);
    var years = Utils.yearsAgo(photo.created_at);

    var memory = calcMemoryScore(analysis);
    var scarcity = calcScarcityScore(analysis, years);
    var info = calcInfoScore(analysis);
    var quality = calcQualityScore(analysis);

    var photoType = detectPhotoType(analysis);
    var detectedType = photoType.type;

    var baseTotal = memory + scarcity + info + quality;

    var totalAdjustment = 0;

    var isQrCode = analysis.is_qr_code || (analysis.qr_score > 0.7 && detectedType === 'screenshot');
    if (isQrCode) {
      totalAdjustment -= 40;
    }

    var typeAdjustments = {
      portrait: 12,
      family: 16,
      landscape: 18,
      pet: 12,
      food: 8,
      urban: 10,
      document: -8,
      screenshot: -20
    };
    totalAdjustment += typeAdjustments[detectedType] || 0;

    if (analysis.is_blurry) {
      var clarityAdj = analysis.clarity_score || 0;
      if (clarityAdj < 0.05) {
        totalAdjustment -= 35;
      } else if (clarityAdj < 0.1) {
        totalAdjustment -= 28;
      } else if (clarityAdj < 0.15) {
        totalAdjustment -= 20;
      } else if (clarityAdj < 0.2) {
        totalAdjustment -= 12;
      } else {
        totalAdjustment -= 5;
      }
    }

    if (analysis.is_screenshot && !analysis.is_important_info) {
      var screenshotPenalty = {
        'qr_code': -35,
        'verify_code': -30,
        'video': -18,
        'chat': -15,
        'app': -12,
        'text': -20,
        'edited': -10
      };
      totalAdjustment += screenshotPenalty[analysis.screenshot_type] || -15;
    }

    if (analysis.is_event) {
      totalAdjustment += 8;
    }

    var eventTags = ['wedding', 'graduation', 'birthday', 'anniversary', 'party'];
    var sceneTags = analysis.scene_tags || [];
    for (var j = 0; j < eventTags.length; j++) {
      if (sceneTags.indexOf(eventTags[j]) !== -1) {
        totalAdjustment += 5;
        break;
      }
    }

    if (analysis.person_count && analysis.person_count >= 2) {
      totalAdjustment += 5;
    }

    if (analysis.is_temp_info) {
      totalAdjustment -= 15;
    }

    if (analysis.is_important_info) {
      totalAdjustment += 15;
    }

    if (preferences) {
      var keepTags = preferences.keepTags || [];
      var deleteTypes = preferences.deleteTypes || [];
      var screenshotType = analysis.screenshot_type;

      for (var i = 0; i < keepTags.length; i++) {
        if (sceneTags.indexOf(keepTags[i]) !== -1) {
          totalAdjustment += 20;
          break;
        }
      }

      for (var k = 0; k < deleteTypes.length; k++) {
        if (screenshotType === deleteTypes[k]) {
          totalAdjustment -= 35;
          break;
        }
      }

      if (keepTags.length > 0) {
        var typeKeepMap = {
          'landscape': ['nature', 'travel', 'landscape', 'mountain', 'sea', 'sunset', 'beach'],
          'people': ['family', 'friends', 'gathering', 'people', 'portrait', 'couple', 'wedding', 'graduation'],
          'food': ['food', 'dining', 'cafe', 'dessert'],
          'closeup': ['closeup', 'object', 'pet', 'animal', 'cat', 'dog']
        };

        for (var keepKey in typeKeepMap) {
          if (preferences.keep && preferences.keep.indexOf(keepKey) !== -1) {
            var matchTags = typeKeepMap[keepKey];
            for (var m = 0; m < matchTags.length; m++) {
              if (sceneTags.indexOf(matchTags[m]) !== -1) {
                totalAdjustment += 12;
                break;
              }
            }
          }
        }
      }

      if (deleteTypes.length > 0) {
        if (photoType.type === 'screenshot' && deleteTypes.indexOf(photoType.subType) !== -1) {
          totalAdjustment -= 20;
        }
      }
    }

    var memoryAdjustment = totalAdjustment * WEIGHTS.memory;
    var scarcityAdjustment = totalAdjustment * WEIGHTS.scarcity;
    var infoAdjustment = totalAdjustment * WEIGHTS.info;
    var qualityAdjustment = totalAdjustment * WEIGHTS.quality;

    var finalMemory = Math.max(0, Math.min(40, memory + memoryAdjustment));
    var finalScarcity = Math.max(0, Math.min(15, scarcity + scarcityAdjustment));
    var finalInfo = Math.max(0, Math.min(20, info + infoAdjustment));
    var finalQuality = Math.max(0, Math.min(25, quality + qualityAdjustment));

    var total = Math.round(finalMemory + finalScarcity + finalInfo + finalQuality);
    total = Utils.clamp(total, 0, 100);

    var displayedMemory = Math.round(finalMemory * 10) / 10;
    var displayedScarcity = Math.round(finalScarcity * 10) / 10;
    var displayedInfo = Math.round(finalInfo * 10) / 10;
    var displayedQuality = Math.round(finalQuality * 10) / 10;

    var reasonTags = buildReasonTags(analysis, memory, scarcity, info, quality, years, photoType);

    return {
      memory: displayedMemory,
      scarcity: displayedScarcity,
      info: displayedInfo,
      quality: displayedQuality,
      total: total,
      reasonTags: reasonTags,
      years: years,
      photoType: photoType
    };
  }

  function buildReasonTags(analysis, memory, scarcity, info, quality, years, photoType) {
    var tags = [];

    tags.push('type_' + photoType.type);
    if (photoType.subType) tags.push('subtype_' + photoType.subType);

    if (analysis.is_screenshot) tags.push('screenshot');
    if (analysis.screenshot_type) tags.push('screenshot_' + analysis.screenshot_type);
    if (analysis.is_blurry) tags.push('blurry');

    var sceneTags = analysis.scene_tags || [];
    var importantTags = ['travel', 'family', 'friends', 'couple', 'gathering', 'party',
                         'ceremony', 'wedding', 'graduation', 'birthday', 'anniversary',
                         'mountain', 'sea', 'sunset', 'beach', 'nature', 'park',
                         'food', 'dining', 'pet', 'animal', 'cat', 'dog',
                         'document', 'portrait', 'urban', 'architecture', 'city', 'street', 'night'];
    sceneTags.forEach(function(t) {
      if (importantTags.indexOf(t) !== -1) {
        tags.push('scene_' + t);
      }
    });

    if (analysis.is_event) tags.push('event');
    if (analysis.person_count) {
      if (analysis.person_count >= 5) tags.push('many_people');
      else if (analysis.person_count >= 3) tags.push('group_people');
      else if (analysis.person_count === 1) tags.push('single_person');
    }

    if (analysis.is_temp_info) tags.push('temp_info');
    if (analysis.is_important_info) tags.push('important_info');
    if (analysis.is_document) tags.push('document');

    if (years >= 3) tags.push('old_photo');
    else if (years >= 2) tags.push('mid_old_photo');

    if (quality >= 18) tags.push('high_quality');
    else if (quality <= 10) tags.push('low_quality');

    if (memory >= 35) tags.push('high_memory');
    else if (memory <= 15) tags.push('low_memory');

    if (scarcity >= 22) tags.push('rare_photo');
    if (scarcity <= 8) tags.push('common_photo');

    if (info >= 20) tags.push('high_info');
    else if (info <= 8) tags.push('low_info');

    return tags;
  }

  function batchScore(photos, preferences) {
    return photos.map(function(photo) {
      var scoreResult = scorePhoto(photo, preferences);
      return Object.assign({}, photo, {
        score: scoreResult.total,
        score_detail: {
          memory: scoreResult.memory,
          scarcity: scoreResult.scarcity,
          info: scoreResult.info,
          quality: scoreResult.quality
        },
        reason_tags: scoreResult.reasonTags,
        years: scoreResult.years,
        detected_type: scoreResult.photoType.type,
        detected_subtype: scoreResult.photoType.subType
      });
    });
  }

  global.ScoringEngine = {
    scorePhoto: scorePhoto,
    batchScore: batchScore,
    analyzePhoto: analyzePhoto,
    detectPhotoType: detectPhotoType,
    WEIGHTS: WEIGHTS
  };

})(window);
