(function(global) {
  'use strict';

  function render() {
    var state = Store.getState();
    var report = state.report;

    if (!report) {
      report = {
        cleanedCount: 0,
        freedBytes: 0,
        healthScore: 72,
        screenshotCount: 0,
        screenshotBytes: 0,
        duplicateCount: 0,
        duplicateBytes: 0,
        blurryCount: 0,
        blurryBytes: 0
      };
    }

    var freed = Utils.formatFileSize(report.freedBytes);
    var screenshotSize = Utils.formatFileSize(report.screenshotBytes);
    var duplicateSize = Utils.formatFileSize(report.duplicateBytes);
    var blurrySize = Utils.formatFileSize(report.blurryBytes);

    return '<div class="page">' +
      '<div class="nav-bar">' +
        '<button class="nav-btn" id="report-back-btn">‹</button>' +
        '<div class="nav-title">清理报告</div>' +
        '<div class="nav-btn" style="visibility:hidden;">›</div>' +
      '</div>' +

      '<div class="page-content" style="padding-top:40px;">' +

        '<div style="text-align:center;margin-bottom:32px;">' +
          '<div class="report-check">' +
            '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' +
              '<polyline points="20 6 9 17 4 12"></polyline>' +
            '</svg>' +
          '</div>' +
          '<div style="font-size:22px;font-weight:600;margin-top:16px;">清理完成</div>' +
        '</div>' +

        '<div class="report-trio">' +
          '<div class="report-stat-card">' +
            '<div class="report-stat-value number-animate">' + report.cleanedCount + '</div>' +
            '<div class="report-stat-label">已清理</div>' +
          '</div>' +
          '<div class="report-stat-card">' +
            '<div class="report-stat-value number-animate">' + freed + '</div>' +
            '<div class="report-stat-label">已释放</div>' +
          '</div>' +
          '<div class="report-stat-card">' +
            '<div class="report-stat-value number-animate">' + report.healthScore + '%</div>' +
            '<div class="report-stat-label">健康度</div>' +
          '</div>' +
        '</div>' +

        '<div class="card">' +
          '<div style="font-size:16px;font-weight:600;margin-bottom:12px;">清理明细</div>' +
          '<div class="report-item">' +
            '<span class="report-item-name">截图清理</span>' +
            '<span class="report-item-detail">' + report.screenshotCount + ' 张 ｜ ' + screenshotSize + '</span>' +
          '</div>' +
          '<div class="report-item">' +
            '<span class="report-item-name">重复照片清理</span>' +
            '<span class="report-item-detail">' + report.duplicateCount + ' 张 ｜ ' + duplicateSize + '</span>' +
          '</div>' +
          '<div class="report-item">' +
            '<span class="report-item-name">模糊照片清理</span>' +
            '<span class="report-item-detail">' + report.blurryCount + ' 张 ｜ ' + blurrySize + '</span>' +
          '</div>' +
        '</div>' +

      '</div>' +

      '<div class="bottom-actions">' +
        '<button class="btn-primary" id="back-home-btn">返回首页</button>' +
      '</div>' +
    '</div>';
  }

  function onMount() {
    var backBtn = Utils.$('#report-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', function() {
        Router.navigate('/dashboard');
      });
    }

    var backHomeBtn = Utils.$('#back-home-btn');
    if (backHomeBtn) {
      backHomeBtn.addEventListener('click', function() {
        Router.navigate('/dashboard');
      });
    }
  }

  global.PageReport = {
    render: render,
    onMount: onMount
  };

})(window);
