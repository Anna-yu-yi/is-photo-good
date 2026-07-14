(function(global) {
  'use strict';

  function formatFileSize(bytes) {
    if (!bytes || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) {
      size /= 1024;
      i++;
    }
    return size.toFixed(size >= 10 || i === 0 ? 0 : 1) + ' ' + units[i];
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function formatDateShort(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    return y + '年' + m + '月' + day + '日';
  }

  function yearsAgo(dateStr) {
    if (!dateStr) return 0;
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  }

  function animateNumber(el, target, duration) {
    duration = duration || 800;
    const start = parseFloat(el.textContent.replace(/,/g, '')) || 0;
    const startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (target - start) * eased);
      el.textContent = current.toLocaleString();
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }
    requestAnimationFrame(step);
  }

  function animateProgress(el, targetPercent, duration) {
    duration = duration || 600;
    const startTime = performance.now();
    const start = 0;

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (targetPercent - start) * eased;
      el.style.width = current + '%';
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }
    requestAnimationFrame(step);
  }

  function animateRing(el, percent, duration) {
    duration = duration || 600;
    const startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentPercent = percent * eased;
      const deg = currentPercent * 3.6;
      el.style.background = 'conic-gradient(var(--color-primary) ' + deg + 'deg, var(--color-primary-light) ' + deg + 'deg)';
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }
    requestAnimationFrame(step);
  }

  function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(function() {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 2200);
  }

  function $(selector, context) {
    return (context || document).querySelector(selector);
  }

  function $$(selector, context) {
    return Array.from((context || document).querySelectorAll(selector));
  }

  function createEl(tag, className, html) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (html !== undefined) el.innerHTML = html;
    return el;
  }

  function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function generateGradient(colors, angle) {
    angle = angle || 135;
    return 'linear-gradient(' + angle + 'deg, ' + colors.join(', ') + ')';
  }

  function getPlaceholderColor(seed) {
    const palettes = [
      ['#A8E6CF', '#7FD4B0'],
      ['#C8F0DC', '#A8E6CF'],
      ['#B8E0D2', '#7FBEAF'],
      ['#E8F5F0', '#C8F0DC'],
      ['#D4EDDA', '#A8E6CF'],
      ['#F5EFE0', '#E8D4A0'],
      ['#F5E6E6', '#E8C4C4'],
      ['#E5F5FF', '#B8E0F0'],
      ['#F0E8F5', '#D4B8E0'],
      ['#FFF0E0', '#FFD4A8'],
    ];
    const idx = (seed || 0) % palettes.length;
    return generateGradient(palettes[idx], 180);
  }

  function debounce(fn, delay) {
    let timer = null;
    return function() {
      const args = arguments;
      const ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function() {
        fn.apply(ctx, args);
      }, delay);
    };
  }

  global.Utils = {
    formatFileSize: formatFileSize,
    formatDate: formatDate,
    formatDateShort: formatDateShort,
    yearsAgo: yearsAgo,
    animateNumber: animateNumber,
    animateProgress: animateProgress,
    animateRing: animateRing,
    showToast: showToast,
    $: $,
    $$: $$,
    createEl: createEl,
    randomFrom: randomFrom,
    shuffle: shuffle,
    clamp: clamp,
    generateGradient: generateGradient,
    getPlaceholderColor: getPlaceholderColor,
    debounce: debounce
  };

})(window);
