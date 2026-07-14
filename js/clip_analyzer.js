(function(global) {
  'use strict';

  var CLIP_LABELS = [
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
  ];

  var CLIP_TO_SCENE = {
    0: 'food',
    1: 'portrait',
    2: 'family',
    3: 'landscape',
    4: 'pet',
    5: 'screenshot',
    6: 'screenshot',
    7: 'urban',
    8: 'screenshot',
    9: 'screenshot',
    10: 'general',
    11: 'urban',
    12: 'landscape',
    13: 'screenshot',
  };

  var CLIP_TO_SUBTYPE = {
    5: 'app',
    6: 'qr_code',
    8: 'receipt',
    9: 'document',
    13: 'live_stream',
  };

  var model = null;
  var modelLoading = false;
  var loadPromise = null;
  var loadProgress = 0;
  var progressCallbacks = [];
  var transformersModule = null;

  function onProgress(callback) {
    progressCallbacks.push(callback);
    if (loadProgress > 0) {
      callback(loadProgress);
    }
  }

  function notifyProgress(progress) {
    loadProgress = progress;
    progressCallbacks.forEach(function(cb) {
      try { cb(progress); } catch(e) {}
    });
  }

  function loadTransformers() {
    if (transformersModule) {
      return Promise.resolve(transformersModule);
    }
    return import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1/dist/transformers.min.js').then(function(mod) {
      transformersModule = mod;
      return mod;
    });
  }

  function loadModel() {
    if (model) {
      return Promise.resolve(model);
    }
    if (loadPromise) {
      return loadPromise;
    }

    modelLoading = true;
    loadPromise = loadTransformers().then(function(trans) {
      return trans.pipeline('zero-shot-image-classification', 'Xenova/clip-vit-base-patch32', {
        progress_callback: function(data) {
          if (data.status === 'downloading' && data.progress) {
            notifyProgress(data.progress);
          }
        }
      });
    }).then(function(classifier) {
      model = classifier;
      modelLoading = false;
      notifyProgress(1);
      return model;
    }).catch(function(err) {
      modelLoading = false;
      loadPromise = null;
      throw err;
    });

    return loadPromise;
  }

  function isModelReady() {
    return model !== null;
  }

  function isModelLoading() {
    return modelLoading;
  }

  function getLoadProgress() {
    return loadProgress;
  }

  async function classifyImage(imageInput) {
    if (!model) {
      await loadModel();
    }

    var input = imageInput;
    if (imageInput && typeof imageInput === 'object' && imageInput.src) {
      input = imageInput.src;
    }

    var result = await model(input, CLIP_LABELS);
    var probs = new Array(CLIP_LABELS.length).fill(0);

    if (Array.isArray(result)) {
      result.forEach(function(item) {
        var idx = CLIP_LABELS.indexOf(item.label);
        if (idx >= 0) {
          probs[idx] = item.score;
        }
      });
    }

    var topIdx = 0;
    var topProb = 0;
    for (var i = 0; i < probs.length; i++) {
      if (probs[i] > topProb) {
        topProb = probs[i];
        topIdx = i;
      }
    }

    return {
      topIdx: topIdx,
      topProb: topProb,
      probs: probs,
      sceneType: CLIP_TO_SCENE[topIdx] || 'general',
      confidence: topProb,
      clipSubtype: CLIP_TO_SUBTYPE[topIdx] || null
    };
  }

  function analyzeFeaturesFromImage(img) {
    var canvas = document.createElement('canvas');
    var maxSize = 300;
    var w = img.naturalWidth || img.width;
    var h = img.naturalHeight || img.height;
    var scale = Math.min(maxSize / w, maxSize / h, 1);
    canvas.width = Math.floor(w * scale);
    canvas.height = Math.floor(h * scale);
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var data = imageData.data;
    var width = canvas.width;
    var height = canvas.height;
    var totalPixels = width * height;

    var rSum = 0, gSum = 0, bSum = 0;
    var rArr = new Uint8ClampedArray(totalPixels);
    var gArr = new Uint8ClampedArray(totalPixels);
    var bArr = new Uint8ClampedArray(totalPixels);
    var grayArr = new Float64Array(totalPixels);

    for (var i = 0; i < totalPixels; i++) {
      var idx = i * 4;
      var r = data[idx];
      var g = data[idx + 1];
      var b = data[idx + 2];
      rArr[i] = r;
      gArr[i] = g;
      bArr[i] = b;
      var gray = 0.299 * r + 0.587 * g + 0.114 * b;
      grayArr[i] = gray;
      rSum += r;
      gSum += g;
      bSum += b;
    }

    var brightness = (rSum + gSum + bSum) / (3 * totalPixels * 255);

    var mean = (rSum + gSum + bSum) / (3 * totalPixels);
    var variance = 0;
    for (var j = 0; j < totalPixels; j++) {
      var gv = grayArr[j];
      variance += (gv - mean) * (gv - mean);
    }
    variance /= totalPixels;
    var contrast = Math.min(1, Math.sqrt(variance) / 128);

    var satSum = 0;
    for (var k = 0; k < totalPixels; k++) {
      var rk = rArr[k];
      var gk = gArr[k];
      var bk = bArr[k];
      var maxv = Math.max(rk, gk, bk);
      var minv = Math.min(rk, gk, bk);
      var sat = maxv > 0 ? (maxv - minv) / maxv : 0;
      satSum += sat;
    }
    var saturation = satSum / totalPixels;

    var edgeCount = 0;
    var edgeHCount = 0;
    var edgeVCount = 0;
    var edgeMagArr = [];
    for (var y = 0; y < height; y++) {
      for (var x = 0; x < width; x++) {
        var pi = y * width + x;
        var gx = 0, gy = 0;
        if (x < width - 1) {
          gx = Math.abs(grayArr[pi] - grayArr[pi + 1]);
          if (gx > 20) edgeHCount++;
        }
        if (y < height - 1) {
          gy = Math.abs(grayArr[pi] - grayArr[pi + width]);
          if (gy > 20) edgeVCount++;
        }
        var mag = Math.sqrt(gx * gx + gy * gy);
        edgeMagArr.push(mag);
        if (mag > 25) edgeCount++;
      }
    }
    var edgeDensity = edgeCount / totalPixels;
    var edgeDensityH = edgeHCount / totalPixels;
    var edgeDensityV = edgeVCount / totalPixels;

    var lapSum = 0;
    var lapMean = 0;
    var lapCount = 0;
    for (var ly = 1; ly < height - 1; ly++) {
      for (var lx = 1; lx < width - 1; lx++) {
        var lpi = ly * width + lx;
        var lap = Math.abs(
          grayArr[lpi] * 4 -
          grayArr[lpi - width] -
          grayArr[lpi + width] -
          grayArr[lpi - 1] -
          grayArr[lpi + 1]
        );
        lapSum += lap;
        lapCount++;
      }
    }
    if (lapCount > 0) {
      lapMean = lapSum / lapCount;
    }
    var lapVar = 0;
    if (lapCount > 0) {
      for (var ly2 = 1; ly2 < height - 1; ly2++) {
        for (var lx2 = 1; lx2 < width - 1; lx2++) {
          var lpi2 = ly2 * width + lx2;
          var lap2 = Math.abs(
            grayArr[lpi2] * 4 -
            grayArr[lpi2 - width] -
            grayArr[lpi2 + width] -
            grayArr[lpi2 - 1] -
            grayArr[lpi2 + 1]
          );
          lapVar += (lap2 - lapMean) * (lap2 - lapMean);
        }
      }
      lapVar /= lapCount;
    }
    var clarity = Math.min(1, lapVar / 6000);

    var skinCount = 0;
    var warmCount = 0;
    var greenCount = 0;
    var blueCount = 0;
    var redCount = 0;
    var yellowCount = 0;
    var highContrastCount = 0;

    for (var ci = 0; ci < totalPixels; ci++) {
      var rc = rArr[ci];
      var gc = gArr[ci];
      var bc = bArr[ci];
      var grc = grayArr[ci];

      var skin1 = (rc > 95) && (gc > 40) && (bc > 20) && (rc > gc) && (rc > bc);
      var skin2 = ((rc - gc) > 15) && ((gc - bc) > 10);
      var skin3 = (rc > 160) && (gc > 110) && (bc > 90) && (rc >= bc - 10) && (rc > gc - 20);
      if ((skin1 && skin2) || skin3) skinCount++;

      if ((rc > gc) && (gc > bc) && (rc > 120) && ((rc - bc) > 30)) warmCount++;
      if ((gc > rc) && (gc > bc) && (gc > 80) && ((gc - rc) > 10) && ((gc - bc) > 10)) greenCount++;
      if ((bc > rc) && (bc > gc) && (bc > 100) && ((bc - rc) > 15) && ((bc - gc) > 5)) blueCount++;
      if ((rc > gc) && (rc > bc) && (rc > 120) && ((rc - gc) > 20)) redCount++;
      if ((rc > 150) && (gc > 150) && (bc < 100) && (Math.abs(rc - gc) < 50)) yellowCount++;
      if (grc > 200 || grc < 50) highContrastCount++;
    }

    var skinRatio = skinCount / totalPixels;
    var warmRatio = warmCount / totalPixels;
    var greenRatio = greenCount / totalPixels;
    var blueRatio = blueCount / totalPixels;
    var redRatio = redCount / totalPixels;
    var yellowRatio = yellowCount / totalPixels;
    var highContrastRatio = highContrastCount / totalPixels;

    var edgeMagMean = 0;
    for (var ei = 0; ei < edgeMagArr.length; ei++) {
      edgeMagMean += edgeMagArr[ei];
    }
    if (edgeMagArr.length > 0) edgeMagMean /= edgeMagArr.length;

    var edgeMagVar = 0;
    for (var ej = 0; ej < edgeMagArr.length; ej++) {
      edgeMagVar += (edgeMagArr[ej] - edgeMagMean) * (edgeMagArr[ej] - edgeMagMean);
    }
    if (edgeMagArr.length > 0) edgeMagVar /= edgeMagArr.length;
    var textureComplexity = Math.min(1, Math.sqrt(edgeMagVar) / 50);

    var qrScore = 0;
    if (edgeDensity > 0.35) qrScore += 25;
    if (highContrastRatio > 0.25) qrScore += 25;
    if (clarity > 0.8) qrScore += 15;
    if (textureComplexity > 0.5) qrScore += 15;

    var naturalColorRatio = greenRatio + blueRatio + warmRatio;
    var hasNaturalColors = naturalColorRatio > 0.2 && saturation > 0.15;
    if (hasNaturalColors) {
      qrScore = Math.max(0, qrScore - 40);
    }
    if (greenRatio > 0.1 && textureComplexity > 0.15 && textureComplexity < 0.6) {
      qrScore = Math.max(0, qrScore - 20);
    }

    var isQrCode = qrScore >= 70;

    var origW = img.naturalWidth || img.width;
    var origH = img.naturalHeight || img.height;
    var aspectRatio = origW / origH;

    var dhash = generateDHashFromCanvas(canvas, 8);

    return {
      clarity_score: Math.round(clarity * 1000) / 1000,
      is_blurry: clarity < 0.04,
      brightness: Math.round(brightness * 1000) / 1000,
      contrast: Math.round(contrast * 1000) / 1000,
      saturation: Math.round(saturation * 1000) / 1000,
      edge_density: Math.round(edgeDensity * 1000) / 1000,
      edge_density_h: Math.round(edgeDensityH * 1000) / 1000,
      edge_density_v: Math.round(edgeDensityV * 1000) / 1000,
      skin_ratio: Math.round(skinRatio * 1000) / 1000,
      warm_ratio: Math.round(warmRatio * 1000) / 1000,
      green_ratio: Math.round(greenRatio * 1000) / 1000,
      blue_ratio: Math.round(blueRatio * 1000) / 1000,
      red_ratio: Math.round(redRatio * 1000) / 1000,
      yellow_ratio: Math.round(yellowRatio * 1000) / 1000,
      high_contrast_ratio: Math.round(highContrastRatio * 1000) / 1000,
      texture_complexity: Math.round(textureComplexity * 1000) / 1000,
      qr_score: Math.round((qrScore / 100) * 1000) / 1000,
      is_qr_code: isQrCode,
      aspect_ratio: Math.round(aspectRatio * 100) / 100,
      is_wide: aspectRatio > 1.5,
      is_portrait: aspectRatio < 0.75,
      hash: dhash,
    };
  }

  function generateDHashFromCanvas(canvas, hashSize) {
    hashSize = hashSize || 8;
    var ctx = canvas.getContext('2d');
    var smallCanvas = document.createElement('canvas');
    smallCanvas.width = hashSize + 1;
    smallCanvas.height = hashSize;
    var smallCtx = smallCanvas.getContext('2d');
    smallCtx.drawImage(canvas, 0, 0, hashSize + 1, hashSize);
    var imgData = smallCtx.getImageData(0, 0, hashSize + 1, hashSize);
    var data = imgData.data;
    var pixels = [];
    for (var i = 0; i < (hashSize + 1) * hashSize; i++) {
      var idx = i * 4;
      pixels.push(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
    }
    var hash = '';
    for (var row = 0; row < hashSize; row++) {
      for (var col = 0; col < hashSize; col++) {
        var curIdx = row * (hashSize + 1) + col;
        hash += pixels[curIdx] > pixels[curIdx + 1] ? '1' : '0';
      }
    }
    return hash;
  }

  function detectScreenshotType(features) {
    var s = features;
    var highFreq = s.edge_density || 0;
    var brightness = s.brightness || 0.5;
    var saturation = s.saturation || 0.5;
    var edgeH = s.edge_density_h || 0;
    var edgeV = s.edge_density_v || 0;
    var qrScore = s.qr_score || 0;
    var isQrCode = s.is_qr_code || false;
    var warmRatio = s.warm_ratio || 0;

    if (isQrCode || qrScore > 0.6) {
      return { type: 'qr_code', isTemp: true, isImportant: false };
    }

    var liveStreamScore = 0;
    if (s.skin_ratio > 0.05) liveStreamScore += 20;
    if (highFreq > 0.15 && highFreq < 0.45) liveStreamScore += 25;
    if (edgeH > 0.1) liveStreamScore += 20;
    if (brightness > 0.3 && brightness < 0.8) liveStreamScore += 15;
    if (saturation > 0.15 && saturation < 0.6) liveStreamScore += 10;
    if (edgeV > 0.08) liveStreamScore += 10;

    if (liveStreamScore >= 65) {
      return { type: 'live_stream', isTemp: true, isImportant: false };
    }

    var weatherScore = 0;
    if (saturation < 0.15) weatherScore += 35;
    else if (saturation < 0.25) weatherScore += 25;
    else if (saturation < 0.35) weatherScore += 10;
    if (s.blue_ratio > 0.12) weatherScore += 30;
    else if (s.blue_ratio > 0.06) weatherScore += 15;
    if (brightness > 0.35 && brightness < 0.75) weatherScore += 10;
    if (highFreq > 0.08 && highFreq < 0.35) weatherScore += 10;
    if (warmRatio > 0.35) weatherScore -= 20;
    else if (warmRatio > 0.2) weatherScore -= 10;
    if (saturation > 0.4) weatherScore -= 30;

    if (weatherScore >= 60) {
      return { type: 'weather', isTemp: true, isImportant: false };
    }

    if (highFreq > 0.35 && saturation < 0.15) {
      return { type: 'document', isTemp: false, isImportant: true };
    } else if (highFreq > 0.3 && brightness > 0.7) {
      if (edgeH > 0.3 || edgeV > 0.3) {
        return { type: 'chat', isTemp: true, isImportant: false };
      } else {
        return { type: 'app', isTemp: true, isImportant: false };
      }
    } else if (brightness > 0.75 && saturation < 0.1) {
      return { type: 'qr_code', isTemp: true, isImportant: false };
    } else if (brightness > 0.6 && saturation < 0.2) {
      return { type: 'verify_code', isTemp: true, isImportant: false };
    } else if (highFreq > 0.25 && brightness > 0.55) {
      return { type: 'ppt', isTemp: false, isImportant: true };
    } else {
      return { type: 'app', isTemp: true, isImportant: false };
    }
  }

  function generateSceneTags(sceneType, features) {
    var tags = [];
    var s = features;

    if (sceneType === 'portrait') {
      tags = ['portrait', 'person'];
      if (s.skin_ratio > 0.25) tags.push('closeup');
    } else if (sceneType === 'family') {
      tags = ['family', 'people', 'gathering'];
    } else if (sceneType === 'landscape') {
      tags = ['nature', 'travel', 'landscape'];
      if (s.green_ratio > 0.15) tags.push('mountain');
      if (s.blue_ratio > 0.15) tags.push('sea', 'sky');
    } else if (sceneType === 'food') {
      tags = ['food', 'dining'];
    } else if (sceneType === 'urban') {
      tags = ['urban', 'architecture', 'city'];
    } else if (sceneType === 'pet') {
      tags = ['animal', 'pet'];
    } else if (sceneType === 'screenshot') {
      tags = ['document', 'screen'];
    } else {
      tags = ['general'];
    }

    return tags;
  }

  async function analyzePhoto(imgElement, photoUrl) {
    var features = analyzeFeaturesFromImage(imgElement);

    var clipResult = null;
    try {
      clipResult = await classifyImage(photoUrl);
    } catch (e) {
      console.warn('CLIP classification failed:', e);
    }

    var clipIdx = -1;
    var clipProbs = null;
    var sceneType = 'general';
    var confidence = 0.3;
    var clipSubtype = null;

    if (clipResult) {
      clipIdx = clipResult.topIdx;
      clipProbs = clipResult.probs;
      sceneType = clipResult.sceneType;
      confidence = clipResult.confidence;
      clipSubtype = clipResult.clipSubtype;
    }

    var clipLandscapeProb = 0;
    var clipUrbanProb = 0;
    var clipFlowerProb = 0;
    if (clipProbs && clipProbs.length > 12) {
      clipLandscapeProb = clipProbs[3];
      clipUrbanProb = clipProbs[7];
      clipFlowerProb = clipProbs[12];
    }

    var hasNaturalFeatures = (
      features.green_ratio + features.blue_ratio > 0.15 &&
      features.edge_density < 0.3 &&
      features.texture_complexity > 0.05 &&
      !features.is_qr_code
    );

    var strongLandscapeSignal = (
      clipLandscapeProb > 0.1 ||
      clipFlowerProb > 0.08 ||
      clipUrbanProb > 0.1
    );

    var landscapeProtection = strongLandscapeSignal && hasNaturalFeatures;

    var weatherCheck = detectScreenshotType(features);
    var isWeatherScreenshot = weatherCheck.type === 'weather';

    var isScreenshot = false;

    if (clipProbs && clipProbs.length > 13 && clipProbs[13] > 0.2) {
      isScreenshot = true;
      sceneType = 'screenshot';
      clipSubtype = 'live_stream';
    } else if (clipProbs && clipProbs[5] > 0.7 && !landscapeProtection) {
      isScreenshot = true;
      sceneType = 'screenshot';
    } else if (clipIdx === 6) {
      isScreenshot = true;
      sceneType = 'screenshot';
    } else if (features.qr_score > 0.6 && features.is_qr_code) {
      isScreenshot = true;
      sceneType = 'screenshot';
    } else if (isWeatherScreenshot) {
      isScreenshot = true;
      sceneType = 'screenshot';
      clipSubtype = 'weather';
    } else if (landscapeProtection && !(features.qr_score > 0.5)) {
      isScreenshot = false;
      if (clipLandscapeProb > clipUrbanProb) {
        sceneType = 'landscape';
      } else {
        sceneType = 'urban';
      }
      confidence = Math.max(clipLandscapeProb, clipUrbanProb);
    } else {
      isScreenshot = false;
      if (sceneType === 'screenshot') {
        sceneType = 'general';
        confidence = Math.max(confidence, 0.3);
      }
    }

    if (sceneType === 'landscape' || strongLandscapeSignal) {
      features.is_blurry = features.clarity_score < 0.02;
    } else if (clipIdx === 10) {
      features.is_blurry = true;
    }

    var sceneTags = generateSceneTags(sceneType, features);

    var screenshotType = null;
    var isTempInfo = false;
    var isImportantInfo = false;
    var textDensity = 0.05;

    if (isScreenshot) {
      var tradInfo = detectScreenshotType(features);
      if (tradInfo.type === 'weather') {
        screenshotType = 'weather';
        isTempInfo = true;
      } else if (clipSubtype) {
        screenshotType = clipSubtype;
        isTempInfo = ['qr_code', 'receipt', 'weather'].indexOf(clipSubtype) >= 0;
        isImportantInfo = clipSubtype === 'document';
      } else {
        screenshotType = tradInfo.type;
        isTempInfo = tradInfo.isTemp;
        isImportantInfo = tradInfo.isImportant;
      }
      textDensity = Math.round((features.edge_density * 0.6 + 0.05) * 1000) / 1000;
    }

    var isQrCodeFinal = (clipIdx === 6) || features.is_qr_code;

    var personCount = 0;
    if (sceneType === 'portrait' || sceneType === 'family') {
      personCount = features.skin_ratio > 0.25 ? 1 : 2;
    }

    var isEvent = sceneType === 'family' || sceneType === 'portrait';

    return {
      clarity_score: features.clarity_score,
      is_blurry: features.is_blurry,
      brightness: features.brightness,
      contrast: features.contrast,
      saturation: features.saturation,
      edge_density: features.edge_density,
      is_screenshot: isScreenshot,
      qr_score: isQrCodeFinal ? 1.0 : features.qr_score,
      is_qr_code: isQrCodeFinal,
      scene_tags: sceneTags,
      person_count: personCount,
      is_event: isEvent,
      screenshot_type: screenshotType,
      is_temp_info: isTempInfo,
      is_important_info: isImportantInfo,
      text_density: textDensity,
      hash: features.hash,
      aspect_ratio: features.aspect_ratio,
      is_wide: features.is_wide,
      is_portrait: features.is_portrait,
      detected_type: sceneType,
      type_confidence: Math.round(confidence * 1000) / 1000,
      type_raw_score: Math.round(confidence * 100),
      skin_ratio: features.skin_ratio,
      warm_ratio: features.warm_ratio,
      green_ratio: features.green_ratio,
      blue_ratio: features.blue_ratio,
      red_ratio: features.red_ratio,
      yellow_ratio: features.yellow_ratio,
      clip_label: clipIdx >= 0 ? CLIP_LABELS[clipIdx] : 'unknown',
      is_duplicate: false,
      duplicate_group_id: null,
      duplicate_count: 0,
    };
  }

  function loadImage(url) {
    return new Promise(function(resolve, reject) {
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function() { resolve(img); };
      img.onerror = function() { reject(new Error('Image load failed')); };
      img.src = url;
    });
  }

  async function analyzeBatch(photos, progressCallback) {
    var results = {};
    var total = photos.length;

    for (var i = 0; i < total; i++) {
      var photo = photos[i];
      try {
        var img = await loadImage(photo.photo_url);
        var analysis = await analyzePhoto(img, photo.photo_url);
        results[photo.photo_url] = analysis;
      } catch (e) {
        console.error('Error analyzing photo', photo.photo_id, e);
        results[photo.photo_url] = {
          is_screenshot: false,
          screenshot_type: null,
          is_duplicate: false,
          duplicate_group_id: null,
          clarity_score: 0.5,
          brightness: 0.5,
          contrast: 0.5,
          saturation: 0.3,
          edge_density: 0.2,
          aspect_ratio: 1,
          person_count: 0,
          scene_tags: ['general'],
          text_density: 0.05,
          is_temp_info: false,
          is_important_info: false,
          is_blurry: false,
          hash: '',
          detected_type: 'general',
          type_confidence: 0.3,
          type_raw_score: 30,
          skin_ratio: 0,
          warm_ratio: 0,
          green_ratio: 0,
          blue_ratio: 0,
          red_ratio: 0,
          yellow_ratio: 0,
          clip_label: 'unknown',
          duplicate_count: 0,
        };
      }

      if (progressCallback) {
        try { progressCallback(i + 1, total); } catch(e) {}
      }
    }

    return results;
  }

  global.ClipAnalyzer = {
    loadModel: loadModel,
    isModelReady: isModelReady,
    isModelLoading: isModelLoading,
    getLoadProgress: getLoadProgress,
    onProgress: onProgress,
    classifyImage: classifyImage,
    analyzePhoto: analyzePhoto,
    analyzeBatch: analyzeBatch,
    loadImage: loadImage,
    analyzeFeaturesFromImage: analyzeFeaturesFromImage,
  };

})(window);
