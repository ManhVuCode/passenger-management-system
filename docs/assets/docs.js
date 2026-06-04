/* MPMS thesis docs — shared behavior: active top-nav, TOC scroll-spy, back-to-top. */
(function () {
  // 1. Mark the active top-nav link for the current file.
  var current = location.pathname.split('/').pop() || 'index.html';
  if (current === '') current = 'index.html';
  document.querySelectorAll('.topnav a').forEach(function (a) {
    if (a.getAttribute('href') === current) a.classList.add('active');
  });

  // 2. TOC scroll-spy.
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll('.toc a'));
  var linkByHash = {};
  var targets = [];
  tocLinks.forEach(function (a) {
    var href = a.getAttribute('href') || '';
    if (href.charAt(0) === '#') {
      var el = document.getElementById(href.slice(1));
      if (el) {
        linkByHash[href] = a;
        targets.push(el);
      }
    }
  });

  var btn = document.querySelector('.to-top');

  function onScroll() {
    // Highlight the last heading whose top has scrolled above the offset line.
    var offset = 100;
    var activeHash = null;
    for (var i = 0; i < targets.length; i++) {
      if (targets[i].getBoundingClientRect().top <= offset) {
        activeHash = '#' + targets[i].id;
      } else {
        break;
      }
    }
    tocLinks.forEach(function (a) { a.classList.remove('active'); });
    if (activeHash && linkByHash[activeHash]) linkByHash[activeHash].classList.add('active');

    if (btn) {
      var top = window.scrollY || document.documentElement.scrollTop;
      if (top > 400) btn.classList.add('visible');
      else btn.classList.remove('visible');
    }
  }

  if (btn) {
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();
})();
