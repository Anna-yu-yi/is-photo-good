(function(global) {
  'use strict';

  var uploadedFiles = [];
  var isProcessing = false;
  var MAX_UPLOAD = 100;

  function render() {
    return '<div class="page page-scrollable">' +

      // ===== 欢迎引导页 =====
      '<div id="welcome-main" style="position:absolute;top:0;left:0;right:0;bottom:0;display:flex;flex-direction:column;">' +
        '<div class="nav-bar">' +
          '<div class="nav-btn" style="visibility:hidden;">‹</div>' +
          '<div class="nav-title">MemAI</div>' +
          '<div class="nav-btn" style="visibility:hidden;">⚙</div>' +
        '</div>' +

        '<div class="scrollable-content scrollable-with-bar" style="display:flex;flex-direction:column;padding:0 24px 40px;">' +

          '<div class="welcome-landing">' +
            '<div class="welcome-landing-logo">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
                '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>' +
                '<circle cx="8.5" cy="8.5" r="1.5"/>' +
                '<polyline points="21 15 16 10 5 21"/>' +
              '</svg>' +
            '</div>' +
            '<div class="welcome-landing-title">欢迎使用</div>' +
            '<div class="welcome-landing-subtitle">MemAI 数字记忆管理助手</div>' +
            '<div class="welcome-landing-desc">智能识别截图、重复和模糊照片<br>帮你轻松整理相册，释放存储空间</div>' +
          '</div>' +

          '<div class="welcome-features">' +
            '<div class="welcome-feature-item">' +
              '<div class="welcome-feature-icon">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                  '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>' +
                  '<circle cx="12" cy="12" r="3"/>' +
                '</svg>' +
              '</div>' +
              '<div class="welcome-feature-text">' +
                '<div class="welcome-feature-name">智能识别</div>' +
                '<div class="welcome-feature-detail">AI自动识别截图、二维码等</div>' +
              '</div>' +
            '</div>' +
            '<div class="welcome-feature-item">' +
              '<div class="welcome-feature-icon">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                  '<rect x="3" y="3" width="7" height="7"/>' +
                  '<rect x="14" y="3" width="7" height="7"/>' +
                  '<rect x="14" y="14" width="7" height="7"/>' +
                  '<rect x="3" y="14" width="7" height="7"/>' +
                '</svg>' +
              '</div>' +
              '<div class="welcome-feature-text">' +
                '<div class="welcome-feature-name">重复检测</div>' +
                '<div class="welcome-feature-detail">找出重复照片推荐最优</div>' +
              '</div>' +
            '</div>' +
            '<div class="welcome-feature-item">' +
              '<div class="welcome-feature-icon">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                  '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>' +
                  '<polyline points="22 4 12 14.01 9 11.01"/>' +
                '</svg>' +
              '</div>' +
              '<div class="welcome-feature-text">' +
                '<div class="welcome-feature-name">分类整理</div>' +
                '<div class="welcome-feature-detail">保留、待复核、建议清理</div>' +
              '</div>' +
            '</div>' +
          '</div>' +

          '<div class="welcome-landing-action">' +
            '<button class="btn-primary welcome-start-btn" id="welcome-start">开始体验</button>' +
            '<div class="welcome-privacy-tip">' +
              '<svg class="welcome-tip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>' +
              '</svg>' +
              '<span>所有照片仅在本地处理，不会上传到服务器</span>' +
            '</div>' +
          '</div>' +

        '</div>' +
      '</div>' +

      // ===== 选择面板（点击开始体验后显示） =====
      '<div id="choice-panel" style="position:absolute;top:0;left:0;right:0;bottom:0;display:none;flex-direction:column;">' +
        '<div class="nav-bar">' +
          '<button class="nav-btn" id="choice-back-btn">‹</button>' +
          '<div class="nav-title">选择照片来源</div>' +
          '<div class="nav-btn" style="visibility:hidden;">›</div>' +
        '</div>' +

        '<div class="scrollable-content scrollable-with-bar" style="padding:24px 20px 40px;">' +

          '<div class="welcome-hero">' +
            '<div class="welcome-icon-wrap">' +
              '<svg class="welcome-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
                '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>' +
                '<circle cx="8.5" cy="8.5" r="1.5"/>' +
                '<polyline points="21 15 16 10 5 21"/>' +
              '</svg>' +
            '</div>' +
            '<div class="welcome-title">选择你的照片来源</div>' +
            '<div class="welcome-desc">上传你自己的照片或使用示例图库体验</div>' +
          '</div>' +

          '<div class="choice-card choice-primary" id="choice-upload">' +
            '<div class="choice-icon-wrap">' +
              '<svg class="choice-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>' +
                '<polyline points="17 8 12 3 7 8"/>' +
                '<line x1="12" y1="3" x2="12" y2="15"/>' +
              '</svg>' +
            '</div>' +
            '<div class="choice-content">' +
              '<div class="choice-title">上传我的照片</div>' +
              '<div class="choice-desc">选择或拖拽照片，最多 ' + MAX_UPLOAD + ' 张</div>' +
            '</div>' +
            '<div class="choice-arrow">›</div>' +
          '</div>' +

          '<div class="choice-card" id="choice-demo">' +
            '<div class="choice-icon-wrap choice-icon-demo">' +
              '<svg class="choice-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>' +
              '</svg>' +
            '</div>' +
            '<div class="choice-content">' +
              '<div class="choice-title">使用示例图库</div>' +
              '<div class="choice-desc">体验由 265 张真实照片构成的模拟相册</div>' +
            '</div>' +
            '<div class="choice-arrow">›</div>' +
          '</div>' +

          '<div class="photo-wheel-section">' +
            '<div class="photo-wheel-label">示例相册预览</div>' +
            '<div class="photo-wheel" id="photo-wheel">' +
              [1,2,3,4,5,6,7,8,9,10].map(function(i) {
                return '<div class="photo-wheel-item"><img src="public/examples/' + String(i).padStart(3, '0') + '.jpg" alt="" /></div>';
              }).join('') +
            '</div>' +
          '</div>' +

        '</div>' +
      '</div>' +

      // ===== 上传面板 =====
      '<div id="upload-panel" style="position:absolute;top:0;left:0;right:0;bottom:0;display:none;flex-direction:column;">' +
        '<div class="nav-bar">' +
          '<button class="nav-btn" id="upload-back-btn">‹</button>' +
          '<div class="nav-title">上传照片</div>' +
          '<div class="nav-btn" style="visibility:hidden;">›</div>' +
        '</div>' +

        '<div class="scrollable-content scrollable-with-bar" style="padding:20px 20px 120px;">' +

          '<div class="upload-hero">' +
            '<div class="upload-icon-wrap">' +
              '<svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>' +
                '<polyline points="17 8 12 3 7 8"/>' +
                '<line x1="12" y1="3" x2="12" y2="15"/>' +
              '</svg>' +
            '</div>' +
            '<div class="upload-title">上传你的照片</div>' +
            '<div class="upload-desc">支持 JPG、PNG 格式，最多 ' + MAX_UPLOAD + ' 张</div>' +
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
      '</div>' +
    '</div>';
  }

  function onMount() {
    uploadedFiles = [];
    isProcessing = false;

    var container = Utils.$('#page-container');
    var currentPage = container ? container.querySelector('.page:last-child') : null;
    if (!currentPage) return;

    var choicePanel = Utils.$('#choice-panel', currentPage);
    var uploadPanel = Utils.$('#upload-panel', currentPage);
    if (choicePanel) choicePanel.style.display = 'none';
    if (uploadPanel) uploadPanel.style.display = 'none';

    // 欢迎页"开始体验"按钮
    var startBtn = Utils.$('#welcome-start', currentPage);
    if (startBtn) {
      startBtn.addEventListener('click', function() {
        showChoicePanel();
      });
    }

    var choiceUpload = Utils.$('#choice-upload', currentPage);
    if (choiceUpload) {
      choiceUpload.addEventListener('click', function() {
        showUploadPanel();
      });
    }

    var choiceDemo = Utils.$('#choice-demo', currentPage);
    if (choiceDemo) {
      choiceDemo.addEventListener('click', function() {
        Store.initPhotos(PHOTOS_DATA);
        Store.setUseDemoData(true);
        Utils.showToast('已加载示例图库');
        setTimeout(function() {
          Router.navigate('/preferences');
        }, 300);
      });
    }

    var choiceBackBtn = Utils.$('#choice-back-btn', currentPage);
    if (choiceBackBtn) {
      choiceBackBtn.addEventListener('click', function() {
        hideChoicePanel();
      });
    }

    setupUploadPanel();
  }

  function showChoicePanel() {
    var container = Utils.$('#page-container');
    var currentPage = container ? container.querySelector('.page:last-child') : null;
    if (!currentPage) return;

    var choicePanel = Utils.$('#choice-panel', currentPage);
    var mainContent = Utils.$('#welcome-main', currentPage);

    if (mainContent && choicePanel) {
      mainContent.style.display = 'none';
      choicePanel.style.display = 'flex';
      choicePanel.classList.add('page-enter');
      requestAnimationFrame(function() {
        choicePanel.classList.add('page-enter-active');
        choicePanel.classList.remove('page-enter');
      });
    }
  }

  function hideChoicePanel() {
    var container = Utils.$('#page-container');
    var currentPage = container ? container.querySelector('.page:last-child') : null;
    if (!currentPage) return;

    var choicePanel = Utils.$('#choice-panel', currentPage);
    var mainContent = Utils.$('#welcome-main', currentPage);

    if (mainContent && choicePanel) {
      choicePanel.style.display = 'none';
      mainContent.style.display = 'flex';
    }
  }

  function showUploadPanel() {
    var container = Utils.$('#page-container');
    var currentPage = container ? container.querySelector('.page:last-child') : null;
    if (!currentPage) return;

    var uploadPanel = Utils.$('#upload-panel', currentPage);
    var choicePanel = Utils.$('#choice-panel', currentPage);

    if (choicePanel && uploadPanel) {
      choicePanel.style.display = 'none';
      uploadPanel.style.display = 'flex';
      uploadPanel.classList.add('page-enter');
      requestAnimationFrame(function() {
        uploadPanel.classList.add('page-enter-active');
        uploadPanel.classList.remove('page-enter');
      });
    }
  }

  function hideUploadPanel() {
    var container = Utils.$('#page-container');
    var currentPage = container ? container.querySelector('.page:last-child') : null;
    if (!currentPage) return;

    var uploadPanel = Utils.$('#upload-panel', currentPage);
    var choicePanel = Utils.$('#choice-panel', currentPage);

    if (choicePanel && uploadPanel) {
      uploadPanel.style.display = 'none';
      choicePanel.style.display = 'flex';
    }
  }

  function setupUploadPanel() {
    var container = Utils.$('#page-container');
    var currentPage = container ? container.querySelector('.page:last-child') : null;
    if (!currentPage) return;

    var backBtn = Utils.$('#upload-back-btn', currentPage);
    if (backBtn) {
      backBtn.addEventListener('click', function() {
        uploadedFiles = [];
        hideUploadPanel();
      });
    }

    var uploadArea = Utils.$('#upload-area', currentPage);
    var fileInput = Utils.$('#file-input', currentPage);

    if (uploadArea && fileInput) {
      uploadArea.addEventListener('click', function() {
        fileInput.click();
      });

      fileInput.addEventListener('change', function(e) {
        handleFiles(e.target.files);
        fileInput.value = '';
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

    var clearBtn = Utils.$('#clear-btn', currentPage);
    if (clearBtn) {
      clearBtn.addEventListener('click', function() {
        uploadedFiles = [];
        updatePreview();
      });
    }

    var startBtn = Utils.$('#start-analyze-btn', currentPage);
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

    if (uploadedFiles.length + imageFiles.length > MAX_UPLOAD) {
      Utils.showToast('最多上传 ' + MAX_UPLOAD + ' 张照片');
      imageFiles = imageFiles.slice(0, MAX_UPLOAD - uploadedFiles.length);
    }

    uploadedFiles = uploadedFiles.concat(imageFiles);
    updatePreview();
  }

  function updatePreview() {
    var container = Utils.$('#page-container');
    var currentPage = container ? container.querySelector('.page:last-child') : null;
    if (!currentPage) return;

    var previewSection = Utils.$('#preview-section', currentPage);
    var previewGrid = Utils.$('#preview-grid', currentPage);
    var selectedCount = Utils.$('#selected-count', currentPage);
    var startBtn = Utils.$('#start-analyze-btn', currentPage);
    var uploadArea = Utils.$('#upload-area', currentPage);

    if (uploadedFiles.length > 0) {
      if (previewSection) previewSection.style.display = 'block';
      if (uploadArea) uploadArea.style.display = 'none';
      if (selectedCount) selectedCount.textContent = uploadedFiles.length;
      if (startBtn) startBtn.disabled = false;

      if (previewGrid) {
        previewGrid.innerHTML = '';
        var displayFiles = uploadedFiles.slice(0, 12);
        displayFiles.forEach(function(file) {
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
    var container = Utils.$('#page-container');
    var currentPage = container ? container.querySelector('.page:last-child') : null;
    var startBtn = currentPage ? Utils.$('#start-analyze-btn', currentPage) : null;
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
    var container = Utils.$('#page-container');
    var currentPage = container ? container.querySelector('.page:last-child') : null;
    var startBtn = currentPage ? Utils.$('#start-analyze-btn', currentPage) : null;

    var modelReady = ClipAnalyzer.isModelReady();
    var modelLoading = ClipAnalyzer.isModelLoading();

    if (!modelReady && !modelLoading) {
      if (startBtn) startBtn.textContent = '正在加载AI引擎...';
      ClipAnalyzer.loadModel();
    }

    function checkAndAnalyze() {
      if (ClipAnalyzer.isModelReady()) {
        doAnalysis();
      } else {
        var progress = ClipAnalyzer.getLoadProgress();
        if (startBtn) {
          startBtn.textContent = 'AI引擎加载中 ' + Math.round(progress * 100) + '%';
        }
        setTimeout(checkAndAnalyze, 500);
      }
    }

    function doAnalysis() {
      if (startBtn) startBtn.textContent = 'AI分析中...';

      ClipAnalyzer.analyzeBatch(photos, function(processed, total) {
        if (startBtn) {
          startBtn.textContent = 'AI分析中 (' + processed + '/' + total + ')';
        }
      }).then(function(cache) {
        var enriched = photos.map(function(p) {
          var a = cache[p.photo_url] || {};
          return Object.assign({}, p, {
            analysis: a.is_screenshot !== undefined ? a : {
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
              duplicate_count: 0
            }
          });
        });

        var dupMap = ImageAnalyzer.findDuplicates(enriched);
        var groupIdCounter = 0;
        var processedDup = {};

        enriched.forEach(function(p) {
          if (dupMap[p.photo_url] && !processedDup[p.photo_url]) {
            groupIdCounter++;
            var groupId = 'dup_' + groupIdCounter;
            var count = 0;
            enriched.forEach(function(p2) {
              if (dupMap[p2.photo_url] === dupMap[p.photo_url]) {
                p2.analysis.is_duplicate = true;
                p2.analysis.duplicate_group_id = groupId;
                processedDup[p2.photo_url] = true;
                count++;
              }
            });
            enriched.forEach(function(p2) {
              if (dupMap[p2.photo_url] === dupMap[p.photo_url]) {
                p2.analysis.duplicate_count = count;
              }
            });
          }
        });

        Store.setPhotos(enriched);
        Store.setUseDemoData(false);
        setTimeout(function() {
          Router.navigate('/preferences');
        }, 300);
      }).catch(function(err) {
        console.error('CLIP analysis error:', err);
        Utils.showToast('AI分析失败，使用本地分析');
        fallbackAnalysis(photos);
      });
    }

    function fallbackAnalysis(photos) {
      ImageAnalyzer.analyzeBatch(photos, function(processed, total) {
        var container = Utils.$('#page-container');
        var currentPage = container ? container.querySelector('.page:last-child') : null;
        var btn = currentPage ? Utils.$('#start-analyze-btn', currentPage) : null;
        if (btn) btn.textContent = '本地分析中 (' + processed + '/' + total + ')';
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
              is_temp_info: false,
              is_important_info: false,
              is_blurry: a.is_blurry || false,
              hash: a.hash || '',
              detected_type: 'general',
              type_confidence: 0.3,
              type_raw_score: 30,
              skin_ratio: 0,
              warm_ratio: 0,
              green_ratio: 0,
              blue_ratio: 0,
              red_ratio: 0,
              yellow_ratio: 0,
              clip_label: 'local analysis',
              duplicate_count: 0
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

    if (modelReady) {
      doAnalysis();
    } else {
      checkAndAnalyze();
    }
  }

  function generatePhotoData(file, img, dataUrl, index) {
    return {
      photo_id: 'upload_' + Date.now() + '_' + index,
      file_name: file.name,
      file_size_bytes: file.size,
      created_at: new Date(file.lastModified).toISOString().split('T')[0],
      width: img.naturalWidth,
      height: img.naturalHeight,
      photo_url: dataUrl,
      idx: index
    };
  }

  global.PageWelcome = {
    render: render,
    onMount: onMount
  };

})(window);
