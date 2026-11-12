(function () {
  'use strict';
  var D = window.ELIFBA, app = document.getElementById('app');
  var AYAH = 'https://everyayah.com/data/Husary_128kbps/';
  var SURAH = 'https://download.quranicaudio.com/quran/mahmood_khaleel_al-husaree/';

  function pad(n, l) { n = String(n); while (n.length < l) n = '0' + n; return n; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  // arabische Buchstaben im deutschen Text in die arabische Schrift setzen
  function txt(s) { return esc(s).replace(/([؀-ۿﹰ-﻿][؀-ۿﹰ-﻿\s]*[؀-ۿﹰ-﻿]|[؀-ۿ])/g, '<span class="ar">$1</span>'); }

  /* ---------- Fortschritt (nur auf diesem Gerät) ---------- */
  var KEY = 'elifba-done';
  function getDone() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } }
  function setDone(id, v) { var d = getDone(); if (v) d[id] = 1; else delete d[id]; try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }

  /* ---------- Audio ---------- */
  var audio = new Audio(), current = null, rate = 1;
  audio.preload = 'none';
  var pl = document.getElementById('player'), plT = document.getElementById('pl-title'),
      plBtn = document.getElementById('pl-toggle'), plSpeed = document.getElementById('pl-speed'), plLoop = document.getElementById('pl-loop');
  function mark(el, on) { if (el) el.classList.toggle('on', on); }
  function play(url, title, el) {
    if (current === el && !audio.paused) { audio.pause(); return; }
    mark(current, false); current = el;
    audio.src = url; audio.playbackRate = rate; audio.play().catch(function () { plT.textContent = 'Audio konnte nicht geladen werden'; });
    plT.textContent = title; pl.hidden = false; mark(el, true);
  }
  audio.addEventListener('play', function () { plBtn.textContent = '❚❚'; plBtn.setAttribute('aria-label', 'Pause'); mark(current, true); });
  audio.addEventListener('pause', function () { plBtn.textContent = '▶'; plBtn.setAttribute('aria-label', 'Abspielen'); mark(current, false); });
  audio.addEventListener('ended', function () { mark(current, false); });
  audio.addEventListener('ratechange', function () {});
  plBtn.onclick = function () { if (audio.paused) audio.play(); else audio.pause(); };
  plSpeed.onclick = function () { rate = rate === 1 ? 0.75 : rate === 0.75 ? 0.5 : 1; audio.playbackRate = rate; plSpeed.textContent = (rate === 1 ? '1' : rate === 0.75 ? '¾' : '½') + '×'; plSpeed.classList.toggle('on', rate !== 1); };
  plLoop.onclick = function () { audio.loop = !audio.loop; plLoop.classList.toggle('on', audio.loop); };
  function ayahUrl(s, a) { return AYAH + pad(s, 3) + pad(a, 3) + '.mp3'; }

  /* ---------- Sprachausgabe für einzelne Buchstaben ---------- */
  var arVoice = null;
  function pickVoice() {
    if (!('speechSynthesis' in window)) return;
    var v = speechSynthesis.getVoices().filter(function (x) { return /^ar/i.test(x.lang); });
    arVoice = v.filter(function (x) { return /SA|EG/i.test(x.lang); })[0] || v[0] || null;
  }
  if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  function say(text) {
    if (!('speechSynthesis' in window)) return false;
    audio.pause(); speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text); u.lang = arVoice ? arVoice.lang : 'ar-SA'; if (arVoice) u.voice = arVoice; u.rate = 0.7;
    speechSynthesis.speak(u); return true;
  }

  /* ---------- Bausteine ---------- */
  function chips(rules) {
    if (!rules || !rules.length) return '';
    return '<div class="chips">' + rules.map(function (k) {
      var r = D.rules[k]; return '<span class="chip"><b style="background:' + r.color + '">' + esc(k) + '</b>' + esc(r.name) + '</span>';
    }).join('') + '</div>';
  }
  function cardHtml(ex, i, kind) {
    var title = (ex.name ? ex.name + ' ' : 'Sure ') + ex.s + ':' + ex.a;
    return '<button class="card" data-k="' + kind + '" data-i="' + i + '" aria-label="' + esc(title) + ' anhören">' +
      '<span class="play" aria-hidden="true">▶</span><img loading="lazy" src="' + ((window.ELIFBA_IMG || {})[ex.img] || ex.img) + '" width="' + ex.w + '" height="' + ex.h + '" alt="Beispiel aus ' + esc(title) + '">' +
      (kind === 'u' ? '' : '') + '</button>';
  }
  function bindCards(L) {
    app.querySelectorAll('.card').forEach(function (el) {
      el.onclick = function () {
        var ex = (el.dataset.k === 'u' ? L.practice : L.examples)[+el.dataset.i];
        play(ayahUrl(ex.s, ex.a), (ex.name ? ex.name + ' ' : 'Sure ') + ex.s + ':' + ex.a, el);
      };
    });
  }

  function lettersBlock() {
    var areas = Object.keys(D.areas).map(function (k) {
      var a = D.areas[k];
      return '<div class="area" style="border-color:' + a.color + '"><div><b>' + esc(a.name) + '</b><small>' + txt(a.text) + '</small></div><span class="ar">' + a.ar + '</span></div>';
    }).join('');
    var heavy = D.heavy.split(' ');
    var grid = D.letters.map(function (l, i) {
      return '<button class="letter' + (heavy.indexOf(l[0]) > -1 ? ' heavy' : '') + '" data-i="' + i + '" style="border-top-color:' + D.areas[l[3]].color + '">' +
        '<span class="ar">' + l[0] + '</span><span class="nm">' + esc(l[1]) + '</span></button>';
    }).join('');
    return '<section><h2>Die fünf Bereiche · Makhārij</h2><div class="areas">' + areas + '</div></section>' +
      '<section><h2>Das Alphabet · zum Anhören antippen</h2>' +
      '<div class="ldetail" id="ldetail">Tipp auf einen Buchstaben. Die Farbe oben zeigt den Bereich, fett gedruckt sind die dicken Buchstaben.</div>' +
      '<div class="letters">' + grid + '</div>' +
      '<p class="hint">Die Buchstaben spricht die Sprachausgabe deines Handys mit Fatḥa (ba, ta …). Das ist eine Computerstimme und nur eine Hilfe. Maßgeblich ist, wie dein Lehrer es vorspricht.</p></section>';
  }
  function bindLetters() {
    var det = document.getElementById('ldetail'), last = null;
    app.querySelectorAll('.letter').forEach(function (el) {
      el.onclick = function () {
        var l = D.letters[+el.dataset.i], a = D.areas[l[3]];
        mark(last, false); last = el; mark(el, true);
        det.innerHTML = '<span class="ar">' + l[0] + '</span><b>' + esc(l[1]) + '</b> · ' + esc(a.name) + '<br>' + esc(l[2]);
        var ok = say(l[0] === 'ا' ? 'أَ' : l[0] === 'ء' ? 'ءَ' : l[0] + 'َ');
        if (!ok || !arVoice) det.innerHTML += '<br><small>Auf diesem Gerät ist keine arabische Stimme installiert.</small>';
      };
    });
  }
  function surahBlock() {
    return '<section><h2>Die letzten zehn Suren · ganz anhören</h2>' + D.surahs.map(function (s, i) {
      return '<button class="surah" data-i="' + i + '"><span class="n">' + s[0] + '</span><span><b>' + esc(s[1]) + '</b><small>Heft S. ' + s[2] + '</small></span></button>';
    }).join('') + '</section>';
  }
  function bindSurahs() {
    app.querySelectorAll('.surah').forEach(function (el) {
      el.onclick = function () { var s = D.surahs[+el.dataset.i]; play(SURAH + pad(s[0], 3) + '.mp3', 'Sure ' + s[1], el); };
    });
  }

  /* ---------- Seiten ---------- */
  function lessonPage(L) {
    var idx = D.lessons.indexOf(L), prev = D.lessons[idx - 1], next = D.lessons[idx + 1];
    var label = L.id === 0 ? 'Einleitung' : 'Lektion ' + L.id;
    var h = '<div class="lhead"><span class="ar">' + L.ar + '</span><h1>' + esc(L.title) + '</h1>' +
      '<div class="meta">' + label + ' · im Heft S. ' + L.pages[0] + (L.pages[1] !== L.pages[0] ? '–' + L.pages[1] : '') + '</div>' + chips(L.rules) + '</div>';
    h += '<section><h2>Worum geht’s?</h2>' + L.intro.map(function (p) { return '<p>' + txt(p) + '</p>'; }).join('');
    if (L.when || L.how) {
      h += '<dl class="kv">' + (L.when ? '<dt>Wann?</dt><dd>' + txt(L.when) + '</dd>' : '') + (L.how ? '<dt>Wie?</dt><dd>' + txt(L.how) + '</dd>' : '') + '</dl>';
    }
    h += '</section>';
    if (L.special === 'letters') h += lettersBlock();
    if (L.examples.length) {
      h += '<section><h2>Hören · Beispiele aus dem Qur’ān</h2><p class="hint">Tipp auf ein Beispiel. Du hörst den ganzen Vers, das Wort steht darin. Mit ¾× und ½× unten wird es langsamer, mit ↻ wiederholt.</p>' +
        '<div class="cards">' + L.examples.map(function (e, i) { return cardHtml(e, i, 'b'); }).join('') + '</div></section>';
    }
    if (L.audio_refs && !L.examples.length) {
      L.examples = L.audio_refs.map(function (r) { var p = r.split(':'); return { s: +p[0], a: +p[1], name: '' }; });
      h += '<section><h2>Hören · die Stelle im Qur’ān</h2><div class="rows">' + L.examples.map(function (e, i) {
        return '<button class="card" data-k="b" data-i="' + i + '"><span class="play">▶</span><span style="padding:12px 0">Sure ' + e.s + ', Vers ' + e.a + '</span></button>';
      }).join('') + '</div></section>';
    }
    if (L.steps) h += '<section><h2>So wendest du es an</h2><ol class="steps">' + L.steps.map(function (s) { return '<li>' + txt(s) + '</li>'; }).join('') + '</ol>' +
      (L.mistake ? '<div class="warn"><b>Typischer Fehler</b>' + txt(L.mistake) + '</div>' : '') + '</section>';
    if (L.practice.length) {
      h += '<section><h2>Üben · Verse zum Mitlesen</h2><p class="hint">Hör zu, lies mit und sprich nach. Welche Regel findest du?</p><div class="rows">' +
        L.practice.map(function (e, i) { return cardHtml(e, i, 'u'); }).join('') + '</div></section>';
    }
    if (L.special === 'surahs') h += surahBlock();
    var done = !!getDone()[L.id];
    h += '<label class="done"><input type="checkbox" id="done"' + (done ? ' checked' : '') + '> Kann ich sicher, Lektion abhaken</label>';
    h += '<nav class="pager">' + (prev ? '<a href="l/' + prev.id + '/"><small>zurück</small>' + esc(prev.id ? 'Lektion ' + prev.id : 'Einleitung') + '</a>' : '<span></span>') +
      '<a href="./" style="flex:.6;text-align:center"><small>alle</small>Übersicht</a>' +
      (next ? '<a class="next" href="l/' + next.id + '/"><small>weiter</small>Lektion ' + next.id + '</a>' : '<span></span>') + '</nav>';
    h += '<footer>Begleit-App zum Heft „Elif Ba Ikra“ · Audio von everyayah.com und quranicaudio.com</footer>';
    app.innerHTML = h;
    document.title = label + ' · ' + L.title + ' · Elif Ba Ikra';
    bindCards(L);
    if (L.special === 'letters') bindLetters();
    if (L.special === 'surahs') bindSurahs();
    document.getElementById('done').onchange = function (e) { setDone(L.id, e.target.checked); };
  }

  function overview() {
    var done = getDone(), n = D.lessons.filter(function (l) { return done[l.id]; }).length;
    var parts = { 0: 'Einleitung', 1: 'Teil I · Die Buchstaben', 2: 'Teil II · Lesezeichen und Tajwīd-Regeln', 32: 'Teil III · Wissen über den Qur’ān', 36: 'Teil IV · Praxis' };
    var h = '<div class="hero"><span class="ar">اِقْرَأْ</span><h1>Elif Ba Ikra</h1>' +
      '<p>Du lernst mit dem Heft. Hier hörst du zu jeder Lektion die Beispiele, liest die Regel noch einmal kurz und übst mit. Scanne einfach den QR-Code auf der Heftseite.</p>' +
      '<div class="progress"><i style="width:' + Math.round(100 * n / D.lessons.length) + '%"></i></div><small>' + n + ' von ' + D.lessons.length + ' abgehakt</small></div><ul class="list">';
    D.lessons.forEach(function (L) {
      if (parts[L.id]) h += '</ul><p class="part">' + parts[L.id] + '</p><ul class="list">';
      h += '<li class="' + (done[L.id] ? 'ok' : '') + '"><a href="l/' + L.id + '/"><span class="num">' + (L.id || 'E') + '</span><span class="t">' + esc(L.title) +
        '<small>Heft S. ' + L.pages[0] + '</small></span><span class="ar">' + L.ar + '</span></a></li>';
    });
    app.innerHTML = h + '</ul><footer>Fortschritt wird nur auf diesem Gerät gespeichert.</footer>';
  }

  var id = document.body.dataset.lesson;
  var q = new URLSearchParams(location.search).get('l');
  if (id === '' && q !== null) id = q;
  var L = id === '' ? null : D.lessons.filter(function (x) { return String(x.id) === String(id); })[0];
  if (L) lessonPage(L); else overview();
})();
