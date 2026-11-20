// Doc Drift home page: reveals, the hero loop, the how-it-works board, typing, the agents switch,
// the recording and the tile micro-animations. Home only. No libraries and no scroll listeners:
// IntersectionObserver drives everything that depends on position.
(function () {
  'use strict';

  var root = document.documentElement;
  var calm = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
  var hasIO = 'IntersectionObserver' in window;
  var moving = !calm && hasIO;

  function each(sel, fn, scope) {
    Array.prototype.forEach.call((scope || document).querySelectorAll(sel), fn);
  }

  // Run fn once, the first time el is at least `ratio` visible.
  function onceVisible(el, ratio, fn) {
    if (!hasIO) {
      fn();
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            io.disconnect();
            fn();
          }
        });
      },
      { threshold: ratio },
    );
    io.observe(el);
  }

  // 1. Reveals: section heads and visuals fade up 16 px over 500 ms, once. Tile visuals play their
  // micro-animation off the same class. Without motion, everything is shown at once.
  if (moving) {
    root.classList.add('motion');
    var rio = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            rio.unobserve(e.target);
          }
        });
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    each('.reveal', function (el) {
      rio.observe(el);
    });
  } else {
    each('.reveal', function (el) {
      el.classList.add('is-in');
    });
  }

  // 2. Hero loop, 12 s. The agent card shows from the first frame ("Verified. Safe to cite."); then
  // the PR card (1.0 s), the link line (1.8 s), the slip (2.6 s, and the agents are warned), a person
  // accepts the fix, Verified again. Pauses off screen, when the tab is hidden, and on the Pause
  // button. With reduced motion it holds the flagged state until the visitor presses the button.
  var stage = document.querySelector('[data-hero-stage]');
  var loopBtn = document.querySelector('[data-loop-toggle]');
  if (stage) {
    var STEPS = [
      [1000, ''],
      [800, 'pr'],
      [800, 'pr w1'],
      [3000, 'pr w1 drift tip'],
      [1400, 'pr w1 drift'],
      [1000, 'pr w1 drift press'],
      [350, 'pr w1 drift press click'],
      [3650, 'pr fixed'],
    ];
    var ALL = ['is-pr', 'is-w1', 'is-drift', 'is-tip', 'is-press', 'is-click', 'is-fixed'];
    var step = calm ? 3 : 0;
    var timer = null;
    var userPaused = calm;
    var inView = true;
    var pageShown = !document.hidden;

    var apply = function (names) {
      ALL.forEach(function (c) {
        stage.classList.remove(c);
      });
      names.split(' ').forEach(function (n) {
        if (n) stage.classList.add('is-' + n);
      });
    };
    var tick = function () {
      apply(STEPS[step][1]);
      timer = setTimeout(function () {
        step = (step + 1) % STEPS.length;
        tick();
      }, STEPS[step][0]);
    };
    var sync = function () {
      var run = !userPaused && inView && pageShown;
      if (run && !timer) tick();
      if (!run && timer) {
        clearTimeout(timer);
        timer = null;
      }
    };

    stage.classList.add('is-live');
    apply(STEPS[step][1]);
    if (loopBtn) {
      loopBtn.hidden = false;
      loopBtn.setAttribute('aria-pressed', String(userPaused));
      loopBtn.setAttribute('aria-label', 'Pause the animation');
      loopBtn.addEventListener('click', function () {
        userPaused = !userPaused;
        loopBtn.setAttribute('aria-pressed', String(userPaused));
        sync();
      });
    }
    if (hasIO) {
      new IntersectionObserver(
        function (entries) {
          inView = entries[0].isIntersecting;
          sync();
        },
        { threshold: 0.2 },
      ).observe(stage);
    }
    document.addEventListener('visibilitychange', function () {
      pageShown = !document.hidden;
      sync();
    });
    sync();
  }

  // 3. How it works: a sticky board. Each step's text switches the board to a whole state as it
  // crosses the middle of the viewport, so the label always shows one word.
  var board = document.querySelector('[data-board]');
  var story = document.querySelector('[data-story]');
  var steps = story ? story.querySelectorAll('.h-step') : [];
  if (board && steps.length && hasIO) {
    var setStep = function (n) {
      board.setAttribute('data-step', n);
      Array.prototype.forEach.call(steps, function (li) {
        li.classList.toggle('is-active', li.getAttribute('data-step') === n);
      });
      story.style.setProperty('--progress', String(Number(n) / steps.length));
    };
    var sio = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) setStep(e.target.getAttribute('data-step'));
        });
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    Array.prototype.forEach.call(steps, function (li) {
      sio.observe(li);
    });
  }

  // 4. The 3 a.m. terminal types its command once, then the error appears. The full text stays in the
  // DOM; only the opacity of each character changes.
  var term = document.querySelector('[data-term]');
  if (term && moving) {
    var cmd = term.querySelector('[data-type-chars]');
    if (cmd) {
      var chars = [];
      var text = cmd.textContent;
      cmd.textContent = '';
      for (var c = 0; c < text.length; c++) {
        var ch = document.createElement('span');
        ch.className = 'ch';
        ch.textContent = text.charAt(c);
        cmd.appendChild(ch);
        chars.push(ch);
      }
      term.classList.add('is-waiting');
      onceVisible(term, 0.6, function () {
        term.classList.remove('is-waiting');
        term.classList.add('is-typing');
        chars.forEach(function (el, i) {
          setTimeout(function () {
            el.classList.add('on');
          }, 260 + i * 42);
        });
        setTimeout(function () {
          term.classList.remove('is-typing');
        }, 260 + chars.length * 42 + 380);
      });
    }
  }

  // 5. AI agents: Without / With Doc Drift. Two buttons with aria-pressed; the answers share one grid
  // cell, so the 200 ms crossfade never moves the layout. With is the real Rovo answer.
  var convo = document.querySelector('[data-convo]');
  var sw = document.querySelector('[data-switch]');
  if (convo && sw) {
    var buttons = sw.querySelectorAll('button');
    var setMode = function (mode) {
      convo.setAttribute('data-mode', mode);
      Array.prototype.forEach.call(buttons, function (b) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === mode));
      });
    };
    sw.hidden = false;
    Array.prototype.forEach.call(buttons, function (b) {
      b.addEventListener('click', function () {
        setMode(b.getAttribute('data-mode'));
      });
    });
    // Announce the answer the switch brings in; set after load, so nothing is read out at first.
    convo.setAttribute('aria-live', 'polite');
  }

  // 6. The real recording: muted, plays only while in view, never on its own with reduced motion.
  var clip = document.querySelector('[data-clip]');
  if (clip) {
    var video = clip.querySelector('video');
    var clipBtn = clip.querySelector('[data-clip-toggle]');
    var clipLabel = clipBtn ? clipBtn.querySelector('[data-clip-label]') : null;
    var want = !calm;
    var clipInView = false;
    var render = function () {
      if (!clipBtn) return;
      var playing = !video.paused;
      clipBtn.classList.toggle('is-playing', playing);
      if (clipLabel) clipLabel.textContent = playing ? 'Pause' : 'Play';
      clipBtn.setAttribute('aria-label', (playing ? 'Pause' : 'Play') + ' the recording');
    };
    var syncClip = function () {
      if (want && clipInView && !document.hidden) {
        var p = video.play();
        if (p && p.catch) p.catch(function () {});
      } else if (!video.paused) {
        video.pause();
        // Scrolled away: rewind to the merge, so it restarts there and shows no flag while out of view.
        if (!clipInView) {
          try {
            video.currentTime = 0;
          } catch (e) {}
        }
      }
    };
    if (video) {
      video.addEventListener('play', render);
      video.addEventListener('pause', render);
      if (clipBtn) {
        clipBtn.hidden = false;
        clipBtn.addEventListener('click', function () {
          want = video.paused;
          if (want) clipInView = true;
          syncClip();
          render();
        });
      }
      if (hasIO) {
        new IntersectionObserver(
          function (entries) {
            clipInView = entries[0].isIntersecting;
            syncClip();
          },
          { threshold: 0.4 },
        ).observe(video);
      }
      document.addEventListener('visibilitychange', syncClip);
      render();
    }
  }
})();
