(function(global) {
  'use strict';

  const STORAGE_KEY = 'memai_store_v1';

  const defaultState = {
    scanStatus: 'idle',
    photos: [],
    categories: {
      keep: [],
      review: [],
      clean: []
    },
    scanStats: {
      total: 0,
      screenshot: 0,
      duplicate: 0,
      duplicateGroups: 0,
      blurry: 0,
      highValue: 0,
      releasableBytes: 0
    },
    distribution: {
      scenery: 0,
      people: 0,
      screenshot: 0,
      daily: 0
    },
    aiInsights: [],
    currentPhotoId: null,
    report: null,
    selectedPhotos: [],
    listCategory: null,
    currentDuplicateGroupId: null,
    uploadStatus: 'idle',
    uploadedCount: 0,
    useDemoData: false,
    profile: null,
    preferences: {
      keep: [],
      delete: []
    }
  };

  const listeners = new Set();
  let state = deepClone(defaultState);

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function setState(patch) {
    state = Object.assign({}, state, patch);
    persist();
    notify();
  }

  function getState() {
    return state;
  }

  function subscribe(callback) {
    listeners.add(callback);
    return function unsubscribe() {
      listeners.delete(callback);
    };
  }

  function notify() {
    listeners.forEach(function(fn) {
      try { fn(state); } catch (e) { console.error(e); }
    });
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('localStorage not available:', e);
    }
  }

  function restore() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        state = Object.assign({}, defaultState, parsed);
        return true;
      }
    } catch (e) {
      console.warn('Failed to restore state:', e);
    }
    return false;
  }

  function reset() {
    state = deepClone(defaultState);
    persist();
    notify();
  }

  function initPhotos(photos) {
    setState({
      photos: photos,
      scanStats: Object.assign({}, state.scanStats, { total: photos.length })
    });
  }

  function setProfile(profileKey) {
    setState({ profile: profileKey });
  }

  function setPhotos(photos) {
    setState({
      photos: photos,
      scanStats: Object.assign({}, state.scanStats, { total: photos.length })
    });
  }

  function updateCategories(categories, scanStats, distribution, insights, allPhotos) {
    setState({
      categories: categories,
      scanStats: scanStats,
      distribution: distribution,
      aiInsights: insights,
      scanStatus: 'completed',
      allPhotos: allPhotos || []
    });
  }

  function setScanStatus(status) {
    setState({ scanStatus: status });
  }

  function movePhoto(photoId, targetCategory) {
    const cats = deepClone(state.categories);
    let found = false;
    let photo = null;

    ['keep', 'review', 'clean'].forEach(function(cat) {
      const idx = cats[cat].findIndex(function(p) { return p.photo_id === photoId; });
      if (idx !== -1) {
        photo = cats[cat].splice(idx, 1)[0];
        found = true;
      }
    });

    if (found && photo) {
      photo.category = targetCategory;
      cats[targetCategory].push(photo);
      const updatedPhotos = state.photos.map(function(p) {
        if (p.photo_id === photoId) {
          return Object.assign({}, p, { category: targetCategory });
        }
        return p;
      });
      setState({ categories: cats, photos: updatedPhotos });
      return true;
    }
    return false;
  }

  function confirmClean() {
    const cleanPhotos = state.categories.clean;
    const totalBytes = cleanPhotos.reduce(function(sum, p) {
      return sum + (p.file_size_bytes || 0);
    }, 0);

    const screenshotClean = cleanPhotos.filter(function(p) { return p.analysis && p.analysis.is_screenshot; }).length;
    const blurryClean = cleanPhotos.filter(function(p) { return p.analysis && p.analysis.clarity_score < 0.5; }).length;

    const screenshotBytes = cleanPhotos.filter(function(p) { return p.analysis && p.analysis.is_screenshot; })
      .reduce(function(sum, p) { return sum + p.file_size_bytes; }, 0);
    const blurryBytes = cleanPhotos.filter(function(p) { return p.analysis && p.analysis.clarity_score < 0.5; })
      .reduce(function(sum, p) { return sum + p.file_size_bytes; }, 0);

    const healthScore = Math.round(70 + Math.random() * 10);

    const report = {
      cleanedCount: cleanPhotos.length,
      freedBytes: totalBytes,
      healthScore: healthScore,
      screenshotCount: screenshotClean,
      screenshotBytes: screenshotBytes,
      duplicateCount: 0,
      duplicateBytes: 0,
      blurryCount: blurryClean,
      blurryBytes: blurryBytes
    };

    const newClean = [];
    const newPhotos = state.allPhotos ? state.allPhotos.filter(function(p) {
      return p.category !== 'clean';
    }) : [];

    setState({
      categories: Object.assign({}, state.categories, { clean: newClean }),
      photos: newPhotos,
      report: report,
      scanStats: Object.assign({}, state.scanStats, {
        releasableBytes: 0,
        total: newPhotos.length
      })
    });

    return report;
  }

  function setCurrentPhoto(id) {
    setState({ currentPhotoId: id });
  }

  function setListCategory(cat) {
    setState({ listCategory: cat, selectedPhotos: [] });
  }

  function toggleSelect(photoId) {
    const selected = state.selectedPhotos.slice();
    const idx = selected.indexOf(photoId);
    if (idx === -1) {
      selected.push(photoId);
    } else {
      selected.splice(idx, 1);
    }
    setState({ selectedPhotos: selected });
  }

  function selectAll(cat) {
    const photos = state.categories[cat] || [];
    const ids = photos.map(function(p) { return p.photo_id; });
    setState({ selectedPhotos: ids });
  }

  function clearSelection() {
    setState({ selectedPhotos: [] });
  }

  function batchMove(targetCategory) {
    const ids = state.selectedPhotos;
    if (ids.length === 0) return;

    ids.forEach(function(id) {
      movePhoto(id, targetCategory);
    });
    setState({ selectedPhotos: [] });
  }

  function getDuplicateGroups() {
    const allPhotos = state.allPhotos || [];
    const groupMap = {};

    allPhotos.forEach(function(p) {
      if (p.analysis && p.analysis.is_duplicate && p.analysis.duplicate_group_id) {
        const gid = p.analysis.duplicate_group_id;
        if (!groupMap[gid]) {
          groupMap[gid] = [];
        }
        groupMap[gid].push(p);
      }
    });

    const groups = Object.keys(groupMap).map(function(gid) {
      const photos = groupMap[gid];
      const bestPhoto = photos.reduce(function(best, current) {
        const bestScore = (best.score || 0) + (best.analysis ? best.analysis.clarity_score || 0 : 0);
        const currentScore = (current.score || 0) + (current.analysis ? current.analysis.clarity_score || 0 : 0);
        return currentScore > bestScore ? current : best;
      }, photos[0]);

      return {
        group_id: gid,
        photos: photos,
        count: photos.length,
        best_photo: bestPhoto
      };
    });

    groups.sort(function(a, b) {
      return b.count - a.count;
    });

    return groups;
  }

  function getDuplicateGroup(groupId) {
    const groups = getDuplicateGroups();
    return groups.find(function(g) { return g.group_id === groupId; }) || null;
  }

  function setCurrentDuplicateGroup(groupId) {
    setState({ currentDuplicateGroupId: groupId });
  }

  function keepDuplicatePhoto(groupId, photoId) {
    const group = getDuplicateGroup(groupId);
    if (!group) return false;

    const cats = deepClone(state.categories);
    const newAllPhotos = state.allPhotos ? deepClone(state.allPhotos) : [];

    group.photos.forEach(function(p) {
      if (p.photo_id === photoId) {
        const keepPhoto = Object.assign({}, p, { category: 'keep' });
        cats.keep.push(keepPhoto);
        const idx = newAllPhotos.findIndex(function(ap) { return ap.photo_id === p.photo_id; });
        if (idx !== -1) {
          newAllPhotos[idx] = Object.assign({}, newAllPhotos[idx], { category: 'keep' });
        }
      } else {
        const cleanPhoto = Object.assign({}, p, { category: 'clean' });
        cats.clean.push(cleanPhoto);
        const idx = newAllPhotos.findIndex(function(ap) { return ap.photo_id === p.photo_id; });
        if (idx !== -1) {
          newAllPhotos[idx] = Object.assign({}, newAllPhotos[idx], { category: 'clean' });
        }
      }
    });

    cats.keep.sort(function(a, b) { return b.score - a.score; });
    cats.clean.sort(function(a, b) { return b.score - a.score; });

    setState({ categories: cats, allPhotos: newAllPhotos });
    return true;
  }

  function setUploadStatus(status, count) {
    const patch = { uploadStatus: status };
    if (count !== undefined) {
      patch.uploadedCount = count;
    }
    setState(patch);
  }

  function setUseDemoData(value) {
    setState({ useDemoData: value });
  }

  function setPreferences(preferences) {
    setState({ preferences: preferences });
  }

  global.Store = {
    getState: getState,
    setState: setState,
    subscribe: subscribe,
    reset: reset,
    restore: restore,
    initPhotos: initPhotos,
    setPhotos: setPhotos,
    updateCategories: updateCategories,
    setScanStatus: setScanStatus,
    movePhoto: movePhoto,
    confirmClean: confirmClean,
    setCurrentPhoto: setCurrentPhoto,
    setListCategory: setListCategory,
    toggleSelect: toggleSelect,
    selectAll: selectAll,
    clearSelection: clearSelection,
    batchMove: batchMove,
    getDuplicateGroups: getDuplicateGroups,
    getDuplicateGroup: getDuplicateGroup,
    setCurrentDuplicateGroup: setCurrentDuplicateGroup,
    keepDuplicatePhoto: keepDuplicatePhoto,
    setUploadStatus: setUploadStatus,
    setUseDemoData: setUseDemoData,
    setProfile: setProfile,
    setPreferences: setPreferences
  };

})(window);
