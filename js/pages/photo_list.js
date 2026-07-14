(function(global) {
  'use strict';

  var selectMode = false;

  function render(params) {
    var category = params[0] || 'clean';
    var state = Store.getState();
    var photos = state.categories[category] || [];
    var selected = state.selectedPhotos || [];

    var categoryNames = {
      keep: '保留',
      review: '待复核',
      clean: '建议清理'
    };
    var name = categoryNames[category] || category;

    var gridHtml = photos.map(function(p) {
      var isSelected = selected.indexOf(p.photo_id) !== -1;
      var photoUrl = p.photo_url || Utils.getPlaceholderColor(p.palette_idx || 0);
      var isImg = p.photo_url;
      return '<div class="photo-item' + (isSelected ? ' selected' : '') + '" data-id="' + p.photo_id + '">' +
               (isImg
                 ? '<img src="' + photoUrl + '" class="photo-img" alt="" />'
                 : '<div class="photo-placeholder" style="background:' + photoUrl + ';"></div>') +
             '</div>';
    }).join('');

    if (photos.length === 0) {
      gridHtml = '<div class="empty-state">' +
                   '<div class="empty-state-title">暂无照片</div>' +
                   '<div class="empty-state-desc">这个分类下没有照片</div>' +
                 '</div>';
    }

    var toolbarHtml = selectMode
      ? ('<div class="list-toolbar">' +
           '<div class="list-toolbar-left">已选 ' + selected.length + ' 张</div>' +
           '<div class="list-toolbar-right">' +
             '<button class="toolbar-btn" id="select-all-btn">全选</button>' +
             '<button class="toolbar-btn" id="cancel-select-btn">取消</button>' +
           '</div>' +
         '</div>')
      : ('<div class="list-toolbar">' +
           '<div class="list-toolbar-left">共 ' + photos.length + ' 张</div>' +
           '<div class="list-toolbar-right">' +
             '<button class="toolbar-btn" id="enter-select-btn">选择</button>' +
           '</div>' +
         '</div>');

    var bottomHtml = '';
    if (selectMode && selected.length > 0) {
      bottomHtml = '<div class="bottom-actions">' +
        '<div style="display:flex;gap:12px;">' +
          '<button class="btn-trio btn-trio-keep" style="flex:1;" id="batch-keep-btn">移到保留</button>' +
          '<button class="btn-trio btn-trio-review" style="flex:1;" id="batch-review-btn">移到待复核</button>' +
          '<button class="btn-trio btn-trio-clean" style="flex:1;" id="batch-clean-btn">确认清理</button>' +
        '</div>' +
      '</div>';
    }

    return '<div class="page page-scrollable">' +
      '<div class="nav-bar">' +
        '<button class="nav-btn" id="list-back-btn">‹</button>' +
        '<div class="nav-title">' + name + '</div>' +
        '<div class="nav-btn" style="visibility:hidden;">›</div>' +
      '</div>' +

      toolbarHtml +

      '<div class="scrollable-content scrollable-with-bar">' +
        '<div class="photo-grid" style="padding:2px 2px ' + (selectMode ? '100px' : '20px') + ' 2px;">' +
          gridHtml +
        '</div>' +
      '</div>' +

      bottomHtml +
    '</div>';
  }

  function onMount(params) {
    var category = params[0] || 'clean';
    selectMode = false;

    var backBtn = Utils.$('#list-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', function() {
        Router.navigate('/results');
      });
    }

    var photoItems = Utils.$$('.photo-item');
    photoItems.forEach(function(item) {
      item.addEventListener('click', function() {
        var id = item.getAttribute('data-id');
        if (selectMode) {
          Store.toggleSelect(id);
          refreshView(category);
        } else {
          Store.setListCategory(category);
          Store.setCurrentPhoto(id);
          Router.navigate('/detail/' + id);
        }
      });
    });

    var enterSelectBtn = Utils.$('#enter-select-btn');
    if (enterSelectBtn) {
      enterSelectBtn.addEventListener('click', function() {
        selectMode = true;
        Store.clearSelection();
        refreshView(category);
      });
    }

    var cancelSelectBtn = Utils.$('#cancel-select-btn');
    if (cancelSelectBtn) {
      cancelSelectBtn.addEventListener('click', function() {
        selectMode = false;
        Store.clearSelection();
        refreshView(category);
      });
    }

    var selectAllBtn = Utils.$('#select-all-btn');
    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', function() {
        Store.selectAll(category);
        refreshView(category);
      });
    }

    var batchKeepBtn = Utils.$('#batch-keep-btn');
    if (batchKeepBtn) {
      batchKeepBtn.addEventListener('click', function() {
        Store.batchMove('keep');
        selectMode = false;
        Utils.showToast('已移到保留');
        refreshView(category);
      });
    }

    var batchReviewBtn = Utils.$('#batch-review-btn');
    if (batchReviewBtn) {
      batchReviewBtn.addEventListener('click', function() {
        Store.batchMove('review');
        selectMode = false;
        Utils.showToast('已移到待复核');
        refreshView(category);
      });
    }

    var batchCleanBtn = Utils.$('#batch-clean-btn');
    if (batchCleanBtn) {
      batchCleanBtn.addEventListener('click', function() {
        var state = Store.getState();
        var count = state.selectedPhotos.length;
        if (confirm('确定要清理选中的 ' + count + ' 张照片吗？')) {
          state.selectedPhotos.forEach(function(id) {
            Store.movePhoto(id, 'clean');
          });
          Store.clearSelection();
          selectMode = false;
          Utils.showToast('已清理 ' + count + ' 张');
          refreshView(category);
        }
      });
    }
  }

  function refreshView(category) {
    var oldPage = document.querySelector('.page');
    if (!oldPage) return;
    var newHtml = render([category || 'clean']);
    var wrapper = document.createElement('div');
    wrapper.innerHTML = newHtml.trim();
    var newPage = wrapper.firstElementChild;
    if (!newPage) return;
    oldPage.parentNode.replaceChild(newPage, oldPage);
    onMount([category || 'clean']);
  }

  global.PagePhotoList = {
    render: render,
    onMount: onMount
  };

})(window);
