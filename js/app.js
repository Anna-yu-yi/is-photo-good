(function(global) {
  'use strict';

  function init() {
    window.location.hash = '#/welcome';
    Store.restore();
    const state = Store.getState();

    Router.register('/welcome', PageWelcome);
    Router.register('/preferences', PagePreferences);
    Router.register('/dashboard', PageDashboard);
    Router.register('/scan', PageScan);
    Router.register('/results', PageResults);
    Router.register('/list/:category', PagePhotoList);
    Router.register('/detail/:id', PageDetail);
    Router.register('/duplicate', PageDuplicateList);
    Router.register('/duplicate/:groupId', PageDuplicateDetail);
    Router.register('/report', PageReport);

    Router.start();

    setTimeout(function() {
      if (global.ClipAnalyzer && !ClipAnalyzer.isModelReady() && !ClipAnalyzer.isModelLoading()) {
        ClipAnalyzer.loadModel().catch(function(e) {
          console.warn('Preload CLIP model failed:', e);
        });
      }
    }, 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
