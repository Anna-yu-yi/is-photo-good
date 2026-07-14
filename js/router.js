(function(global) {
  'use strict';

  const routes = {};
  let currentPath = null;
  let isNavigating = false;
  let historyStack = [];

  function register(path, handler) {
    routes[path] = handler;
  }

  function parseHash() {
    const hash = window.location.hash.slice(1) || '/welcome';
    const parts = hash.split('/').filter(Boolean);
    return {
      path: '/' + (parts[0] || 'welcome'),
      params: parts.slice(1)
    };
  }

  function matchRoute(path) {
    if (routes[path]) {
      return { handler: routes[path], params: [] };
    }
    const keys = Object.keys(routes);
    for (let i = 0; i < keys.length; i++) {
      const routePath = keys[i];
      const routeParts = routePath.split('/').filter(Boolean);
      const pathParts = path.split('/').filter(Boolean);
      if (routeParts.length === pathParts.length) {
        const params = [];
        let matched = true;
        for (let j = 0; j < routeParts.length; j++) {
          if (routeParts[j].startsWith(':')) {
            params.push(pathParts[j]);
          } else if (routeParts[j] !== pathParts[j]) {
            matched = false;
            break;
          }
        }
        if (matched) {
          return { handler: routes[routePath], params: params };
        }
      }
    }
    return null;
  }

  function navigate(path, options) {
    if (isNavigating) return;
    options = options || {};
    const isBack = options.back || false;
    const silent = options.silent || false;

    if (!isBack && currentPath) {
      historyStack.push(currentPath);
    }

    if (!silent) {
      window.location.hash = '#' + path;
    }

    isNavigating = true;
    const container = document.getElementById('page-container');
    const match = matchRoute(path);
    const handler = match ? match.handler : null;
    const params = match ? match.params : [];

    if (!handler) {
      window.location.hash = '#/welcome';
      isNavigating = false;
      return;
    }

    const oldPage = container.querySelector('.page');
    const newPageHtml = handler.render ? handler.render(params) : handler(params);
    const wrapper = document.createElement('div');
    wrapper.innerHTML = newPageHtml.trim();
    const newPage = wrapper.firstElementChild;

    if (!newPage) {
      isNavigating = false;
      return;
    }

    const enterClass = isBack ? 'page-back-enter' : 'page-enter';
    const leaveClass = isBack ? 'page-back-leave-active' : 'page-leave-active';
    const enterActive = isBack ? 'page-back-enter-active' : 'page-enter-active';

    newPage.classList.add('page', enterClass);
    container.appendChild(newPage);

    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        newPage.classList.add(enterActive);
        newPage.classList.remove(enterClass);
        if (oldPage) {
          oldPage.classList.add(leaveClass);
        }
      });
    });

    setTimeout(function() {
      if (oldPage && oldPage.parentNode) {
        oldPage.parentNode.removeChild(oldPage);
      }
      newPage.classList.remove(enterActive);
      currentPath = path;
      isNavigating = false;
      if (handler.onMount) {
        try { handler.onMount(params); } catch (e) { console.error(e); }
      }
    }, 310);
  }

  function goBack() {
    if (historyStack.length > 0) {
      const prev = historyStack.pop();
      navigate(prev, { back: true });
    } else {
      navigate('/dashboard', { back: true });
    }
  }

  function getCurrentPath() {
    return currentPath;
  }

  function start() {
    const initial = parseHash();
    const match = matchRoute(initial.path);
    if (match) {
      currentPath = initial.path;
      const container = document.getElementById('page-container');
      const html = match.handler.render ? match.handler.render(initial.params) : match.handler(initial.params);
      container.innerHTML = html;
      if (match.handler.onMount) {
        try { match.handler.onMount(initial.params); } catch (e) { console.error(e); }
      }
    }

    window.addEventListener('hashchange', function() {
      const parsed = parseHash();
      if (parsed.path !== currentPath && !isNavigating) {
        navigate(parsed.path, { silent: true });
      }
    });
  }

  global.Router = {
    register: register,
    navigate: navigate,
    goBack: goBack,
    start: start,
    getCurrentPath: getCurrentPath
  };

})(window);
