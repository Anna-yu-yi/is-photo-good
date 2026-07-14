(function(global) {
  'use strict';

  function render() {
    var groups = Store.getDuplicateGroups();

    return '<div class="page page-scrollable">' +
      '<div class="nav-bar">' +
        '<button class="nav-btn" id="dup-list-back-btn">‹</button>' +
        '<div class="nav-title">重复照片</div>' +
        '<div class="nav-btn" style="visibility:hidden;">⋯</div>' +
      '</div>' +

      '<div class="scrollable-content scrollable-with-bar">' +
        '<div class="page-content" style="padding-bottom:100px;">' +

          '<div class="dup-list-header">' +
            '<div class="dup-list-count">共发现 ' + groups.length + ' 组重复照片</div>' +
            '<div class="dup-list-desc">每组保留一张最优照片，其余可清理</div>' +
          '</div>' +

          '<div class="dup-list-groups">' +
            groups.map(function(group) {
              var best = group.best_photo;
              var photoUrl = best.photo_url || Utils.getPlaceholderColor(best.palette_idx || 0);
              var isImg = !!best.photo_url;
              var savedBytes = group.photos.slice(1).reduce(function(sum, p) {
                return sum + (p.file_size_bytes || 0);
              }, 0);

              var previewsHtml = group.photos.slice(0, 4).map(function(p, i) {
                var url = p.photo_url || Utils.getPlaceholderColor(p.palette_idx || 0);
                var hasImg = !!p.photo_url;
                return '<div class="dup-group-thumb" style="z-index:' + (4 - i) + '; left:' + (i * 20) + 'px;">' +
                         (hasImg ? '<img src="' + url + '" alt="" />' : '<div style="width:100%;height:100%;background:' + url + ';"></div>') +
                       '</div>';
              }).join('');

              return '<div class="dup-group-card" data-id="' + group.group_id + '">' +
                       '<div class="dup-group-left">' +
                         '<div class="dup-group-thumbs">' +
                           previewsHtml +
                         '</div>' +
                       '</div>' +
                       '<div class="dup-group-info">' +
                         '<div class="dup-group-title">' + group.count + ' 张相似照片</div>' +
                         '<div class="dup-group-reason">AI 推荐保留第 1 张</div>' +
                         '<div class="dup-group-size">可释放 ' + Utils.formatFileSize(savedBytes) + '</div>' +
                       '</div>' +
                       '<div class="dup-group-arrow">›</div>' +
                     '</div>';
            }).join('') +
          '</div>' +

          (groups.length === 0 ?
            '<div class="empty-state" style="padding-top:80px;">' +
              '<div class="empty-state-title">没有重复照片</div>' +
              '<div class="empty-state-desc">你的相册整理得很不错</div>' +
            '</div>' : '') +

        '</div>' +
      '</div>' +

      (groups.length > 0 ? '<div class="bottom-actions">' +
        '<button class="btn-primary" id="dup-auto-keep-btn">一键保留最优（' + groups.length + ' 组）</button>' +
      '</div>' : '') +
    '</div>';
  }

  function onMount() {
    var backBtn = Utils.$('#dup-list-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', function() {
        Router.goBack();
      });
    }

    var groupCards = Utils.$$('.dup-group-card');
    groupCards.forEach(function(card) {
      card.addEventListener('click', function() {
        var groupId = card.getAttribute('data-id');
        Store.setCurrentDuplicateGroup(groupId);
        Router.navigate('/duplicate/' + groupId);
      });
    });

    var autoKeepBtn = Utils.$('#dup-auto-keep-btn');
    if (autoKeepBtn) {
      autoKeepBtn.addEventListener('click', function() {
        if (confirm('确定让 AI 自动保留每组最优照片吗？其余重复照片将被标记为清理。')) {
          var groups = Store.getDuplicateGroups();
          groups.forEach(function(group) {
            Store.keepDuplicatePhoto(group.group_id, group.best_photo.photo_id);
          });
          Utils.showToast('已自动处理 ' + groups.length + ' 组重复照片');
          setTimeout(function() {
            Router.goBack();
          }, 500);
        }
      });
    }
  }

  global.PageDuplicateList = {
    render: render,
    onMount: onMount
  };

})(window);
