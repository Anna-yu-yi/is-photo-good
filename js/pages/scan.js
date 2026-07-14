(function(global) {
  'use strict';

  var cancelled = false;

  var STAGES = [
    { text: '正在读取相册...', duration: 800 },
    { text: '正在识别照片类型...', duration: 1200 },
    { text: '正在分析照片质量...', duration: 1500 },
    { text: '正在评估记忆价值...', duration: 1000 }
  ];

  function render() {
    return '<div class="page">' +
      '<div class="nav-bar">' +
        '<button class="nav-btn" id="scan-back-btn">‹</button>' +
        '<div class="nav-title">智能扫描</div>' +
        '<div class="nav-btn" style="visibility:hidden;">›</div>' +
      '</div>' +

      '<div class="page-content" style="padding-top:40px;">' +

        '<div class="scan-ring-wrap">' +
          '<div class="scan-ring" id="scan-ring">' +
            '<div class="scan-ring-content">' +
              '<div class="scan-percent number-animate" id="scan-percent">0%</div>' +
              '<div class="scan-status" id="scan-status">准备中...</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="scan-detail-card">' +
          '<div class="scan-detail-title" id="scan-detail-title">已分析 0 / 1,000 张</div>' +
          '<div class="progress-bar" style="height:8px;">' +
            '<div class="progress-fill" id="scan-progress" style="width:0%;background:var(--color-primary);"></div>' +
          '</div>' +
        '</div>' +

        '<div class="scan-tags">' +
          '<div class="scan-tag">' +
            '<div class="scan-tag-num number-animate" id="tag-screenshot">0</div>' +
            '<div class="scan-tag-label">截图</div>' +
          '</div>' +
          '<div class="scan-tag">' +
            '<div class="scan-tag-num number-animate" id="tag-duplicate">0</div>' +
            '<div class="scan-tag-label">重复</div>' +
          '</div>' +
          '<div class="scan-tag">' +
            '<div class="scan-tag-num number-animate" id="tag-blurry">0</div>' +
            '<div class="scan-tag-label">模糊</div>' +
          '</div>' +
          '<div class="scan-tag">' +
            '<div class="scan-tag-num number-animate" id="tag-highvalue">0</div>' +
            '<div class="scan-tag-label">高价值</div>' +
          '</div>' +
        '</div>' +

      '</div>' +

      '<div class="bottom-actions">' +
        '<button class="btn-secondary" id="cancel-scan-btn">取消扫描</button>' +
      '</div>' +
    '</div>';
  }

  function onMount() {
    cancelled = false;
    Store.setScanStatus('scanning');

    var backBtn = Utils.$('#scan-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', function() {
        cancelled = true;
        Router.goBack();
      });
    }

    var cancelBtn = Utils.$('#cancel-scan-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', function() {
        if (confirm('确定要取消扫描吗？')) {
          cancelled = true;
          Store.setScanStatus('idle');
          Router.goBack();
        }
      });
    }

    var photos = Store.getState().photos;
    if (!photos || photos.length === 0) {
      Utils.showToast('没有可扫描的照片');
      Router.navigate('/dashboard');
      return;
    }

    var resultData = runAnalysis(photos);
    var totalDuration = 1600;
    var startTime = performance.now();

    function animate(now) {
      if (cancelled) return;

      var elapsed = now - startTime;
      var progress = Math.min(elapsed / totalDuration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var percent = Math.round(eased * 99);
      var currentCount = Math.round(eased * photos.length);

      var ring = Utils.$('#scan-ring');
      var pctEl = Utils.$('#scan-percent');
      var detailTitle = Utils.$('#scan-detail-title');
      var progressBar = Utils.$('#scan-progress');
      var statusEl = Utils.$('#scan-status');

      if (ring) {
        var deg = percent * 3.6;
        ring.style.background = 'conic-gradient(var(--color-primary) ' + deg + 'deg, var(--color-primary-light) ' + deg + 'deg)';
      }
      if (pctEl) pctEl.textContent = percent + '%';
      if (detailTitle) detailTitle.textContent = '已分析 ' + currentCount.toLocaleString() + ' / ' + photos.length.toLocaleString() + ' 张';
      if (progressBar) progressBar.style.width = (eased * 100) + '%';

      var stageIndex = 0;
      var stageElapsed = 0;
      for (var i = 0; i < STAGES.length; i++) {
        stageElapsed += STAGES[i].duration;
        if (elapsed < stageElapsed) {
          stageIndex = i;
          break;
        }
        stageIndex = STAGES.length - 1;
      }

      var currentStatus = STAGES[stageIndex].text;
      if (statusEl) statusEl.textContent = currentStatus;

      var stats = resultData ? resultData.stats : null;
      var screenshotCount = Math.round(eased * (stats ? stats.screenshot : 0));
      var duplicateCount = Math.round(eased * (stats ? stats.duplicate : 0));
      var blurryCount = Math.round(eased * (stats ? stats.blurry : 0));
      var highValueCount = Math.round(eased * (stats ? stats.highValue : 0));

      var tagScreenshot = Utils.$('#tag-screenshot');
      var tagDuplicate = Utils.$('#tag-duplicate');
      var tagBlurry = Utils.$('#tag-blurry');
      var tagHighValue = Utils.$('#tag-highvalue');

      if (tagScreenshot) tagScreenshot.textContent = screenshotCount;
      if (tagDuplicate) tagDuplicate.textContent = duplicateCount;
      if (tagBlurry) tagBlurry.textContent = blurryCount;
      if (tagHighValue) tagHighValue.textContent = highValueCount;

      if (progress < 0.9) {
        requestAnimationFrame(animate);
      } else {
        finish(resultData);
      }
    }

    requestAnimationFrame(animate);
  }

  function runAnalysis(photos) {
    var enriched;
    var allHaveAnalysis = photos.every(function(p) { return p.analysis && p.analysis.clarity_score !== undefined; });

    if (allHaveAnalysis) {
      enriched = photos.map(function(p) {
        return Object.assign({}, p, {
          analysis: Object.assign({}, p.analysis, {
            is_duplicate: false,
            duplicate_group_id: null,
            person_count: 0,
            text_density: p.analysis.is_screenshot ? Math.min(0.9, p.analysis.edge_density || 0.3) : 0.05,
            is_temp_info: p.analysis.is_screenshot && p.analysis.screenshot_type !== 'memo' && p.analysis.screenshot_type !== 'code',
            is_important_info: p.analysis.is_screenshot && (p.analysis.screenshot_type === 'memo' || p.analysis.screenshot_type === 'code'),
          })
        });
      });
    } else {
      enriched = photos.map(function(p) {
        return Object.assign({}, p, {
          analysis: {
            is_screenshot: false,
            screenshot_type: null,
            is_duplicate: false,
            duplicate_group_id: null,
            clarity_score: 0.5,
            brightness: 0.5,
            contrast: 0.5,
            saturation: 0.3,
            edge_density: 0.2,
            aspect_ratio: p.width / p.height,
            person_count: 0,
            scene_tags: ['general'],
            text_density: 0.05,
            is_temp_info: false,
            is_important_info: false,
            is_blurry: false,
            hash: ''
          }
        });
      });
    }

    var hashGroups = {};
    enriched.forEach(function(p) {
      if (p.analysis && p.analysis.hash) {
        var h = p.analysis.hash;
        if (!hashGroups[h]) hashGroups[h] = [];
        hashGroups[h].push(p);
      }
    });

    var groupId = 0;
    Object.keys(hashGroups).forEach(function(h) {
      if (hashGroups[h].length > 1) {
        groupId++;
        var gid = 'dup_group_' + groupId;
        hashGroups[h].forEach(function(p) {
          p.analysis.is_duplicate = true;
          p.analysis.duplicate_group_id = gid;
          p.analysis.duplicate_count = hashGroups[h].length;
        });
      }
    });

    var preferences = Store.getState().preferences;
    var scored = ScoringEngine.batchScore(enriched, preferences);
    var categorized = CategoryEngine.batchClassify(scored);
    var all = categorized.keep.concat(categorized.review).concat(categorized.clean);
    var stats = CategoryEngine.computeStats(categorized, enriched);
    var dist = CategoryEngine.computeDistribution(all);
    var insights = CategoryEngine.generateInsights(stats, dist);

    Store.setPhotos(enriched);

    return {
      scored: scored,
      categorized: categorized,
      stats: stats,
      dist: dist,
      insights: insights,
      allPhotos: enriched
    };
  }

  function finish(resultData) {
    if (cancelled) return;

    var allWithExplain = ExplanationEngine.batchExplain(
      resultData.categorized.keep.concat(resultData.categorized.review).concat(resultData.categorized.clean)
    );
    var keep = allWithExplain.filter(function(p) { return p.category === 'keep'; });
    var review = allWithExplain.filter(function(p) { return p.category === 'review'; });
    var clean = allWithExplain.filter(function(p) { return p.category === 'clean'; });

    Store.updateCategories(
      { keep: keep, review: review, clean: clean },
      resultData.stats,
      resultData.dist,
      resultData.insights,
      resultData.allPhotos
    );

    Router.navigate('/results');
  }

  global.PageScan = {
    render: render,
    onMount: onMount
  };

})(window);
