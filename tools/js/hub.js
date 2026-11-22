(function () {
  var searchEl = document.getElementById('hubSearch');
  var catBtns = document.querySelectorAll('.tools-cat-btn');
  var sections = document.querySelectorAll('.tools-section');
  var pinnedSection = document.getElementById('hubPinnedSection');
  var pinnedGrid = document.getElementById('hubPinnedGrid');
  var activeCat = 'all';

  var tc = window.ToolsCommon;

  function getSlugFromCard(card) {
    var href = card.getAttribute('href') || '';
    var m = href.match(/\/tools\/([^/]+)\//);
    return m ? m[1] : '';
  }

  function getFavs() {
    return tc ? tc.getJsonStore(tc.FAV_KEY, []) : [];
  }

  function getRecents() {
    return tc ? tc.getJsonStore(tc.RECENT_KEY, []) : [];
  }

  function toggleFav(slug) {
    if (!tc || !slug) return;
    var favs = getFavs();
    var idx = favs.indexOf(slug);
    if (idx !== -1) {
      favs.splice(idx, 1);
      tc.notify('已取消收藏');
    } else {
      favs.unshift(slug);
      tc.notify('已收藏到置顶区');
    }
    tc.setJsonStore(tc.FAV_KEY, favs);
    syncFavButtons();
    renderPinned();
  }

  function attachFavButton(card, slug) {
    var top = card.querySelector('.tool-hub-top');
    if (!top) return;
    var arrow = top.querySelector('.tool-hub-arrow');
    var actions = top.querySelector('.tool-hub-actions');
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'tool-hub-actions';
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tool-fav-btn';
      btn.setAttribute('data-fav-slug', slug);
      btn.title = '收藏 / 取消收藏';
      btn.textContent = '★';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        toggleFav(slug);
      });
      actions.appendChild(btn);
      if (arrow) actions.appendChild(arrow);
      top.appendChild(actions);
    }
  }

  function syncFavButtons() {
    var favs = getFavs();
    document.querySelectorAll('.tool-fav-btn[data-fav-slug]').forEach(function (btn) {
      var slug = btn.getAttribute('data-fav-slug');
      if (favs.indexOf(slug) !== -1) btn.classList.add('is-fav');
      else btn.classList.remove('is-fav');
    });
  }

  function renderPinned() {
    if (!pinnedSection || !pinnedGrid) return;
    var kw = (searchEl && searchEl.value || '').trim();
    if (kw || activeCat !== 'all') {
      pinnedSection.style.display = 'none';
      return;
    }

    var favs = getFavs();
    var recents = getRecents();
    var merged = [];
    favs.concat(recents).forEach(function (slug) {
      if (slug && merged.indexOf(slug) === -1) merged.push(slug);
    });
    merged = merged.slice(0, 6);

    if (!merged.length) {
      pinnedSection.style.display = 'none';
      return;
    }

    pinnedGrid.innerHTML = '';
    merged.forEach(function (slug) {
      var orig = document.querySelector('.tools-section .tool-hub-card[href="/tools/' + slug + '/"]');
      if (!orig) return;
      var clone = orig.cloneNode(true);
      clone.style.display = 'flex';
      var cloneBtn = clone.querySelector('.tool-fav-btn');
      if (cloneBtn) {
        cloneBtn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          toggleFav(slug);
        });
      }
      pinnedGrid.appendChild(clone);
    });

    pinnedSection.style.display = pinnedGrid.children.length ? 'block' : 'none';
    syncFavButtons();
  }

  function applyFilter() {
    var kw = (searchEl.value || '').trim().toLowerCase();
    sections.forEach(function (sec) {
      var secCat = sec.getAttribute('data-cat');
      var catMatch = activeCat === 'all' || secCat === activeCat;
      if (!catMatch) {
        sec.style.display = 'none';
        return;
      }
      var cards = sec.querySelectorAll('.tool-hub-card');
      var visibleCount = 0;
      cards.forEach(function (card) {
        var text = (card.textContent + ' ' + (card.getAttribute('data-keywords') || '')).toLowerCase();
        var show = !kw || text.indexOf(kw) !== -1;
        card.style.display = show ? 'flex' : 'none';
        if (show) visibleCount++;
      });
      sec.style.display = visibleCount > 0 ? 'block' : 'none';
    });
    renderPinned();
  }

  document.querySelectorAll('.tools-section .tool-hub-card').forEach(function (card) {
    var slug = getSlugFromCard(card);
    if (slug) attachFavButton(card, slug);
  });
  syncFavButtons();
  renderPinned();

  catBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      catBtns.forEach(function (b) { b.classList.remove('is-active'); });
      btn.classList.add('is-active');
      activeCat = btn.getAttribute('data-cat');
      applyFilter();
    });
  });

  if (searchEl) {
    searchEl.addEventListener('input', applyFilter);
  }
})();
