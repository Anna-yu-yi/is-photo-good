(function(global) {
  'use strict';

  function render() {
    var state = Store.getState();
    var scanned = state.scanStatus === 'completed';
    var stats = state.scanStats;
    var dist = state.distribution;
    var insights = state.aiInsights;

    var totalPhotos = scanned ? stats.total : (state.photos.length || 0);
    var screenshotCount = scanned ? stats.screenshot : '--';
    var duplicateGroups = scanned ? stats.duplicateGroups : '--';
    var blurryCount = scanned ? stats.blurry : '--';
    var highValueCount = scanned ? stats.highValue : '--';
    var releasable = scanned ? Utils.formatFileSize(stats.releasableBytes) : '--';

    var insightHtml = '';
    if (scanned && insights && insights.length > 0) {
      insightHtml = insights.map(function(item, i) {
        return '<div class="list-row" style="padding:' + (i === 0 ? '0 0 12px' : '12px 0') + '">' +
                 '<span class="list-row-label" style="font-size:14px;">' + item.title + '</span>' +
                 '<span class="list-row-value" style="font-size:13px;">›</span>' +
               '</div>' +
               '<p style="font-size:13px;color:var(--color-text-secondary);margin-top:4px;">' + item.desc + '</p>';
      }).join('<div class="divider" style="margin:0;"></div>');
    } else {
      insightHtml = '<p style="font-size:13px;color:var(--color-text-secondary);line-height:1.6;">' +
                    '点击下方按钮开始智能扫描，AI 将分析你相册中的照片，' +
                    '识别截图、重复照片和模糊照片，帮你快速整理相册。' +
                    '</p>';
    }

    var sceneryPct = scanned ? dist.scenery : 0;
    var peoplePct = scanned ? dist.people : 0;
    var screenshotPct = scanned ? dist.screenshot : 0;
    var dailyPct = scanned ? dist.daily : 0;

    return '<div class="page">' +
      '<div class="demo-banner">本 Demo 为在线演示版本，所有照片数据均为预构建的模拟数据</div>' +

      '<div class="nav-bar">' +
        '<button class="nav-btn" id="dashboard-back-btn">‹</button>' +
        '<div class="nav-title">MemAI</div>' +
        '<div class="nav-btn" id="reset-btn" style="font-size:13px;width:auto;">重置</div>' +
      '</div>' +

      '<div class="page-content">' +

        '<div class="summary-card">' +
          '<div class="summary-title">你的相册中有 ' + totalPhotos.toLocaleString() + ' 张照片</div>' +
          '<div class="summary-space">可释放 ' + releasable + '</div>' +
        '</div>' +

        '<div class="card card-clickable" style="margin-bottom:16px;" id="overview-card">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
            '<span style="font-size:17px;font-weight:600;">照片概览</span>' +
            '<span style="font-size:14px;color:var(--color-text-secondary);">›</span>' +
          '</div>' +
          '<div class="overview-grid">' +
            '<div class="overview-item">' +
              '<div class="overview-num number-animate">' + screenshotCount + '</div>' +
              '<div class="overview-label">截图</div>' +
            '</div>' +
            '<div class="overview-item">' +
              '<div class="overview-num number-animate">' + duplicateGroups + (scanned ? ' 组' : '') + '</div>' +
              '<div class="overview-label">重复照片</div>' +
            '</div>' +
            '<div class="overview-item">' +
              '<div class="overview-num number-animate">' + blurryCount + '</div>' +
              '<div class="overview-label">模糊照片</div>' +
            '</div>' +
            '<div class="overview-item">' +
              '<div class="overview-num number-animate">' + (scanned ? '约 ' + highValueCount : '--') + '</div>' +
              '<div class="overview-label">高价值照片</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="card card-clickable" style="margin-bottom:16px;" id="dist-card">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
            '<span style="font-size:17px;font-weight:600;">照片分布</span>' +
            '<span style="font-size:14px;color:var(--color-text-secondary);">›</span>' +
          '</div>' +

          '<div class="dist-row">' +
            '<div class="dist-header">' +
              '<span class="dist-name">风景旅行</span>' +
              '<span class="dist-pct">' + sceneryPct + '%</span>' +
            '</div>' +
            '<div class="progress-bar"><div class="progress-fill" style="width:' + sceneryPct + '%;background:var(--color-dist-scenery);"></div></div>' +
          '</div>' +

          '<div class="dist-row">' +
            '<div class="dist-header">' +
              '<span class="dist-name">人物合照</span>' +
              '<span class="dist-pct">' + peoplePct + '%</span>' +
            '</div>' +
            '<div class="progress-bar"><div class="progress-fill" style="width:' + peoplePct + '%;background:var(--color-dist-people);"></div></div>' +
          '</div>' +

          '<div class="dist-row">' +
            '<div class="dist-header">' +
              '<span class="dist-name">截图文档</span>' +
              '<span class="dist-pct">' + screenshotPct + '%</span>' +
            '</div>' +
            '<div class="progress-bar"><div class="progress-fill" style="width:' + screenshotPct + '%;background:var(--color-dist-screenshot);"></div></div>' +
          '</div>' +

          '<div class="dist-row">' +
            '<div class="dist-header">' +
              '<span class="dist-name">日常随手</span>' +
              '<span class="dist-pct">' + dailyPct + '%</span>' +
            '</div>' +
            '<div class="progress-bar"><div class="progress-fill" style="width:' + dailyPct + '%;background:var(--color-dist-daily);"></div></div>' +
          '</div>' +
        '</div>' +

        '<div class="card card-clickable" style="margin-bottom:16px;" id="insight-card">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
            '<span class="ai-insight-label">' +
              '<svg class="ai-star" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                '<path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"/>' +
              '</svg>' +
              'AI INSIGHT' +
            '</span>' +
            '<span style="font-size:14px;color:var(--color-text-secondary);">›</span>' +
          '</div>' +
          insightHtml +
        '</div>' +

      '</div>' +

      '<div class="bottom-actions">' +
        '<button class="btn-primary" id="start-scan-btn">' + (scanned ? '重新扫描' : '开始智能扫描') + '</button>' +
      '</div>' +
    '</div>';
  }

  function onMount() {
    var backBtn = Utils.$('#dashboard-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', function() {
        Router.navigate('/welcome');
      });
    }

    var resetBtn = Utils.$('#reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', function() {
        if (confirm('确定要重置所有数据吗？这将清除当前的照片和分析结果。')) {
          Store.reset();
          Router.navigate('/welcome');
        }
      });
    }

    var startBtn = Utils.$('#start-scan-btn');
    if (startBtn) {
      startBtn.addEventListener('click', function() {
        Router.navigate('/preferences');
      });
    }

    var overviewCard = Utils.$('#overview-card');
    if (overviewCard) {
      overviewCard.addEventListener('click', function() {
        var state = Store.getState();
        if (state.scanStatus === 'completed') {
          Router.navigate('/results');
        } else {
          Utils.showToast('请先开始扫描');
        }
      });
    }
  }

  global.PageDashboard = {
    render: render,
    onMount: onMount
  };

})(window);
