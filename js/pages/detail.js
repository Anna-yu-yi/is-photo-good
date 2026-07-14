(function(global) {
  'use strict';

  function getPhotoList() {
    var state = Store.getState();
    var category = state.listCategory;
    if (category && state.categories[category]) {
      return state.categories[category];
    }
    return state.categories.keep.concat(state.categories.review).concat(state.categories.clean);
  }

  function getAllPhotos() {
    var state = Store.getState();
    return state.categories.keep.concat(state.categories.review).concat(state.categories.clean);
  }

  function findPhotoById(id) {
    var list = getPhotoList();
    var photo = list.find(function(p) { return p.photo_id === id; });
    if (!photo) {
      var all = getAllPhotos();
      photo = all.find(function(p) { return p.photo_id === id; });
    }
    return photo;
  }

  function findNeighbors(id) {
    var list = getPhotoList();
    var idx = list.findIndex(function(p) { return p.photo_id === id; });
    
    if (idx === -1) {
      list = getAllPhotos();
      idx = list.findIndex(function(p) { return p.photo_id === id; });
    }
    
    return {
      prev: idx > 0 ? list[idx - 1] : null,
      next: idx < list.length - 1 ? list[idx + 1] : null,
      index: idx,
      total: list.length
    };
  }

  function render(params) {
    var id = params[0];
    var photo = findPhotoById(id);
    var neighbors = findNeighbors(id);

    if (!photo) {
      return '<div class="page">' +
        '<div class="nav-bar">' +
          '<button class="nav-btn" id="detail-back-btn">‹</button>' +
          '<div class="nav-title">照片详情</div>' +
          '<div class="nav-btn">⋯</div>' +
        '</div>' +
        '<div class="empty-state" style="padding-top:80px;">' +
          '<div class="empty-state-title">照片数据加载失败</div>' +
          '<div class="empty-state-desc">请返回上一页重试</div>' +
        '</div>' +
      '</div>';
    }

    var bg = Utils.getPlaceholderColor(photo.palette_idx || 0);
    var photoUrl = photo.photo_url || bg;
    var isImg = !!photo.photo_url;
    var score = photo.score || 0;
    var category = photo.category || 'review';
    var detail = photo.score_detail || { memory: 0, scarcity: 0, info: 0, quality: 0 };
    var explanation = photo.explanation || '';

    var categoryNames = { keep: '保留', review: '待复核', clean: '建议清理' };
    var catName = categoryNames[category] || category;

    var date = Utils.formatDate(photo.created_at);
    var size = Utils.formatFileSize(photo.file_size_bytes);
    var resolution = (photo.width || 0) + 'x' + (photo.height || 0);

    var hasPrev = !!neighbors.prev;
    var hasNext = !!neighbors.next;

    return '<div class="page page-scrollable">' +
      '<div class="nav-bar">' +
        '<button class="nav-btn" id="detail-back-btn">‹</button>' +
        '<div class="nav-title">照片详情</div>' +
        '<div class="nav-btn">' + (neighbors.index + 1) + '/' + neighbors.total + '</div>' +
      '</div>' +

      '<div class="scrollable-content scrollable-with-bar">' +

        '<div class="detail-photo-wrap">' +
          (hasPrev ? '<button class="detail-nav-btn detail-nav-prev" id="prev-btn" aria-label="上一张">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">' +
              '<polyline points="15 18 9 12 15 6"/>' +
            '</svg>' +
          '</button>' : '') +

          '<div class="detail-photo" id="detail-photo-container">' +
            (isImg
              ? '<img src="' + photoUrl + '" class="detail-img" alt="" onerror="this.style.display=\'none\'; this.parentNode.innerHTML=\'<div class=photo-placeholder style=background:' + bg + '></div>\';" />'
              : '<div class="photo-placeholder" style="background:' + bg + ';"></div>') +
          '</div>' +

          (hasNext ? '<button class="detail-nav-btn detail-nav-next" id="next-btn" aria-label="下一张">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">' +
              '<polyline points="9 18 15 12 9 6"/>' +
            '</svg>' +
          '</button>' : '') +
        '</div>' +

        '<div class="card" style="margin-bottom:16px;">' +
          '<div class="score-header">' +
            '<div class="score-big">' + score + '<small> / 100</small></div>' +
            '<span class="tag tag-' + category + '">' + catName + '</span>' +
          '</div>' +

          '<div class="score-grid">' +
            '<div class="score-dim-block">' +
              '<div class="score-dim-top">' +
                '<span class="score-dim-name">记忆价值</span>' +
                '<span class="score-dim-num">' + detail.memory + '/40</span>' +
              '</div>' +
              '<div class="progress-bar score-dim-bar">' +
                '<div class="progress-fill" style="width:' + (detail.memory / 40 * 100) + '%;background:var(--color-keep);"></div>' +
              '</div>' +
            '</div>' +
            '<div class="score-dim-block">' +
              '<div class="score-dim-top">' +
                '<span class="score-dim-name">稀缺价值</span>' +
                '<span class="score-dim-num">' + detail.scarcity + '/15</span>' +
              '</div>' +
              '<div class="progress-bar score-dim-bar">' +
                '<div class="progress-fill" style="width:' + (detail.scarcity / 15 * 100) + '%;background:var(--color-review);"></div>' +
              '</div>' +
            '</div>' +
            '<div class="score-dim-block">' +
              '<div class="score-dim-top">' +
                '<span class="score-dim-name">信息价值</span>' +
                '<span class="score-dim-num">' + detail.info + '/20</span>' +
              '</div>' +
              '<div class="progress-bar score-dim-bar">' +
                '<div class="progress-fill" style="width:' + (detail.info / 20 * 100) + '%;background:var(--color-dist-screenshot);"></div>' +
              '</div>' +
            '</div>' +
            '<div class="score-dim-block">' +
              '<div class="score-dim-top">' +
                '<span class="score-dim-name">画面质量</span>' +
                '<span class="score-dim-num">' + detail.quality + '/25</span>' +
              '</div>' +
              '<div class="progress-bar score-dim-bar">' +
                '<div class="progress-fill" style="width:' + (detail.quality / 25 * 100) + '%;background:var(--color-primary);"></div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="card card-clickable" style="margin-bottom:16px;">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
            '<span style="font-size:15px;font-weight:600;">AI 解释</span>' +
            '<span style="font-size:14px;color:var(--color-text-secondary);">›</span>' +
          '</div>' +
          '<p style="font-size:14px;color:var(--color-text-primary);line-height:1.6;margin:0 0 12px 0;">' + explanation + '</p>' +
          '<div style="font-size:12px;color:var(--color-text-tertiary);">' +
            date + ' ｜ ' + size + ' ｜ ' + resolution +
          '</div>' +
        '</div>' +

      '</div>' +

      '<div class="bottom-actions">' +
        '<div style="display:flex;gap:12px;">' +
          '<button class="btn-trio btn-trio-keep" data-target="keep">移到保留</button>' +
          '<button class="btn-trio btn-trio-review" data-target="review">移到待复核</button>' +
          '<button class="btn-trio btn-trio-clean" data-target="clean">确认清理</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function onMount(params) {
    var id = params[0];
    var container = Utils.$('#page-container');
    var currentPage = container ? container.querySelector('.page:last-child') : null;

    var backBtn = currentPage ? Utils.$('#detail-back-btn', currentPage) : null;
    if (backBtn) {
      backBtn.addEventListener('click', function() {
        var state = Store.getState();
        var category = state.listCategory;
        if (category) {
          Router.navigate('/list/' + category);
        } else {
          Router.goBack();
        }
      });
    }

    var prevBtn = currentPage ? Utils.$('#prev-btn', currentPage) : null;
    if (prevBtn) {
      prevBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        var currentPath = window.location.hash.slice(1);
        var currentId = currentPath.split('/')[2];
        var neighbors = findNeighbors(currentId);
        if (neighbors.prev) {
          Router.navigate('/detail/' + neighbors.prev.photo_id);
        }
      });
    }

    var nextBtn = currentPage ? Utils.$('#next-btn', currentPage) : null;
    if (nextBtn) {
      nextBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        var currentPath = window.location.hash.slice(1);
        var currentId = currentPath.split('/')[2];
        var neighbors = findNeighbors(currentId);
        if (neighbors.next) {
          Router.navigate('/detail/' + neighbors.next.photo_id);
        }
      });
    }

    var trioBtns = currentPage ? Utils.$$('.btn-trio', currentPage) : [];
    trioBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var currentPath = window.location.hash.slice(1);
        var currentId = currentPath.split('/')[2];
        var target = btn.getAttribute('data-target');
        var photo = findPhotoById(currentId);
        if (!photo) return;

        if (target === 'clean') {
          if (!confirm('确定要清理这张照片吗？')) return;
        }

        Store.movePhoto(currentId, target);

        var targetNames = { keep: '保留', review: '待复核', clean: '清理' };
        Utils.showToast('已移到' + targetNames[target]);

        var neighbors = findNeighbors(currentId);
        if (neighbors.next) {
          Router.navigate('/detail/' + neighbors.next.photo_id, { replace: true });
        } else if (neighbors.prev) {
          Router.navigate('/detail/' + neighbors.prev.photo_id, { replace: true });
        } else {
          setTimeout(function() {
            Router.goBack();
          }, 500);
        }
      });
    });
  }

  global.PageDetail = {
    render: render,
    onMount: onMount
  };

})(window);
