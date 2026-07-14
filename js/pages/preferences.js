(function(global) {
  'use strict';

  var KEEP_OPTIONS = [
    { key: 'landscape', label: '风景照片', desc: '自然风光、山川湖海', icon: '🏔️',
      sceneTags: ['nature', 'travel', 'landscape', 'mountain', 'sea', 'sunset', 'park'] },
    { key: 'people', label: '人物合照', desc: '家人、朋友、聚会合影', icon: '👥',
      sceneTags: ['family', 'friends', 'gathering', 'people', 'group_people'] },
    { key: 'food', label: '食物实拍', desc: '美食、餐厅、下午茶', icon: '🍜',
      sceneTags: ['food', 'dining'] },
    { key: 'closeup', label: '小物件特写', desc: '手办、文具、小物品', icon: '📸',
      sceneTags: ['closeup', 'object', 'detail'] }
  ];

  var DELETE_OPTIONS = [
    { key: 'qr_code', label: '含二维码', desc: '付款码、扫码截图', icon: '📱',
      screenshotType: 'qr_code' },
    { key: 'verify_code', label: '验证码', desc: '短信验证码、图形验证码', icon: '🔢',
      screenshotType: 'verify_code' },
    { key: 'video_frame', label: '视频截图', desc: '电影、短视频截帧', icon: '🎬',
      screenshotType: 'video' },
    { key: 'text_screenshot', label: '纯文本截图', desc: '聊天记录、纯文字页面', icon: '💬',
      screenshotType: 'chat' },
    { key: 'ppt_screenshot', label: 'PPT 截图', desc: '幻灯片、课件截图', icon: '📊',
      screenshotType: 'ppt' },
    { key: 'edited', label: '二次编辑图片', desc: '红笔标注、手画圈圈', icon: '✏️',
      screenshotType: 'edited' }
  ];

  var selectedKeep = [];
  var selectedDelete = [];

  function render() {
    var state = Store.getState();
    if (state.preferences) {
      selectedKeep = state.preferences.keep || [];
      selectedDelete = state.preferences.delete || [];
    }

    var keepHtml = KEEP_OPTIONS.map(function(item) {
      var isSelected = selectedKeep.indexOf(item.key) !== -1;
      return '<div class="pref-card ' + (isSelected ? 'pref-card-selected' : '') + '" data-type="keep" data-key="' + item.key + '">' +
        '<div class="pref-icon">' + item.icon + '</div>' +
        '<div class="pref-info">' +
          '<div class="pref-label">' + item.label + '</div>' +
          '<div class="pref-desc">' + item.desc + '</div>' +
        '</div>' +
        '<div class="pref-check">' + (isSelected ? '✓' : '') + '</div>' +
      '</div>';
    }).join('');

    var deleteHtml = DELETE_OPTIONS.map(function(item) {
      var isSelected = selectedDelete.indexOf(item.key) !== -1;
      return '<div class="pref-card ' + (isSelected ? 'pref-card-selected' : '') + '" data-type="delete" data-key="' + item.key + '">' +
        '<div class="pref-icon">' + item.icon + '</div>' +
        '<div class="pref-info">' +
          '<div class="pref-label">' + item.label + '</div>' +
          '<div class="pref-desc">' + item.desc + '</div>' +
        '</div>' +
        '<div class="pref-check">' + (isSelected ? '✓' : '') + '</div>' +
      '</div>';
    }).join('');

    var totalSelected = selectedKeep.length + selectedDelete.length;

    return '<div class="page page-scrollable">' +
      '<div class="nav-bar">' +
        '<button class="nav-btn" id="pref-back-btn">‹</button>' +
        '<div class="nav-title">分析偏好</div>' +
        '<div class="nav-btn" style="visibility:hidden;">›</div>' +
      '</div>' +

      '<div class="scrollable-content scrollable-with-bar">' +

        '<div style="padding:20px 20px 8px;">' +
          '<div style="font-size:20px;font-weight:600;margin-bottom:6px;">自定义你的保留标准</div>' +
          '<div style="font-size:14px;color:var(--color-text-secondary);line-height:1.5;">选择你希望优先保留和优先清理的照片类型，AI 会根据你的偏好调整评分。</div>' +
        '</div>' +

        '<div class="pref-section">' +
          '<div class="pref-section-title">' +
            '<span class="pref-section-dot" style="background:var(--color-keep);"></span>' +
            '优先保留' +
          '</div>' +
          keepHtml +
        '</div>' +

        '<div class="pref-section">' +
          '<div class="pref-section-title">' +
            '<span class="pref-section-dot" style="background:var(--color-clean);"></span>' +
            '优先删除' +
          '</div>' +
          deleteHtml +
        '</div>' +

      '</div>' +

      '<div class="bottom-actions">' +
        '<button class="btn-primary" id="start-scan-btn" ' + (totalSelected === 0 ? '' : '') + '>' +
          '开始智能扫描' +
          (totalSelected > 0 ? '（已选 ' + totalSelected + ' 项）' : '') +
        '</button>' +
      '</div>' +
    '</div>';
  }

  function toggleSelection(type, key) {
    if (type === 'keep') {
      var idx = selectedKeep.indexOf(key);
      if (idx === -1) {
        selectedKeep.push(key);
      } else {
        selectedKeep.splice(idx, 1);
      }
    } else {
      var idx2 = selectedDelete.indexOf(key);
      if (idx2 === -1) {
        selectedDelete.push(key);
      } else {
        selectedDelete.splice(idx2, 1);
      }
    }
  }

  function updateUI() {
    var cards = Utils.$$('.pref-card');
    cards.forEach(function(card) {
      var type = card.getAttribute('data-type');
      var key = card.getAttribute('data-key');
      var isSelected = (type === 'keep' ? selectedKeep : selectedDelete).indexOf(key) !== -1;
      if (isSelected) {
        card.classList.add('pref-card-selected');
        card.querySelector('.pref-check').textContent = '✓';
      } else {
        card.classList.remove('pref-card-selected');
        card.querySelector('.pref-check').textContent = '';
      }
    });

    var totalSelected = selectedKeep.length + selectedDelete.length;
    var btn = Utils.$('#start-scan-btn');
    if (btn) {
      btn.textContent = '开始智能扫描' + (totalSelected > 0 ? '（已选 ' + totalSelected + ' 项）' : '');
    }
  }

  function onMount() {
    var backBtn = Utils.$('#pref-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', function() {
        Router.goBack();
      });
    }

    var cards = Utils.$$('.pref-card');
    cards.forEach(function(card) {
      card.addEventListener('click', function() {
        var type = card.getAttribute('data-type');
        var key = card.getAttribute('data-key');
        toggleSelection(type, key);
        updateUI();
      });
    });

    var startBtn = Utils.$('#start-scan-btn');
    if (startBtn) {
      startBtn.addEventListener('click', function() {
        var keepTags = [];
        KEEP_OPTIONS.forEach(function(item) {
          if (selectedKeep.indexOf(item.key) !== -1) {
            keepTags = keepTags.concat(item.sceneTags || []);
          }
        });

        var deleteTypes = [];
        DELETE_OPTIONS.forEach(function(item) {
          if (selectedDelete.indexOf(item.key) !== -1) {
            deleteTypes.push(item.screenshotType);
          }
        });

        Store.setPreferences({
          keep: selectedKeep.slice(),
          delete: selectedDelete.slice(),
          keepTags: keepTags,
          deleteTypes: deleteTypes
        });

        Router.navigate('/scan');
      });
    }
  }

  global.PagePreferences = {
    render: render,
    onMount: onMount,
    KEEP_OPTIONS: KEEP_OPTIONS,
    DELETE_OPTIONS: DELETE_OPTIONS
  };

})(window);
