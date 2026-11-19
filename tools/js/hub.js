(function () {
  var searchEl = document.getElementById('hubSearch');
  var catBtns = document.querySelectorAll('.tools-cat-btn');
  var sections = document.querySelectorAll('.tools-section');
  var activeCat = 'all';

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
  }

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
