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
  var plVerse = null, lastEx = null, queue = [], sub = document.querySelector('.pl-sub');
  function play(url, title, el, ex) {
    if (current === el && !audio.paused && url === audio.src) { audio.pause(); return; }
    lastEx = ex || null; queue = []; sub.textContent = 'Rezitation: Maḥmūd Khalīl al-Ḥuṣarī';
    if (plVerse) plVerse.hidden = !(ex && / · Wort$/.test(title));
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
  plVerse = document.createElement('button'); plVerse.className = 'pl-chip'; plVerse.textContent = 'Vers'; plVerse.hidden = true;
  plVerse.setAttribute('aria-label', 'Ganzen Vers anhören');
  pl.insertBefore(plVerse, plSpeed);
  plVerse.onclick = function () { if (lastEx) { var e = lastEx; queue = []; sub.textContent = 'Rezitation: Maḥmūd Khalīl al-Ḥuṣarī'; audio.src = ayahUrl(e.s, e.a); audio.playbackRate = rate; audio.play(); plT.textContent = (e.name ? e.name + ' ' : 'Sure ') + e.s + ':' + e.a + ' · ganzer Vers'; plVerse.hidden = true; } };
  plLoop.onclick = function () { audio.loop = !audio.loop; plLoop.classList.toggle('on', audio.loop); };
  function ayahUrl(s, a) { return AYAH + pad(s, 3) + pad(a, 3) + '.mp3'; }

  /* Wort-Audio: aus dem Vers das Wort suchen, das auf der Karte steht (Buchstaben-Vergleich) */
  function norm(t) {
    return (t || '').replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '')
      .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627').replace(/\u0649/g, '\u064A').replace(/\u06CC/g, '\u064A')
      .replace(/\u0629/g, '\u0647').replace(/\u0624/g, '\u0648').replace(/\u0626/g, '\u064A');
  }
  function letterSet(t) { var o = {}; norm(t).replace(/\s/g, '').split('').forEach(function (c) { o[c] = 1; }); return o; }
  function score(card, word) {
    var A = letterSet(card), B = letterSet(word), inter = 0, na = 0, nb = 0, k;
    for (k in A) { na++; if (B[k]) inter++; }
    for (k in B) nb++;
    return na && nb ? inter / (na + nb - inter) : 0;
  }
  function grams(t) { t = norm(t).replace(/\s/g, ''); var o = {}; if (t.length < 2) o[t] = 1; for (var i = 0; i < t.length - 1; i++) o[t.substr(i, 2)] = 1; return o; }
  function wsim(a, b) {
    if (norm(a).replace(/\s/g, '') === norm(b).replace(/\s/g, '')) return 1;
    var A = grams(a), B = grams(b), inter = 0, na = 0, nb = 0, k;
    for (k in A) { na++; if (B[k]) inter++; }
    for (k in B) nb++;
    return na + nb ? 2 * inter / (na + nb) : 0;
  }
  var verseCache = {};
  function verseWords(s, a) {
    var key = s + ':' + a;
    if (!verseCache[key]) verseCache[key] = fetch('https://api.quran.com/api/v4/verses/by_key/' + key + '?words=true&word_fields=text_uthmani')
      .then(function (r) { return r.json(); })
      .then(function (j) { return (j.verse.words || []).filter(function (w) { return w.char_type_name === 'word' && w.audio_url; }); });
    return verseCache[key];
  }
  audio.addEventListener('ended', function () { if (queue.length) { audio.src = queue.shift(); audio.playbackRate = rate; audio.play(); } });
  function playWord(ex, title, el) {
    if (!ex.ar) { play(ayahUrl(ex.s, ex.a), title + ' · ganzer Vers', el); return; }
    verseWords(ex.s, ex.a).then(function (ws) {
      /* Woerter der Karte der Reihe nach mit den Woertern des Verses vergleichen */
      var cw = norm(ex.ar).split(/\s+/).filter(Boolean), best = null, bs = 0, i, k, sc;
      for (var ns = [cw.length, cw.length - 1, cw.length + 1], q = 0, n; q < 3; q++) if ((n = ns[q]) > 0) for (i = 0; i + n <= ws.length; i++) {
        var span = ws.slice(i, i + n);
        sc = n === cw.length ? cw.reduce(function (acc, c, j) { return acc + wsim(c, span[j].text_uthmani); }, 0) / n
                             : score(cw.join(''), span.map(function (w) { return w.text_uthmani; }).join('')) * (bs >= 0.6 ? 0 : 0.9);
        if (sc > bs + 0.001) { bs = sc; best = span; }
      }
      if (best && bs >= 0.5) {
        var urls = best.map(function (w) { return 'https://audio.qurancdn.com/' + w.audio_url; });
        play(urls[0], title + ' · Wort', el, ex); queue = urls.slice(1);
        sub.textContent = 'Einzelwort-Aufnahme · „Vers“ spielt den ganzen Vers (al-Ḥuṣarī)';
      } else play(ayahUrl(ex.s, ex.a), title + ' · ganzer Vers', el, ex);
    }).catch(function () { play(ayahUrl(ex.s, ex.a), title + ' · ganzer Vers', el, ex); });
  }

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
        var t = (ex.name ? ex.name + ' ' : 'Sure ') + ex.s + ':' + ex.a;
        if (el.dataset.k === 'u') play(ayahUrl(ex.s, ex.a), t, el); else playWord(ex, t, el);
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
    return '<section id="buchstaben"><h2>Die fünf Bereiche · Makhārij</h2><div class="areas">' + areas + '</div></section>' +
      '<section><h2>Das Alphabet · zum Anhören antippen</h2>' +
      '<div class="ldetail" id="ldetail">Tipp auf einen Buchstaben. Die Farbe oben zeigt den Bereich, fett gedruckt sind die dicken Buchstaben.</div>' +
      '<div class="letters">' + grid + '</div>' +
      '<p class="hint">Tipp auf einen Buchstaben, dann hörst du seinen Namen (Aufnahmen von IslamCan.com). Maßgeblich ist, wie dein Lehrer es vorspricht.</p></section>';
  }
  /* Aufnahmen der Buchstaben: IslamCan.com (Nutzung fuer Da'wa erlaubt) */
  var LETTER_MP3 = {'ا':'001-alif','ب':'ba','ت':'003-taa','ث':'004-tha','ج':'005-jeem','ح':'006-haa','خ':'007-khaa','د':'008-dal','ذ':'009-dhal','ر':'010-raa','ز':'011-jaa','س':'012-seen','ش':'013-sheen','ص':'014-saad','ض':'015-dhaad','ط':'016-toa','ظ':'017-dhaa','ع':'018-ain','غ':'019-ghain','ف':'020-faa','ق':'021-qaaf','ك':'022-kaaf','ل':'023-laam','م':'024-meem','ن':'025-noon','و':'026-waw','ه':'027-ha','ء':'028-hamza','ي':'029-yaa'};
  function bindLetters() {
    var det = document.getElementById('ldetail'), last = null;
    app.querySelectorAll('.letter').forEach(function (el) {
      el.onclick = function () {
        var l = D.letters[+el.dataset.i], a = D.areas[l[3]];
        mark(last, false); last = el; mark(el, true);
        det.innerHTML = '<span class="ar">' + l[0] + '</span><b>' + esc(l[1]) + '</b> · ' + esc(a.name) + '<br>' + esc(l[2]);
        var f = LETTER_MP3[l[0]];
        if (f) {
          if ('speechSynthesis' in window) speechSynthesis.cancel();
          play('https://www.islamcan.com/learn-arabic/arabic-alphabets/' + f + '.mp3', l[1], el);
          sub.textContent = 'Aufnahme: IslamCan.com';
        } else {
          var ok = say(l[0] === 'ا' ? 'أَ' : l[0] === 'ء' ? 'ءَ' : l[0] + 'َ');
          if (!ok || !arVoice) det.innerHTML += '<br><small>Auf diesem Gerät ist keine arabische Stimme installiert.</small>';
        }
      };
    });
  }
  function surahBlock(L) {
    var imgs = (L && L.surah_imgs) || {};
    return '<section id="suren"><h2>Die letzten zehn Suren · lesen und anhören</h2><p class="hint">Tipp auf den Namen einer Sure, dann hörst du sie ganz.</p>' + D.surahs.map(function (s, i) {
      var src = imgs[s[0]] || imgs[String(s[0])];
      return '<div class="mushaf"><button class="surah" data-i="' + i + '"><span class="n">' + s[0] + '</span><span><b>' + esc(s[1]) + '</b><small>Heft S. ' + s[2] + ' · ▶ anhören</small></span></button>' +
        (src ? '<img loading="lazy" alt="Sure ' + esc(s[1]) + '" src="' + ((window.ELIFBA_IMG || {})[src] || src) + '">' : '') + '</div>';
    }).join('') + '</section>';
  }
  function bindSurahs() {
    app.querySelectorAll('.surah').forEach(function (el) {
      el.onclick = function () { var s = D.surahs[+el.dataset.i]; play(SURAH + pad(s[0], 3) + '.mp3', 'Sure ' + s[1], el); };
    });
  }

  /* ---------- Das Heft, Abschnitt fuer Abschnitt (Erklaerungen und Aufgaben) ---------- */
  function sectionsHtml(L) {
    if (!L.sections || !L.sections.length) return '';
    var IMG = window.ELIFBA_IMG || {}, seenPage = {};
    var toc = '<details class="toc" id="inhalt"><summary>Inhalt dieser Lektion · ' + L.sections.length + ' Abschnitte</summary><ol>' +
      L.sections.map(function (s, i) { return '<li><a href="#' + (s.anchor || 'abschnitt-' + (i + 1)) + '" data-go="' + (s.anchor || 'abschnitt-' + (i + 1)) + '">' + esc(s.title) + ' <small>S. ' + s.page + '</small></a></li>'; }).join('') + '</ol></details>';
    return '<section id="heft"><h2>Aus dem Heft · alle Erklärungen und Aufgaben</h2><p class="hint">Alles steht hier in derselben Reihenfolge wie im Heft. Tipp auf ein Bild, dann wird es groß. Karten mit ▶ kannst du anhören.</p>' + toc +
      L.sections.map(function (s, i) {
        var id = s.anchor || 'abschnitt-' + (i + 1);
        return '<article class="hs ' + (s.kind === 'aufgabe' ? 'auf' : 'erk') + '" id="' + id + '"><h3><span class="tag">' + (s.kind === 'aufgabe' ? 'Aufgabe' : 'Erklärung') + '</span>' + esc(s.title) + ' <small>Heft S. ' + s.page + '</small></h3>' +
          s.parts.map(function (p) {
            var pid = '';
            if (!seenPage[p.page]) { seenPage[p.page] = 1; pid = ' id="s-' + p.page + '"'; }
            if (p.img) return '<button class="pg"' + pid + '><img loading="lazy" decoding="async" alt="Heft Seite ' + p.page + '" width="' + p.w + '" height="' + p.h + '" src="' + (IMG[p.img] || p.img) + '"></button>';
            var list = p.kind === 'u' ? L.practice : L.examples;
            return '<div' + pid + ' class="' + (p.kind === 'u' ? 'rows' : 'cards') + '">' + p.cards.map(function (ci) { return cardHtml(list[ci], ci, p.kind); }).join('') + '</div>';
          }).join('') + '</article>';
      }).join('') + '</section>';
  }

  /* ---------- Seiten ---------- */
  function lessonPage(L) {
    var idx = D.lessons.indexOf(L), prev = D.lessons[idx - 1], next = D.lessons[idx + 1];
    var label = L.id === 0 ? 'Einleitung' : 'Lektion ' + L.id;
    var h = '<div class="lhead"><span class="ar">' + L.ar + '</span><h1>' + esc(L.title) + '</h1>' +
      '<div class="meta">' + label + ' · im Heft S. ' + L.pages[0] + (L.pages[1] !== L.pages[0] ? '–' + L.pages[1] : '') + '</div>' + chips(L.rules) + '</div>';
    h += '<nav class="jump" id="jump"></nav>';
    h += '<section id="erklaerung"><h2>Worum geht’s?</h2>' + L.intro.map(function (p) { return '<p>' + txt(p) + '</p>'; }).join('');
    if (L.when || L.how) {
      h += '<dl class="kv">' + (L.when ? '<dt>Wann?</dt><dd>' + txt(L.when) + '</dd>' : '') + (L.how ? '<dt>Wie?</dt><dd>' + txt(L.how) + '</dd>' : '') + '</dl>';
    }
    h += '</section>';
    if (L.special === 'letters') h += lettersBlock();
    if (L.audio_refs && !L.examples.length) {
      L.examples = L.audio_refs.map(function (r) { var p = r.split(':'); return { s: +p[0], a: +p[1], name: '' }; });
      h += '<section id="hoeren"><h2>Hören · die Stelle im Qur’ān</h2><div class="rows">' + L.examples.map(function (e, i) {
        return '<button class="card" data-k="b" data-i="' + i + '"><span class="play">▶</span><span style="padding:12px 0">Sure ' + e.s + ', Vers ' + e.a + '</span></button>';
      }).join('') + '</div></section>';
    }
    if (L.steps) h += '<section id="anwenden"><h2>So wendest du es an</h2><ol class="steps">' + L.steps.map(function (s) { return '<li>' + txt(s) + '</li>'; }).join('') + '</ol>' +
      (L.mistake ? '<div class="warn"><b>Typischer Fehler</b>' + txt(L.mistake) + '</div>' : '') + '</section>';
    if (L.special === 'surahs') h += surahBlock(L);
    h += sectionsHtml(L);
    var done = !!getDone()[L.id];
    h += '<label class="done"><input type="checkbox" id="done"' + (done ? ' checked' : '') + '> Kann ich sicher, Lektion abhaken</label>';
    h += '<nav class="pager">' + (prev ? '<a href="l/' + prev.id + '/"><small>zurück</small>' + esc(prev.id ? 'Lektion ' + prev.id : 'Einleitung') + '</a>' : '<span></span>') +
      '<a href="./" style="flex:.6;text-align:center"><small>alle</small>Übersicht</a>' +
      (next ? '<a class="next" href="l/' + next.id + '/"><small>weiter</small>Lektion ' + next.id + '</a>' : '<span></span>') + '</nav>';
    h += '<footer>Begleit-App zum Heft „Elif Ba Ikra“ · Audio von everyayah.com und quranicaudio.com</footer>';
    app.innerHTML = h;
    document.title = label + ' · ' + L.title + ' · Elif Ba Ikra';
    var names = { erklaerung: 'Kurz erklärt', buchstaben: 'Buchstaben', hoeren: 'Hören', anwenden: 'Anwenden', suren: 'Suren', heft: 'Erklärungen und Aufgaben aus dem Heft' };
    document.getElementById('jump').innerHTML = Object.keys(names).filter(function (k) { return document.getElementById(k); })
      .map(function (k) { return '<a href="#' + k + '" data-go="' + k + '">' + names[k] + '</a>'; }).join('');
    document.getElementById('jump').onclick = function (ev) {
      var a = ev.target.closest('a'); if (!a) return; ev.preventDefault();
      document.getElementById(a.dataset.go).scrollIntoView({ block: 'start' }); window.scrollBy(0, -60);
    };
    var tocEl = document.getElementById('inhalt');
    if (tocEl) tocEl.onclick = function (ev) {
      var a = ev.target.closest('a'); if (!a) return; ev.preventDefault();
      document.getElementById(a.dataset.go).scrollIntoView({ block: 'start' }); window.scrollBy(0, -60);
    };
    [].forEach.call(document.querySelectorAll('.pg'), function (b) {
      b.onclick = function () {
        var v = document.createElement('div'); v.className = 'viewer';
        v.innerHTML = '<button class="close" aria-label="Schließen">✕</button><img alt="" src="' + b.querySelector('img').src + '">';
        v.querySelector('.close').onclick = function () { v.remove(); document.body.style.overflow = ''; };
        document.body.appendChild(v); document.body.style.overflow = 'hidden';
      };
    });
    bindCards(L);
    if (L.special === 'letters') bindLetters();
    if (L.special === 'surahs') bindSurahs();
    exercise(L);
    document.getElementById('done').onchange = function (e) { setDone(L.id, e.target.checked); };
  }

  /* ---------- Sprung zu einer Übung (QR-Code neben der Aufgabe im Heft) ---------- */
  var EX = {
    'tamrin-1': { t: 'Tamrīn 1 · die Fälle', d: 'Hör dir jedes Beispiel an und achte auf die Regel dieser Lektion. Sprich es danach dreimal nach.', go: ['hoeren', 'buchstaben', 'ueben'] },
    'tamrin-2': { t: 'Tamrīn 2 · Wörter lesen', d: 'Lies jedes Wort im Heft zuerst selbst. Dann tipp hier auf ein Beispiel und vergleiche mit der Aufnahme.', go: ['hoeren', 'buchstaben', 'ueben'] },
    'tamrin-3': { t: 'Tamrīn 3 · selbst markieren', d: 'Markiere die Regel im Heft in ihrer Farbe und schreib das Kürzel darunter. Hör dir danach die Verse hier an und prüfe, ob du alle Stellen gefunden hast.', go: ['ueben', 'hoeren', 'suren'] },
    'zusatz': { t: 'Zusatzübung', d: 'Tipp auf eine Ayah und lies mit. Unterstreiche im Heft jede Stelle mit der Regel dieser Lektion.', go: ['ueben', 'hoeren', 'buchstaben'] },
    'aufgabe': { t: 'Aufgabe · selbst markieren', d: 'Hör dir die Sure an, male die Regeln im Heft in ihren Farben aus und schreib das Kürzel darunter.', go: ['suren', 'ueben', 'hoeren'] }
  };
  function exercise(L) {
    var k = (location.hash || '').replace('#', '');
    if (!k) return;
    var el = document.getElementById(k);
    if (!el && EX[k]) { for (var i = 0; i < EX[k].go.length && !el; i++) el = document.getElementById(EX[k].go[i]); }
    if (!el) return;
    if (el.classList.contains('hs')) el.classList.add('hl');
    setTimeout(function () { el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -60); }, 80);
  }
  window.addEventListener('hashchange', function () { location.reload(); });

  function overview() {
    var done = getDone(), n = D.lessons.filter(function (l) { return done[l.id]; }).length;
    var parts = { 0: 'Einleitung', 1: 'Teil I · Die Buchstaben', 2: 'Teil II · Lesezeichen und Tajwīd-Regeln', 32: 'Teil III · Wissen über den Qur’ān', 36: 'Teil IV · Praxis' };
    var h = '<div class="hero"><span class="ar">اِقْرَأْ</span><h1>Elif Ba Ikra</h1>' +
      '<p>Du lernst mit dem Heft. Hier findest du jede Seite aus dem Heft, hörst zu jeder Lektion die Beispiele, liest die Regel noch einmal kurz und übst mit. Scanne einfach den QR-Code auf der Heftseite.</p>' +
      '<div class="progress"><i style="width:' + Math.round(100 * n / D.lessons.length) + '%"></i></div><small>' + n + ' von ' + D.lessons.length + ' abgehakt</small></div><ul class="list">';
    var ex = {}; (D.extra || []).forEach(function (e) { (ex[e.after === null ? 'start' : e.after] = ex[e.after === null ? 'start' : e.after] || []).push(e); });
    function exLi(e) {
      var lid = e.after === 36 ? 36 : 0;
      return '<li><a href="l/' + lid + '/#s-' + e.pages[0] + '"><span class="num">S</span><span class="t">' + esc(e.title) + '<small>Heft S. ' + e.pages[0] + (e.pages[1] !== e.pages[0] ? '–' + e.pages[1] : '') + '</small></span></a></li>';
    }
    (ex.start || []).forEach(function (e) { h += exLi(e); });
    D.lessons.forEach(function (L) {
      if (parts[L.id]) h += '</ul><p class="part">' + parts[L.id] + '</p><ul class="list">';
      h += '<li class="' + (done[L.id] ? 'ok' : '') + '"><a href="l/' + L.id + '/"><span class="num">' + (L.id || 'E') + '</span><span class="t">' + esc(L.title) +
        '<small>Heft S. ' + L.pages[0] + (L.pages[1] !== L.pages[0] ? '–' + L.pages[1] : '') + '</small></span><span class="ar">' + L.ar + '</span></a></li>';
      (ex[L.id] || []).forEach(function (e) { h += exLi(e); });
    });
    app.innerHTML = h + '</ul><footer>Fortschritt wird nur auf diesem Gerät gespeichert.</footer>';
  }

  var id = document.body.dataset.lesson;
  var q = new URLSearchParams(location.search).get('l');
  if (id === '' && q !== null) id = q;
  var L = id === '' ? null : D.lessons.filter(function (x) { return String(x.id) === String(id); })[0];
  if (L) lessonPage(L); else overview();
})();
