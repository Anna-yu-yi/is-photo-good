(function(global) {
  'use strict';

  var uploadedFiles = [];
  var isProcessing = false;

  function render() {
    return '<div class="page">' +
      '<div class="nav-bar">' +
        '<button class="nav-btn" id="upload-back-btn">‹</button>' +
        '<div class="nav-title">上传照片</div>' +
        '<div class="nav-btn" style="visibility:hidden;">›</div>' +
      '</div>' +

      '<div class="page-content" style="padding-top:24px;">' +

        '<div class="upload-hero">' +
          '<div class="upload-icon-wrap">' +
            '<svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
              '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>' +
              '<polyline points="17 8 12 3 7 8"/>' +
              '<line x1="12" y1="3" x2="12" y2="15"/>' +
            '</svg>' +
          '</div>' +
          '<div class="upload-title">上传你的照片</div>' +
          '<div class="upload-desc">支持 JPG、PNG 格式，最多上传 200 张</div>' +
        '</div>' +

        '<div class="upload-area" id="upload-area">' +
          '<input type="file" id="file-input" accept="image/*" multiple style="display:none;" />' +
          '<div class="upload-area-inner">' +
            '<svg class="upload-area-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
              '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>' +
              '<circle cx="8.5" cy="8.5" r="1.5"/>' +
              '<polyline points="21 15 16 10 5 21"/>' +
            '</svg>' +
            '<div class="upload-area-title">点击选择照片</div>' +
            '<div class="upload-area-desc">或拖拽照片到此处</div>' +
          '</div>' +
        '</div>' +

        '<div class="upload-preview-section" id="preview-section" style="display:none;">' +
          '<div class="upload-preview-header">' +
            '<span class="upload-preview-title">已选择 <span id="selected-count">0</span> 张</span>' +
            '<button class="upload-clear-btn" id="clear-btn">清空</button>' +
          '</div>' +
          '<div class="upload-preview-grid" id="preview-grid"></div>' +
        '</div>' +

      '</div>' +

      '<div class="bottom-actions">' +
        '<button class="btn-primary" id="start-analyze-btn" disabled>开始智能分析</button>' +
      '</div>' +
    '</div>';
  }

  function onMount() {
    uploadedFiles = [];
    isProcessing = false;

    var backBtn = Utils.$('#upload-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', function() {
        Router.goBack();
      });
    }

    var uploadArea = Utils.$('#upload-area');
    var fileInput = Utils.$('#file-input');

    if (uploadArea && fileInput) {
      uploadArea.addEventListener('click', function() {
        fileInput.click();
      });

      fileInput.addEventListener('change', function(e) {
        handleFiles(e.target.files);
      });

      uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.classList.add('dragover');
      });

      uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
      });

      uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        if (e.dataTransfer && e.dataTransfer.files) {
          handleFiles(e.dataTransfer.files);
        }
      });
    }

    var clearBtn = Utils.$('#clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', function() {
        uploadedFiles = [];
        updatePreview();
      });
    }

    var startBtn = Utils.$('#start-analyze-btn');
    if (startBtn) {
      startBtn.addEventListener('click', function() {
        if (isProcessing || uploadedFiles.length === 0) return;
        startAnalysis();
      });
    }
  }

  function handleFiles(files) {
    var imageFiles = Array.from(files).filter(function(f) {
      return f.type && f.type.startsWith('image/');
    });

    if (imageFiles.length === 0) {
      Utils.showToast('请选择图片文件');
      return;
    }

    if (uploadedFiles.length + imageFiles.length > 200) {
      Utils.showToast('最多上传 200 张照片');
      imageFiles = imageFiles.slice(0, 200 - uploadedFiles.length);
    }

    uploadedFiles = uploadedFiles.concat(imageFiles);
    updatePreview();
  }

  function updatePreview() {
    var previewSection = Utils.$('#preview-section');
    var previewGrid = Utils.$('#preview-grid');
    var selectedCount = Utils.$('#selected-count');
    var startBtn = Utils.$('#start-analyze-btn');
    var uploadArea = Utils.$('#upload-area');

    if (uploadedFiles.length > 0) {
      if (previewSection) previewSection.style.display = 'block';
      if (uploadArea) uploadArea.style.display = 'none';
      if (selectedCount) selectedCount.textContent = uploadedFiles.length;
      if (startBtn) startBtn.disabled = false;

      if (previewGrid) {
        previewGrid.innerHTML = '';
        var displayFiles = uploadedFiles.slice(0, 12);
        displayFiles.forEach(function(file, i) {
          var reader = new FileReader();
          reader.onload = function(e) {
            var item = document.createElement('div');
            item.className = 'upload-preview-item';
            item.innerHTML = '<img src="' + e.target.result + '" alt="" />';
            previewGrid.appendChild(item);
          };
          reader.readAsDataURL(file);
        });

        if (uploadedFiles.length > 12) {
          var moreItem = document.createElement('div');
          moreItem.className = 'upload-preview-item upload-preview-more';
          moreItem.innerHTML = '<span>+' + (uploadedFiles.length - 12) + '</span>';
          previewGrid.appendChild(moreItem);
        }
      }
    } else {
      if (previewSection) previewSection.style.display = 'none';
      if (uploadArea) uploadArea.style.display = 'block';
      if (startBtn) startBtn.disabled = true;
    }
  }

  function startAnalysis() {
    isProcessing = true;
    var startBtn = Utils.$('#start-analyze-btn');
    if (startBtn) {
      startBtn.disabled = true;
      startBtn.textContent = '处理中...';
    }

    var photos = [];
    var processed = 0;
    var total = uploadedFiles.length;

    uploadedFiles.forEach(function(file, index) {
      var reader = new FileReader();
      reader.onload = function(e) {
        var dataUrl = e.target.result;
        var img = new Image();
        img.onload = function() {
          var photo = generatePhotoData(file, img, dataUrl, index);
          photos.push(photo);
          processed++;

          if (processed >= total) {
            photos.sort(function(a, b) { return a.idx - b.idx; });
            runImageAnalysis(photos);
          }
        };
        img.onerror = function() {
          processed++;
          if (processed >= total) {
            photos.sort(function(a, b) { return a.idx - b.idx; });
            runImageAnalysis(photos);
          }
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  }

  function runImageAnalysis(photos) {
    var startBtn = Utils.$('#start-analyze-btn');
    if (startBtn) startBtn.textContent = '正在分析像素...';

    ImageAnalyzer.analyzeBatch(photos, function(processed, total) {
      var btn = Utils.$('#start-analyze-btn');
      if (btn) btn.textContent = '分析中 (' + processed + '/' + total + ')';
    }).then(function(cache) {
      var enriched = photos.map(function(p) {
        var a = cache[p.photo_url] || {};
        return Object.assign({}, p, {
          analysis: {
            is_screenshot: a.is_screenshot || false,
            screenshot_type: a.screenshot_type || null,
            is_duplicate: false,
            duplicate_group_id: null,
            clarity_score: a.clarity_score || 0.5,
            brightness: a.brightness || 0.5,
            contrast: a.contrast || 0.5,
            saturation: a.saturation || 0.3,
            edge_density: a.edge_density || 0.2,
            aspect_ratio: a.aspect_ratio || 1,
            person_count: 0,
            scene_tags: a.scene_tags || ['general'],
            text_density: a.is_screenshot ? Math.min(0.9, a.edge_density || 0.3) : 0.05,
            is_temp_info: a.is_screenshot && a.screenshot_type !== 'memo' && a.screenshot_type !== 'code',
            is_important_info: a.is_screenshot && (a.screenshot_type === 'memo' || a.screenshot_type === 'code'),
            is_blurry: a.is_blurry || false,
            hash: a.hash || ''
          }
        });
      });

      var dupMap = ImageAnalyzer.findDuplicates(enriched);
      enriched.forEach(function(p) {
        if (dupMap[p.photo_url]) {
          p.analysis.is_duplicate = true;
          p.analysis.duplicate_group_id = dupMap[p.photo_url];
        }
      });

      Store.setPhotos(enriched);
      Store.setUseDemoData(false);
      setTimeout(function() {
        Router.navigate('/preferences');
      }, 300);
    });
  }

  function generatePhotoData(file, img, dataUrl, index) {
    return {
      photo_id: 'upload_' + index,
      file_name: file.name,
      file_size_bytes: file.size,
      created_at: new Date(file.lastModified).toISOString().split('T')[0],
      width: img.naturalWidth,
      height: img.naturalHeight,
      photo_url: dataUrl,
      idx: index
    };
  }

  function inferSceneTags(filename) {
    var name = filename.toLowerCase();
    var tags = [];
    if (name.includes('screenshot') || name.includes('screen') || name.includes('截图')) tags.push('screenshot');
    if (name.includes('food') || name.includes('eat') || name.includes('餐') || name.includes('吃')) tags.push('food', 'dining');
    if (name.includes('travel') || name.includes('trip') || name.includes('旅行') || name.includes('旅游')) tags.push('travel');
    if (name.includes('mountain') || name.includes('山')) tags.push('mountain', 'nature');
    if (name.includes('sea') || name.includes('beach') || name.includes('海')) tags.push('sea', 'travel');
    if (name.includes('sunset') || name.includes('日落')) tags.push('sunset');
    if (name.includes('family') || name.includes('家庭')) tags.push('family', 'gathering');
    if (name.includes('friend') || name.includes('朋友')) tags.push('friends', 'party');
    if (name.includes('pet') || name.includes('cat') || name.includes('dog')) tags.push('pet');
    if (name.includes('portrait') || name.includes('人像') || name.includes('selfie')) tags.push('portrait', 'single');
    if (name.includes('nature') || name.includes('park') || name.includes('自然')) tags.push('park', 'nature');
    if (name.includes('city') || name.includes('城市') || name.includes('street')) tags.push('city', 'architecture');
    if (name.includes('wedding') || name.includes('婚礼')) tags.push('wedding', 'ceremony');
    if (name.includes('birthday') || name.includes('生日')) tags.push('birthday', 'party');
    if (tags.length === 0) tags.push('general');
    return tags;
  }

  global.PageUpload = {
    render: render,
    onMount: onMount
  };

})(window);
