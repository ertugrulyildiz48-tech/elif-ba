(function () {
  'use strict';
  var D = window.ELIFBA, app = document.getElementById('app');
  var IMG = window.ELIFBA_IMG || {};
  var AYAH = 'https://everyayah.com/data/Husary_128kbps/';
  var WORD = 'https://audio.qurancdn.com/';
  var SURAH = 'https://download.quranicaudio.com/quran/mahmood_khaleel_al-husaree/';
  var CLIP = 'https://download.quranicaudio.com/qdc/khalil_al_husary/murattal/';
  var LETTER = 'https://www.islamcan.com/learn-arabic/arabic-alphabets/';

  var SN = 'Al-Fātiḥa|Al-Baqara|Āl ʿImrān|An-Nisāʾ|Al-Māʾida|Al-Anʿām|Al-Aʿrāf|Al-Anfāl|At-Tauba|Yūnus|Hūd|Yūsuf|Ar-Raʿd|Ibrāhīm|Al-Ḥidschr|An-Naḥl|Al-Isrāʾ|Al-Kahf|Maryam|Ṭā-Hā|Al-Anbiyāʾ|Al-Ḥadsch|Al-Muʾminūn|An-Nūr|Al-Furqān|Asch-Schuʿarāʾ|An-Naml|Al-Qaṣaṣ|Al-ʿAnkabūt|Ar-Rūm|Luqmān|As-Sadschda|Al-Aḥzāb|Sabaʾ|Fāṭir|Yā-Sīn|Aṣ-Ṣāffāt|Ṣād|Az-Zumar|Ghāfir|Fuṣṣilat|Asch-Schūrā|Az-Zuchruf|Ad-Duchān|Al-Dschāthiya|Al-Aḥqāf|Muḥammad|Al-Fatḥ|Al-Ḥudschurāt|Qāf|Adh-Dhāriyāt|Aṭ-Ṭūr|An-Nadschm|Al-Qamar|Ar-Raḥmān|Al-Wāqiʿa|Al-Ḥadīd|Al-Mudschādala|Al-Ḥaschr|Al-Mumtaḥana|Aṣ-Ṣaff|Al-Dschumuʿa|Al-Munāfiqūn|At-Taghābun|Aṭ-Ṭalāq|At-Taḥrīm|Al-Mulk|Al-Qalam|Al-Ḥāqqa|Al-Maʿāridsch|Nūḥ|Al-Dschinn|Al-Muzzammil|Al-Muddaththir|Al-Qiyāma|Al-Insān|Al-Mursalāt|An-Nabaʾ|An-Nāziʿāt|ʿAbasa|At-Takwīr|Al-Infiṭār|Al-Muṭaffifīn|Al-Inschiqāq|Al-Burūdsch|Aṭ-Ṭāriq|Al-Aʿlā|Al-Ghāschiya|Al-Fadschr|Al-Balad|Asch-Schams|Al-Lail|Aḍ-Ḍuḥā|Asch-Scharḥ|At-Tīn|Al-ʿAlaq|Al-Qadr|Al-Bayyina|Az-Zalzala|Al-ʿĀdiyāt|Al-Qāriʿa|At-Takāthur|Al-ʿAṣr|Al-Humaza|Al-Fīl|Quraisch|Al-Māʿūn|Al-Kauthar|Al-Kāfirūn|An-Naṣr|Al-Masad|Al-Ichlāṣ|Al-Falaq|An-Nās'.split('|');
  function sname(n) { return SN[n - 1] || ('Sure ' + n); }
  function arnum(n) { return String(n).replace(/\d/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'[d]; }); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  var LES = null;
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
  var audio = new Audio(), current = null, rate = +(store('elifba-rate') || 1) || 1, queue = [], onStep = null, loopPref = store('elifba-loop') === '1';
  audio.preload = 'none';
  var pl = document.getElementById('player'), plT = document.getElementById('pl-title'), plS = document.getElementById('pl-sub'),
      plBtn = document.getElementById('pl-toggle'), plSpeed = document.getElementById('pl-speed'), plLoop = document.getElementById('pl-loop');
  function mark(el, on) { if (el) el.classList.toggle('on', on); }
  function play(urls, title, subtitle, el) {
    if (current === el && !audio.paused) { audio.pause(); return; }
    mark(current, false); current = el;
    queue = urls.slice(1); onStep = null; audio.loop = loopPref && urls.length === 1; clip = null;
    audio.src = urls[0]; audio.playbackRate = rate;
    audio.play().catch(function () { plS.textContent = 'Audio konnte nicht geladen werden. Bitte Internetverbindung prüfen.'; });
    plT.textContent = title; plS.textContent = subtitle; pl.hidden = false; mark(el, true);
  }
  audio.addEventListener('play', function () { plBtn.textContent = '❚❚'; plBtn.setAttribute('aria-label', 'Pause'); mark(current, true); });
  audio.addEventListener('pause', function () { plBtn.textContent = '▶'; plBtn.setAttribute('aria-label', 'Abspielen'); mark(current, false); });
  audio.addEventListener('ended', function () {
    if (queue.length) { audio.src = queue.shift(); audio.playbackRate = rate; audio.play(); if (onStep) onStep(queue.length); return; }
    mark(current, false); if (onStep) onStep(-1);
  });
  plBtn.onclick = function () { if (audio.paused) audio.play(); else audio.pause(); };
  function showRate() { audio.playbackRate = rate; plSpeed.textContent = (rate === 1 ? '1' : rate === 0.75 ? '¾' : '½') + '×'; plSpeed.classList.toggle('on', rate !== 1); plLoop.classList.toggle('on', loopPref); }
  function setRate(r) { rate = r; store('elifba-rate', String(r)); showRate(); }
  function setLoop(v) { loopPref = v; audio.loop = v && !queue.length; store('elifba-loop', v ? '1' : '0'); showRate(); }
  plSpeed.onclick = function () { setRate(rate === 1 ? 0.75 : rate === 0.75 ? 0.5 : 1); };
  plLoop.onclick = function () { setLoop(!loopPref); };
  showRate();
  function ayahUrl(s, a) { return AYAH + pad(s, 3) + pad(a, 3) + '.mp3'; }

  /* Jede Karte hat beim Bauen geprüft bekommen, welche Aufnahme genau zu ihrem Text passt (ex.aud).
     Ohne geprüfte Zuordnung wird nichts abgespielt. */
  function playCard(ex, el) {
    var a = ex.aud; if (!a) return;
    var k = a.k.split(':'), ref = sname(+k[0]) + ' ' + a.k;
    // Ein Wort: Einzelaufnahme (quran.com). Mehrere Wörter: genau diese Wörter aus al-Ḥuṣarīs Aufnahme
    // (Wortzeiten von quran.com), damit der Tajwīd zwischen den Wörtern hörbar bleibt. Ganzer Vers nur bei Verskarten.
    if (a.t === 'w' && a.u.length === 1) play([WORD + a.u[0]], ref, 'Genau dieses Wort (quran.com)', el);
    else if (a.t === 'w' && a.c) playClip(CLIP + (+k[0]) + '.mp3', a.c[0], a.c[1], ref, 'Genau diese Wörter · Maḥmūd Khalīl al-Ḥuṣarī', el);
    else if (a.t === 'w') return;
    else play([ayahUrl(+k[0], +k[1])], ref, 'Ganzer Vers · Maḥmūd Khalīl al-Ḥuṣarī', el);
  }
  /* Ausschnitt aus einer Surenaufnahme: Start und Ende in Millisekunden */
  var clip = null;
  function playClip(url, a, b, title, sub, el) {
    if (current === el && !audio.paused) { audio.pause(); return; }
    var s0 = Math.max(0, a - 40) / 1000, s1 = (b + 120) / 1000;
    play([url + '#t=' + s0.toFixed(2) + ',' + s1.toFixed(2)], title, sub, el);
    audio.loop = false; clip = { a: s0, b: s1 };
    var seek = function () { if (clip && Math.abs(audio.currentTime - clip.a) > 0.3) audio.currentTime = clip.a; };
    audio.addEventListener('loadedmetadata', seek, { once: true });
  }
  audio.addEventListener('timeupdate', function () {
    if (!clip || audio.currentTime < clip.b) return;
    if (loopPref) { audio.currentTime = clip.a; return; }
    audio.pause(); mark(current, false);
  });
  audio.addEventListener('emptied', function () { if (clip && audio.src.indexOf('#t=') < 0) clip = null; });

  /* ---------- Bausteine ---------- */
  function chips(rules) {
    if (!rules || !rules.length) return '';
    return '<div class="chips">' + rules.map(function (k) {
      var r = D.rules[k]; return '<span class="chip" style="--c:' + r.color + '"><b>' + esc(k) + '</b>' + esc(r.name) + '</span>';
    }).join('') + '</div>';
  }
  function cardFs(ex, kind) { return ex.fs >= 12 ? ex.fs : (kind === 'u' ? 19 : 24); }
  function cardHtml(ex, i, kind) {
    var key = (ex.aud && ex.aud.k) || (ex.s + ':' + ex.a), title = sname(+key.split(':')[0]) + ' ' + key, has = !!ex.aud;
    var em = (ex.w / (cardFs(ex, kind) * 4.1667)).toFixed(2);
    return '<button class="card' + (has ? '' : ' still') + '" data-k="' + kind + '" data-i="' + i + '"' + (ex.img2 ? ' data-two="1"' : '') + (has ? ' aria-label="' + esc(title) + ' anhören"' : ' aria-label="' + esc(title) + '" disabled') + '>' +
      (has ? '<span class="play" aria-hidden="true">▶</span>' : '') +
      '<span class="cl">' + (ex.vm ? '<span class="vn" aria-hidden="true">' + arnum(key.split(':')[1]) + '</span>' : '') +
      '<img src="' + src(ex.img) + '" width="' + ex.w + '" height="' + ex.h + '" alt="' + esc(title) + '" style="width:calc(' + em + ' * var(--apx))"></span>' +
      (kind === 'u' ? '<span class="ref">' + esc(title) + '</span>' : '') + '</button>';
  }
  /* Lange Verse: in einer Reihe, wenn der Platz reicht, sonst die Fassung in zwei Zeilen. Das Verszeichen bleibt immer am Versende. */
  function fitCards() {
    if (!LES) return;
    var apx = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--apx')) || 28;
    [].forEach.call(app.querySelectorAll('.card[data-two]'), function (el) {
      var cl = el.querySelector('.cl'); if (!cl || !cl.clientWidth) return;
      var kind = el.dataset.k, ex = (kind === 'u' ? LES.practice : LES.examples)[+el.dataset.i], im = el.querySelector('img'), vn = el.querySelector('.vn');
      var unit = cardFs(ex, kind) * 4.1667, avail = cl.clientWidth - (vn ? vn.offsetWidth + 12 : 0);
      var st = ex.w / unit * apx <= avail + 1 ? '1' : '2';
      if (el.dataset.st === st) return; el.dataset.st = st;
      var one = st === '1', w = one ? ex.w : ex.w2, h = one ? ex.h : ex.h2;
      im.src = src(one ? ex.img : ex.img2); im.width = w; im.height = h; im.style.width = 'calc(' + (w / unit).toFixed(2) + ' * var(--apx))';
      el.classList.toggle('two', !one);
      if (vn) vn.style.marginBottom = one ? '' : 'calc(' + Math.max(0, ex.h2 / Math.max(2, Math.round(ex.h2 / ex.h)) / unit / 2 - 0.5).toFixed(2) + ' * var(--apx))';
    });
  }
  window.addEventListener('resize', fitCards);
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
        play(urls, sname(p.mushaf) + (p.ganz ? '' : ' ' + p.mushaf + ':' + p.von + '–' + p.bis), (p.ganz ? 'Ganze Sure' : 'Vers für Vers') + ' · Maḥmūd Khalīl al-Ḥuṣarī', el);
      };
    });
    app.querySelectorAll('.vmark').forEach(function (el) {
      el.onclick = function () { var p = mushafPart(el.dataset.m), v = +el.dataset.v; play([ayahUrl(p.mushaf, v)], sname(p.mushaf) + ' ' + p.mushaf + ':' + v, 'Ganzer Vers · Maḥmūd Khalīl al-Ḥuṣarī', el); };
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
      return '<button class="verse" data-i="' + i + '"><span class="play" aria-hidden="true">▶</span><span class="vt quran">' + esc(v.text) + ' ﴿' + v.k.split(':')[1].replace(/\d/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'[d]; }) + '﴾</span><small>' + esc(sname(+v.k.split(':')[0])) + ' ' + v.k + '</small></button>';
    }).join('') + '</div></section>';
  }
  function bindVerses(L) {
    app.querySelectorAll('.verse').forEach(function (el) {
      el.onclick = function () { var v = L.audio_verses[+el.dataset.i], p = v.k.split(':'); play([ayahUrl(+p[0], +p[1])], sname(+p[0]) + ' ' + v.k, 'Ganzer Vers · Maḥmūd Khalīl al-Ḥuṣarī', el); };
    });
  }

  /* ---------- Markier-Aufgaben: Farbe wählen, Buchstaben antippen, korrigieren ----------
     Text: Tanzil Uthmani. Lösung: Tajwīd-Stellen aus cpfair/quran-tajweed (CC BY 4.0), beim Bauen gegen die Zählung im Heft geprüft. */
  var MK_RULES = { 'M.T.': ['madd_2'], 'M.Mut.': ['madd_muttasil'], 'M.Mun.': ['madd_munfasil'], 'M.Lazım': ['madd_6'], 'İ.M.Günne': ['idghaam_ghunnah'], 'İ.B.Günne': ['idghaam_no_ghunnah'],
    'İklab': ['iqlab'], 'İhfa': ['ikhfa'], 'Dudak İ.': ['ikhfa_shafawi'], 'İ.Misl.': ['idghaam_shafawi'], 'İ.Mütec.': ['idghaam_mutajanisayn'], 'İ.Mütek.': ['idghaam_mutaqaribayn'], 'Kalkale': ['qalqalah'] };
  var MK_COMB = /[ؐ-ًؚ-ٰٟۖ-ۭ࣓-ࣿ]/;
  var MK_BAS = '\u0628\u0650\u0633\u0652\u0645\u0650 \u0671\u0644\u0644\u0651\u064e\u0647\u0650 \u0671\u0644\u0631\u0651\u064e\u062d\u0652\u0645\u064e\u0670\u0646\u0650 \u0671\u0644\u0631\u0651\u064e\u062d\u0650\u064a\u0645\u0650 ';
  function mkFor(L, page) { return (D.mark || []).filter(function (e) { return e.l === L.id && e.page === page; })[0] || null; }
  function mkGroups(L) {
    var known = {}, groups = [], byColor = {};
    D.lessons.forEach(function (X) { if (X.id <= L.id) (X.rules || []).forEach(function (k) { known[k] = 1; }); });
    Object.keys(known).forEach(function (k) {
      var r = D.rules[k]; if (!r || !MK_RULES[k]) return;
      var g = byColor[r.color]; if (!g) { g = byColor[r.color] = { color: r.color, keys: [], rules: [] }; groups.push(g); }
      g.keys.push(k); g.rules = g.rules.concat(MK_RULES[k]);
    });
    var unchecked = Object.keys(known).filter(function (k) { return D.rules[k] && !MK_RULES[k]; });
    return { groups: groups, unchecked: unchecked };
  }
  function mkUnits(t) {
    var u = [];
    for (var i = 0; i < t.length; i++) {
      var ch = t[i];
      if (MK_COMB.test(ch) && u.length && u[u.length - 1].sp === false) { u[u.length - 1].t += ch; u[u.length - 1].b = i + 1; continue; }
      u.push({ t: ch, a: i, b: i + 1, sp: ch === ' ' });
    }
    return u;
  }
  function mkHtml(E, L, sec) {
    var G = mkGroups(L);
    var h = '<div class="mk" data-mk="' + E.l + '-' + E.page + '"><div class="mk-h"><b>Selbst markieren</b><span>' + esc(sname(E.s)) + ' ' + E.s + ':' + E.a + (E.b > E.a ? '–' + E.b : '') + '</span></div>' +
      '<p class="hint">1. Farbe antippen. 2. Buchstaben antippen, die zu dieser Regel gehören (nochmal tippen nimmt die Farbe weg). 3. „Korrigieren“.</p>' +
      '<div class="mk-leg">' + G.groups.map(function (g, i) { return '<button class="mk-c" data-g="' + i + '" style="--c:' + g.color + '"><i></i>' + g.keys.map(esc).join(' · ') + '</button>'; }).join('') +
      '<button class="mk-c mk-er" data-g="-1"><i></i>Radierer</button></div>' +
      (G.unchecked.length ? '<p class="mk-note">' + G.unchecked.map(function (k) { return esc(D.rules[k].name); }).join(', ') + ': kannst du hier nicht markieren, die prüft die App nicht.</p>' : '') +
      '<div class="mk-t quran" dir="rtl">' + E.v.map(function (v, vi) {
        var bas = (v[0] === 1 && E.s !== 1 && v[1].indexOf(MK_BAS) === 0) ? MK_BAS.length : 0, inB = false;
        return mkUnits(v[1]).map(function (u, ui) {
          var o = '';
          if (bas && ui === 0) { o = '<span class="mk-bas">'; inB = true; }
          if (inB && u.a >= bas) { o += '</span>'; inB = false; }
          return o + (u.sp ? ' ' : '<span class="u" data-v="' + vi + '" data-u="' + ui + '">' + u.t + '</span>');
        }).join('') + (inB ? '</span>' : '') + ' <span class="mk-n">﴿' + arnum(v[0]) + '﴾</span> ';
      }).join('') + '</div>' +
      '<div class="mk-b"><button class="mk-go">Korrigieren</button><button class="mk-sol" hidden>Lösung zeigen</button><button class="mk-clr">Alles löschen</button></div><div class="mk-res" aria-live="polite"></div></div>';
    return h;
  }
  function mkBind(L) {
    [].forEach.call(app.querySelectorAll('.mk'), function (box) {
      var id = box.dataset.mk.split('-'), sec = null, E = (D.mark || []).filter(function (e) { return e.l === +id[0] && e.page === +id[1]; })[0];
      if (!E) return;
      var G = mkGroups(L).groups, cur = 0, key = 'elifba-mk-' + box.dataset.mk, marks = {};
      try { marks = JSON.parse(store(key) || '{}') || {}; } catch (e) { marks = {}; }
      var U = E.v.map(function (v) { return mkUnits(v[1]); });
      function paint() {
        [].forEach.call(box.querySelectorAll('.u'), function (s) {
          var g = marks[s.dataset.v + ':' + s.dataset.u];
          if (g !== undefined && G[g]) { s.style.setProperty('--c', G[g].color); s.classList.add('on'); } else { s.classList.remove('on'); s.style.removeProperty('--c'); }
        });
        [].forEach.call(box.querySelectorAll('.mk-c'), function (b) { b.classList.toggle('sel', +b.dataset.g === cur); });
      }
      function clearCheck() { [].forEach.call(box.querySelectorAll('.u.bad, .u.miss'), function (s) { s.classList.remove('bad', 'miss'); }); box.querySelector('.mk-res').textContent = ''; box.querySelector('.mk-sol').hidden = true; }
      // Lösung: welche Buchstaben gehören zu welcher Gruppe (Madd: auch der Buchstabe davor zählt)
      function sol() {
        var occ = [];
        E.v.forEach(function (v, vi) {
          v[2].forEach(function (an) {
            var gi = -1; G.forEach(function (g, i) { if (g.rules.indexOf(an[2]) > -1) gi = i; }); if (gi < 0) return;
            var us = []; U[vi].forEach(function (u, ui) { if (!u.sp && u.a < an[1] && u.b > an[0]) us.push(ui); });
            if (/^madd/.test(an[2]) && us.length) { var p = us[0] - 1; if (p >= 0 && !U[vi][p].sp) us.unshift(p); }
            // Toleranz: ein Buchstabe daneben im selben Wort zählt auch (verbundene Schrift ist schwer genau zu treffen)
            var near = us.slice(); if (us.length) { var lo = us[0] - 1, hi = us[us.length - 1] + 1; if (lo >= 0 && !U[vi][lo].sp) near.push(lo); if (hi < U[vi].length && !U[vi][hi].sp) near.push(hi); }
            occ.push({ g: gi, v: vi, us: us, near: near });
          });
        });
        return occ;
      }
      box.onclick = function (ev) {
        var c = ev.target.closest('.mk-c'); if (c) { cur = +c.dataset.g; paint(); return; }
        var s = ev.target.closest('.u');
        if (s) {
          var k = s.dataset.v + ':' + s.dataset.u;
          if (cur < 0 || marks[k] === cur) delete marks[k]; else marks[k] = cur;
          store(key, JSON.stringify(marks)); clearCheck(); paint(); return;
        }
        if (ev.target.closest('.mk-clr')) { marks = {}; store(key, '{}'); clearCheck(); paint(); return; }
        if (ev.target.closest('.mk-go')) {
          clearCheck();
          var occ = sol(), ok = {}, wrong = 0;
          occ.forEach(function (o) { o.near.forEach(function (ui) { ok[o.v + ':' + ui + ':' + o.g] = 1; }); });
          Object.keys(marks).forEach(function (k) {
            if (!ok[k + ':' + marks[k]]) { wrong++; var p = k.split(':'), el = box.querySelector('.u[data-v="' + p[0] + '"][data-u="' + p[1] + '"]'); if (el) el.classList.add('bad'); }
          });
          var used = {}; Object.keys(marks).forEach(function (k) { used[marks[k]] = 1; });
          var own = {}; (L.rules || []).forEach(function (k) { G.forEach(function (g, i) { if (g.keys.indexOf(k) > -1) own[i] = 1; }); });
          var lines = [];
          G.forEach(function (g, i) {
            if (!used[i] && !own[i]) return;
            var all = occ.filter(function (o) { return o.g === i; }), found = all.filter(function (o) { return o.near.some(function (ui) { return marks[o.v + ':' + ui] === i; }); });
            found.forEach(function (o) { o.found = true; });
            lines.push(g.keys.join(' · ') + ': ' + found.length + ' von ' + all.length + ' gefunden');
          });
          occ = occ.filter(function (o) { return used[o.g] || own[o.g]; });
          var r = box.querySelector('.mk-res');
          r.innerHTML = (wrong ? '<b class="bad">' + wrong + (wrong === 1 ? ' Buchstabe ist' : ' Buchstaben sind') + ' falsch markiert (rot umkreist).</b>' : (Object.keys(marks).length ? '<b class="good">Keine falsche Markierung.</b>' : '')) +
            lines.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('');
          box.querySelector('.mk-sol').hidden = !occ.some(function (o) { return !o.found; });
          var sb = box.querySelector('.mk-sol'); sb.onclick = function (e2) { e2.stopPropagation(); occ.forEach(function (o) { if (!o.found) o.us.forEach(function (ui) { var el = box.querySelector('.u[data-v="' + o.v + '"][data-u="' + ui + '"]'); if (el) { el.classList.add('miss'); el.style.setProperty('--m', G[o.g].color); } }); }); };
        }
      };
      paint();
    });
  }

  /* Kleine Zwischenüberschriften, die im Heft als Bild ausgeschnitten wurden: als Text */
  var SUBHEAD = { 'img/x13-005.webp': 'Vor ن', 'img/x13-006.webp': 'Vor م', 'img/x13-007.webp': 'Vor و',
    'img/x22-005.webp': 'Gruppe ث ذ ظ', 'img/x22-006.webp': 'Gruppe م ب', 'img/x23-005.webp': 'Gruppe ق ك',
    'img/x19-005.webp': 'Al-Muṭaffifīn 83:3', 'img/x24-003.webp': 'Al-Inschiqāq 84:14–84:15',
    'img/x10-010.webp': 'تَمْرِينٌ', 'img/x10-016.webp': 'تَمْرِينٌ', 'img/x19-012.webp': 'تَمْرِينٌ', 'img/x20-012.webp': 'تَمْرِينٌ', 'img/x20-001.webp': 'اَلْمِيمُ السَّاكِنَةُ' };
  /* ---------- Das Heft, Abschnitt für Abschnitt ---------- */
  function sectionsHtml(L) {
    if (!L.sections || !L.sections.length) return '';
    var seenPage = {};
    var toc = '<details class="toc" id="inhalt"><summary>Inhalt · ' + L.sections.length + ' Abschnitte</summary><ol>' +
      L.sections.map(function (s, i) { var id = s.anchor || 'abschnitt-' + (i + 1); return '<li><a href="#' + id + '" data-go="' + id + '"><span>' + esc(s.title) + '</span><small>S. ' + s.page + '</small></a></li>'; }).join('') + '</ol></details>';
    return '<section id="heft"><h2>Aus dem Heft · alle Erklärungen und Aufgaben</h2><p class="hint">Alles in derselben Reihenfolge wie im Heft. Bilder antippen zum Vergrößern. Karten mit ▶ kannst du anhören.</p>' + toc +
      L.sections.map(function (s, i) {
        var id = s.anchor || 'abschnitt-' + (i + 1), auf = s.kind === 'aufgabe', MK = auf ? mkFor(L, s.page) : null, mkImgs = [];
        return '<article class="hs ' + (auf ? 'auf' : 'erk') + '" id="' + id + '"><header><span class="tag">' + (auf ? 'Aufgabe' : 'Erklärung') + '</span><small>Heft S. ' + s.page + '</small></header><h3>' + esc(s.title) + '</h3>' + secTools(s, i) +
          (MK ? mkHtml(MK, L, s) : '') +
          s.parts.map(function (p, pi) {
            if (MK && p.img && !p.plain) { mkImgs.push(p); return ''; }
            var pid = '';
            if (p._in) return '';
            if (!seenPage[p.page]) { seenPage[p.page] = 1; pid = ' id="s-' + p.page + '"'; }
            if (p.img && ('mushaf' in p)) {
              var head = '';
              if (p.mushaf) {
                var nm = SURAH_AR[p.mushaf] || ('سُورَةُ ' + p.sname);
                head = '<div class="mh"><span class="quran">' + esc(nm) + '</span><span class="mref">' + esc(sname(p.mushaf)) + ' · ' + (p.ganz ? 'Sure ' + p.mushaf : p.mushaf + ':' + p.von + (p.bis > p.von ? '–' + p.bis : '')) + '</span>' +
                  '<button class="surah-play" data-m="' + p.img + '"><span class="play" aria-hidden="true">▶</span> ' + (p.ganz ? 'ganze Sure anhören' : 'Abschnitt anhören') + '</button></div>';
              }
              var hot = (p.marks || []).map(function (m, k) {
                return '<button class="vmark" data-m="' + p.img + '" data-v="' + (p.von + k) + '" style="left:' + (m[0] * 100) + '%;top:' + (m[1] * 100) + '%;width:' + (m[2] * 360) + '%" aria-label="Vers ' + (p.von + k) + ' anhören"></button>';
              }).join('');
              return '<div class="mushafw"' + pid + '>' + head + '<div class="mimg"><img alt="Sure" width="' + p.w + '" height="' + p.h + '" src="' + src(p.img) + '">' + hot + '</div>' +
                (p.marks ? '<p class="mtip">Tipp auf ein Verszeichen, dann hörst du genau diesen Vers.</p>' : '') + '</div>';
            }
            if (p.img && p.plain) return '<div class="ptext' + (p.box && /^[A-ZÄÖÜ]{4,}/.test(p.plain[0]) ? ' pbox' : '') + '"' + pid + '>' + p.plain.filter(function (x) { return x.replace(/\s/g, '') !== s.title.replace(/\s/g, ''); }).map(function (x) { return '<p>' + txt(x) + '</p>'; }).join('') + '</div>';
            if (p.img && SUBHEAD[p.img]) return '<p class="subh"' + pid + '>' + txt(SUBHEAD[p.img]) + '</p>';
            // Bildausschnitte in der Größe wie im Heft (1100 Pixel = volle Textbreite), nie hochskaliert
            if (p.img) return '<button class="pg"' + pid + (p.w < 1100 ? ' style="width:' + (100 * p.w / 1100).toFixed(1) + '%"' : '') + '><img alt="Heft Seite ' + p.page + '" width="' + p.w + '" height="' + p.h + '" src="' + src(p.img) + '"></button>';
            if (p.tiles) {
              var nx = s.parts[pi + 1], extra = '';
              if (nx && nx.img && nx.plain && nx.box) { nx._in = 1; extra = '<div class="ptext pbox tbox">' + nx.plain.map(function (x) { return '<p>' + txt(x) + '</p>'; }).join('') + '</div>'; }
              return '<div class="tiles"' + pid + '>' + p.tiles.map(function (t) { return '<button class="pg tile"><img alt="' + esc(t.letters) + '" width="' + t.w + '" height="' + t.h + '" src="' + src(t.img) + '"></button>'; }).join('') + extra + '</div>';
            }
            var list = p.kind === 'u' ? L.practice : L.examples;
            return '<div' + pid + ' class="' + (p.kind === 'u' ? 'rows' : 'cards') + '">' + p.cards.map(function (ci) { return cardHtml(list[ci], ci, p.kind); }).join('') + '</div>';
          }).join('') + (mkImgs.length ? '<details class="mk-orig"><summary>Heftseite zum Vergleich</summary>' + mkImgs.map(function (p) { return '<button class="pg"><img alt="Heft Seite ' + p.page + '" width="' + p.w + '" height="' + p.h + '" src="' + src(p.img) + '"></button>'; }).join('') + '</details>' : '') +
          (/Wiederholung/.test(s.title) && /Regeln/.test(s.title) ? recapBlock(L) : '') + '</article>';
      }).join('') + '</section>';
  }

  /* ---------- Erklärung zum Abschnitt: anhören oder lesen ---------- */
  function secText(s) { return (s.text || []).filter(function (t) { return t !== s.title && t.replace(/\s/g, '') !== s.title.replace(/\s/g, ''); }); }
  function secTools(s, i) {
    var t = secText(s); if (!t.length) return '';
    return '<div class="stools">' + (TTS.ok ? '<button class="say" data-sec="' + i + '">🔊 Anhören</button>' : '') +
      '<button class="readbtn" data-sec="' + i + '" aria-expanded="false">📖 Text lesen</button></div>' +
      '<div class="stext" id="stext-' + i + '" hidden>' + t.map(function (x) { return '<p>' + txt(x) + '</p>'; }).join('') + '</div>';
  }
  function bindSecTools(L) {
    app.querySelectorAll('.say[data-sec]').forEach(function (el) {
      el.onclick = function () { var s = L.sections[+el.dataset.sec]; say([s.title + '.'].concat(secText(s)), el); };
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
          (TTS.ok ? '<button class="rsay" data-i="' + i + '">🔊 Erklärung</button>' : '') +
          (x.ex ? '<button class="rex" data-i="' + i + '"><span class="play" aria-hidden="true">▶</span> Beispiel ' + esc(sname(+x.ex.aud.k.split(':')[0]) + ' ' + x.ex.aud.k) + '</button>' : '') +
          '<a class="rgo" href="l/' + x.les.id + '/">Lektion ' + x.les.id + '</a></div></div>';
      }).join('') + '</div>';
  }
  function bindRecap(L) {
    var rs = recapRules(L);
    function clean(t) { return (t || '').replace(/[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]+/g, ' ').replace(/\s+/g, ' '); }
    app.querySelectorAll('.rsay').forEach(function (el) {
      el.onclick = function () {
        var x = rs[+el.dataset.i];
        say([x.r.name + '.', x.r.short || '', x.les.when ? 'Wann? ' + x.les.when : '', x.les.how ? 'Wie? ' + x.les.how : ''], el);
      };
    });
    app.querySelectorAll('.rex').forEach(function (el) {
      el.onclick = function () { TTS.stop(); playCard(rs[+el.dataset.i].ex, el); };
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

  /* ---------- Vorlesen auf Deutsch: Satz für Satz, mit Pausen, Start · Pause · Weiter · Stopp ----------
     Im Browser die Stimme des Geräts (speechSynthesis), in der Android-App die Android-Sprachausgabe (window.AndroidTTS).
     Die Stimme kann in den Einstellungen gewählt werden; ohne Wahl nimmt die App die natürlichste männliche deutsche Stimme. */
  var TTS = (function () {
    var A = window.AndroidTTS || null, sy = window.speechSynthesis || null;
    var parts = [], idx = 0, state = 'idle', btn = null, timer = null, uid = 0, bar = null;
    var MALE = /conrad|killian|florian|ralf|stefan|klaus|markus|yannick|martin|hans|jonas|bernd|christoph|kasper|tobias|lukas|male|männlich|mann/i;
    var GOOD = /natural|online|neural|premium|enhanced|verbessert|network|wavenet/i;
    function voices() {
      if (A) { try { return JSON.parse(A.voices() || '[]'); } catch (e) { return []; } }
      if (!sy) return [];
      return (sy.getVoices() || []).filter(function (v) { return /^de([-_]|$)/i.test(v.lang); }).map(function (v) { return { id: v.voiceURI || v.name, name: v.name, lang: v.lang, v: v }; });
    }
    function score(v) { var s = 0; if (MALE.test(v.name) && !/female|weiblich|frau/i.test(v.name)) s += 4; if (GOOD.test(v.name)) s += 3; if (/de-DE|de_DE/i.test(v.lang)) s += 1; return s; }
    function pick() {
      var vs = voices(), want = store('elifba-voice');
      for (var i = 0; i < vs.length; i++) if (vs[i].id === want) return vs[i];
      return vs.slice().sort(function (a, b) { return score(b) - score(a); })[0] || null;
    }
    var AB = [[/\bz\.\s?B\./g, 'zum Beispiel'], [/\bd\.\s?h\./g, 'das heißt'], [/\bu\.\s?a\./g, 'unter anderem'], [/\bbzw\./g, 'beziehungsweise'], [/\busw\./g, 'und so weiter'],
      [/\bggf\./g, 'gegebenenfalls'], [/\bca\./g, 'circa'], [/\bNr\./g, 'Nummer'], [/\bS\.\s?(?=\d)/g, 'Seite '], [/\bvgl\./g, 'vergleiche'], [/(\d)\s?[–-]\s?(\d)/g, '$1 bis $2'],
      [/[·•→]/g, ', '], [/[„“”"«»]/g, ''], [/…/g, '.'], [/\(\s*\)/g, '']];
    function clean(t) {
      t = String(t || '');
      Object.keys(D.rules).sort(function (a, b) { return b.length - a.length; }).forEach(function (k) { if (t.indexOf(k) > -1) t = t.split(k).join(D.rules[k].name || k); });
      AB.forEach(function (r) { t = t.replace(r[0], r[1]); });
      t = t.replace(/[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]+/g, ' ');
      t = t.normalize ? t.normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC') : t;
      return t.replace(/[ʿʾ‘’`´]/g, '').replace(/\s+([,.!?;:])/g, '$1').replace(/([,.!?;:]){2,}/g, '$1').replace(/\s+/g, ' ').trim();
    }
    // in Sätze teilen; ein Abschnitt (Absatz) bekommt eine längere Pause
    function split(blocks) {
      var out = [];
      blocks.forEach(function (b) {
        var s = clean(b); if (!s) return;
        var ss = s.match(/[^.!?:]+[.!?:]*/g) || [s];
        ss.forEach(function (x, i) { x = x.trim(); if (x.length > 1) out.push({ t: x, p: i === ss.length - 1 ? 650 : 320 }); });
      });
      return out;
    }
    function ui() {
      if (btn) btn.classList.toggle('on', state !== 'idle');
      if (!bar) return;
      bar.hidden = state === 'idle';
      bar.querySelector('.tt-s').textContent = state === 'paused' ? 'Pausiert · Satz ' + (idx + 1) + ' von ' + parts.length : 'Satz ' + (idx + 1) + ' von ' + parts.length;
      var pb = bar.querySelector('#tt-p'); pb.textContent = state === 'paused' ? '▶ Weiter' : '❚❚ Pause';
    }
    function speakOne() {
      if (state !== 'on') return;
      if (idx >= parts.length) { stop(); return; }
      var my = ++uid, t = parts[idx].t, v = pick();
      var done = function () { if (my !== uid || state !== 'on') return; var p = parts[idx].p; idx++; ui(); timer = setTimeout(speakOne, p); };
      if (A) { window.__ttsDone = function (id) { if (+id === my) done(); }; A.speak(t, 0.95, v ? v.id : '', String(my)); }
      else {
        var u = new SpeechSynthesisUtterance(t); u.lang = 'de-DE'; u.rate = 0.95; u.pitch = 0.96;
        if (v && v.v) u.voice = v.v;
        u.onend = done; u.onerror = function () { if (my === uid && state === 'on') done(); };
        sy.cancel(); sy.speak(u);
      }
      ui();
    }
    function hush() { uid++; clearTimeout(timer); if (A) A.stop(); else if (sy) sy.cancel(); }
    function start(blocks, el) {
      if (btn === el && state !== 'idle') { stop(); return; }
      hush(); audio.pause();
      if (btn) btn.classList.remove('on');
      parts = split(blocks); idx = 0; btn = el || null; state = 'on';
      bar = bar || makeBar(); speakOne();
    }
    function pause() { if (state !== 'on') return; hush(); state = 'paused'; ui(); }
    function resume() { if (state !== 'paused') return; state = 'on'; speakOne(); }
    function stop() { hush(); state = 'idle'; ui(); btn = null; }
    function makeBar() {
      var b = document.createElement('div'); b.className = 'ttsbar'; b.hidden = true;
      b.innerHTML = '<div class="tt-i"><b>Vorlesen</b><span class="tt-s"></span></div><button class="tt-b" id="tt-p">❚❚ Pause</button><button class="tt-b" id="tt-x">■ Stopp</button>';
      b.onclick = function (ev) { var x = ev.target.closest('button'); if (!x) return; if (x.id === 'tt-x') stop(); else if (state === 'paused') resume(); else pause(); };
      document.body.appendChild(b); return b;
    }
    audio.addEventListener('play', function () { if (state !== 'idle') stop(); });
    if (sy && sy.getVoices) { sy.getVoices(); if ('onvoiceschanged' in sy) sy.onvoiceschanged = function () {}; }
    return { ok: !!(A || sy), start: start, stop: stop, voices: voices, pick: pick, clean: clean, split: split, test: function () { start(['Assalāmu ʿalaikum. So klingt diese Stimme beim Vorlesen der Erklärungen.'], null); } };
  })();
  function say(text, el) { TTS.start(Array.isArray(text) ? text : [text], el); }

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
        TTS.stop();
        groups.forEach(function (g, k) { g.el.classList.toggle('cur', k === i); });
        cur = i;
        document.getElementById('st-pos').textContent = (i + 1) + ' / ' + groups.length;
        document.getElementById('st-prev').disabled = i === 0;
        var nb = document.getElementById('st-next');
        nb.textContent = i === groups.length - 1 ? (next ? 'Lektion ' + next.id + ' ›' : 'Übersicht ›') : 'Weiter ›';
        [].forEach.call(list.querySelectorAll('button[data-s]'), function (b) { b.classList.toggle('on', +b.dataset.s === i); });
        store(key, String(i)); store('elifba-last', JSON.stringify({ l: L.id, s: i, n: groups.length }));
        if (!quiet) window.scrollTo(0, 0);
        fitCards();
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
    if (!location.hash) startAt = +store(key) || 0;
    if (startAt >= groups.length - 1) startAt = 0;
    api.show(startAt, true);
    return api;
  }

  /* ---------- Lektionsseite ---------- */
  function lessonPage(L) {
    LES = L;
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
    h += '<section id="erklaerung"><h2>Kurz erklärt</h2>' + (TTS.ok ? '<button class="say" id="say-intro">🔊 Erklärung vorlesen</button>' : '') + L.intro.map(function (p) { return '<p>' + txt(p) + '</p>'; }).join('');
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
    h += '<footer>Begleit-App zum Heft „Elif Ba Ikra“ · Rezitation: Maḥmūd Khalīl al-Ḥuṣarī (everyayah.com, quranicaudio.com) · einzelne Wörter: quran.com · Buchstaben: IslamCan.com</footer>';
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
    bindCards(L); bindRecap(L); bindSecTools(L); mkBind(L);
    if (L.special === 'letters') bindLetters(L);
    bindSurahs();
    var si = document.getElementById('say-intro');
    if (si) si.onclick = function () {
      say([L.title + '.'].concat(L.intro, L.when ? ['Wann? ' + L.when] : [], L.how ? ['Wie? ' + L.how] : [], L.steps ? ['So wendest du es an.'].concat(L.steps) : [], L.mistake ? ['Typischer Fehler. ' + L.mistake] : []), si);
    };
    STEPS = makeSteps(L, next);
    bindVerses(L);
    exercise();
    document.getElementById('done').onchange = function (e) { setDone(L.id, e.target.checked); };
  }

  /* ---------- Leiste oben: Lektionen · Koran · Einstellungen ---------- */
  var GEAR = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
  function topBar(view) {
    var top = document.querySelector('.top'); if (!top) return;
    var nav = document.createElement('nav'); nav.className = 'tnav';
    nav.innerHTML = '<a class="tb' + (view === 'lektionen' ? ' on' : '') + '" href="./">Lektionen</a>' +
      '<a class="tb' + (view === 'koran' ? ' on' : '') + '" href="koran/">Koran</a>' +
      '<button class="tb gear" id="open-set" aria-label="Einstellungen">' + GEAR + '</button>';
    top.appendChild(nav);
    document.getElementById('open-set').onclick = openSettings;
  }
  function lastPos() {
    try { var p = JSON.parse(store('elifba-last') || 'null'); if (!p) return null; var L = D.lessons.filter(function (x) { return x.id === p.l; })[0]; return L ? { L: L, s: p.s, n: p.n } : null; } catch (e) { return null; }
  }
  var PREF = { dark: store('elifba-dark') === '1', size: store('elifba-size') || '1', tj: store('elifba-tj') === '1' };
  function applyPrefs() {
    var r = document.documentElement;
    r.classList.toggle('dark', PREF.dark); r.classList.toggle('tj', PREF.tj); r.style.setProperty('--as', PREF.size);
    var m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = PREF.dark ? '#000000' : '#ffffff';
    fitCards();
  }
  applyPrefs();
  function voiceSel() {
    var vs = TTS.voices(), cur = TTS.pick();
    if (!vs.length) return '<p class="sh-note">Auf diesem Gerät ist keine deutsche Stimme installiert. Unter Android: Einstellungen › Sprachausgabe › Google-Sprachausgabe › Deutsch.</p>';
    return '<div class="vrow"><select id="set-voice" aria-label="Stimme">' + vs.map(function (x) { return '<option value="' + esc(x.id) + '"' + (cur && cur.id === x.id ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('') + '</select>' +
      '<button class="sh-mini" id="set-vtest">Probe hören</button></div><p class="sh-note">Die Stimme kommt von deinem Gerät. Am natürlichsten klingen Stimmen mit „Natural“, „Online“ oder „Premium“ im Namen.</p>';
  }
  function openSettings() {
    var old = document.querySelector('.sheet'); if (old) old.remove();
    var d = getDone(), n = D.lessons.filter(function (l) { return d[l.id]; }).length, last = lastPos();
    function seg(name, opts, val) {
      return '<div class="seg" data-name="' + name + '">' + opts.map(function (o) { return '<button data-v="' + o[0] + '"' + (String(val) === o[0] ? ' class="on"' : '') + '>' + o[1] + '</button>'; }).join('') + '</div>';
    }
    function row(label, ctl) { return '<div class="sh-row"><span>' + label + '</span>' + ctl + '</div>'; }
    var v = document.createElement('div'); v.className = 'sheet';
    v.innerHTML = '<div class="sh-in" role="dialog" aria-label="Einstellungen"><div class="sh-h"><b>Einstellungen</b><button class="sh-x" aria-label="Schließen">✕</button></div>' +
      row('Ansicht', seg('dark', [['0', 'Hell'], ['1', 'Dunkel']], PREF.dark ? '1' : '0')) +
      row('Arabische Schrift', seg('size', [['0.85', 'Klein'], ['1', 'Normal'], ['1.2', 'Groß']], PREF.size)) +
      row('Tempo beim Anhören', seg('rate', [['1', 'Normal'], ['0.75', 'Langsam'], ['0.5', 'Sehr langsam']], rate)) +
      row('Aufnahme wiederholen', seg('loop', [['0', 'Aus'], ['1', 'An']], loopPref ? '1' : '0')) +
      row('Farben im Koran', seg('tj', [['0', 'Schlicht'], ['1', 'Tajwīd-Farben']], PREF.tj ? '1' : '0')) +
      (TTS.ok ? row('Deutsche Vorlesestimme', voiceSel()) : '') +
      '<div class="sh-sec"><b>Dein Fortschritt</b><div class="progress"><i style="width:' + Math.round(100 * n / D.lessons.length) + '%"></i></div>' +
      '<p>' + n + ' von ' + D.lessons.length + ' Lektionen abgehakt.' + (last ? ' Zuletzt: ' + (last.L.id ? 'Lektion ' + last.L.id : 'Einleitung') + ', Schritt ' + (last.s + 1) + ' von ' + last.n + '.' : '') + '</p>' +
      (last ? '<a class="sh-btn" href="l/' + last.L.id + '/">Dort weiter lernen</a>' : '') +
      '<button class="sh-link" id="set-reset">Fortschritt zurücksetzen</button></div>' +
      '<a class="sh-big" href="iqra/"><span><b>Arabisch KI-Lehrer</b><small>Arabisch sprechen üben, im Gespräch</small></span><span aria-hidden="true">›</span></a>' +
      '<p class="sh-foot">Rezitation: Maḥmūd Khalīl al-Ḥuṣarī. Alles wird nur auf diesem Gerät gespeichert.</p></div>';
    document.body.appendChild(v);
    var vsel = v.querySelector('#set-voice');
    if (vsel) vsel.onchange = function () { store('elifba-voice', vsel.value); TTS.test(); };
    v.onclick = function (ev) {
      var t = ev.target;
      if (t === v || t.closest('.sh-x')) { v.remove(); return; }
      if (t.id === 'set-vtest') { TTS.test(); return; }
      var b = t.closest('.seg button');
      if (b) {
        var name = b.parentNode.dataset.name, val = b.dataset.v;
        [].forEach.call(b.parentNode.children, function (x) { x.classList.toggle('on', x === b); });
        if (name === 'dark') { PREF.dark = val === '1'; store('elifba-dark', val); }
        else if (name === 'size') { PREF.size = val; store('elifba-size', val); }
        else if (name === 'tj') { PREF.tj = val === '1'; store('elifba-tj', val); }
        else if (name === 'rate') setRate(+val);
        else if (name === 'loop') setLoop(val === '1');
        applyPrefs();
        return;
      }
      if (t.id === 'set-reset') {
        if (t.dataset.sure !== '1') { t.dataset.sure = '1'; t.textContent = 'Wirklich alles zurücksetzen? Noch einmal tippen.'; return; }
        try { Object.keys(localStorage).forEach(function (k) { if (k === KEY || k === 'elifba-last' || /^elifba-step-/.test(k)) localStorage.removeItem(k); }); } catch (e) {}
        location.reload();
      }
    };
  }

  /* ---------- Koran: Seiten wie im Madinah-Mushaf (King-Fahd-Druckerei, 15 Zeilen), Seite für Seite umblättern ---------- */
  var KSETS = {
    '30': { from: 582, to: 604, file: 'koran/m30.js', name: '30. Juz · ʿAmma' },
    '36': { from: 440, to: 445, file: 'koran/m36.js', name: 'Yā-Sīn' }
  };
  // erste Seite und Zahl der Verse je Sure (aus den Seitendaten)
  var KSURA = {"35":[440,45],"36":[440,83],"78":[582,40],"79":[583,46],"80":[585,42],"81":[586,29],"82":[587,19],"83":[587,36],"84":[589,25],"85":[590,22],"86":[591,17],"87":[591,19],"88":[592,26],"89":[593,30],"90":[594,20],"91":[595,15],"92":[595,21],"93":[596,11],"94":[596,8],"95":[597,8],"96":[597,19],"97":[598,5],"98":[598,8],"99":[599,8],"100":[599,11],"101":[600,11],"102":[600,8],"103":[601,3],"104":[601,9],"105":[601,5],"106":[602,4],"107":[602,7],"108":[602,3],"109":[603,6],"110":[603,3],"111":[603,5],"112":[604,4],"113":[604,5],"114":[604,6]};
  var KNAME_AR = { 36: 'يسٓ', 78: 'النَّبَإِ', 79: 'النَّازِعَاتِ', 80: 'عَبَسَ', 81: 'التَّكْوِيرِ', 82: 'الانْفِطَارِ', 83: 'المُطَفِّفِينَ', 84: 'الانْشِقَاقِ', 85: 'البُرُوجِ', 86: 'الطَّارِقِ', 87: 'الأَعْلَى', 88: 'الغَاشِيَةِ', 89: 'الفَجْرِ', 90: 'البَلَدِ', 91: 'الشَّمْسِ', 92: 'اللَّيْلِ', 93: 'الضُّحَى', 94: 'الشَّرْحِ', 95: 'التِّينِ', 96: 'العَلَقِ', 97: 'القَدْرِ', 98: 'البَيِّنَةِ', 99: 'الزَّلْزَلَةِ', 100: 'العَادِيَاتِ', 101: 'القَارِعَةِ', 102: 'التَّكَاثُرِ', 103: 'العَصْرِ', 104: 'الهُمَزَةِ', 105: 'الفِيلِ', 106: 'قُرَيْشٍ', 107: 'المَاعُونِ', 108: 'الكَوْثَرِ', 109: 'الكَافِرُونَ', 110: 'النَّصْرِ', 111: 'المَسَدِ', 112: 'الإِخْلَاصِ', 113: 'الفَلَقِ', 114: 'النَّاسِ' };
  var KAUDIO = 'https://everyayah.com/data/Ibrahim_Akhdar_32kbps/', KREC = 'Ibrāhīm al-Akhḍar';
  function kUrl(s, a) { return KAUDIO + pad(s, 3) + pad(a, 3) + '.mp3'; }
  function kSetOf(p) { for (var k in KSETS) if (p >= KSETS[k].from && p <= KSETS[k].to) return k; return null; }
  function kRef(s, a) { return sname(s) + ' ' + s + ':' + a; }
  function kGet(k, def) { try { return JSON.parse(store(k) || 'null') || def; } catch (e) { return def; } }
  function kMarks() { return kGet('elifba-k-marks', []); }
  function kSaveMarks(m) { store('elifba-k-marks', JSON.stringify(m)); }

  var kLoading = {};
  function kLoad(set, cb) {
    var M = window.MUSHAF || {};
    if (M[set]) return kFonts(set, cb);
    if (!kLoading[set]) {
      kLoading[set] = [];
      var sc = document.createElement('script'); sc.src = KSETS[set].file + '?v=m1';
      sc.onload = function () { var l = kLoading[set]; kLoading[set] = null; kFonts(set, function () { l.forEach(function (f) { f(true); }); }); };
      sc.onerror = function () { var l = kLoading[set]; kLoading[set] = null; l.forEach(function (f) { f(false); }); };
      document.head.appendChild(sc);
    }
    kLoading[set].push(cb);
  }
  var kFontDone = {};
  function kFonts(set, cb) {
    var M = window.MUSHAF[set], css = '', jobs = [];
    Object.keys(M.fonts).forEach(function (p) {
      if (kFontDone[p]) { jobs.push(kFontDone[p]); return; }
      var b = atob(M.fonts[p]), u = new Uint8Array(b.length);
      for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
      var ff = new FontFace('mp' + p, u.buffer);
      document.fonts.add(ff);
      kFontDone[p] = ff.load().catch(function () {});
      jobs.push(kFontDone[p]);
      // Farben: Tajwīd-Farben der Druckerei, oder schlicht in Schriftfarbe. Dunkel: Palette 1 der Schrift.
      var plain = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 15];
      css += '@font-palette-values --k' + p + '{font-family:mp' + p + ';base-palette:0}' +
        '@font-palette-values --kd' + p + '{font-family:mp' + p + ';base-palette:1}' +
        '@font-palette-values --ks' + p + '{font-family:mp' + p + ';base-palette:0;override-colors:' + plain.map(function (i) { return i + ' #111111'; }).join(',') + ',12 #ffffff}' +
        '@font-palette-values --ksd' + p + '{font-family:mp' + p + ';base-palette:1;override-colors:' + plain.map(function (i) { return i + ' #f2f2f2'; }).join(',') + ',12 #000000}' +
        '.mp' + p + '{font-family:mp' + p + ';font-palette:--ks' + p + '}html.dark .mp' + p + '{font-palette:--ksd' + p + '}' +
        'html.tj .mp' + p + '{font-palette:--k' + p + '}html.dark.tj .mp' + p + '{font-palette:--kd' + p + '}';
    });
    if (css) { var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); }
    Promise.all(jobs).then(function () { cb(true); });
  }

  var K = { set: null, page: 0, sel: null, mode: null, list: null, idx: -1, max: 16.9 };
  function kPageAyahs(p) {
    var out = [], seen = {}, L = window.MUSHAF[kSetOf(p)].pages[p];
    L.forEach(function (l) { if (l[0] === 'l') l[1].forEach(function (t) { var k = t[1] + ':' + t[2]; if (!seen[k]) { seen[k] = 1; out.push([t[1], t[2]]); } }); });
    return out;
  }
  function kPageOf(s, a) {
    var p0 = KSURA[s] ? KSURA[s][0] : 0, set = kSetOf(p0); if (!set) return 0;
    for (var p = p0; p <= KSETS[set].to; p++) { var A = kPageAyahs(p); for (var i = 0; i < A.length; i++) if (A[i][0] === s && A[i][1] === a) return p; }
    return 0;
  }
  function kPageSuras(p) { var o = []; kPageAyahs(p).forEach(function (x) { if (o.indexOf(x[0]) < 0) o.push(x[0]); }); return o; }
  function kSave() { if (K.page) store('elifba-k', JSON.stringify({ p: K.page, s: K.sel ? K.sel[0] : 0, a: K.sel ? K.sel[1] : 0 })); }

  function kLine(l, p) {
    if (l[0] === 'h') return '<div class="ml mh-s"><button class="ksura" data-s="' + l[1] + '" aria-label="Sure ' + esc(sname(l[1])) + ' anhören"><span class="ar">سُورَةُ ' + (KNAME_AR[l[1]] || '') + '</span></button></div>';
    if (l[0] === 'b') return '<div class="ml mb-s"><button class="kbas mp1" data-s="' + l[1] + '" aria-label="Basmala anhören">' + window.MUSHAF[K.set].basmala.map(function (w) { return '<span>' + w + '</span>'; }).join('') + '</button></div>';
    var short = l[2] < K.max * 0.8;
    return '<div class="ml' + (short ? ' short' : '') + '">' + l[1].map(function (t) {
      return '<span class="t' + (t[3] ? ' e' : '') + '" data-a="' + t[1] + ':' + t[2] + '">' + t[0] + '</span>';
    }).join('') + '</div>';
  }
  function kFit() {
    var pg = app.querySelector('.mpage'); if (!pg) return;
    var w = pg.parentNode.clientWidth - 2 * 12, top = document.querySelector('.top');
    var hAvail = window.innerHeight - (top ? top.offsetHeight : 0) - 190;
    var fw = w / K.max, fh = hAvail / (15 * 1.8);
    pg.style.setProperty('--kw', K.max.toFixed(3));
    pg.style.fontSize = Math.max(12, Math.min(fw, Math.max(26, fh), 44)).toFixed(2) + 'px';
  }
  window.addEventListener('resize', kFit);

  function kTitle(p) {
    var su = kPageSuras(p).filter(function (s) { return KSURA[s] && KSURA[s][0] <= p; });
    return su.map(sname).join(' · ');
  }
  function kRender(p, dir) {
    K.page = p; var set = K.set, S = KSETS[set];
    var L = window.MUSHAF[set].pages[p];
    var h = '<div class="kbar"><a class="kback" href="koran/#" aria-label="Zur Übersicht">‹ Übersicht</a>' +
      '<div class="ktitle"><b>' + esc(kTitle(p)) + '</b><small>Seite ' + p + ' · Juz ' + (p >= 582 ? 30 : p >= 442 ? 23 : 22) + '</small></div>' +
      '<button class="tb' + (PREF.tj ? ' on' : '') + '" id="k-col" aria-pressed="' + PREF.tj + '">Tajwīd-Farben</button></div>' +
      '<div class="ktools"><button class="kbtn" id="k-page"><span class="play" aria-hidden="true">▶</span> Seite anhören</button>' +
      '<button class="kbtn" id="k-sura"><span class="play" aria-hidden="true">▶</span> Sure anhören</button></div>' +
      '<div class="mwrap"><div class="mpage' + (dir ? ' turn' + (dir > 0 ? 'n' : 'p') : '') + '" dir="rtl" lang="ar">' + L.map(function (l) { return kLine(l, p); }).join('') +
      '<div class="mno">' + arnum(p) + '</div></div></div>' +
      '<div class="knav"><button class="kpn" id="k-next"' + (p >= S.to ? ' disabled' : '') + '>‹ Nächste</button>' +
      '<button class="kpos" id="k-pos" aria-label="Seite wählen">' + p + ' <small>/ ' + S.to + '</small></button>' +
      '<button class="kpn" id="k-prev"' + (p <= S.from ? ' disabled' : '') + '>Vorherige ›</button></div>' +
      '<p class="hint kh">Tipp auf einen Vers, dann kannst du ihn anhören und markieren. Zum Umblättern nach rechts wischen.</p>';
    app.innerHTML = h;
    app.querySelector('.mpage').className += ' mp' + p;
    kFit(); kPaint(); kSave();
    document.title = 'Koran · Seite ' + p + ' · Elif Ba Ikra';
    if (history.replaceState) history.replaceState(null, '', '#p' + p);
  }
  function kPaint() {
    var marks = kMarks(), sel = K.sel ? K.sel[0] + ':' + K.sel[1] : '', pl = K.list && K.idx >= 0 && K.list[K.idx] && !K.list[K.idx].bas ? K.list[K.idx].s + ':' + K.list[K.idx].a : '';
    [].forEach.call(app.querySelectorAll('.mpage .t'), function (el) {
      var a = el.dataset.a;
      el.classList.toggle('sel', a === sel); el.classList.toggle('pl', a === pl); el.classList.toggle('mk', marks.indexOf(a) > -1);
    });
    var basPl = K.list && K.idx >= 0 && K.list[K.idx] && K.list[K.idx].bas ? K.list[K.idx].s : 0;
    [].forEach.call(app.querySelectorAll('.kbas'), function (el) { el.classList.toggle('pl', +el.dataset.s === basPl); });
    kBar();
  }
  function kGo(p, dir) {
    var S = KSETS[K.set]; if (p < S.from || p > S.to || p === K.page) return;
    kRender(p, dir); window.scrollTo(0, 0);
  }

  /* Abspielen: Liste aus Versen; vor Vers 1 einer Sure die Basmala (eigene Aufnahme 1:1) */
  function kItems(from, untilS, untilA, withBas) {
    var out = [], s = from[0], a = from[1];
    while (true) {
      if (!KSURA[s] || a > KSURA[s][1]) break;
      if (a === 1 && withBas && s !== 9 && s !== 1) out.push({ bas: true, s: s });
      out.push({ s: s, a: a });
      if (s === untilS && a === untilA) break;
      a++; if (a > KSURA[s][1]) { if (untilS === s) break; s++; a = 1; if (!KSURA[s]) break; }
    }
    return out;
  }
  function kStart(list, label) {
    K.list = list; K.idx = 0; K.label = label;
    var urls = list.map(function (x) { return x.bas ? kUrl(1, 1) : kUrl(x.s, x.a); });
    current = null;
    play(urls, '', KREC, document.createElement('span'));
    onStep = function (left) {
      if (left < 0) { K.idx = -1; kPaint(); return; }
      K.idx = list.length - 1 - left; kFollow();
    };
    kFollow();
  }
  function kFollow() {
    var x = K.list && K.list[K.idx]; if (!x) { kPaint(); return; }
    if (!x.bas) { K.sel = [x.s, x.a]; var p = kPageOf(x.s, x.a); if (p && p !== K.page) kRender(p, p > K.page ? 1 : -1); }
    else { var p2 = KSURA[x.s] && KSURA[x.s][0]; if (p2 && p2 !== K.page) kRender(p2, 1); }
    kSave(); kPaint();
    var el = app.querySelector('.mpage .pl');
    if (el) { var r = el.getBoundingClientRect(); if (r.top < 70 || r.bottom > window.innerHeight - 170) window.scrollTo({ top: r.top + window.scrollY - window.innerHeight * 0.35, behavior: 'smooth' }); }
  }
  function kStop() { audio.pause(); K.list = null; K.idx = -1; onStep = null; }
  function kOne(s, a) { kStart([{ s: s, a: a }], kRef(s, a)); }

  /* Leiste unten: Vers ausgewählt oder Wiedergabe läuft */
  function kBar() {
    var bar = document.getElementById('kplayer'); if (!bar) return;
    var x = K.sel, playing = K.list && K.idx >= 0;
    if (!x && !playing) { bar.hidden = true; return; }
    bar.hidden = false;
    var cur = playing ? K.list[K.idx] : null;
    var t = cur && cur.bas ? 'Basmala · vor ' + sname(cur.s) : x ? kRef(x[0], x[1]) : '';
    var marked = x && kMarks().indexOf(x[0] + ':' + x[1]) > -1;
    bar.querySelector('.kp-t').textContent = t;
    bar.querySelector('.kp-s').textContent = playing ? (K.list.length > 1 ? K.label + ' · ' : '') + KREC + (audio.paused ? ' · pausiert' : '') : 'Vers ausgewählt';
    var pb = bar.querySelector('#kp-play'); pb.textContent = playing && !audio.paused ? '❚❚' : '▶'; pb.setAttribute('aria-label', playing && !audio.paused ? 'Pause' : 'Vers anhören');
    var mb = bar.querySelector('#kp-mark'); mb.classList.toggle('on', !!marked); mb.textContent = marked ? '★ Markiert' : '☆ Markieren'; mb.disabled = !x;
    bar.querySelector('#kp-rate').textContent = (rate === 1 ? '1' : rate === 0.75 ? '¾' : '½') + '×';
  }
  function kNeighbour(d) {
    var x = K.sel; if (!x) return null;
    var s = x[0], a = x[1] + d;
    if (a < 1) { s--; if (!KSURA[s] || !kSetOf(KSURA[s][0])) return null; a = KSURA[s][1]; }
    if (a > KSURA[s][1]) { s++; a = 1; }
    if (!KSURA[s] || !kPageOf(s, a)) return null;
    return [s, a];
  }
  function kSelect(s, a, andPlay) {
    K.sel = [s, a]; var p = kPageOf(s, a);
    if (p && p !== K.page) kRender(p, p > K.page ? 1 : -1);
    kSave(); kPaint();
    if (andPlay) kOne(s, a);
  }

  function kBindPage() {
    app.onclick = function (ev) {
      var t = ev.target.closest('.mpage .t');
      if (t) { var k = t.dataset.a.split(':'); var same = K.sel && K.sel[0] === +k[0] && K.sel[1] === +k[1]; kSelect(+k[0], +k[1], false); if (same) kOne(+k[0], +k[1]); return; }
      var hs = ev.target.closest('.ksura'); if (hs) { var s = +hs.dataset.s; kStart(kItems([s, 1], s, KSURA[s][1], true), 'Ganze Sure ' + sname(s)); return; }
      var bs = ev.target.closest('.kbas'); if (bs) { K.sel = null; kStart([{ bas: true, s: +bs.dataset.s }], 'Basmala'); return; }
      var id = ev.target.closest('button, a') && ev.target.closest('button, a').id;
      if (id === 'k-next') kGo(K.page + 1, 1);
      else if (id === 'k-prev') kGo(K.page - 1, -1);
      else if (id === 'k-col') { PREF.tj = !PREF.tj; store('elifba-tj', PREF.tj ? '1' : '0'); applyPrefs(); var b = document.getElementById('k-col'); b.classList.toggle('on', PREF.tj); b.setAttribute('aria-pressed', String(PREF.tj)); }
      else if (id === 'k-page') { var A = kPageAyahs(K.page); kStart(kItems(A[0], A[A.length - 1][0], A[A.length - 1][1], true), 'Seite ' + K.page); }
      else if (id === 'k-sura') {
        var su = K.sel ? K.sel[0] : kPageSuras(K.page).filter(function (s) { return KSURA[s][0] === K.page; })[0] || kPageSuras(K.page)[0];
        if (!kPageOf(su, 1)) su = kPageSuras(K.page).filter(function (s) { return kPageOf(s, 1); })[0];
        if (!su) return;
        kStart(kItems([su, 1], su, KSURA[su][1], true), 'Ganze Sure ' + sname(su));
      }
      else if (id === 'k-pos') kPicker();
    };
  }
  function kPicker() {
    var S = KSETS[K.set], v = document.createElement('div'); v.className = 'steplist';
    var h = '<div class="sl-in"><b>Seite wählen · ' + esc(S.name) + '</b><div class="kgrid">';
    for (var p = S.from; p <= S.to; p++) h += '<button data-p="' + p + '"' + (p === K.page ? ' class="on"' : '') + '><b>' + p + '</b><small>' + esc(kTitle(p)) + '</small></button>';
    v.innerHTML = h + '</div><button class="sl-x">Schließen</button></div>';
    document.body.appendChild(v);
    v.onclick = function (ev) {
      var b = ev.target.closest('button[data-p]');
      if (b) { v.remove(); kGo(+b.dataset.p, +b.dataset.p > K.page ? 1 : -1); }
      else if (ev.target === v || ev.target.classList.contains('sl-x')) v.remove();
    };
  }
  function kPlayerEl() {
    var bar = document.getElementById('kplayer'); if (bar) return bar;
    bar = document.createElement('div'); bar.id = 'kplayer'; bar.className = 'kplayer'; bar.hidden = true;
    bar.innerHTML = '<div class="kp-top"><div class="kp-i"><span class="kp-t"></span><span class="kp-s"></span></div>' +
      '<button class="kp-c" id="kp-mark">☆ Markieren</button><button class="kp-c kp-x" id="kp-x" aria-label="Schließen">✕</button></div>' +
      '<div class="kp-row"><button class="kp-b" id="kp-prev" aria-label="Vorheriger Vers">⏮</button>' +
      '<button class="kp-b" id="kp-again" aria-label="Vers noch einmal">↺</button>' +
      '<button class="kp-b kp-main" id="kp-play" aria-label="Vers anhören">▶</button>' +
      '<button class="kp-b" id="kp-next" aria-label="Nächster Vers">⏭</button>' +
      '<button class="kp-b kp-txt" id="kp-from" aria-label="Ab hier weiter anhören">Ab hier</button>' +
      '<button class="kp-b kp-txt" id="kp-rate" aria-label="Tempo">1×</button></div>';
    document.body.appendChild(bar);
    bar.onclick = function (ev) {
      var b = ev.target.closest('button'); if (!b) return;
      var playing = K.list && K.idx >= 0, x = K.sel;
      if (b.id === 'kp-x') { kStop(); K.sel = null; kPaint(); kSave(); }
      else if (b.id === 'kp-play') {
        if (playing) { if (audio.paused) audio.play(); else audio.pause(); }
        else if (x) kOne(x[0], x[1]);
      }
      else if (b.id === 'kp-again') { if (playing && K.list.length === 1 || !playing) { if (x) kOne(x[0], x[1]); } else { audio.currentTime = 0; audio.play(); } }
      else if (b.id === 'kp-prev' || b.id === 'kp-next') {
        var n = kNeighbour(b.id === 'kp-next' ? 1 : -1); if (!n) return;
        var cont = playing && K.list.length > 1;
        kSelect(n[0], n[1], false);
        if (cont) kStart(kItems(n, n[0], KSURA[n[0]][1], true), 'Ab ' + kRef(n[0], n[1]));
        else if (playing) kOne(n[0], n[1]);
      }
      else if (b.id === 'kp-from') { if (x) kStart(kItems(x, x[0], KSURA[x[0]][1], false), 'Ab ' + kRef(x[0], x[1])); }
      else if (b.id === 'kp-mark') {
        if (!x) return; var m = kMarks(), k = x[0] + ':' + x[1], i = m.indexOf(k);
        if (i > -1) m.splice(i, 1); else m.push(k);
        kSaveMarks(m); kPaint();
      }
      else if (b.id === 'kp-rate') { setRate(rate === 1 ? 0.75 : rate === 0.75 ? 0.5 : 1); kBar(); }
    };
    ['play', 'pause', 'ended'].forEach(function (e) { audio.addEventListener(e, function () { if (view === 'koran') setTimeout(kBar, 0); }); });
    return bar;
  }
  function kSwipe() {
    var sx = 0, sy = 0, st = 0;
    app.addEventListener('touchstart', function (e) { if (e.touches.length !== 1 || !e.target.closest('.mwrap')) { st = 0; return; } sx = e.touches[0].clientX; sy = e.touches[0].clientY; st = Date.now(); }, { passive: true });
    app.addEventListener('touchend', function (e) {
      if (!st || !K.page) return; var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy; st = 0;
      // wie in einem arabischen Buch: nach rechts wischen = nächste Seite
      if (Math.abs(dx) > 60 && Math.abs(dy) < 50) kGo(K.page + (dx > 0 ? 1 : -1), dx > 0 ? 1 : -1);
    }, { passive: true });
    document.addEventListener('keydown', function (e) {
      if (!K.page || /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
      if (e.key === 'ArrowLeft') kGo(K.page + 1, 1); else if (e.key === 'ArrowRight') kGo(K.page - 1, -1);
    });
  }

  function kHome() {
    K.page = 0; K.sel = null; kBar();
    var last = kGet('elifba-k', null), marks = kMarks();
    var h = '<div class="khead"><h1>Koran</h1><p class="hint">Seiten wie im Madinah-Mushaf. Tipp auf eine Sure oder Seite.</p></div>';
    if (last && last.p) h += '<a class="resume" href="koran/#p' + last.p + '"><b>Weiterlesen</b><small>Seite ' + last.p + (last.s ? ' · ' + esc(kRef(last.s, last.a)) : '') + '</small></a>';
    h += '<section class="ksec"><h2>30. Juz · Seite 582 bis 604</h2><div class="seg ktabs" data-name="ktab"><button data-v="s" class="on">Suren</button><button data-v="p">Seiten</button></div><ul class="list ksl">';
    for (var s = 78; s <= 114; s++) h += '<li><a href="koran/#s' + s + '"><span class="num">' + s + '</span><span class="t">' + esc(sname(s)) + '<small>' + KSURA[s][1] + ' Verse · Seite ' + KSURA[s][0] + '</small></span><span class="ar">' + KNAME_AR[s] + '</span></a></li>';
    h += '</ul><div class="kgrid kpl" hidden>';
    for (var p = 582; p <= 604; p++) h += '<a href="koran/#p' + p + '"><b>' + p + '</b><small></small></a>';
    h += '</div></section><section class="ksec"><h2>Weitere Sure</h2><ul class="list"><li><a href="koran/#s36"><span class="num">36</span><span class="t">Yā-Sīn<small>83 Verse · Seite 440 bis 445</small></span><span class="ar">' + KNAME_AR[36] + '</span></a></li></ul></section>';
    if (marks.length) h += '<section class="ksec"><h2>Markierte Verse</h2><ul class="list">' + marks.map(function (k) { var x = k.split(':'); return '<li><a href="koran/#a' + k + '"><span class="num">★</span><span class="t">' + esc(kRef(+x[0], +x[1])) + '<small></small></span></a></li>'; }).join('') + '</ul></section>';
    h += '<footer>Mushaf-Seiten: Schrift der King-Fahd-Druckerei Medina (Ausgabe 1441, Tajwīd-Fassung über das Quranic Universal Library). Rezitation: ' + KREC + ' (everyayah.com).</footer>';
    app.innerHTML = h; app.onclick = null;
    document.title = 'Koran · Elif Ba Ikra';
    var tabs = app.querySelector('.ktabs');
    tabs.onclick = function (ev) {
      var b = ev.target.closest('button'); if (!b) return;
      [].forEach.call(tabs.children, function (x) { x.classList.toggle('on', x === b); });
      app.querySelector('.ksl').hidden = b.dataset.v !== 's'; app.querySelector('.kpl').hidden = b.dataset.v !== 'p';
      store('elifba-ktab', b.dataset.v);
    };
    if (store('elifba-ktab') === 'p') tabs.children[1].click();
    // Seitenraster: Surennamen auf der Seite
    var g = app.querySelectorAll('.kpl a small');
    for (var i = 0; i < g.length; i++) { var pp = 582 + i, names = []; for (var ss in KSURA) if (+ss >= 78 && KSURA[ss][0] === pp) names.push(sname(+ss)); g[i].textContent = names.join(' · ') || '·'; }
    // markierte Verse: Seite nachtragen, sobald die Daten da sind
    if (marks.length) marks.forEach(function (k, i) {
      var x = k.split(':'), set = kSetOf(KSURA[x[0]] ? KSURA[x[0]][0] : 0); if (!set) return;
      kLoad(set, function (ok) { if (!ok || K.page) return; var el = app.querySelectorAll('.ksec:last-of-type small')[i]; if (el) el.textContent = 'Seite ' + kPageOf(+x[0], +x[1]); });
    });
  }
  function koranRoute() {
    var hsh = (location.hash || '').slice(1), m, p = 0, sel = null;
    if ((m = /^p(\d+)$/.exec(hsh))) p = +m[1];
    else if ((m = /^s(\d+)$/.exec(hsh)) && KSURA[m[1]]) p = KSURA[m[1]][0];
    else if ((m = /^a(\d+):(\d+)$/.exec(hsh)) && KSURA[m[1]]) { sel = [+m[1], +m[2]]; p = KSURA[m[1]][0]; }
    var set = kSetOf(p);
    if (!set) { kHome(); return; }
    app.innerHTML = '<p class="hint kload">Seite wird geladen …</p>';
    kLoad(set, function (ok) {
      if (!ok) { app.innerHTML = '<div class="stale"><b>Die Koran-Seiten fehlen.</b> Beim Hochladen auf GitHub muss der Ordner „koran“ mit allen Dateien dabei sein.</div>'; return; }
      K.set = set; K.max = 0;
      var P = window.MUSHAF[set].pages; Object.keys(P).forEach(function (q) { P[q].forEach(function (l) { if (l[0] === 'l' && l[2] > K.max) K.max = l[2]; }); });
      if (m && /^s/.test(hsh)) { var s = +m[1]; p = kPageOf(s, 1) || p; }
      if (sel) p = kPageOf(sel[0], sel[1]) || p;
      K.sel = sel; kBindPage(); kRender(p, 0);
    });
  }
  function koranPage() {
    kPlayerEl(); kSwipe();
    document.getElementById('player').classList.add('koff');
    window.addEventListener('hashchange', function () { if (!/^#p\d+$/.test(location.hash) || +location.hash.slice(2) !== K.page) koranRoute(); });
    koranRoute();
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
  window.addEventListener('hashchange', function () { if (view !== 'koran') exercise(); });

  /* ---------- Übersicht ---------- */
  function overview() {
    var done = getDone(), n = D.lessons.filter(function (l) { return done[l.id]; }).length;
    var parts = { 0: 'Einleitung', 1: 'Teil I · Die Buchstaben', 2: 'Teil II · Lesezeichen und Tajwīd-Regeln', 32: 'Teil III · Wissen über den Qur’ān', 36: 'Teil IV · Praxis' };
    var last = lastPos(), go = last ? last.L : D.lessons[0];
    var h = '<div class="hero"><span class="ar">اِقْرَأْ</span><h1>Elif Ba Ikra</h1>' +
      '<p>Zu jeder Lektion im Heft: lesen, antippen, anhören. Schritt für Schritt.</p>' +
      '<a class="resume" href="l/' + go.id + '/"><b>' + (last ? 'Weiter lernen' : 'Jetzt anfangen') + '</b><small>' + (go.id ? 'Lektion ' + go.id : 'Einleitung') + ' · ' + esc(go.title) + (last ? ' · Schritt ' + (last.s + 1) + ' von ' + last.n : '') + '</small></a>' +
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

  var id = document.body.dataset.lesson, view = document.body.dataset.view || '';
  var q = new URLSearchParams(location.search).get('l');
  if (id === '' && q !== null) id = q;
  var L = id === '' || id === undefined ? null : D.lessons.filter(function (x) { return String(x.id) === String(id); })[0];
  if (view === 'koran') { topBar('koran'); koranPage(); }
  else if (L) { topBar(''); lessonPage(L); }
  else { topBar('lektionen'); overview(); }
})();
