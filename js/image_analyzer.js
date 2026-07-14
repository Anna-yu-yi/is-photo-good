(function(global) {
  'use strict';

  var ANALYSIS_SIZE = 64;
  var PHASH_SIZE = 8;

  function loadImage(url) {
    return new Promise(function(resolve, reject) {
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function() { resolve(img); };
      img.onerror = function() { reject(new Error('Failed to load: ' + url)); };
      img.src = url;
    });
  }

  function imageToGrayscale(img) {
    var canvas = document.createElement('canvas');
    canvas.width = ANALYSIS_SIZE;
    canvas.height = ANALYSIS_SIZE;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, ANALYSIS_SIZE, ANALYSIS_SIZE);
    var imageData = ctx.getImageData(0, 0, ANALYSIS_SIZE, ANALYSIS_SIZE);
    var data = imageData.data;
    var gray = new Float32Array(ANALYSIS_SIZE * ANALYSIS_SIZE);

    for (var i = 0; i < gray.length; i++) {
      var r = data[i * 4];
      var g = data[i * 4 + 1];
      var b = data[i * 4 + 2];
      gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    }

    return { gray: gray, imageData: imageData, width: ANALYSIS_SIZE, height: ANALYSIS_SIZE };
  }

  function computeLaplacianVariance(gray) {
    var sum = 0;
    var sumSq = 0;
    var count = 0;
    var w = ANALYSIS_SIZE;

    for (var y = 1; y < ANALYSIS_SIZE - 1; y++) {
      for (var x = 1; x < ANALYSIS_SIZE - 1; x++) {
        var i = y * w + x;
        var center = gray[i] * 8;
        var neighbors = gray[i - w - 1] + gray[i - w] + gray[i - w + 1] +
                        gray[i - 1] + gray[i + 1] +
                        gray[i + w - 1] + gray[i + w] + gray[i + w + 1];
        var laplacian = neighbors - center;
        sum += laplacian;
        sumSq += laplacian * laplacian;
        count++;
      }
    }

    var mean = sum / count;
    var variance = (sumSq / count) - (mean * mean);
    return variance;
  }

  function computeBrightness(gray) {
    var sum = 0;
    for (var i = 0; i < gray.length; i++) {
      sum += gray[i];
    }
    return sum / gray.length / 255;
  }

  function computeContrast(gray) {
    var min = 255;
    var max = 0;
    for (var i = 0; i < gray.length; i++) {
      if (gray[i] < min) min = gray[i];
      if (gray[i] > max) max = gray[i];
    }
    return (max - min) / 255;
  }

  function computeSaturation(imageData) {
    var data = imageData.data;
    var sum = 0;
    var count = 0;
    for (var i = 0; i < data.length; i += 4) {
      var r = data[i] / 255;
      var g = data[i + 1] / 255;
      var b = data[i + 2] / 255;
      var max = Math.max(r, g, b);
      var min = Math.min(r, g, b);
      var l = (max + min) / 2;
      var s = 0;
      if (max !== min) {
        s = l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
      }
      sum += s;
      count++;
    }
    return sum / count;
  }

  function computeEdgeDensity(gray) {
    var edges = 0;
    var w = ANALYSIS_SIZE;
    for (var y = 1; y < ANALYSIS_SIZE - 1; y++) {
      for (var x = 1; x < ANALYSIS_SIZE - 1; x++) {
        var i = y * w + x;
        var gx = -gray[i - w - 1] - 2 * gray[i - 1] - gray[i + w - 1] +
                  gray[i - w + 1] + 2 * gray[i + 1] + gray[i + w + 1];
        var gy = -gray[i - w - 1] - 2 * gray[i - w] - gray[i - w + 1] +
                  gray[i + w - 1] + 2 * gray[i + w] + gray[i + w + 1];
        var magnitude = Math.sqrt(gx * gx + gy * gy);
        if (magnitude > 30) edges++;
      }
    }
    return edges / ((ANALYSIS_SIZE - 2) * (ANALYSIS_SIZE - 2));
  }

  function computeColorDistribution(imageData) {
    var data = imageData.data;
    var rSum = 0, gSum = 0, bSum = 0;
    var count = data.length / 4;
    for (var i = 0; i < data.length; i += 4) {
      rSum += data[i];
      gSum += data[i + 1];
      bSum += data[i + 2];
    }
    return {
      r: rSum / count / 255,
      g: gSum / count / 255,
      b: bSum / count / 255
    };
  }

  function dct(input) {
    var N = input.length;
    var output = new Float32Array(N);
    for (var k = 0; k < N; k++) {
      var sum = 0;
      for (var n = 0; n < N; n++) {
        sum += input[n] * Math.cos(Math.PI * k * (2 * n + 1) / (2 * N));
      }
      output[k] = sum;
    }
    return output;
  }

  function computePHash(img) {
    var canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, 32, 32);
    var imageData = ctx.getImageData(0, 0, 32, 32);
    var data = imageData.data;
    var gray = new Float32Array(32 * 32);
    for (var i = 0; i < gray.length; i++) {
      gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    }

    var reduced = new Float32Array(PHASH_SIZE * PHASH_SIZE);
    for (var y = 0; y < PHASH_SIZE; y++) {
      for (var x = 0; x < PHASH_SIZE; x++) {
        var sum = 0;
        for (var dy = 0; dy < 4; dy++) {
          for (var dx = 0; dx < 4; dx++) {
            sum += gray[(y * 4 + dy) * 32 + (x * 4 + dx)];
          }
        }
        reduced[y * PHASH_SIZE + x] = sum / 16;
      }
    }

    var sum = 0;
    for (var i = 0; i < reduced.length; i++) sum += reduced[i];
    var mean = sum / reduced.length;

    var bits = [];
    for (var i = 0; i < reduced.length; i++) {
      bits.push(reduced[i] >= mean ? 1 : 0);
    }

    var hash = '';
    for (var i = 0; i < bits.length; i += 4) {
      var nibble = (bits[i] << 3) | (bits[i + 1] << 2) | (bits[i + 2] << 1) | bits[i + 3];
      hash += nibble.toString(16);
    }
    return hash;
  }

  function hammingDistance(hash1, hash2) {
    if (!hash1 || !hash2 || hash1.length !== hash2.length) return 64;
    var distance = 0;
    for (var i = 0; i < hash1.length; i++) {
      var a = parseInt(hash1[i], 16);
      var b = parseInt(hash2[i], 16);
      var xor = a ^ b;
      while (xor) {
        distance += xor & 1;
        xor >>= 1;
      }
    }
    return distance;
  }

  function analyzeImage(img) {
    var result = imageToGrayscale(img);
    var gray = result.gray;
    var imageData = result.imageData;

    var lapVar = computeLaplacianVariance(gray);
    var brightness = computeBrightness(gray);
    var contrast = computeContrast(gray);
    var saturation = computeSaturation(imageData);
    var edgeDensity = computeEdgeDensity(gray);
    var colors = computeColorDistribution(imageData);
    var hash = computePHash(img);

    var clarityScore = Math.min(1, lapVar / 500);
    var isBlurry = lapVar < 100;

    var aspectRatio = img.naturalWidth / img.naturalHeight;
    var isWide = aspectRatio > 1.5;
    var isPortrait = aspectRatio < 0.75;

    var isScreenshot = false;
    var screenshotType = null;
    if (aspectRatio > 1.7 && aspectRatio < 2.2 && img.naturalWidth < 2000) {
      isScreenshot = true;
      if (edgeDensity > 0.3 && saturation < 0.2) {
        screenshotType = 'document';
      } else if (edgeDensity > 0.4) {
        screenshotType = 'chat';
      } else {
        screenshotType = 'app';
      }
    } else if (img.naturalWidth < 800 && img.naturalHeight < 800) {
      isScreenshot = true;
      screenshotType = 'thumbnail';
    }

    var sceneTags = inferSceneTags(colors, brightness, saturation, edgeDensity, isWide, isPortrait);

    return {
      clarity_score: Math.round(clarityScore * 1000) / 1000,
      is_blurry: isBlurry,
      brightness: Math.round(brightness * 1000) / 1000,
      contrast: Math.round(contrast * 1000) / 1000,
      saturation: Math.round(saturation * 1000) / 1000,
      edge_density: Math.round(edgeDensity * 1000) / 1000,
      aspect_ratio: Math.round(aspectRatio * 100) / 100,
      is_wide: isWide,
      is_portrait: isPortrait,
      is_screenshot: isScreenshot,
      screenshot_type: screenshotType,
      dominant_color: colors,
      scene_tags: sceneTags,
      hash: hash
    };
  }

  function inferSceneTags(colors, brightness, saturation, edgeDensity, isWide, isPortrait) {
    var tags = [];
    var greenDominant = colors.g > colors.r * 1.1 && colors.g > colors.b * 1.1;
    var blueDominant = colors.b > colors.r * 1.15 && colors.b > colors.g * 0.95;
    var warmDominant = colors.r > colors.b * 1.15 && colors.r > colors.g * 0.95;
    var grayish = saturation < 0.15;
    var bright = brightness > 0.6;
    var dark = brightness < 0.35;
    var highContrast = edgeDensity > 0.25;

    if (greenDominant && bright && !grayish) {
      tags.push('nature', 'plant');
    } else if (blueDominant && !grayish) {
      tags.push('water', 'sky');
      if (bright) tags.push('travel');
    } else if (warmDominant && !grayish) {
      if (bright) {
        tags.push('warm', 'sunset');
      } else {
        tags.push('warm', 'indoor');
      }
    } else if (grayish) {
      if (highContrast) {
        tags.push('urban', 'architecture');
      } else {
        tags.push('indoor', 'document');
      }
    }

    if (dark && !tags.length) {
      tags.push('night');
    }

    if (isWide) {
      tags.push('landscape');
    } else if (isPortrait) {
      tags.push('vertical');
    }

    if (highContrast && saturation < 0.1) {
      tags.push('document');
    }

    if (tags.length === 0) {
      tags.push('general');
    }

    return tags;
  }

  function analyzeBatch(photos, onProgress) {
    var urlMap = {};
    var urls = [];
    photos.forEach(function(p) {
      if (p.photo_url && !urlMap[p.photo_url]) {
        urlMap[p.photo_url] = true;
        urls.push(p.photo_url);
      }
    });

    var cache = {};
    var processed = 0;

    var promises = urls.map(function(url) {
      return loadImage(url).then(function(img) {
        cache[url] = analyzeImage(img);
        processed++;
        if (onProgress) onProgress(processed, urls.length);
      }).catch(function(err) {
        cache[url] = {
          clarity_score: 0.5,
          is_blurry: false,
          brightness: 0.5,
          contrast: 0.5,
          saturation: 0.3,
          edge_density: 0.2,
          aspect_ratio: 1,
          is_screenshot: false,
          scene_tags: ['general'],
          hash: ''
        };
        processed++;
        if (onProgress) onProgress(processed, urls.length);
      });
    });

    return Promise.all(promises).then(function() {
      return cache;
    });
  }

  function findDuplicates(photos) {
    var urlMap = {};
    var groups = {};

    photos.forEach(function(p) {
      if (p.analysis && p.analysis.hash) {
        if (!urlMap[p.photo_url]) {
          urlMap[p.photo_url] = p.analysis.hash;
        }
      }
    });

    var hashes = Object.keys(urlMap);
    var dupMap = {};
    var groupId = 0;

    for (var i = 0; i < hashes.length; i++) {
      if (dupMap[hashes[i]]) continue;
      var current = urlMap[hashes[i]];
      var group = [hashes[i]];

      for (var j = i + 1; j < hashes.length; j++) {
        if (dupMap[hashes[j]]) continue;
        var distance = hammingDistance(current, urlMap[hashes[j]]);
        if (distance <= 8) {
          group.push(hashes[j]);
          dupMap[hashes[j]] = true;
        }
      }

      if (group.length > 1) {
        groupId++;
        group.forEach(function(url) {
          dupMap[url] = 'dup_real_' + groupId;
        });
      }
    }

    return dupMap;
  }

  global.ImageAnalyzer = {
    analyzeImage: analyzeImage,
    analyzeBatch: analyzeBatch,
    findDuplicates: findDuplicates,
    loadImage: loadImage,
    hammingDistance: hammingDistance
  };

})(window);
