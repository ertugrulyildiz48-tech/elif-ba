(function () {
  'use strict';
  var D = window.ELIFBA, app = document.getElementById('app');
  var IMG = window.ELIFBA_IMG || {};
  var AYAH = 'https://everyayah.com/data/Husary_128kbps/';
  var WORD = 'https://audio.qurancdn.com/';
  var SURAH = 'https://download.quranicaudio.com/quran/mahmood_khaleel_al-husaree/';
  var LETTER = 'https://www.islamcan.com/learn-arabic/arabic-alphabets/';

  function pad(n, l) { n = String(n); while (n.length < l) n = '0' + n; return n; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function src(p) { return IMG[p] || p; }

  /* Regelkürzel und Regelnamen im Text in ihrer Heft-Farbe */
  var ruleRe = null, ruleOf = {};
  (function () {
    var keys = [];
    Object.keys(D.rules).forEach(function (k) {
      var r = D.rules[k]; ruleOf[esc(k)] = r.color; keys.push(esc(k));
      if (r.name && r.name.length > 4) { ruleOf[esc(r.name)] = r.color; keys.push(esc(r.name)); }
    });
    keys.sort(function (a, b) { return b.length - a.length; });
    ruleRe = new RegExp('(' + keys.map(function (k) { return k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')', 'g');
  })();
  function txt(s) {
    return esc(s).replace(ruleRe, function (m) { return '<b class="rk" style="--c:' + ruleOf[m] + '">' + m + '</b>'; })
      .replace(/([؀-ۿﹰ-﻿][؀-ۿﹰ-﻿\s]*[؀-ۿﹰ-﻿]|[؀-ۿ])/g, '<span class="ar">$1</span>');
  }

  /* ---------- Fortschritt (nur auf diesem Gerät) ---------- */
  var KEY = 'elifba-done';
  function getDone() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } }
  function setDone(id, v) { var d = getDone(); if (v) d[id] = 1; else delete d[id]; try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }

  /* ---------- Audio ---------- */
  var audio = new Audio(), current = null, rate = 1, queue = [];
  audio.preload = 'none';
  var pl = document.getElementById('player'), plT = document.getElementById('pl-title'), plS = document.getElementById('pl-sub'),
      plBtn = document.getElementById('pl-toggle'), plSpeed = document.getElementById('pl-speed'), plLoop = document.getElementById('pl-loop');
  function mark(el, on) { if (el) el.classList.toggle('on', on); }
  function play(urls, title, subtitle, el) {
    if (current === el && !audio.paused) { audio.pause(); return; }
    mark(current, false); current = el;
    queue = urls.slice(1);
    audio.src = urls[0]; audio.playbackRate = rate;
    audio.play().catch(function () { plS.textContent = 'Audio konnte nicht geladen werden. Bitte Internetverbindung prüfen.'; });
    plT.textContent = title; plS.textContent = subtitle; pl.hidden = false; mark(el, true);
  }
  audio.addEventListener('play', function () { plBtn.textContent = '❚❚'; plBtn.setAttribute('aria-label', 'Pause'); mark(current, true); });
  audio.addEventListener('pause', function () { plBtn.textContent = '▶'; plBtn.setAttribute('aria-label', 'Abspielen'); mark(current, false); });
  audio.addEventListener('ended', function () {
    if (queue.length) { audio.src = queue.shift(); audio.playbackRate = rate; audio.play(); return; }
    mark(current, false);
  });
  plBtn.onclick = function () { if (audio.paused) audio.play(); else audio.pause(); };
  plSpeed.onclick = function () { rate = rate === 1 ? 0.75 : rate === 0.75 ? 0.5 : 1; audio.playbackRate = rate; plSpeed.textContent = (rate === 1 ? '1' : rate === 0.75 ? '¾' : '½') + '×'; plSpeed.classList.toggle('on', rate !== 1); };
  plLoop.onclick = function () { audio.loop = !audio.loop; plLoop.classList.toggle('on', audio.loop); };
  function ayahUrl(s, a) { return AYAH + pad(s, 3) + pad(a, 3) + '.mp3'; }

  /* Jede Karte hat beim Bauen geprüft bekommen, welche Aufnahme genau zu ihrem Text passt (ex.aud).
     Ohne geprüfte Zuordnung wird nichts abgespielt. */
  function playCard(ex, el) {
    var ref = (ex.name ? ex.name + ' ' : 'Sure ') + ex.s + ':' + ex.a, a = ex.aud;
    if (!a) return;
    if (a.t === 'w') play(a.u.map(function (u) { return WORD + u; }), ref, a.u.length > 1 ? 'Genau diese Wörter, einzeln aufgenommen (quran.com)' : 'Genau dieses Wort (quran.com)', el);
    else play([ayahUrl(+a.k.split(':')[0], +a.k.split(':')[1])], ref, 'Ganzer Vers · Maḥmūd Khalīl al-Ḥuṣarī', el);
  }

  /* ---------- Bausteine ---------- */
  function chips(rules) {
    if (!rules || !rules.length) return '';
    return '<div class="chips">' + rules.map(function (k) {
      var r = D.rules[k]; return '<span class="chip" style="--c:' + r.color + '"><b>' + esc(k) + '</b>' + esc(r.name) + '</span>';
    }).join('') + '</div>';
  }
  function cardHtml(ex, i, kind) {
    var title = (ex.name ? ex.name + ' ' : 'Sure ') + ex.s + ':' + ex.a, has = !!ex.aud;
    return '<button class="card' + (has ? '' : ' still') + '" data-k="' + kind + '" data-i="' + i + '"' + (has ? ' aria-label="' + esc(title) + ' anhören"' : ' aria-label="' + esc(title) + '" disabled') + '>' +
      (has ? '<span class="play" aria-hidden="true">▶</span>' : '') +
      '<img loading="lazy" decoding="async" src="' + src(ex.img) + '" width="' + ex.w + '" height="' + ex.h + '" alt="' + esc(title) + '"' +
      (kind === 'u' ? ' style="width:' + Math.min(100, Math.round(ex.w / 11)) + '%"' : '') + '></button>';
  }
  function bindCards(L) {
    app.querySelectorAll('.card[data-k]').forEach(function (el) {
      el.onclick = function () { playCard((el.dataset.k === 'u' ? L.practice : L.examples)[+el.dataset.i], el); };
    });
  }

  /* ---------- Buchstaben und Makhārij (Lektion 1) ---------- */
  var LETTER_MP3 = {'ا':'001-alif','ب':'ba','ت':'003-taa','ث':'004-tha','ج':'005-jeem','ح':'006-haa','خ':'007-khaa','د':'008-dal','ذ':'009-dhal','ر':'010-raa','ز':'011-jaa','س':'012-seen','ش':'013-sheen','ص':'014-saad','ض':'015-dhaad','ط':'016-toa','ظ':'017-dhaa','ع':'018-ain','غ':'019-ghain','ف':'020-faa','ق':'021-qaaf','ك':'022-kaaf','ل':'023-laam','م':'024-meem','ن':'025-noon','و':'026-waw','ه':'027-ha','ء':'028-hamza','ي':'029-yaa'};
  var REGION_LETTERS = { hohlraum: 'ا و ي', kehle: 'ء ه ع ح غ خ', zunge: 'ق ك ج ش ي ض ل ن ر ط د ت ظ ذ ث ص ز س', lippen: 'ف ب م و', nase: 'ن م' };
  var REGION_ORDER = ['kehle', 'zunge', 'lippen', 'nase', 'hohlraum'];
  function letterInfo(ch) { for (var i = 0; i < D.letters.length; i++) if (D.letters[i][0] === ch) return D.letters[i]; return null; }
  function tilesFor(L, ch) {
    var out = [];
    (L.sections || []).forEach(function (s) { s.parts.forEach(function (p) { (p.tiles || []).forEach(function (t) { if (t.letters.indexOf(ch) > -1) out.push(t); }); }); });
    return out;
  }
  function headImage(L) {
    var best = null;
    (L.sections || []).forEach(function (s) { if (s.page === 14) s.parts.forEach(function (p) { if (p.img && (!best || p.h > best.h)) best = p; }); });
    return best;
  }
  function lettersBlock(L) {
    var head = headImage(L);
    var regions = REGION_ORDER.map(function (k) {
      var a = D.areas[k];
      return '<div class="region" style="--c:' + a.color + '"><div class="rh"><b>' + esc(a.name) + '</b><span class="ar">' + a.ar + '</span></div>' +
        '<div class="rl">' + REGION_LETTERS[k].split(' ').map(function (ch) { return '<button class="rlet" data-ch="' + ch + '">' + ch + '</button>'; }).join('') + '</div>' +
        '<p>' + txt(a.text) + '</p></div>';
    }).join('');
    var heavy = D.heavy.split(' ');
    var grid = D.letters.map(function (l, i) {
      return '<button class="letter' + (heavy.indexOf(l[0]) > -1 ? ' heavy' : '') + '" data-ch="' + l[0] + '" style="--c:' + D.areas[l[3]].color + '">' +
        '<span class="ar">' + l[0] + '</span><span class="nm">' + esc(l[1]) + '</span></button>';
    }).join('');
    return '<section id="buchstaben"><h2>Woher kommen die Buchstaben? · Makhārij</h2>' +
      '<p>Jeder Buchstabe hat seinen festen Austrittsort. Es gibt fünf Bereiche. Die Farbe ist dieselbe wie im Heft. Tipp auf einen Buchstaben: Du hörst ihn und siehst darunter, wo er entsteht und wo die Zunge drückt.</p>' +
      (head ? '<button class="pg head"><img loading="lazy" decoding="async" alt="Kopf im Schnitt mit den Austrittsorten" width="' + head.w + '" height="' + head.h + '" src="' + src(head.img) + '"><span>Bild antippen zum Vergrößern</span></button>' : '') +
      '<div class="regions">' + regions + '</div></section>' +
      '<section id="alphabet"><h2>Das Alphabet · antippen und anhören</h2>' +
      '<p class="hint">Der farbige Strich oben zeigt den Bereich. Fett sind die dicken Buchstaben (خ ص ض غ ط ق ظ).</p>' +
      '<div class="letters">' + grid + '</div>' +
      '<div class="ldetail" id="ldetail" hidden></div>' +
      '<p class="hint">Aufnahmen der Buchstaben: IslamCan.com. Maßgeblich ist, wie dein Lehrer es vorspricht.</p></section>';
  }
  function showLetter(L, ch, el) {
    var l = letterInfo(ch), det = document.getElementById('ldetail');
    if (!l) return;
    var a = D.areas[l[3]], tiles = tilesFor(L, ch);
    det.hidden = false;
    det.style.setProperty('--c', a.color);
    det.innerHTML = '<div class="lt"><span class="ar big">' + ch + '</span><div><b>' + esc(l[1]) + '</b><span class="tag" style="--c:' + a.color + '">' + esc(a.name) + '</span><p>' + txt(l[2]) + '</p></div></div>' +
      (tiles.length ? '<div class="ltiles">' + tiles.map(function (t) { return '<button class="pg tile"><img alt="" width="' + t.w + '" height="' + t.h + '" src="' + src(t.img) + '"></button>'; }).join('') + '</div>' : '');
    bindZoom(det);
    var f = LETTER_MP3[ch];
    if (f) play([LETTER + f + '.mp3'], l[1], 'Aufnahme: IslamCan.com', el);
    if (el && el.classList.contains('letter')) det.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  function bindLetters(L) {
    app.querySelectorAll('[data-ch]').forEach(function (el) {
      el.onclick = function () {
        app.querySelectorAll('.letter.sel, .rlet.sel').forEach(function (x) { x.classList.remove('sel'); });
        el.classList.add('sel');
        var g = app.querySelector('.letter[data-ch="' + el.dataset.ch + '"]'); if (g) g.classList.add('sel');
        showLetter(L, el.dataset.ch, el);
      };
    });
  }

  /* ---------- Suren (Lektion 36) ---------- */
  function surahBlock() {
    return '<section id="suren"><h2>Die letzten zehn Suren · anhören</h2><p class="hint">Tipp auf eine Sure, dann hörst du sie ganz (al-Ḥuṣarī). Den Text findest du weiter unten bei den Heftseiten.</p><div class="surahs">' +
      D.surahs.map(function (s, i) {
        return '<button class="surah" data-i="' + i + '"><span class="n">' + s[0] + '</span><span class="sn"><b>' + esc(s[1]) + '</b><small>Heft S. ' + s[2] + '</small></span><span class="play" aria-hidden="true">▶</span></button>';
      }).join('') + '</div></section>';
  }
  function bindSurahs() {
    app.querySelectorAll('.surah').forEach(function (el) {
      el.onclick = function () { var s = D.surahs[+el.dataset.i]; play([SURAH + pad(s[0], 3) + '.mp3'], 'Sure ' + s[1], 'Ganze Sure · Maḥmūd Khalīl al-Ḥuṣarī', el); };
    });
  }

  /* ---------- Hörstellen ohne Karte im Heft (Sakta, Imāla …) ---------- */
  function versesBlock(L) {
    if (!L.audio_verses || !L.audio_verses.length) return '';
    return '<section id="hoeren"><h2>Hören · die Stellen im Qur’ān</h2><div class="verses">' + L.audio_verses.map(function (v, i) {
      return '<button class="verse" data-i="' + i + '"><span class="play" aria-hidden="true">▶</span><span class="vt quran">' + esc(v.text) + ' ﴿' + v.k.split(':')[1].replace(/\d/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'[d]; }) + '﴾</span><small>Sure ' + v.k + '</small></button>';
    }).join('') + '</div></section>';
  }
  function bindVerses(L) {
    app.querySelectorAll('.verse').forEach(function (el) {
      el.onclick = function () { var v = L.audio_verses[+el.dataset.i], p = v.k.split(':'); play([ayahUrl(+p[0], +p[1])], 'Sure ' + v.k, 'Ganzer Vers · Maḥmūd Khalīl al-Ḥuṣarī', el); };
    });
  }

  /* ---------- Das Heft, Abschnitt für Abschnitt ---------- */
  function sectionsHtml(L) {
    if (!L.sections || !L.sections.length) return '';
    var seenPage = {};
    var toc = '<details class="toc" id="inhalt"><summary>Inhalt · ' + L.sections.length + ' Abschnitte</summary><ol>' +
      L.sections.map(function (s, i) { var id = s.anchor || 'abschnitt-' + (i + 1); return '<li><a href="#' + id + '" data-go="' + id + '"><span>' + esc(s.title) + '</span><small>S. ' + s.page + '</small></a></li>'; }).join('') + '</ol></details>';
    return '<section id="heft"><h2>Aus dem Heft · alle Erklärungen und Aufgaben</h2><p class="hint">Alles in derselben Reihenfolge wie im Heft. Bilder antippen zum Vergrößern. Karten mit ▶ kannst du anhören.</p>' + toc +
      L.sections.map(function (s, i) {
        var id = s.anchor || 'abschnitt-' + (i + 1), auf = s.kind === 'aufgabe';
        return '<article class="hs ' + (auf ? 'auf' : 'erk') + '" id="' + id + '"><header><span class="tag">' + (auf ? 'Aufgabe' : 'Erklärung') + '</span><small>Heft S. ' + s.page + '</small></header><h3>' + esc(s.title) + '</h3>' +
          s.parts.map(function (p) {
            var pid = '';
            if (!seenPage[p.page]) { seenPage[p.page] = 1; pid = ' id="s-' + p.page + '"'; }
            if (p.img) return '<button class="pg"' + pid + '><img loading="lazy" decoding="async" alt="Heft Seite ' + p.page + '" width="' + p.w + '" height="' + p.h + '" src="' + src(p.img) + '"></button>';
            if (p.tiles) return '<div class="tiles"' + pid + '>' + p.tiles.map(function (t) { return '<button class="pg tile"><img loading="lazy" decoding="async" alt="' + esc(t.letters) + '" width="' + t.w + '" height="' + t.h + '" src="' + src(t.img) + '"></button>'; }).join('') + '</div>';
            var list = p.kind === 'u' ? L.practice : L.examples;
            return '<div' + pid + ' class="' + (p.kind === 'u' ? 'rows' : 'cards') + '">' + p.cards.map(function (ci) { return cardHtml(list[ci], ci, p.kind); }).join('') + '</div>';
          }).join('') + '</article>';
      }).join('') + '</section>';
  }

  function bindZoom(root) {
    [].forEach.call(root.querySelectorAll('.pg'), function (b) {
      b.onclick = function () {
        var v = document.createElement('div'); v.className = 'viewer';
        v.innerHTML = '<button class="close" aria-label="Schließen">✕</button><img alt="" src="' + b.querySelector('img').src + '">';
        v.querySelector('.close').onclick = function () { v.remove(); document.body.style.overflow = ''; };
        document.body.appendChild(v); document.body.style.overflow = 'hidden';
      };
    });
  }
  function scrollToId(id) { var el = document.getElementById(id); if (!el) return; el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -70); }

  /* ---------- Lektionsseite ---------- */
  function lessonPage(L) {
    var idx = D.lessons.indexOf(L), prev = D.lessons[idx - 1], next = D.lessons[idx + 1];
    var label = L.id === 0 ? 'Einleitung' : 'Lektion ' + L.id;
    var rc = (L.rules && L.rules.length && D.rules[L.rules[0]]) ? D.rules[L.rules[0]].color : '#111';
    var h = '';
    if (window.ELIFBA_IMG_V !== D.version) {
      h += '<div class="stale"><b>Die Bilder dieser Seite fehlen oder sind veraltet.</b> Beim Hochladen auf GitHub muss auch der Ordner „l“ mit hochgeladen werden. Danach die Seite neu laden.</div>';
    }
    h += '<div class="lhead"><span class="ar">' + L.ar + '</span><h1>' + esc(L.title) + '</h1>' +
      '<div class="meta">' + label + ' · Heft S. ' + L.pages[0] + (L.pages[1] !== L.pages[0] ? '–' + L.pages[1] : '') + '</div>' + chips(L.rules) + '</div>';
    h += '<nav class="jump" id="jump"></nav>';
    h += '<section id="erklaerung"><h2>Kurz erklärt</h2>' + L.intro.map(function (p) { return '<p>' + txt(p) + '</p>'; }).join('');
    if (L.when || L.how) h += '<dl class="kv">' + (L.when ? '<dt>Wann?</dt><dd>' + txt(L.when) + '</dd>' : '') + (L.how ? '<dt>Wie?</dt><dd>' + txt(L.how) + '</dd>' : '') + '</dl>';
    h += '</section>';
    if (L.special === 'letters') h += lettersBlock(L);
    h += versesBlock(L);
    if (L.steps) h += '<section id="anwenden"><h2>So wendest du es an</h2><ol class="steps">' + L.steps.map(function (s) { return '<li>' + txt(s) + '</li>'; }).join('') + '</ol>' +
      (L.mistake ? '<div class="warn"><b>Typischer Fehler</b>' + txt(L.mistake) + '</div>' : '') + '</section>';
    if (L.special === 'surahs') h += surahBlock();
    h += sectionsHtml(L);
    var done = !!getDone()[L.id];
    h += '<label class="done"><input type="checkbox" id="done"' + (done ? ' checked' : '') + '> Kann ich sicher, Lektion abhaken</label>';
    h += '<nav class="pager">' + (prev ? '<a href="l/' + prev.id + '/"><small>zurück</small>' + esc(prev.id ? 'Lektion ' + prev.id : 'Einleitung') + '</a>' : '<span></span>') +
      '<a href="./" class="mid"><small>alle</small>Übersicht</a>' +
      (next ? '<a class="next" href="l/' + next.id + '/"><small>weiter</small>Lektion ' + next.id + '</a>' : '<span></span>') + '</nav>';
    h += '<footer>Begleit-App zum Heft „Elif Ba Ikra“ · Audio: quran.com (Wörter), everyayah.com und quranicaudio.com (al-Ḥuṣarī), IslamCan.com (Buchstaben)</footer>';
    app.innerHTML = h;
    app.style.setProperty('--rc', rc);
    document.title = label + ' · ' + L.title + ' · Elif Ba Ikra';
    var names = { erklaerung: 'Kurz erklärt', buchstaben: 'Makhārij', alphabet: 'Alphabet', hoeren: 'Hören', anwenden: 'Anwenden', suren: 'Suren', heft: 'Aus dem Heft' };
    var jump = document.getElementById('jump');
    jump.innerHTML = Object.keys(names).filter(function (k) { return document.getElementById(k); })
      .map(function (k) { return '<a href="#' + k + '" data-go="' + k + '">' + names[k] + '</a>'; }).join('');
    app.addEventListener('click', function (ev) {
      var a = ev.target.closest('a[data-go]'); if (!a) return; ev.preventDefault(); scrollToId(a.dataset.go);
    });
    bindZoom(app);
    bindCards(L);
    if (L.special === 'letters') bindLetters(L);
    if (L.special === 'surahs') bindSurahs();
    bindVerses(L);
    exercise();
    document.getElementById('done').onchange = function (e) { setDone(L.id, e.target.checked); };
  }

  /* ---------- Sprung zu einer Übung (QR-Code neben der Aufgabe im Heft) ---------- */
  function exercise() {
    var k = (location.hash || '').replace('#', '');
    if (!k) return;
    var el = document.getElementById(k) || document.getElementById(k.replace(/-\d+$/, '')) || document.getElementById('heft');
    if (!el) return;
    if (el.classList.contains('hs')) el.classList.add('hl');
    setTimeout(function () { scrollToId(el.id); }, 120);
  }
  window.addEventListener('hashchange', function () { exercise(); });

  /* ---------- Übersicht ---------- */
  function overview() {
    var done = getDone(), n = D.lessons.filter(function (l) { return done[l.id]; }).length;
    var parts = { 0: 'Einleitung', 1: 'Teil I · Die Buchstaben', 2: 'Teil II · Lesezeichen und Tajwīd-Regeln', 32: 'Teil III · Wissen über den Qur’ān', 36: 'Teil IV · Praxis' };
    var h = '<div class="hero"><span class="ar">اِقْرَأْ</span><h1>Elif Ba Ikra</h1>' +
      '<p>Du lernst mit dem Heft. Hier findest du zu jeder Lektion alle Erklärungen und Aufgaben aus dem Heft, hörst die Beispiele und übst mit. Scanne einfach den QR-Code auf der Heftseite.</p>' +
      '<div class="progress"><i style="width:' + Math.round(100 * n / D.lessons.length) + '%"></i></div><small>' + n + ' von ' + D.lessons.length + ' Lektionen abgehakt</small></div><ul class="list">';
    var ex = {}; (D.extra || []).forEach(function (e) { var k = e.after === null ? 'start' : e.after; (ex[k] = ex[k] || []).push(e); });
    function exLi(e) {
      var lid = e.after === 36 ? 36 : 0;
      return '<li><a href="l/' + lid + '/#s-' + e.pages[0] + '"><span class="num">S</span><span class="t">' + esc(e.title) + '<small>Heft S. ' + e.pages[0] + (e.pages[1] !== e.pages[0] ? '–' + e.pages[1] : '') + '</small></span></a></li>';
    }
    (ex.start || []).forEach(function (e) { h += exLi(e); });
    D.lessons.forEach(function (L) {
      if (parts[L.id]) h += '</ul><p class="part">' + parts[L.id] + '</p><ul class="list">';
      var c = (L.rules && L.rules.length && D.rules[L.rules[0]]) ? D.rules[L.rules[0]].color : '#111';
      h += '<li class="' + (done[L.id] ? 'ok' : '') + '"><a href="l/' + L.id + '/"><span class="num" style="--c:' + c + '">' + (L.id || 'E') + '</span><span class="t">' + esc(L.title) +
        '<small>Heft S. ' + L.pages[0] + (L.pages[1] !== L.pages[0] ? '–' + L.pages[1] : '') + '</small></span><span class="ar">' + L.ar + '</span></a></li>';
      (ex[L.id] || []).forEach(function (e) { h += exLi(e); });
    });
    app.innerHTML = h + '</ul><footer>Dein Fortschritt wird nur auf diesem Gerät gespeichert.</footer>';
  }

  var id = document.body.dataset.lesson;
  var q = new URLSearchParams(location.search).get('l');
  if (id === '' && q !== null) id = q;
  var L = id === '' ? null : D.lessons.filter(function (x) { return String(x.id) === String(id); })[0];
  if (L) lessonPage(L); else overview();
})();
