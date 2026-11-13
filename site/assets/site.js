// Doc Drift Sentinel website: theme, menu, tabs, copy buttons, table of contents, and the hero demo.
(function () {
  'use strict';

  // Set these once the production share link and the demo video exist. Until then the Install
  // buttons open the install section of the setup guide.
  var CONFIG = {
    installUrl: '',
    videoUrl: '',
  };

  var root = document.documentElement;

  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, value);
    } catch (e) {
      return null;
    }
    return null;
  }

  // Theme: Day (light) by default, Night shift on request. The inline head script applies the saved choice
  // before first paint; this wires the toggle.
  document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
    function label() {
      var light = root.getAttribute('data-theme') === 'light';
      btn.setAttribute('aria-label', light ? 'Switch to Night shift (dark) theme' : 'Switch to Day (light) theme');
      btn.setAttribute('title', light ? 'Night shift theme' : 'Day theme');
    }
    label();
    btn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
      store('dds-theme', next);
      label();
    });
  });

  // Install and video links.
  if (CONFIG.installUrl) {
    document.querySelectorAll('[data-install]').forEach(function (a) {
      a.setAttribute('href', CONFIG.installUrl);
      a.setAttribute('rel', 'noopener');
    });
    document.querySelectorAll('[data-install-pending]').forEach(function (el) {
      el.hidden = true;
    });
    document.querySelectorAll('[data-install-ready]').forEach(function (el) {
      el.hidden = false;
    });
  }
  if (CONFIG.videoUrl) {
    document.querySelectorAll('[data-video]').forEach(function (a) {
      a.setAttribute('href', CONFIG.videoUrl);
      a.hidden = false;
    });
  }

  // Header border on scroll.
  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Mobile menu.
  var menuBtn = document.querySelector('[data-menu-toggle]');
  var nav = document.getElementById('site-nav');
  if (menuBtn && nav) {
    var setMenu = function (open) {
      nav.classList.toggle('is-open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
    };
    menuBtn.addEventListener('click', function () {
      setMenu(menuBtn.getAttribute('aria-expanded') !== 'true');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setMenu(false);
    });
  }

  // Tabs (agents section). Arrow keys move between tabs.
  document.querySelectorAll('[role="tablist"]').forEach(function (list) {
    var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
      var bar = document.querySelector('[data-terminal-title]');
      if (bar && tab.dataset.title) bar.textContent = tab.dataset.title;
      if (focus) tab.focus();
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () {
        select(tab, false);
      });
      tab.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
        if (e.key === 'Home') next = tabs[0];
        if (e.key === 'End') next = tabs[tabs.length - 1];
        if (next) {
          e.preventDefault();
          select(next, true);
        }
      });
    });
  });

  // Copy buttons copy the text of the element named by data-copy.
  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    var text = btn.querySelector('[data-copy-label]');
    btn.addEventListener('click', function () {
      var src = document.getElementById(btn.getAttribute('data-copy'));
      if (!src) return;
      var value = src.textContent.trim();
      var done = function () {
        if (!text) return;
        text.textContent = 'Copied';
        setTimeout(function () {
          text.textContent = 'Copy';
        }, 1600);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(value).then(done, function () {});
      } else {
        var ta = document.createElement('textarea');
        ta.value = value;
        ta.setAttribute('readonly', '');
        ta.style.position = 'absolute';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand('copy');
          done();
        } catch (e) {}
        document.body.removeChild(ta);
      }
    });
  });

  // Hero demo: the page starts Verified, then PR #482 merges and the badge slips to Possibly stale.
  // The visitor can mark it verified and replay the merge. This is the only motion on the page.
  var mock = document.querySelector('[data-hero-mock]');
  if (mock) {
    var agentCard = document.querySelector('[data-agent-card]');
    var stateText = document.querySelector('[data-agent-state]');
    var guidanceText = document.querySelector('[data-agent-guidance]');
    var toggle = document.querySelector('[data-hero-toggle]');
    var status = document.querySelector('[data-hero-status]');
    var live = document.querySelector('[data-hero-live]');
    var setDrift = function (drifted, announce) {
      mock.classList.toggle('is-drifted', drifted);
      if (agentCard) agentCard.classList.toggle('is-drifted-agent', drifted);
      if (stateText) stateText.textContent = drifted ? '"possibly_stale"' : '"verified"';
      if (guidanceText)
        guidanceText.textContent = drifted
          ? '"Do not present steps from this page as current. Cite with caveat: changed by PR #482 on 2026-11-10."'
          : '"Safe to cite."';
      if (toggle) toggle.textContent = drifted ? 'Mark verified' : 'Merge PR #482';
      if (status) status.textContent = drifted ? 'PR #482 merged 2 minutes ago' : 'Verified by Dana, 3 days ago';
      if (live && announce)
        live.textContent = drifted
          ? 'PR #482 merged. The page is now Possibly stale.'
          : 'Marked verified. The page is Verified again.';
    };
    setDrift(false, false);
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var timer = setTimeout(function () {
      setDrift(true, false);
    }, reduce ? 300 : 1400);
    if (toggle)
      toggle.addEventListener('click', function () {
        clearTimeout(timer);
        setDrift(!mock.classList.contains('is-drifted'), true);
      });
  }

  // Table of contents: highlight the section in view.
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll('.toc a[href^="#"]'));
  if (tocLinks.length && 'IntersectionObserver' in window) {
    var byId = {};
    tocLinks.forEach(function (a) {
      byId[a.getAttribute('href').slice(1)] = a;
    });
    var visible = {};
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          visible[en.target.id] = en.isIntersecting;
        });
        var first = null;
        tocLinks.forEach(function (a) {
          var id = a.getAttribute('href').slice(1);
          if (!first && visible[id]) first = id;
        });
        if (!first) return;
        tocLinks.forEach(function (a) {
          var on = a === byId[first];
          a.classList.toggle('is-active', on);
          if (on) a.setAttribute('aria-current', 'location');
          else a.removeAttribute('aria-current');
        });
      },
      { rootMargin: '-90px 0px -55% 0px' },
    );
    Object.keys(byId).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) io.observe(el);
    });
  }

  var year = document.querySelector('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());
})();
