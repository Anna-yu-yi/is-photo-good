(function(global) {
  'use strict';

  function render() {
    var state = Store.getState();
    var cats = state.categories;
    var stats = state.scanStats;
    var insights = state.aiInsights;

    var keepCount = cats.keep.length;
    var reviewCount = cats.review.length;
    var cleanCount = cats.clean.length;
    var releasable = Utils.formatFileSize(stats.releasableBytes);

    var insightHtml = '';
    if (insights && insights.length > 0) {
      insightHtml = insights.map(function(item, i) {
        return '<div class="list-row" style="padding:' + (i === 0 ? '0 0 12px' : '12px 0') + '">' +
                 '<span class="list-row-label" style="font-size:14px;">' + item.title + '</span>' +
                 '<span class="list-row-value" style="font-size:13px;">›</span>' +
               '</div>' +
               '<p style="font-size:13px;color:var(--color-text-secondary);margin-top:4px;">' + item.desc + '</p>';
      }).join('<div class="divider" style="margin:0;"></div>');
    }

    return '<div class="page">' +
      '<div class="nav-bar">' +
        '<button class="nav-btn" id="results-back-btn">‹</button>' +
        '<div class="nav-title">扫描结果</div>' +
        '<button class="nav-btn nav-btn-text" id="rescan-btn">重新扫描</button>' +
      '</div>' +

      '<div class="page-content">' +

        '<div style="text-align:center;margin-bottom:24px;padding:16px 0;">' +
          '<div style="font-size:13px;color:var(--color-text-secondary);margin-bottom:8px;">MemAI</div>' +
          '<div style="font-size:22px;font-weight:600;margin-bottom:4px;">发现 ' + cleanCount + ' 张可清理照片</div>' +
          '<div style="font-size:15px;color:var(--color-text-secondary);">预计释放 ' + releasable + '</div>' +
        '</div>' +

        '<div class="category-trio" style="margin-bottom:20px;">' +
          '<div class="category-card category-card-keep" data-category="keep">' +
            '<div class="category-count">' + keepCount + '</div>' +
            '<div class="category-label">保留</div>' +
          '</div>' +
          '<div class="category-card category-card-review" data-category="review">' +
            '<div class="category-count">' + reviewCount + '</div>' +
            '<div class="category-label">待复核</div>' +
          '</div>' +
          '<div class="category-card category-card-clean" data-category="clean">' +
            '<div class="category-count">' + cleanCount + '</div>' +
            '<div class="category-label">建议清理</div>' +
          '</div>' +
        '</div>' +

        '<div class="card card-clickable" style="margin-bottom:16px;" id="dup-card">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;">' +
            '<div style="display:flex;align-items:center;gap:10px;">' +
              '<div style="width:40px;height:40px;border-radius:12px;background:var(--color-review-light);display:flex;align-items:center;justify-content:center;">' +
                '<svg style="width:20px;height:20px;color:var(--color-review);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                  '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>' +
                  '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>' +
                '</svg>' +
              '</div>' +
              '<div>' +
                '<div style="font-size:15px;font-weight:600;">重复照片</div>' +
                '<div style="font-size:13px;color:var(--color-text-secondary);">' + stats.duplicateGroups + ' 组 · 共 ' + stats.duplicate + ' 张</div>' +
              '</div>' +
            '</div>' +
            '<span style="font-size:14px;color:var(--color-text-secondary);">›</span>' +
          '</div>' +
        '</div>' +

        '<div class="card card-clickable" style="margin-bottom:16px;">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
            '<span style="font-size:17px;font-weight:600;">AI 洞察</span>' +
            '<span style="font-size:14px;color:var(--color-text-secondary);">›</span>' +
          '</div>' +
          insightHtml +
        '</div>' +

      '</div>' +

      '<div class="bottom-actions">' +
        '<button class="btn-primary" id="confirm-clean-btn">确认清理</button>' +
      '</div>' +
    '</div>';
  }

  function onMount() {
    var backBtn = Utils.$('#results-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', function() {
        Router.navigate('/welcome');
      });
    }

    var rescanBtn = Utils.$('#rescan-btn');
    if (rescanBtn) {
      rescanBtn.addEventListener('click', function() {
        if (confirm('重新扫描将重置当前结果，确定继续吗？')) {
          Store.reset();
          Store.initPhotos(PHOTOS_DATA);
          Router.navigate('/scan');
        }
      });
    }

    var categoryCards = Utils.$$('.category-card');
    categoryCards.forEach(function(card) {
      card.addEventListener('click', function() {
        var cat = card.getAttribute('data-category');
        Store.setListCategory(cat);
        Router.navigate('/list/' + cat);
      });
    });

    var dupCard = Utils.$('#dup-card');
    if (dupCard) {
      dupCard.addEventListener('click', function() {
        Router.navigate('/duplicate');
      });
    }

    var confirmBtn = Utils.$('#confirm-clean-btn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', function() {
        var state = Store.getState();
        var cleanCount = state.categories.clean.length;
        var cleanSize = Utils.formatFileSize(state.scanStats.releasableBytes);
        if (confirm('即将清理 ' + cleanCount + ' 张照片，释放约 ' + cleanSize + ' 空间。确定继续吗？')) {
          Store.confirmClean();
          Router.navigate('/report');
        }
      });
    }
  }

  global.PageResults = {
    render: render,
    onMount: onMount
  };

})(window);
