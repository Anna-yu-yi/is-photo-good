(function(global) {
  'use strict';

  var THRESHOLDS = {
    keep: 50,
    review: 30
  };

  function classifyPhoto(photo, preferences) {
    var score = photo.score || 0;

    if (score >= THRESHOLDS.keep) return 'keep';
    if (score >= THRESHOLDS.review) return 'review';
    return 'clean';
  }

  function batchClassify(photos, preferences) {
    var keep = [];
    var review = [];
    var clean = [];

    photos.forEach(function(photo) {
      if (photo.analysis && photo.analysis.is_duplicate) {
        return;
      }
      var category = classifyPhoto(photo, preferences);
      var p = Object.assign({}, photo, { category: category });
      if (category === 'keep') keep.push(p);
      else if (category === 'review') review.push(p);
      else clean.push(p);
    });

    keep.sort(function(a, b) { return b.score - a.score; });
    review.sort(function(a, b) { return b.score - a.score; });
    clean.sort(function(a, b) { return b.score - a.score; });

    return {
      keep: keep,
      review: review,
      clean: clean
    };
  }

  function computeStats(categories, photos) {
    var total = photos.length;
    var allPhotos = categories.keep.concat(categories.review).concat(categories.clean);

    var screenshot = allPhotos.filter(function(p) {
      return p.analysis && p.analysis.is_screenshot;
    }).length;

    var blurry = allPhotos.filter(function(p) {
      return p.analysis && p.analysis.is_blurry;
    }).length;

    var dupPhotos = photos.filter(function(p) {
      return p.analysis && p.analysis.is_duplicate;
    });
    var dupGroupIds = new Set(dupPhotos.map(function(p) {
      return p.analysis.duplicate_group_id;
    }));

    var highValue = categories.keep.length;

    var releasableBytes = categories.clean.reduce(function(sum, p) {
      return sum + (p.file_size_bytes || 0);
    }, 0);

    var typeStats = {};
    ['portrait', 'landscape', 'food', 'pet', 'urban', 'document', 'screenshot', 'family', 'general'].forEach(function(type) {
      typeStats[type] = allPhotos.filter(function(p) {
        return p.detected_type === type;
      }).length;
    });

    return {
      total: total,
      screenshot: screenshot,
      duplicate: dupPhotos.length,
      duplicateGroups: dupGroupIds.size,
      blurry: blurry,
      highValue: highValue,
      releasableBytes: releasableBytes,
      typeStats: typeStats
    };
  }

  function computeDistribution(photos) {
    var sceneryTags = ['travel', 'mountain', 'sea', 'nature', 'park', 'lake', 'sunset', 'landscape', 'beach'];
    var peopleTags = ['family', 'friends', 'couple', 'gathering', 'party', 'ceremony', 'wedding', 'graduation', 'birthday', 'portrait', 'person'];

    var scenery = 0;
    var people = 0;
    var screenshot = 0;
    var daily = 0;

    photos.forEach(function(p) {
      var tags = p.analysis && p.analysis.scene_tags ? p.analysis.scene_tags : [];
      var detectedType = p.detected_type || '';

      if (detectedType === 'screenshot' || (p.analysis && p.analysis.is_screenshot)) {
        screenshot++;
      } else if (tags.some(function(t) { return peopleTags.indexOf(t) !== -1; }) || detectedType === 'portrait' || detectedType === 'family') {
        people++;
      } else if (tags.some(function(t) { return sceneryTags.indexOf(t) !== -1; }) || detectedType === 'landscape') {
        scenery++;
      } else {
        daily++;
      }
    });

    var total = photos.length || 1;
    return {
      scenery: Math.round(scenery / total * 100),
      people: Math.round(people / total * 100),
      screenshot: Math.round(screenshot / total * 100),
      daily: Math.round(daily / total * 100),
      sceneryCount: scenery,
      peopleCount: people,
      screenshotCount: screenshot,
      dailyCount: daily
    };
  }

  function generateInsights(stats, distribution) {
    var insights = [];
    var total = stats.total || 1;

    var scrPct = stats.screenshot / total * 100;
    if (scrPct > 25) {
      insights.push({
        icon: 'screenshot',
        title: '截图占比偏高',
        desc: '截图占比 ' + scrPct.toFixed(0) + '%，高于用户平均水平。建议优先清理验证码、二维码和视频截图。'
      });
    } else if (scrPct > 15) {
      insights.push({
        icon: 'screenshot',
        title: '截图数量适中',
        desc: '截图占比 ' + scrPct.toFixed(0) + '%，处于正常范围。'
      });
    } else {
      insights.push({
        icon: 'screenshot',
        title: '截图状态良好',
        desc: '截图占比 ' + scrPct.toFixed(0) + '%，处于合理范围。'
      });
    }

    if (stats.duplicateGroups > 30) {
      insights.push({
        icon: 'duplicate',
        title: '存在较多重复照片',
        desc: '发现 ' + stats.duplicateGroups + ' 组重复照片，共 ' + stats.duplicate + ' 张。建议每组保留一张最清晰的。'
      });
    } else if (stats.duplicateGroups > 15) {
      insights.push({
        icon: 'duplicate',
        title: '存在部分重复照片',
        desc: '发现 ' + stats.duplicateGroups + ' 组重复照片，共 ' + stats.duplicate + ' 张。可以清理多余副本。'
      });
    } else {
      insights.push({
        icon: 'duplicate',
        title: '重复照片不多',
        desc: '仅发现 ' + stats.duplicateGroups + ' 组重复照片，相册整理得不错。'
      });
    }

    if (stats.blurry > 50) {
      insights.push({
        icon: 'blurry',
        title: '模糊照片较多',
        desc: '有 ' + stats.blurry + ' 张模糊照片，占用了不必要的空间。'
      });
    } else if (stats.blurry > 25) {
      insights.push({
        icon: 'blurry',
        title: '存在一些模糊照片',
        desc: '有 ' + stats.blurry + ' 张模糊照片，可以考虑清理质量较差的。'
      });
    } else {
      insights.push({
        icon: 'blurry',
        title: '整体画质良好',
        desc: '模糊照片仅 ' + stats.blurry + ' 张，大部分照片清晰度不错。'
      });
    }

    var landscapePct = distribution.scenery / 100;
    var peoplePct = distribution.people / 100;

    if (peoplePct > 0.3 && stats.highValue > total * 0.4) {
      insights.push({
        icon: 'family',
        title: '家庭回忆丰富',
        desc: '您的相册中有大量人物合照和家庭照片，这些都是珍贵的回忆。'
      });
    }

    if (landscapePct > 0.25) {
      insights.push({
        icon: 'travel',
        title: '旅行记忆充足',
        desc: '风景照片占比 ' + distribution.scenery + '%，记录了许多美好的旅行瞬间。'
      });
    }

    var foodCount = stats.typeStats.food || 0;
    if (foodCount > total * 0.15) {
      insights.push({
        icon: 'food',
        title: '美食记录丰富',
        desc: '美食照片占比 ' + (foodCount / total * 100).toFixed(0) + '%，是个美食爱好者呢！'
      });
    }

    var petCount = stats.typeStats.pet || 0;
    if (petCount > total * 0.05) {
      insights.push({
        icon: 'pet',
        title: '宠物照片可爱',
        desc: '宠物照片有 ' + petCount + ' 张，毛孩子的日常很治愈。'
      });
    }

    return insights;
  }

  global.CategoryEngine = {
    classifyPhoto: classifyPhoto,
    batchClassify: batchClassify,
    computeStats: computeStats,
    computeDistribution: computeDistribution,
    generateInsights: generateInsights,
    THRESHOLDS: THRESHOLDS
  };

})(window);
