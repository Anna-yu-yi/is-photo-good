(function(global) {
  'use strict';

  var selectedPhotoId = null;

  function render(params) {
    var groupId = params[0];
    var group = Store.getDuplicateGroup(groupId);

    if (!group) {
      return '<div class="page">' +
        '<div class="nav-bar">' +
          '<button class="nav-btn" id="dup-back-btn">‹</button>' +
          '<div class="nav-title">重复照片组</div>' +
          '<div class="nav-btn" style="visibility:hidden;">⋯</div>' +
        '</div>' +
        '<div class="empty-state" style="padding-top:80px;">' +
          '<div class="empty-state-title">未找到重复组</div>' +
          '<div class="empty-state-desc">请返回上一页重试</div>' +
        '</div>' +
      '</div>';
    }

    var photos = group.photos;
    var bestPhoto = group.best_photo;
    selectedPhotoId = bestPhoto.photo_id;

    var photosHtml = photos.map(function(p, i) {
      var isBest = p.photo_id === bestPhoto.photo_id;
      var isSelected = p.photo_id === selectedPhotoId;
      var photoUrl = p.photo_url || Utils.getPlaceholderColor(p.palette_idx || 0);
      var isImg = !!p.photo_url;
      var clarity = Math.round((p.analysis ? p.analysis.clarity_score || 0 : 0) * 100);
      var score = p.score || 0;

      return '<div class="dup-photo-item' + (isSelected ? ' selected' : '') + '" data-id="' + p.photo_id + '">' +
               '<div class="dup-photo-wrap">' +
                 (isImg
                   ? '<img src="' + photoUrl + '" class="dup-photo-img" alt="" />'
                   : '<div class="photo-placeholder" style="background:' + photoUrl + ';"></div>') +
                 (isBest ? '<div class="dup-best-badge">推荐保留</div>' : '') +
                 '<div class="dup-select-check">' +
                   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">' +
                     '<polyline points="20 6 9 17 4 12"/>' +
                   '</svg>' +
                 '</div>' +
               '</div>' +
               '<div class="dup-photo-info">' +
                 '<div class="dup-photo-score">综合评分 ' + score + '</div>' +
                 '<div class="dup-photo-meta">清晰度 ' + clarity + '% ｜ ' + Utils.formatFileSize(p.file_size_bytes) + '</div>' +
               '</div>' +
             '</div>';
    }).join('');

    return '<div class="page page-scrollable">' +
      '<div class="nav-bar">' +
        '<button class="nav-btn" id="dup-back-btn">‹</button>' +
        '<div class="nav-title">重复照片组</div>' +
        '<div class="nav-btn" style="visibility:hidden;">⋯</div>' +
      '</div>' +

      '<div class="scrollable-content scrollable-with-bar">' +
        '<div class="page-content" style="padding-bottom:120px;">' +

          '<div class="dup-header-card">' +
            '<div class="dup-header-title">' +
              '<svg class="dup-header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>' +
                '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>' +
              '</svg>' +
              '共 ' + photos.length + ' 张相似照片' +
            '</div>' +
            '<div class="dup-header-desc">AI 已为你推荐最优保留照片，你也可以手动选择要保留的照片</div>' +
          '</div>' +

          '<div class="dup-recommend-card">' +
            '<div class="dup-recommend-label">' +
              '<svg class="dup-recommend-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>' +
              '</svg>' +
              'AI 推荐保留' +
            '</div>' +
            '<div class="dup-recommend-reason">' +
              getRecommendReason(bestPhoto) +
            '</div>' +
          '</div>' +

          '<div class="dup-section-title">选择要保留的照片</div>' +
          '<div class="dup-photos-grid">' +
            photosHtml +
          '</div>' +

        '</div>' +
      '</div>' +

      '<div class="bottom-actions">' +
        '<div style="display:flex;gap:12px;">' +
          '<button class="btn-secondary" style="flex:1;" id="dup-cancel-btn">返回</button>' +
          '<button class="btn-primary" style="flex:2;" id="dup-confirm-btn">确认保留此张</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function getRecommendReason(photo) {
    var reasons = [];
    var analysis = photo.analysis || {};
    var clarity = analysis.clarity_score || 0;

    if (clarity >= 0.85) {
      reasons.push('画面最清晰');
    }
    if ((photo.score || 0) >= 70) {
      reasons.push('综合评分最高');
    }
    if (analysis.person_count && analysis.person_count >= 2) {
      reasons.push('人物表情自然');
    }
    if (analysis.text_density && analysis.text_density > 0.3) {
      reasons.push('信息密度最大');
    }
    if (photo.file_size_bytes && photo.file_size_bytes > 2000000) {
      reasons.push('分辨率最高');
    }

    if (reasons.length === 0) {
      reasons.push('综合表现最佳');
    }

    return '原因：' + reasons.join('、');
  }

  function onMount(params) {
    var groupId = params[0];

    var backBtn = Utils.$('#dup-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', function() {
        Router.goBack();
      });
    }

    var cancelBtn = Utils.$('#dup-cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', function() {
        Router.goBack();
      });
    }

    var photoItems = Utils.$$('.dup-photo-item');
    photoItems.forEach(function(item) {
      item.addEventListener('click', function() {
        var id = item.getAttribute('data-id');
        selectedPhotoId = id;
        updateSelection();
      });
    });

    var confirmBtn = Utils.$('#dup-confirm-btn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', function() {
        if (!selectedPhotoId) {
          Utils.showToast('请选择要保留的照片');
          return;
        }
        if (confirm('确定保留这张照片吗？其他重复照片将被标记为清理。')) {
          Store.keepDuplicatePhoto(groupId, selectedPhotoId);
          Utils.showToast('已保留选中的照片');
          setTimeout(function() {
            Router.goBack();
          }, 500);
        }
      });
    }
  }

  function updateSelection() {
    var items = Utils.$$('.dup-photo-item');
    items.forEach(function(item) {
      var id = item.getAttribute('data-id');
      if (id === selectedPhotoId) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
    });
  }

  global.PageDuplicateDetail = {
    render: render,
    onMount: onMount
  };

})(window);
