/* ChromaFix LP */
(function () {
  'use strict';

  var doc = document.documentElement;
  doc.classList.add('js');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- header: shadow on scroll ---------- */
  var header = document.querySelector('[data-header]');
  if (header) {
    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- mobile menu ---------- */
  var menuBtn = document.querySelector('[data-menu-btn]');
  var nav = document.querySelector('[data-nav]');
  if (menuBtn && nav) {
    var setMenu = function (open) {
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
      nav.classList.toggle('is-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    };
    menuBtn.addEventListener('click', function () {
      setMenu(menuBtn.getAttribute('aria-expanded') !== 'true');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); menuBtn.focus(); }
    });
    window.matchMedia('(min-width: 1024px)').addEventListener('change', function (mq) {
      if (mq.matches) setMenu(false);
    });
  }

  /* ---------- before / after slider ---------- */
  function initBA(root) {
    var handle = root.querySelector('.ba__handle');
    var pos = 50;
    var dragging = false;

    function set(p) {
      pos = Math.max(0, Math.min(100, p));
      root.style.setProperty('--pos', pos + '%');
      if (handle) {
        handle.setAttribute('aria-valuenow', String(Math.round(pos)));
        handle.setAttribute('aria-valuetext', '補正前 ' + Math.round(pos) + '% ／ 補正後 ' + (100 - Math.round(pos)) + '%');
      }
    }
    function fromEvent(e) {
      var r = root.getBoundingClientRect();
      return ((e.clientX - r.left) / r.width) * 100;
    }

    root.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      dragging = true;
      root.stopHint && root.stopHint();
      root.classList.add('is-dragging');
      try { root.setPointerCapture(e.pointerId); } catch (_) {}
      set(fromEvent(e));
    });
    root.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      set(fromEvent(e));
    });
    var end = function () { dragging = false; root.classList.remove('is-dragging'); };
    root.addEventListener('pointerup', end);
    root.addEventListener('pointercancel', end);
    root.addEventListener('lostpointercapture', end);

    if (handle) {
      handle.addEventListener('keydown', function (e) {
        var step = e.shiftKey ? 10 : 2;
        var map = { ArrowLeft: -step, ArrowDown: -step, ArrowRight: step, ArrowUp: step };
        if (e.key in map) { e.preventDefault(); root.stopHint && root.stopHint(); set(pos + map[e.key]); }
        else if (e.key === 'Home') { e.preventDefault(); set(0); }
        else if (e.key === 'End') { e.preventDefault(); set(100); }
      });
    }

    set(50);

    // さりげなく動かして「触れる」ことを伝える
    if (root.hasAttribute('data-ba-hint') && !reduceMotion && 'IntersectionObserver' in window) {
      var raf = 0, stopped = false;
      root.stopHint = function () { stopped = true; cancelAnimationFrame(raf); };
      var io = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        var keys = [[0, 50], [700, 26], [1500, 74], [2200, 50]];
        var t0 = null;
        var ease = function (t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
        var tick = function (ts) {
          if (stopped) return;
          if (t0 === null) t0 = ts;
          var t = ts - t0 - 600;
          if (t < 0) { raf = requestAnimationFrame(tick); return; }
          for (var i = 1; i < keys.length; i++) {
            if (t <= keys[i][0]) {
              var a = keys[i - 1], b = keys[i];
              var k = ease((t - a[0]) / (b[0] - a[0]));
              set(a[1] + (b[1] - a[1]) * k);
              raf = requestAnimationFrame(tick);
              return;
            }
          }
          set(50);
        };
        raf = requestAnimationFrame(tick);
      }, { threshold: 0.5 });
      io.observe(root);
    }
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-ba]'), initBA);

  /* ---------- lineup toggle ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-lineup]'), function (root) {
    var btns = root.querySelectorAll('[data-show]');
    var auto = null;
    function show(state) {
      root.classList.toggle('is-after', state === 'after');
      Array.prototype.forEach.call(btns, function (b) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-show') === state));
      });
    }
    Array.prototype.forEach.call(btns, function (b) {
      b.addEventListener('click', function () {
        if (auto) { clearInterval(auto); auto = null; }
        show(b.getAttribute('data-show'));
      });
    });
    // 見えたら一度だけ自動で切り替えて見せる
    if (!reduceMotion && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        var n = 0;
        auto = setInterval(function () {
          n++;
          show(n % 2 ? 'after' : 'before');
          if (n >= 3) { clearInterval(auto); auto = null; show('after'); }
        }, 1600);
      }, { threshold: 0.6 });
      io.observe(root);
    }
  });

  /* ---------- labor cost simulator ---------- */
  var sim = document.querySelector('[data-sim]');
  if (sim) {
    var range = sim.querySelector('[data-sim-range]');
    var price = parseFloat(sim.getAttribute('data-price')) || 25; // ChromaFix 月額（万円・税別）
    var SCALE = 1100; // 棒グラフの最大値（万円/年）
    var out = function (k) { return sim.querySelector('[data-out="' + k + '"]'); };
    var fmt = function (v) { return Math.round(v).toLocaleString('ja-JP'); };

    var update = function () {
      var net = parseFloat(range.value);
      // 手取り ≒ 額面の78% として逆算。会社負担の社会保険料 ≒ 額面の15.5%（いずれも目安）
      var gross = net / 0.78;
      var tax = gross - net;
      var co = gross * 0.155;
      var month = gross + co;
      var year = month * 12;
      var usYear = price * 12;

      sim.querySelector('[data-sim-takehome] .mono').textContent = net;
      range.style.setProperty('--fill', ((net - range.min) / (range.max - range.min)) * 100 + '%');
      out('net').textContent = fmt(net);
      out('tax').textContent = fmt(tax);
      out('co').textContent = fmt(co);
      out('month').textContent = fmt(month);
      out('year').textContent = fmt(year);
      out('usyear').textContent = fmt(usYear);
      out('diff').textContent = fmt(Math.max(0, year - usYear));

      var staffBar = sim.querySelector('[data-bar="staff"]');
      staffBar.style.width = Math.min(100, (year / SCALE) * 100) + '%';
      staffBar.querySelector('[data-seg="net"]').style.flexBasis = (net / month) * 100 + '%';
      staffBar.querySelector('[data-seg="tax"]').style.flexBasis = (tax / month) * 100 + '%';
      staffBar.querySelector('[data-seg="co"]').style.flexBasis = (co / month) * 100 + '%';
      sim.querySelector('[data-bar="us"]').style.width = Math.min(100, (usYear / SCALE) * 100) + '%';
    };
    range.addEventListener('input', update);
    update();
  }

  /* ---------- reveal on scroll ---------- */
  if (!reduceMotion && 'IntersectionObserver' in window) {
    var targets = document.querySelectorAll(
      '.section-head, .problem, .problems__answer, .sim, .saving, .ai-point, .compare, .case, .parts__figure, .parts__legend li, .material, .step, .qa, .form'
    );
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); ro.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    Array.prototype.forEach.call(targets, function (el) { el.classList.add('reveal'); ro.observe(el); });
  }

  /* ---------- contact form ---------- */
  var form = document.querySelector('[data-form]');
  if (form) {
    var status = form.querySelector('[data-status]');
    var submit = form.querySelector('[data-submit]');
    var messages = {
      name: 'お名前を入力してください。',
      email: 'メールアドレスを正しく入力してください。',
      tel: '電話番号は数字とハイフンで入力してください。',
      agree: 'プライバシーポリシーへの同意が必要です。'
    };

    var setError = function (name, msg) {
      var p = form.querySelector('[data-error-for="' + name + '"]');
      var input = form.elements[name];
      if (p) p.textContent = msg || '';
      if (input && input.setAttribute) {
        if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
      }
    };

    var validate = function () {
      var errors = {};
      var v = function (n) { return (form.elements[n].value || '').trim(); };
      if (!v('name')) errors.name = messages.name;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('email'))) errors.email = messages.email;
      if (v('tel') && !/^[0-9０-９+\-－() ]{8,20}$/.test(v('tel'))) errors.tel = messages.tel;
      if (!form.elements.agree.checked) errors.agree = messages.agree;
      ['name', 'email', 'tel', 'agree', 'message'].forEach(function (n) { setError(n, errors[n]); });
      return errors;
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      status.className = 'form__status';
      status.textContent = '';
      var errors = validate();
      var keys = Object.keys(errors);
      if (keys.length) {
        var first = form.elements[keys[0]];
        if (first && first.focus) first.focus();
        return;
      }
      submit.disabled = true;
      status.textContent = '送信しています…';

      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' },
        credentials: 'same-origin'
      })
        .then(function (res) {
          return res.json().catch(function () { return { ok: false }; });
        })
        .then(function (data) {
          if (data && data.ok) {
            form.reset();
            status.className = 'form__status is-ok';
            status.textContent = 'お問い合わせを受け付けました。原則1営業日以内に、担当者よりご連絡いたします。';
          } else {
            if (data && data.errors) {
              Object.keys(data.errors).forEach(function (k) { setError(k, data.errors[k]); });
            }
            status.className = 'form__status is-error';
            status.textContent = (data && data.message) || '送信できませんでした。時間をおいて、もう一度お試しください。';
          }
        })
        .catch(function () {
          status.className = 'form__status is-error';
          status.textContent = '通信エラーが発生しました。時間をおいて、もう一度お試しください。';
        })
        .then(function () { submit.disabled = false; });
    });
  }

  /* ---------- footer year ---------- */
  var y = document.querySelector('[data-year]');
  if (y) y.textContent = new Date().getFullYear();
})();
