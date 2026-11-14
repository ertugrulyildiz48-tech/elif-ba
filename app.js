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
      '<span class="ref">' + esc((ex.aud && ex.aud.k) || (ex.s + ':' + ex.a)) + '</span>' +
      '<img src="' + src(ex.img) + '" width="' + ex.w + '" height="' + ex.h + '" alt="' + esc(title) + '"' +
      ' style="width:calc(' + (ex.w / ((ex.fs >= 12 ? ex.fs : (kind === 'u' ? 19 : 24)) * 4.1667)).toFixed(2) + ' * var(--apx))"></button>';
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
      (head ? '<button class="pg head"><img alt="Kopf im Schnitt mit den Austrittsorten" width="' + head.w + '" height="' + head.h + '" src="' + src(head.img) + '"><span>Bild antippen zum Vergrößern</span></button>' : '') +
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

  var SURAH_AR = { 105: 'سُورَةُ الْفِيلِ', 106: 'سُورَةُ قُرَيْشٍ', 107: 'سُورَةُ الْمَاعُونِ', 108: 'سُورَةُ الْكَوْثَرِ', 109: 'سُورَةُ الْكَافِرُونَ',
    110: 'سُورَةُ النَّصْرِ', 111: 'سُورَةُ الْمَسَدِ', 112: 'سُورَةُ الْإِخْلَاصِ', 113: 'سُورَةُ الْفَلَقِ', 114: 'سُورَةُ النَّاسِ' };
  /* ---------- Suren (Lektion 36) ---------- */
  function surahBlock() {
    return '<section id="suren"><h2>Die letzten zehn Suren · anhören</h2><p class="hint">Tipp auf eine Sure, dann hörst du sie ganz (al-Ḥuṣarī). Den Text findest du weiter unten bei den Heftseiten.</p><div class="surahs">' +
      D.surahs.map(function (s, i) {
        return '<button class="surah" data-i="' + i + '"><span class="n">' + s[0] + '</span><span class="sn"><b>' + esc(s[1]) + '</b><small>Heft S. ' + s[2] + '</small></span><span class="play" aria-hidden="true">▶</span></button>';
      }).join('') + '</div></section>';
  }
  function mushafPart(img) {
    var found = null;
    (D.lessons || []).forEach(function (L) { (L.sections || []).forEach(function (s) { s.parts.forEach(function (p) { if (p.img === img) found = p; }); }); });
    return found;
  }
  function bindMushaf() {
    app.querySelectorAll('.surah-play[data-m]').forEach(function (el) {
      el.onclick = function () {
        var p = mushafPart(el.dataset.m), urls = [];
        if (p.ganz) urls = [SURAH + pad(p.mushaf, 3) + '.mp3'];
        else for (var v = p.von; v <= p.bis; v++) urls.push(ayahUrl(p.mushaf, v));
        play(urls, 'Sure ' + p.mushaf + (p.ganz ? '' : ', Vers ' + p.von + '–' + p.bis), (p.ganz ? 'Ganze Sure' : 'Vers für Vers') + ' · Maḥmūd Khalīl al-Ḥuṣarī', el);
      };
    });
    app.querySelectorAll('.vmark').forEach(function (el) {
      el.onclick = function () { var p = mushafPart(el.dataset.m), v = +el.dataset.v; play([ayahUrl(p.mushaf, v)], 'Sure ' + p.mushaf + ':' + v, 'Ganzer Vers · Maḥmūd Khalīl al-Ḥuṣarī', el); };
    });
  }
  function bindSurahs() {
    bindMushaf();
    app.querySelectorAll('.surah, .surah-play:not([data-m])').forEach(function (el) {
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
        return '<article class="hs ' + (auf ? 'auf' : 'erk') + '" id="' + id + '"><header><span class="tag">' + (auf ? 'Aufgabe' : 'Erklärung') + '</span><small>Heft S. ' + s.page + '</small></header><h3>' + esc(s.title) + '</h3>' + secTools(s, i) +
          s.parts.map(function (p) {
            var pid = '';
            if (!seenPage[p.page]) { seenPage[p.page] = 1; pid = ' id="s-' + p.page + '"'; }
            if (p.img && ('mushaf' in p)) {
              var head = '';
              if (p.mushaf) {
                var nm = SURAH_AR[p.mushaf] || ('سُورَةُ ' + p.sname);
                head = '<div class="mh"><span class="quran">' + esc(nm) + '</span><span class="mref">' + (p.ganz ? 'Sure ' + p.mushaf : 'Sure ' + p.mushaf + ', Vers ' + p.von + (p.bis > p.von ? '–' + p.bis : '')) + '</span>' +
                  '<button class="surah-play" data-m="' + p.img + '"><span class="play" aria-hidden="true">▶</span> ' + (p.ganz ? 'ganze Sure anhören' : 'Abschnitt anhören') + '</button></div>';
              }
              var hot = (p.marks || []).map(function (m, k) {
                return '<button class="vmark" data-m="' + p.img + '" data-v="' + (p.von + k) + '" style="left:' + (m[0] * 100) + '%;top:' + (m[1] * 100) + '%;width:' + (m[2] * 360) + '%" aria-label="Vers ' + (p.von + k) + ' anhören"></button>';
              }).join('');
              return '<div class="mushafw"' + pid + '>' + head + '<div class="mimg"><img alt="Sure" width="' + p.w + '" height="' + p.h + '" src="' + src(p.img) + '">' + hot + '</div>' +
                (p.marks ? '<p class="mtip">Tipp auf ein Verszeichen, dann hörst du genau diesen Vers.</p>' : '') + '</div>';
            }
            if (p.img && p.plain) return '<div class="ptext"' + pid + '>' + p.plain.filter(function (x) { return x.replace(/\s/g, '') !== s.title.replace(/\s/g, ''); }).map(function (x) { return '<p>' + txt(x) + '</p>'; }).join('') + '</div>';
            if (p.img) return '<button class="pg"' + pid + '><img alt="Heft Seite ' + p.page + '" width="' + p.w + '" height="' + p.h + '" src="' + src(p.img) + '"></button>';
            if (p.tiles) return '<div class="tiles"' + pid + '>' + p.tiles.map(function (t) { return '<button class="pg tile"><img alt="' + esc(t.letters) + '" width="' + t.w + '" height="' + t.h + '" src="' + src(t.img) + '"></button>'; }).join('') + '</div>';
            var list = p.kind === 'u' ? L.practice : L.examples;
            return '<div' + pid + ' class="' + (p.kind === 'u' ? 'rows' : 'cards') + '">' + p.cards.map(function (ci) { return cardHtml(list[ci], ci, p.kind); }).join('') + '</div>';
          }).join('') + (/Wiederholung/.test(s.title) && /Regeln/.test(s.title) ? recapBlock(L) : '') + '</article>';
      }).join('') + '</section>';
  }

  /* ---------- Erklärung zum Abschnitt: anhören oder lesen ---------- */
  function secText(s) { return (s.text || []).filter(function (t) { return t !== s.title && t.replace(/\s/g, '') !== s.title.replace(/\s/g, ''); }); }
  function secTools(s, i) {
    var t = secText(s); if (!t.length) return '';
    return '<div class="stools">' + ('speechSynthesis' in window ? '<button class="say" data-sec="' + i + '">🔊 Anhören</button>' : '') +
      '<button class="readbtn" data-sec="' + i + '" aria-expanded="false">📖 Text lesen</button></div>' +
      '<div class="stext" id="stext-' + i + '" hidden>' + t.map(function (x) { return '<p>' + txt(x) + '</p>'; }).join('') + '</div>';
  }
  function bindSecTools(L) {
    app.querySelectorAll('.say[data-sec]').forEach(function (el) {
      el.onclick = function () { var s = L.sections[+el.dataset.sec]; say(s.title + '. ' + secText(s).join(' '), el); };
    });
    app.querySelectorAll('.readbtn').forEach(function (el) {
      el.onclick = function () { var b = document.getElementById('stext-' + el.dataset.sec); b.hidden = !b.hidden; el.classList.toggle('on', !b.hidden); el.setAttribute('aria-expanded', String(!b.hidden)); };
    });
  }

  /* ---------- Wiederholung: jede Regel zum Anhören ---------- */
  function recapRules(L) {
    var out = [], seen = {};
    D.lessons.forEach(function (X) {
      if (X.id > L.id || !X.rules) return;
      X.rules.forEach(function (k) {
        if (seen[k] || !D.rules[k]) return; seen[k] = 1;
        var ex = null, all = X.examples.concat(X.practice);
        // nur ein Beispiel, das im Heft genau mit dieser Regel beschriftet ist; bei Lektionen mit einer einzigen Regel das erste
        all.forEach(function (e) { if (!ex && e.aud && e.rule === k) ex = e; });
        if (!ex && X.rules.length === 1) all.forEach(function (e) { if (!ex && e.aud && !e.rule) ex = e; });
        out.push({ k: k, r: D.rules[k], les: X, ex: ex });
      });
    });
    return out;
  }
  function recapBlock(L) {
    var rs = recapRules(L);
    if (!rs.length) return '';
    return '<div class="recap"><h4>Jede Regel zum Anhören</h4><p class="hint">„Erklärung“ liest dir die Regel auf Deutsch vor (Stimme deines Geräts). „Beispiel“ spielt eine echte Aufnahme aus dem Qur’ān.</p>' +
      rs.map(function (x, i) {
        return '<div class="rrule" style="--c:' + x.r.color + '"><div class="rh"><b class="rk" style="--c:' + x.r.color + '">' + esc(x.k) + '</b><span>' + esc(x.r.name) + '</span></div>' +
          '<p>' + txt(x.r.short || '') + '</p><div class="rb">' +
          ('speechSynthesis' in window ? '<button class="rsay" data-i="' + i + '">🔊 Erklärung</button>' : '') +
          (x.ex ? '<button class="rex" data-i="' + i + '"><span class="play" aria-hidden="true">▶</span> Beispiel ' + esc(x.ex.aud.k) + '</button>' : '') +
          '<a class="rgo" href="l/' + x.les.id + '/">Lektion ' + x.les.id + '</a></div></div>';
      }).join('') + '</div>';
  }
  function bindRecap(L) {
    var rs = recapRules(L);
    function clean(t) { return (t || '').replace(/[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]+/g, ' ').replace(/\s+/g, ' '); }
    app.querySelectorAll('.rsay').forEach(function (el) {
      el.onclick = function () {
        var x = rs[+el.dataset.i];
        say(x.r.name + '. ' + (x.r.short || '') + '. ' + (x.les.when ? 'Wann? ' + x.les.when + ' ' : '') + (x.les.how ? 'Wie? ' + x.les.how : ''), el);
      };
    });
    app.querySelectorAll('.rex').forEach(function (el) {
      el.onclick = function () { if (window.speechSynthesis) window.speechSynthesis.cancel(); playCard(rs[+el.dataset.i].ex, el); };
    });
  }

  function bindZoom(root) {
    [].forEach.call(root.querySelectorAll('.pg'), function (b) {
      b.onclick = function () {
        var im = b.querySelector('img'), z = 2;
        var v = document.createElement('div'); v.className = 'viewer' + (b.classList.contains('tile') || b.classList.contains('head') ? ' nofilter' : '');
        v.innerHTML = '<div class="vbar"><button class="vz" data-d="-1" aria-label="Kleiner">−</button><button class="vz" data-d="1" aria-label="Größer">+</button><button class="close">Schließen ✕</button></div><div class="vscroll"><img alt="" src="' + im.src + '"></div>';
        var vi = v.querySelector('img');
        function set() { vi.style.width = (z * 100) + '%'; }
        set();
        v.onclick = function (ev) {
          var zb = ev.target.closest('.vz');
          if (zb) { z = Math.max(1, Math.min(5, z + (+zb.dataset.d) * 0.75)); set(); }
          else if (ev.target.closest('.close')) { v.remove(); document.body.style.overflow = ''; }
        };
        document.body.appendChild(v); document.body.style.overflow = 'hidden';
      };
    });
  }
  var STEPS = null;
  function scrollToId(id) {
    var el = document.getElementById(id); if (!el) return;
    var st = el.closest && el.closest('.step');
    if (STEPS && st) { STEPS.show(+st.dataset.step, true); if (el === st || el.classList.contains('hs')) { window.scrollTo(0, 0); return; } }
    var t = document.querySelector('.top'); window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - (t ? t.offsetHeight : 0) - 12);
  }

  /* ---------- Vorlesen (Stimme des Geräts) ---------- */
  function say(text, el) {
    var sy = window.speechSynthesis; if (!sy) return;
    if (sy.speaking && el.classList.contains('on')) { sy.cancel(); el.classList.remove('on'); return; }
    sy.cancel(); audio.pause();
    [].forEach.call(document.querySelectorAll('.say.on, .rsay.on'), function (o) { o.classList.remove('on'); });
    var u = new SpeechSynthesisUtterance((text || '').replace(/…/g, ' ').replace(/[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]+/g, ' ').replace(/\s+/g, ' '));
    u.lang = 'de-DE'; u.rate = 0.95;
    var vs = (sy.getVoices() || []).filter(function (v) { return /^de/i.test(v.lang); });
    var male = vs.filter(function (v) { return /male|männlich|martin|markus|yannick|stefan|conrad|hans|daniel|viktor|klaus|killian|christoph|#male/i.test(v.name) && !/female|weiblich/i.test(v.name); })[0];
    if (male) u.voice = male; else if (vs[0]) u.voice = vs[0];
    u.onend = u.onerror = function () { el.classList.remove('on'); };
    el.classList.add('on'); sy.speak(u);
  }
  if (window.speechSynthesis && window.speechSynthesis.getVoices) window.speechSynthesis.getVoices();

  /* ---------- Schritt für Schritt: ein Abschnitt pro Bildschirm ---------- */
  function makeSteps(L, next) {
    var groups = [], first = document.createElement('div');
    first.id = 'start';
    var lead = [].filter.call(app.children, function (c) { return c.classList.contains('stale') || c.classList.contains('lhead') || c.id === 'erklaerung' || c.id === 'anwenden'; });
    app.insertBefore(first, lead[0]); lead.forEach(function (c) { first.appendChild(c); });
    groups.push({ el: first, label: 'Erklärung' });
    var names = { buchstaben: 'Woher die Buchstaben kommen', alphabet: 'Das Alphabet', hoeren: 'Hören', suren: 'Die Suren anhören' };
    [].forEach.call(app.children, function (c) { if (names[c.id]) groups.push({ el: c, label: names[c.id] }); });
    [].forEach.call(app.querySelectorAll('#heft > article.hs'), function (a) {
      var h3 = a.querySelector('h3'); groups.push({ el: a, label: (a.classList.contains('auf') ? 'Aufgabe: ' : '') + (h3 ? h3.textContent : 'Abschnitt') });
    });
    var end = document.createElement('div'); end.id = 'fertig';
    end.innerHTML = '<h2>Geschafft</h2><p>Du bist am Ende dieser Lektion. Wenn du alles sicher kannst, hak sie ab.</p>';
    [].filter.call(app.children, function (c) { return c.classList.contains('done') || c.classList.contains('pager') || c.tagName === 'FOOTER'; }).forEach(function (c) { end.appendChild(c); });
    app.appendChild(end); groups.push({ el: end, label: 'Fertig' });
    groups.forEach(function (g, i) { g.el.classList.add('step'); g.el.dataset.step = i; });
    document.body.classList.add('stepmode');
    var bar = document.createElement('div'); bar.className = 'stepbar';
    bar.innerHTML = '<button id="st-prev" aria-label="Zurück">‹ Zurück</button><button id="st-pos" aria-label="Alle Schritte zeigen"></button><button id="st-next">Weiter ›</button>';
    document.body.appendChild(bar);
    var list = document.createElement('div'); list.className = 'steplist'; list.hidden = true;
    list.innerHTML = '<div class="sl-in"><b>Alle Schritte dieser Lektion</b><ol>' + groups.map(function (g, i) { return '<li><button data-s="' + i + '">' + esc(g.label) + '</button></li>'; }).join('') + '</ol><button class="sl-x">Schließen</button></div>';
    document.body.appendChild(list);
    var cur = -1, key = 'elifba-step-' + L.id;
    var api = {
      groups: groups,
      show: function (i, quiet) {
        i = Math.max(0, Math.min(groups.length - 1, i)); if (i === cur) return;
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        groups.forEach(function (g, k) { g.el.classList.toggle('cur', k === i); });
        cur = i;
        document.getElementById('st-pos').textContent = (i + 1) + ' / ' + groups.length;
        document.getElementById('st-prev').disabled = i === 0;
        var nb = document.getElementById('st-next');
        nb.textContent = i === groups.length - 1 ? (next ? 'Lektion ' + next.id + ' ›' : 'Übersicht ›') : 'Weiter ›';
        [].forEach.call(list.querySelectorAll('button[data-s]'), function (b) { b.classList.toggle('on', +b.dataset.s === i); });
        try { sessionStorage.setItem(key, i); } catch (e) {}
        if (!quiet) window.scrollTo(0, 0);
      },
      go: function (d) {
        if (d > 0 && cur === groups.length - 1) { location.href = next ? 'l/' + next.id + '/' : './'; return; }
        api.show(cur + d);
      }
    };
    document.getElementById('st-prev').onclick = function () { api.go(-1); };
    document.getElementById('st-next').onclick = function () { api.go(1); };
    document.getElementById('st-pos').onclick = function () { list.hidden = false; };
    list.onclick = function (ev) {
      var b = ev.target.closest('button[data-s]');
      if (b) { api.show(+b.dataset.s); list.hidden = true; }
      else if (ev.target === list || ev.target.classList.contains('sl-x')) list.hidden = true;
    };
    // Wischen: nach links = weiter, nach rechts = zurück
    var sx = 0, sy = 0, st = 0;
    app.addEventListener('touchstart', function (e) { if (e.touches.length !== 1) { st = 0; return; } sx = e.touches[0].clientX; sy = e.touches[0].clientY; st = Date.now(); }, { passive: true });
    app.addEventListener('touchend', function (e) {
      if (!st) return; var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      if (Date.now() - st < 700 && Math.abs(dx) > 80 && Math.abs(dy) < 45) api.go(dx < 0 ? 1 : -1);
      st = 0;
    }, { passive: true });
    document.addEventListener('keydown', function (e) {
      if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
      if (e.key === 'ArrowRight') api.go(1); else if (e.key === 'ArrowLeft') api.go(-1);
    });
    var startAt = 0;
    try { if (!location.hash) startAt = +sessionStorage.getItem(key) || 0; } catch (e) {}
    api.show(startAt, true);
    return api;
  }

  /* ---------- Lektionsseite ---------- */
  function lessonPage(L) {
    var idx = D.lessons.indexOf(L), prev = D.lessons[idx - 1], next = D.lessons[idx + 1];
    var label = L.id === 0 ? 'Einleitung' : 'Lektion ' + L.id;
    var rc = (L.rules && L.rules.length && D.rules[L.rules[0]]) ? D.rules[L.rules[0]].color : 'var(--ink)';
    var h = '';
    if (window.ELIFBA_IMG_V !== D.version) {
      h += '<div class="stale"><b>Die Bilder dieser Seite fehlen oder sind veraltet.</b> Beim Hochladen auf GitHub muss auch der Ordner „l“ mit hochgeladen werden. Danach die Seite neu laden.</div>';
    }
    h += '<div class="lhead"><span class="ar">' + L.ar + '</span><h1>' + esc(L.title) + '</h1>' +
      '<div class="meta">' + label + ' · Heft S. ' + L.pages[0] + (L.pages[1] !== L.pages[0] ? '–' + L.pages[1] : '') + '</div>' + chips(L.rules) + '</div>';
    h += '<nav class="jump" id="jump"></nav>';
    h += '<section id="erklaerung"><h2>Kurz erklärt</h2>' + ('speechSynthesis' in window ? '<button class="say" id="say-intro">🔊 Erklärung vorlesen</button>' : '') + L.intro.map(function (p) { return '<p>' + txt(p) + '</p>'; }).join('');
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
    bindCards(L); bindRecap(L); bindSecTools(L);
    if (L.special === 'letters') bindLetters(L);
    bindSurahs();
    var si = document.getElementById('say-intro');
    if (si) si.onclick = function () {
      say(L.title + '. ' + L.intro.join(' ') + (L.when ? ' Wann? ' + L.when : '') + (L.how ? ' Wie? ' + L.how : '') + (L.steps ? ' So wendest du es an. ' + L.steps.join(' ') : '') + (L.mistake ? ' Typischer Fehler. ' + L.mistake : ''), si);
    };
    STEPS = makeSteps(L, next);
    navBar(L);
    bindVerses(L);
    exercise();
    document.getElementById('done').onchange = function (e) { setDone(L.id, e.target.checked); };
  }

  /* ---------- Feste Leiste oben: Lektion wechseln, Abschnitt wählen ---------- */
  function navBar(L) {
    var top = document.querySelector('.top'); if (!top) return;
    var idx = D.lessons.indexOf(L), prev = D.lessons[idx - 1], next = D.lessons[idx + 1];
    var opt = D.lessons.map(function (x) { return '<option value="' + x.id + '"' + (x === L ? ' selected' : '') + '>' + (x.id ? 'Lektion ' + x.id : 'Einleitung') + ' · ' + esc(x.title) + '</option>'; }).join('');
    var secs = STEPS ? STEPS.groups.map(function (g, i) { return '<option value="' + i + '">' + (i + 1) + ' · ' + esc(g.label) + '</option>'; }).join('') : '';
    var tg = document.createElement('button'); tg.className = 'navtoggle'; tg.setAttribute('aria-expanded', 'false');
    tg.innerHTML = '<span class="nt-l">' + (L.id ? 'Lektion ' + L.id : 'Einleitung') + '</span><span class="nt-i" aria-hidden="true">▾</span>';
    top.appendChild(tg);
    var bar = document.createElement('div'); bar.className = 'nav'; bar.hidden = true;
    bar.innerHTML = '<a class="nb" href="' + (prev ? 'l/' + prev.id + '/' : './') + '" aria-label="Vorige Lektion">‹</a>' +
      '<select id="nav-l" aria-label="Lektion wählen">' + opt + '</select>' +
      '<a class="nb" href="' + (next ? 'l/' + next.id + '/' : './') + '" aria-label="Nächste Lektion">›</a>' +
      (secs ? '<select id="nav-s" aria-label="Schritt wählen"><option value="">Zu einem Schritt springen …</option>' + secs + '</select>' : '');
    top.appendChild(bar);
    tg.onclick = function () { bar.hidden = !bar.hidden; tg.setAttribute('aria-expanded', String(!bar.hidden)); tg.classList.toggle('open', !bar.hidden); };
    document.getElementById('nav-l').onchange = function (e) { location.href = 'l/' + e.target.value + '/'; };
    var ns = document.getElementById('nav-s');
    if (ns) ns.onchange = function (e) { if (e.target.value !== '') { STEPS.show(+e.target.value); e.target.value = ''; bar.hidden = true; tg.classList.remove('open'); tg.setAttribute('aria-expanded', 'false'); } };
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

  /* ---------- Hell / Dunkel ---------- */
  (function () {
    var top = document.querySelector('.top'); if (!top) return;
    var dark = false; try { dark = localStorage.getItem('elifba-dark') === '1'; } catch (e) {}
    var b = document.createElement('button'); b.className = 'themebtn';
    function set() {
      document.documentElement.classList.toggle('dark', dark);
      b.textContent = dark ? '☀' : '☾'; b.setAttribute('aria-label', dark ? 'Helle Ansicht' : 'Dunkle Ansicht');
      var m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = dark ? '#000000' : '#ffffff';
    }
    b.onclick = function () { dark = !dark; try { localStorage.setItem('elifba-dark', dark ? '1' : '0'); } catch (e) {} set(); };
    set();
    window.ELIFBA_THEMEBTN = b;
  })();

  var id = document.body.dataset.lesson;
  var q = new URLSearchParams(location.search).get('l');
  if (id === '' && q !== null) id = q;
  var L = id === '' ? null : D.lessons.filter(function (x) { return String(x.id) === String(id); })[0];
  if (L) lessonPage(L); else overview();
  (function () { var top = document.querySelector('.top'), b = window.ELIFBA_THEMEBTN, nav = top && top.querySelector('.nav'); if (top && b) { if (nav) top.insertBefore(b, nav); else top.appendChild(b); } })();
})();
