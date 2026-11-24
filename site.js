(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MAXSHIFT_TOP = 48;

  /* ---------- anchors: pick the visible copy (desktop or phone layout) ---------- */
  function visibleById(id) {
    var els = document.querySelectorAll('[id="' + id + '"]');
    for (var i = 0; i < els.length; i++) if (els[i].offsetParent !== null || els[i].getClientRects().length) return els[i];
    return els[0];
  }
  function goTo(id, smooth) {
    var el = visibleById(id);
    if (el) el.scrollIntoView({ behavior: smooth && !reduce ? 'smooth' : 'auto', block: 'start' });
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href');
    if (href === '#menu') { e.preventDefault(); openMenu(); return; }
    if (href === '#close-menu') { e.preventDefault(); closeMenu(); return; }
    var url = new URL(a.href, location.href);
    if (url.pathname === location.pathname && url.hash && url.hash.length > 1) {
      e.preventDefault();
      closeMenu();
      history.pushState(null, '', url.hash);
      goTo(decodeURIComponent(url.hash.slice(1)), true);
    } else if (a.closest('.menu')) {
      closeMenu();
    }
  });
  window.addEventListener('load', function () {
    if (location.hash.length > 1) goTo(decodeURIComponent(location.hash.slice(1)), false);
  });

  /* ---------- menu ---------- */
  var menu = document.querySelector('.menu');
  var lastFocus = null;
  function openMenu() {
    if (!menu) return;
    lastFocus = document.activeElement;
    menu.hidden = false;
    document.documentElement.classList.add('menu-open');
    placeDots(menu);
    var first = menu.querySelector('a[href]:not([hidden])');
    var close = Array.prototype.filter.call(menu.querySelectorAll('a[href="#close-menu"]'), function (x) { return x.offsetParent !== null; })[0];
    (close || first).focus();
  }
  function closeMenu() {
    if (!menu || menu.hidden) return;
    menu.hidden = true;
    document.documentElement.classList.remove('menu-open');
    if (lastFocus) lastFocus.focus();
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });

  /* ---------- floating punches: new spots every visit, never over text ---------- */
  var CELLS = 274, COLS = 12;
  function textRects(scope) {
    var out = [], walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT), n, r = document.createRange();
    while ((n = walker.nextNode())) {
      if (!n.textContent.trim()) continue;
      if (n.parentElement && n.parentElement.closest('.dots')) continue;
      r.selectNodeContents(n);
      var rs = r.getClientRects();
      for (var i = 0; i < rs.length; i++) out.push(rs[i]);
    }
    scope.querySelectorAll('img,video,svg,figure,input+label').forEach(function (el) { out.push(el.getBoundingClientRect()); });
    return out;
  }
  function placeDots(root) {
    (root || document).querySelectorAll('.dots').forEach(function (layer) {
      if (!layer.offsetParent && layer.getClientRects().length === 0) return;
      var box = layer.getBoundingClientRect();
      if (box.width < 50 || box.height < 50) return;
      var host = layer.parentElement, rects = textRects(host), placed = [];
      layer.querySelectorAll('.dot').forEach(function (dot) {
        var d = dot.offsetWidth || 30, pad = d * 0.5, vpad = (reduce ? 0 : MAXSHIFT_TOP) + d * 0.5, ok = false, x = 0, y = 0;
        for (var t = 0; t < 400 && !ok; t++) {
          x = Math.random() * (box.width - d - 16) + 8;
          y = Math.random() * (box.height - d - 16) + 8;
          var ax = box.left + x, ay = box.top + y;
          ok = rects.every(function (q) { return ax + d + pad < q.left || ax - pad > q.right || ay + d + vpad < q.top || ay - vpad > q.bottom; }) &&
               placed.every(function (p) { return Math.hypot(p[0] - x, p[1] - y) > d * 4; });
        }
        if (!ok) { dot.style.display = 'none'; return; }
        dot.style.display = '';
        placed.push([x, y]);
        dot.style.left = x + 'px';
        dot.style.top = y + 'px';
        var c = Math.floor(Math.random() * CELLS);
        dot.style.backgroundPosition = '-' + (c % COLS) * d + 'px -' + Math.floor(c / COLS) * d + 'px';
      });
    });
  }

  /* ---------- parallax at three speeds ---------- */
  var speed = { a: 0.05, b: 0.1, c: 0.15 }, MAXSHIFT = 48;
  var dots = [];
  function collect() {
    dots = Array.prototype.map.call(document.querySelectorAll('main .dot, .page-top .dot, footer .dot, section .dot'), function (el) {
      var k = el.classList.contains('c') ? speed.c : el.classList.contains('b') ? speed.b : speed.a;
      return { el: el, k: k, host: el.closest('.dots').parentElement };
    });
  }
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var vh = window.innerHeight;
      dots.forEach(function (o) {
        var r = o.host.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var shift = Math.max(-MAXSHIFT, Math.min(MAXSHIFT, (r.top + r.height / 2 - vh / 2) * o.k));
        o.el.style.transform = 'translate3d(0,' + shift.toFixed(1) + 'px,0)';
      });
      ticking = false;
    });
  }

  function init() {
    placeDots(document.querySelector('.site'));
    if (!reduce) { collect(); onScroll(); window.addEventListener('scroll', onScroll, { passive: true }); }
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(init); else window.addEventListener('load', init);
  var lastW = window.innerWidth, rt;
  window.addEventListener('resize', function () {
    if (Math.abs(window.innerWidth - lastW) < 40) return;
    lastW = window.innerWidth;
    clearTimeout(rt);
    rt = setTimeout(function () { placeDots(document.querySelector('.site')); if (!reduce) { collect(); onScroll(); } }, 200);
  });
})();
