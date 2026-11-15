/* Iqra Arabischlehrer – eine Seite, kein Login, alles lokal gespeichert. */
(function () {
  'use strict';

  // ---------- Speicher ----------
  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem('iqra.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('iqra.' + k, JSON.stringify(v)); } catch (e) {} }
  };
  var S = LS.get('settings', {});
  S = Object.assign({ prov: 'gemini', gkey: '', gmodel: 'gemini-3.5-flash', key: '', model: 'claude-haiku-5-5', proxy: '', showTr: true, showDe: true, theme: '', book: 'frei', kb: false }, S);
  var chats = LS.get('chats', {});   // szenario -> [{role, ...}]
  var vocab = LS.get('vocab', []);   // [{k, ar, tr, de, root, pos, box, due, t}]
  function save() { LS.set('settings', S); LS.set('chats', chats); LS.set('vocab', vocab); }

  // ---------- Daten ----------
  var SCN = [
    { id: 'gruss', de: 'Begrüßung', ar: 'التَّحِيَّة', hint: 'Begrüßung und Kennenlernen: Name, Herkunft, Befinden.' },
    { id: 'familie', de: 'Familie', ar: 'الأُسْرَة', hint: 'Familie: Eltern, Geschwister, Kinder, wer was macht.' },
    { id: 'einkauf', de: 'Einkaufen', ar: 'التَّسَوُّق', hint: 'Einkaufen im Laden oder auf dem Markt: Wünsche, Preise, Mengen.' },
    { id: 'wohnung', de: 'Wohnung', ar: 'السَّكَن', hint: 'Wohnung und Wohnen: Zimmer, Möbel, wo man wohnt.' },
    { id: 'tag', de: 'Tagesablauf', ar: 'الحَيَاةُ اليَوْمِيَّة', hint: 'Tagesablauf: aufstehen, Arbeit oder Schule, Uhrzeiten, Gewohnheiten.' },
    { id: 'moschee', de: 'Moschee', ar: 'المَسْجِد', hint: 'Moschee und Gebet: Gebetszeiten, Freitagsgebet, Koran lesen.' },
    { id: 'reise', de: 'Reise', ar: 'السَّفَر', hint: 'Reise: Flughafen, Ticket, Hotel, Wohin und Wann.' },
    { id: 'frei', de: 'Freies Gespräch', ar: 'حِوَارٌ حُرّ', hint: 'Freies Gespräch über ein einfaches Alltagsthema, das der Lerner vorgibt oder das du vorschlägst.' }
  ];
  var BOOKS = {
    frei: { de: 'Frei, Anfänger (A1 bis A2)', p: 'Niveau A1 bis A2, häufiger Grundwortschatz.' },
    madinah: { de: 'Madinah-Kurs (Durūs al-Lugha, Band 1)', p: 'Orientiere dich bei Wortschatz, Satzmustern und Reihenfolge am Stoff von „Durūs al-Lugha al-ʿArabiyya li-ghayr an-nāṭiqīn bihā“ (Dr. V. Abdur Rahim), Band 1. Bilde eigene Sätze in diesem Stil, zitiere keine Texte aus dem Buch.' },
    yadayk: { de: 'al-ʿArabiyya bayna Yadayk (Buch 1)', p: 'Orientiere dich bei Wortschatz, Redewendungen und Dialogmustern am Stoff von „al-ʿArabiyya bayna Yadayk“, Schülerbuch 1. Bilde eigene Sätze in diesem Stil, zitiere keine Texte aus dem Buch.' }
  };
  var GMODELS = [['gemini-3.5-flash', 'Gemini 3.5 Flash'], ['gemini-3.1-flash-lite', 'Gemini 3.1 Flash-Lite (schneller, einfacher)']];
  function ready() { return !!(S.proxy || (S.prov === 'gemini' ? S.gkey : S.key)); }
  var MODELS = [
    ['claude-opus-5-5', 'Beste Qualität (Claude Opus 5.5)'],
    ['claude-sonnet-5-5', 'Mittel (Claude Sonnet 5.5)'],
    ['claude-haiku-5-5', 'Günstig und schnell (Claude Haiku 5.5)']
  ];
  var I = {
    back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
    spk: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 010 7"/></svg>',
    mic: '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/></svg>',
    send: '<svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
    kb: '<svg viewBox="0 0 24 24"><rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/></svg>',
    sun: '<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 100 18V3z" fill="currentColor"/><circle cx="12" cy="12" r="9"/></svg>',
    chat: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4V5z"/></svg>',
    list: '<svg viewBox="0 0 24 24"><path d="M5 6h14M5 12h14M5 18h14"/></svg>',
    gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  };

  // ---------- Helfer ----------
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'html') n.innerHTML = v;
      else if (k === 'text') n.textContent = v;
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    });
    (kids || []).forEach(function (c) { if (c != null) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  var $ = function (id) { return document.getElementById(id); };
  var HARAKAT = /[ً-ْٰـٓ-ٕ]/g;
  var PUNCT = /[،؛؟.,!?:;«»"'()\[\]…\-–]/g;
  function clean(w) { return (w || '').replace(PUNCT, '').trim(); }
  function bare(w) { return clean(w).replace(HARAKAT, ''); }
  var hasAr = function (s) { return /[؀-ۿ]/.test(s); };

  function applyTheme() {
    var t = S.theme || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', t);
    var m = document.querySelector('meta[name=theme-color]'); if (m) m.setAttribute('content', t === 'dark' ? '#000000' : '#ffffff');
    return t;
  }
  function toggleTheme() { S.theme = applyTheme() === 'dark' ? 'light' : 'dark'; save(); applyTheme(); }

  // ---------- Vorlesen ----------
  var voices = [];
  function loadVoices() { try { voices = speechSynthesis.getVoices() || []; } catch (e) { voices = []; } }
  if ('speechSynthesis' in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
  function speak(text, btn) {
    if (!('speechSynthesis' in window)) { toast('Dieser Browser kann nicht vorlesen.'); return; }
    if (speechSynthesis.speaking) { speechSynthesis.cancel(); if (btn && btn.classList.contains('on')) return; }
    loadVoices();
    var v = voices.filter(function (x) { return /^ar/i.test(x.lang); })[0];
    if (voices.length && !v) { toast('Auf diesem Gerät ist keine arabische Stimme installiert. In den Geräte-Einstellungen unter Sprachausgabe lässt sich Arabisch nachladen.'); return; }
    var u = new SpeechSynthesisUtterance(text);
    u.lang = v ? v.lang : 'ar-SA'; if (v) u.voice = v;
    u.rate = 0.6;
    document.querySelectorAll('.spk.on').forEach(function (b) { b.classList.remove('on'); });
    if (btn) { btn.classList.add('on'); u.onend = u.onerror = function () { btn.classList.remove('on'); }; }
    speechSynthesis.speak(u);
  }
  var toastT;
  function toast(msg) {
    var t = $('toast') || document.body.appendChild(el('div', { id: 'toast', role: 'status', style: 'position:fixed;left:16px;right:16px;bottom:150px;z-index:20;margin:auto;max-width:520px;background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:12px 16px;font-size:15px' }));
    t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, 6000);
  }

  // ---------- Sprachmodell ----------
  var WORD = { type: 'object', additionalProperties: false, required: ['ar', 'tr', 'de', 'root', 'pos'],
    properties: { ar: { type: 'string' }, tr: { type: 'string' }, de: { type: 'string' }, root: { type: 'string' }, pos: { type: 'string' } } };
  var LINE = { type: 'object', additionalProperties: false, required: ['ar', 'tr', 'de'],
    properties: { ar: { type: 'string' }, tr: { type: 'string' }, de: { type: 'string' } } };
  var SCHEMA_TURN = { type: 'object', additionalProperties: false, required: ['correction', 'reply'], properties: {
    correction: { type: 'object', additionalProperties: false, required: ['status', 'corrected', 'note'],
      properties: { status: { type: 'string', enum: ['none', 'ok', 'fixed'] }, corrected: { type: 'string' }, note: { type: 'string' } } },
    reply: { type: 'object', additionalProperties: false, required: ['ar', 'tr', 'de', 'words'],
      properties: { ar: { type: 'string' }, tr: { type: 'string' }, de: { type: 'string' }, words: { type: 'array', items: WORD } } } } };
  var SCHEMA_HELP = { type: 'object', additionalProperties: false, required: ['suggestions'], properties: { suggestions: { type: 'array', items: LINE } } };

  var RULES = [
    'Sprache: ausschließlich Hocharabisch (Fuṣḥā), niemals Dialekt.',
    'Jedes arabische Wort ist vollständig vokalisiert: alle Ḥarakāt samt Kasusendungen, Shadda, Sukūn und Tanwīn.',
    'Umschrift (tr): lateinisch mit ā ī ū, ḥ ṣ ḍ ṭ ẓ, ʿ für ʿAyn, ʾ für Hamza, th dh kh sh gh. Sonnenbuchstaben angleichen (ash-shams).',
    'Übersetzung (de): natürliches, schlichtes Deutsch.',
    'Wurzel (root): die Radikale einzeln, durch Leerzeichen getrennt, zum Beispiel "ك ت ب". Leer lassen, wenn das Wort keine Wurzel hat (Partikel, Pronomen, Fremdwort).',
    'Wortart (pos): ein deutsches Wort, zum Beispiel Nomen, Verb, Adjektiv, Pronomen, Präposition, Partikel, Fragewort, Zahlwort, Eigenname.'
  ].join('\n');

  function sysTurn(scn) {
    return 'Du bist ein ruhiger, geduldiger Gesprächspartner für einen deutschsprachigen Lerner, der die arabische Schrift lesen kann, aber noch wenig versteht.\n' +
      'Szenario: ' + scn.de + '. ' + scn.hint + '\n' + BOOKS[S.book].p + '\n\n' + RULES + '\n\n' +
      'reply: Deine Antwort im Gespräch. Ein bis zwei kurze Sätze, und sie endet immer mit einer einfachen Anschlussfrage, damit das Gespräch weiterläuft. Bleib beim Szenario und geh auf das ein, was der Lerner gesagt hat. Kein Lob, keine Erklärungen in reply.\n' +
      'reply.words: genau ein Eintrag pro Wort von reply.ar, in derselben Reihenfolge. ar exakt wie im Satz, ohne Satzzeichen. de ist die Bedeutung dieses Wortes im Satz, tr seine Umschrift.\n' +
      'correction: bewertet die letzte Nachricht des Lerners. status "ok", wenn sie sprachlich richtig ist (fehlende Ḥarakāt sind kein Fehler). status "fixed", wenn etwas falsch oder unnatürlich ist, auch wenn der Lerner Deutsch oder Lateinschrift benutzt hat. corrected ist immer die richtige Fassung seines Satzes, vollständig vokalisiert. note ist genau ein kurzer Satz auf Deutsch: bei "fixed" die Erklärung des wichtigsten Fehlers, bei "ok" ein knapper sachlicher Hinweis zu Form oder Bedeutung. Beim Gesprächsbeginn status "none" und leere Felder.';
  }

  function api(system, messages, schema) { return S.prov === 'gemini' && !S.proxy ? apiGemini(system, messages, schema) : apiClaude(system, messages, schema); }
  function fail(status, m) {
    return new Error(
      status === 401 || status === 403 || /API key not valid/i.test(m) ? 'Der Schlüssel wurde nicht angenommen. Bitte in den Einstellungen prüfen.' :
      status === 429 ? (S.prov === 'gemini' ? 'Das kostenlose Kontingent ist gerade ausgeschöpft. Kurz warten, bei Tageslimit erst morgen wieder.' : 'Im Moment zu viele Anfragen. Kurz warten und nochmal versuchen.') :
      status === 529 || status >= 500 ? 'Der Dienst ist gerade überlastet. Bitte gleich nochmal versuchen.' :
      /credit|billing/i.test(m) ? 'Auf dem API-Konto ist kein Guthaben. Das lässt sich in der Anthropic Console aufladen.' :
      'Die Anfrage ist fehlgeschlagen (' + status + '). ' + m);
  }
  function parse(txt) {
    txt = String(txt || '').replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/, '');
    try { return JSON.parse(txt); } catch (e) { throw new Error('Die Antwort kam unvollständig an. Bitte nochmal versuchen.'); }
  }
  function noAP(o) { if (Array.isArray(o)) return o.map(noAP); if (o && typeof o === 'object') { var r = {}; Object.keys(o).forEach(function (k) { if (k !== 'additionalProperties') r[k] = noAP(o[k]); }); return r; } return o; }
  function apiGemini(system, messages, schema) {
    var sys = system + '\n\nAntworte ausschließlich mit einem JSON-Objekt nach diesem Schema, ohne Text davor oder danach:\n' + JSON.stringify(noAP(schema));
    var models = [S.gmodel].concat(GMODELS.map(function (m) { return m[0]; }).filter(function (m) { return m !== S.gmodel; }));
    function go(mi, withSchema) {
      var cfg = { responseMimeType: 'application/json', maxOutputTokens: 6000 };
      if (withSchema) cfg.responseSchema = noAP(schema);
      var body = { systemInstruction: { parts: [{ text: sys }] }, generationConfig: cfg,
        contents: messages.map(function (m) { return { role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }; }) };
      return fetch('https://generativelanguage.googleapis.com/v1beta/models/' + models[mi] + ':generateContent', { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': S.gkey }, body: JSON.stringify(body) })
        .then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (j) {
            if (r.ok) return j;
            var m = (j.error && j.error.message) || '';
            if (r.status === 400 && withSchema && !/API key/i.test(m)) return go(mi, false);
            if (r.status === 404 && mi + 1 < models.length) return go(mi + 1, true);
            throw fail(r.status, m);
          });
        }, function () { throw new Error('Keine Verbindung. Bitte Internet prüfen und nochmal versuchen.'); });
    }
    return go(0, true).then(function (j) {
      var c = (j.candidates || [])[0];
      if (!c || !c.content) throw new Error('Das Modell hat diese Nachricht abgelehnt. Bitte anders formulieren.');
      return parse((c.content.parts || []).filter(function (p) { return !p.thought; }).map(function (p) { return p.text || ''; }).join(''));
    });
  }
  function apiClaude(system, messages, schema) {
    var body = { model: S.model, max_tokens: 6000, system: system, messages: messages,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: schema } } };
    var useFb = S.model !== 'claude-haiku-5-5';
    function go(fb) {
      var headers = { 'content-type': 'application/json' };
      var b = Object.assign({}, body);
      if (!S.proxy) {
        headers['x-api-key'] = S.key;
        headers['anthropic-version'] = '2023-06-01';
        headers['anthropic-dangerous-direct-browser-access'] = 'true';
        // Falls ein Sicherheitsfilter einmal ablehnt, übernimmt automatisch ein Ersatzmodell.
        if (fb) { headers['anthropic-beta'] = 'server-side-fallback-2026-07-01'; b.fallbacks = 'default'; }
      }
      return fetch(S.proxy || 'https://api.anthropic.com/v1/messages', { method: 'POST', headers: headers, body: JSON.stringify(b) })
        .then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (j) {
            if (r.ok) return j;
            if (r.status === 400 && fb) return go(false);
            var m = (j.error && j.error.message) || '';
            throw fail(r.status, m);
          });
        }, function () { throw new Error('Keine Verbindung. Bitte Internet prüfen und nochmal versuchen.'); });
    }
    return go(useFb && !S.proxy).then(function (j) {
      if (j.stop_reason === 'refusal') throw new Error('Das Modell hat diese Nachricht abgelehnt. Bitte anders formulieren.');
      var txt = (j.content || []).filter(function (c) { return c.type === 'text'; }).map(function (c) { return c.text; }).join('');
      return parse(txt);
    });
  }

  function history(list) {
    var out = [{ role: 'user', content: 'Beginne das Gespräch.' }];
    list.forEach(function (m) {
      if (m.role === 'bot') out.push({ role: 'assistant', content: m.ar });
      else if (m.role === 'me') out.push({ role: 'user', content: m.text });
    });
    return out;
  }

  // ---------- Ansichten ----------
  var view = { name: 'home', scn: null, busy: false, sugg: null, vmode: 'table' };
  var app = $('app'), top = $('top'), dock = $('dock'), tabs = $('tabs'), sheet = $('sheet');

  function header(title, back, extra) {
    top.innerHTML = '';
    if (back) top.appendChild(el('button', { class: 'ic', 'aria-label': 'Zurück', html: I.back, onclick: back }));
    top.appendChild(title);
    (extra || []).forEach(function (x) { top.appendChild(x); });
    top.appendChild(el('button', { class: 'ic', 'aria-label': 'Hell oder dunkel', title: 'Hell oder dunkel', html: I.sun, onclick: toggleTheme }));
  }
  function drawTabs(cur) {
    tabs.innerHTML = '';
    [['home', 'Gespräch', I.chat], ['vocab', 'Vokabeln', I.list], ['settings', 'Einstellungen', I.gear]].forEach(function (t) {
      tabs.appendChild(el('button', { 'aria-current': t[0] === cur ? 'page' : null, onclick: function () { show(t[0]); } }, [el('span', { html: t[2] }), t[1]]));
    });
    tabs.hidden = false;
  }
  function show(name, arg) {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    stopRec();
    view.name = name; dock.innerHTML = ''; app.className = ''; closeSheet();
    ({ home: home, chat: chat, vocab: vocabView, settings: settings })[name](arg);
    window.scrollTo(0, name === 'chat' ? document.body.scrollHeight : 0);
  }

  // Start
  function home() {
    header(el('h1', null, [el('span', { class: 'ar', text: 'اِقْرَأْ' }), 'Arabischlehrer']));
    drawTabs('home');
    app.innerHTML = '';
    app.appendChild(el('h2', { text: 'Worüber möchtest du sprechen?' }));
    app.appendChild(el('p', { class: 'lead', text: 'Dein Gesprächspartner antwortet nur auf Hocharabisch, in kurzen Sätzen.' }));
    var g = el('div', { class: 'scn' });
    SCN.forEach(function (s) {
      var n = (chats[s.id] || []).filter(function (m) { return m.role === 'me'; }).length;
      g.appendChild(el('button', { onclick: function () { show('chat', s.id); } }, [
        el('span', { class: 'ar', text: s.ar }),
        el('span', { class: 'de' }, [s.de, n ? el('span', { class: 'st', text: ' · ' + n + (n === 1 ? ' Antwort' : ' Antworten') }) : null])
      ]));
    });
    app.appendChild(g);
    if (!ready()) {
      app.appendChild(el('hr'));
      app.appendChild(el('p', { class: 'note' }, ['Für das Gespräch braucht die App einmalig einen Schlüssel für ein Sprachmodell. Das geht kostenlos. ', el('a', { href: '#', text: 'Jetzt einrichten', onclick: function (e) { e.preventDefault(); show('settings'); } })]));
    }
  }

  // Gespräch
  function chat(id) {
    if (id) view.scn = SCN.filter(function (s) { return s.id === id; })[0];
    var scn = view.scn, list = chats[scn.id] || (chats[scn.id] = []);
    view.sugg = null; view.busy = false;
    function pill(lbl, key) {
      return el('button', { class: 'pill', 'aria-pressed': String(!!S[key]), text: lbl, onclick: function () { S[key] = !S[key]; save(); this.setAttribute('aria-pressed', String(S[key])); cls(); } });
    }
    function cls() { app.className = (S.showTr ? '' : 'hide-tr ') + (S.showDe ? '' : 'hide-de'); }
    header(el('h1', { text: scn.de }), function () { show('home'); }, [pill('Umschrift', 'showTr'), pill('Deutsch', 'showDe')]);
    tabs.hidden = true; cls();
    app.innerHTML = '';
    var box = el('div', { class: 'chat', 'aria-live': 'polite' });
    app.appendChild(box);
    list.forEach(function (m) { box.appendChild(renderMsg(m)); });
    if (list.length) app.appendChild(el('p', { class: 'note', style: 'margin-top:26px' }, [el('a', { href: '#', text: 'Gespräch neu beginnen', onclick: function (e) { e.preventDefault(); chats[scn.id] = []; save(); show('chat', scn.id); } })]));
    drawDock();
    if (!list.length) turn(null);

    function turn(text) {
      if (view.busy) return;
      if (!ready()) { keySheet(); return; }
      var mine = null, mineEl = null;
      if (text != null) { mine = { role: 'me', text: text }; list.push(mine); mineEl = box.appendChild(renderMsg(mine)); }
      var old = box.querySelector('.err'); if (old) old.remove();
      var wait = box.appendChild(el('p', { class: 'wait', text: 'Dein Gesprächspartner schreibt …' }));
      view.busy = true; view.sugg = null; drawDock(); scrollEnd();
      api(sysTurn(scn), history(list), SCHEMA_TURN).then(function (r) {
        if (mine && r.correction && r.correction.status !== 'none') { mine.corr = r.correction; var n = renderMsg(mine); box.replaceChild(n, mineEl); }
        var bot = { role: 'bot', ar: r.reply.ar, tr: r.reply.tr, de: r.reply.de, words: r.reply.words || [] };
        list.push(bot); save(); wait.remove(); box.appendChild(renderMsg(bot));
      }).catch(function (e) {
        wait.remove();
        if (mine) { list.pop(); mineEl.remove(); var ta = $('inp'); if (ta && !ta.value) ta.value = text; }
        box.appendChild(el('div', { class: 'err' }, [e.message, el('br'), el('button', { text: 'Nochmal versuchen', onclick: function () { var t = mine ? text : null; if (mine) { var ta = $('inp'); if (ta) ta.value = ''; } turn(t); } })]));
      }).then(function () { view.busy = false; drawDock(true); scrollEnd(); });
    }
    function scrollEnd() { requestAnimationFrame(function () { window.scrollTo(0, document.body.scrollHeight); }); }

    function drawDock(keep) {
      var prev = $('inp'), val = prev ? prev.value : '';
      dock.innerHTML = '';
      var inn = el('div', { class: 'dockin' });
      if (view.sugg) {
        var sg = el('div', { class: 'sugg' });
        view.sugg.forEach(function (s) {
          sg.appendChild(el('button', { onclick: function () { ta.value = s.ar; view.sugg = null; drawDock(); $('inp').focus(); } }, [
            el('span', { class: 'ar', text: s.ar }), el('small', { text: s.tr + ' · ' + s.de })]));
        });
        inn.appendChild(sg);
      }
      var helpBtn = el('button', { class: 'btn', text: view.helping ? 'Einen Moment …' : 'Hilf mir', disabled: view.busy || view.helping || !list.length, onclick: help });
      var kbBtn = el('button', { class: 'btn' + (S.kb ? ' on' : ''), 'aria-pressed': String(S.kb), html: I.kb + '<span>Tastatur</span>', onclick: function () { S.kb = !S.kb; save(); drawDock(); } });
      inn.appendChild(el('div', { class: 'tools' }, [helpBtn, el('span', { class: 'sp' }), kbBtn]));
      var ta = el('textarea', { id: 'inp', class: 'ar', dir: 'rtl', lang: 'ar', rows: '1', placeholder: 'Antwort auf Arabisch', 'aria-label': 'Deine Antwort auf Arabisch', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false',
        onkeydown: function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } } });
      ta.value = val;
      var row = el('div', { class: 'inrow' });
      if (REC) row.appendChild(el('button', { id: 'mic', class: 'btn sq', 'aria-label': 'Spracheingabe', title: 'Spracheingabe', html: I.mic, disabled: view.busy, onclick: function () { toggleRec(ta, this); } }));
      row.appendChild(ta);
      row.appendChild(el('button', { class: 'btn pri sq', 'aria-label': 'Senden', title: 'Senden', html: I.send, disabled: view.busy, onclick: send }));
      inn.appendChild(row);
      if (S.kb) inn.appendChild(keyboard(ta));
      dock.appendChild(inn);
      function send() { var t = ta.value.trim(); if (!t || view.busy) return; ta.value = ''; stopRec(); turn(t); }
    }
    function help() {
      if (!ready()) { keySheet(); return; }
      view.helping = true; drawDock();
      var sys = 'Der Lerner führt ein arabisches Übungsgespräch (Szenario: ' + scn.de + ') und weiß nicht, was er antworten soll. ' + BOOKS[S.book].p + '\n' + RULES +
        '\nGib genau drei verschiedene, kurze mögliche Antworten des Lerners auf die letzte Frage, von sehr einfach bis etwas ausführlicher.';
      var h = history(list); h.push({ role: 'user', content: 'Gib mir drei mögliche Antworten auf deine letzte Frage.' });
      api(sys, h, SCHEMA_HELP).then(function (r) { view.sugg = (r.suggestions || []).slice(0, 3); }, function (e) { toast(e.message); })
        .then(function () { view.helping = false; drawDock(); scrollEnd(); });
    }
  }

  function renderMsg(m) {
    if (m.role === 'me') {
      var kids = [hasAr(m.text) ? arLine(m.text, null) : el('p', { class: 'lat', text: m.text })];
      if (m.corr) {
        var ok = m.corr.status === 'ok';
        kids.push(el('div', { class: 'corr' }, [
          el('span', { class: 'lbl' + (ok ? ' ok' : ''), text: ok ? 'Richtig. Mit Ḥarakāt:' : 'Besser so:' }),
          arLine(m.corr.corrected, null, true),
          el('p', { text: m.corr.note })
        ]));
      }
      return el('div', { class: 'msg me' }, kids);
    }
    return el('div', { class: 'msg bot' }, [el('div', { class: 'row' }, [
      el('div', { class: 'body' }, [arLine(m.ar, m.words), el('p', { class: 'tr', text: m.tr }), el('p', { class: 'de', text: m.de })]),
      el('button', { class: 'spk', 'aria-label': 'Langsam vorlesen', title: 'Langsam vorlesen', html: I.spk, onclick: function () { speak(m.ar, this); } })
    ])]);
  }
  // Arabische Zeile, jedes Wort antippbar
  function arLine(text, words, small) {
    var p = el('p', { class: 'ar' + (small ? '' : ' arline'), lang: 'ar' });
    if (small) p.classList.add('arline'), p.style.fontSize = '24px';
    var toks = text.split(/\s+/).filter(Boolean), idx = 0;
    var real = toks.filter(function (t) { return bare(t); });
    var aligned = words && words.length === real.length;
    toks.forEach(function (t, i) {
      if (i) p.appendChild(document.createTextNode(' '));
      if (!bare(t)) { p.appendChild(document.createTextNode(t)); return; }
      var info = null;
      if (aligned) info = words[idx];
      else if (words) info = words.filter(function (w) { return bare(w.ar) === bare(t); })[0] || null;
      idx++;
      p.appendChild(el('span', { class: 'w', role: 'button', tabindex: '0', text: t,
        onclick: function () { wordSheet(clean(t), info, text, this); },
        onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.click(); } } }));
    });
    return p;
  }

  // ---------- Wort-Blatt ----------
  function openSheet(card) { sheet.innerHTML = ''; sheet.appendChild(card); sheet.hidden = false; }
  function closeSheet() { sheet.hidden = true; sheet.innerHTML = ''; document.querySelectorAll('.w.on').forEach(function (w) { w.classList.remove('on'); }); }
  sheet.addEventListener('click', function (e) { if (e.target === sheet) closeSheet(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !sheet.hidden) closeSheet(); });

  function wordSheet(word, info, sentence, span) {
    if (span) span.classList.add('on');
    var known = vocab.filter(function (v) { return v.k === bare(word); })[0];
    if (!info && known) info = known;
    if (info) return fill(info);
    openSheet(el('div', { class: 'card' }, [el('p', { class: 'ar big', text: word }), el('p', { class: 'note', style: 'text-align:center', text: ready() ? 'Schlage nach …' : 'Zum Nachschlagen fehlt noch der Schlüssel.' })]));
    if (!ready()) return;
    api('Du bist ein arabisches Wörterbuch für deutschsprachige Anfänger.\n' + RULES + '\nGib das Wort vollständig vokalisiert zurück (ar), so wie es im Satz steht, und seine Bedeutung in diesem Satz.',
      [{ role: 'user', content: 'Wort: ' + word + '\nSatz: ' + sentence }], WORD)
      .then(function (r) { if (!sheet.hidden) fill(r); }, function (e) { if (!sheet.hidden) openSheet(el('div', { class: 'card' }, [el('p', { class: 'ar big', text: word }), el('p', { class: 'note', text: e.message })])); });

    function fill(w) {
      var k = bare(w.ar) || bare(word);
      var entry = vocab.filter(function (v) { return v.k === k; })[0];
      if (!entry) { entry = { k: k, ar: clean(w.ar) || word, tr: w.tr, de: w.de, root: w.root || '', pos: w.pos || '', box: 1, due: 0, t: Date.now() }; vocab.unshift(entry); save(); }
      var st = el('p', { class: 'note', style: 'margin:0 0 16px', text: 'In deiner Vokabelliste gespeichert.' });
      openSheet(el('div', { class: 'card', role: 'dialog', 'aria-label': 'Wort' }, [
        el('p', { class: 'ar big', lang: 'ar', text: entry.ar }),
        el('dl', null, [
          el('dt', { text: 'Umschrift' }), el('dd', { text: w.tr, style: 'font-style:italic' }),
          el('dt', { text: 'Bedeutung' }), el('dd', { text: w.de }),
          el('dt', { text: 'Wurzel' }), w.root ? el('dd', { class: 'ar', lang: 'ar', text: w.root }) : el('dd', { text: 'keine' }),
          el('dt', { text: 'Wortart' }), el('dd', { text: w.pos || 'unbekannt' })
        ]),
        st,
        el('div', { class: 'acts' }, [
          el('button', { class: 'btn', text: 'Anhören', onclick: function () { speak(entry.ar); } }),
          el('button', { class: 'btn', text: 'Aus Liste entfernen', onclick: function () { vocab = vocab.filter(function (v) { return v !== entry; }); save(); st.textContent = 'Aus der Liste entfernt.'; this.disabled = true; } }),
          el('button', { class: 'btn pri', text: 'Schließen', onclick: closeSheet })
        ])
      ]));
    }
  }

  function keySheet() {
    openSheet(el('div', { class: 'card' }, [
      el('h2', { text: 'Einmal einrichten' }),
      el('p', { class: 'note', text: 'Damit dein Gesprächspartner antworten kann, braucht die App einen Schlüssel für ein Sprachmodell. Den gibt es kostenlos bei Google, das Einrichten dauert ein paar Minuten und wird nur einmal gemacht.' }),
      el('div', { class: 'acts', style: 'margin-top:18px' }, [
        el('button', { class: 'btn', text: 'Später', onclick: function () { show('home'); } }),
        el('button', { class: 'btn pri', text: 'Zu den Einstellungen', onclick: function () { show('settings'); } })
      ])
    ]));
  }

  // ---------- Spracheingabe ----------
  var REC = window.SpeechRecognition || window.webkitSpeechRecognition, rec = null;
  function stopRec() { if (rec) { try { rec.stop(); } catch (e) {} rec = null; } }
  function toggleRec(ta, btn) {
    if (rec) { stopRec(); btn.classList.remove('on'); return; }
    var base = ta.value ? ta.value.trim() + ' ' : '';
    rec = new REC(); rec.lang = 'ar-SA'; rec.interimResults = true; rec.continuous = false;
    rec.onresult = function (e) { var t = ''; for (var i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; ta.value = base + t; };
    rec.onerror = function (e) { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') toast('Das Mikrofon ist für diese Seite nicht freigegeben.'); else if (e.error !== 'aborted' && e.error !== 'no-speech') toast('Die Spracheingabe hat nicht geklappt. Die Diktier-Taste der arabischen Tastatur geht auch.'); };
    rec.onend = function () { rec = null; btn.classList.remove('on'); };
    btn.classList.add('on');
    try { rec.start(); } catch (e) { rec = null; btn.classList.remove('on'); }
  }

  // ---------- Bildschirmtastatur ----------
  function keyboard(ta) {
    var rows = ['ض ص ث ق ف غ ع ه خ ح ج د', 'ش س ي ب ل ا ت ن م ك ط ذ', 'ئ ء ؤ ر ى ة و ز ظ أ إ آ', 'َ ُ ِ ْ ّ ً ٌ ٍ ؟ ،'];
    var kb = el('div', { class: 'kb', 'aria-label': 'Arabische Tastatur' });
    function ins(s) {
      var a = ta.selectionStart == null ? ta.value.length : ta.selectionStart, b = ta.selectionEnd == null ? a : ta.selectionEnd;
      ta.value = ta.value.slice(0, a) + s + ta.value.slice(b); ta.selectionStart = ta.selectionEnd = a + s.length;
    }
    rows.forEach(function (r, ri) {
      var d = el('div', { class: 'r' });
      r.split(' ').forEach(function (c) {
        d.appendChild(el('button', { type: 'button', text: ri === 3 && c.charCodeAt(0) < 0x0660 && /[ً-ْ]/.test(c) ? 'ـ' + c : c, 'aria-label': c, onclick: function () { ins(c); } }));
      });
      if (ri === 3) {
        d.appendChild(el('button', { type: 'button', class: 'mid', text: 'Leer', onclick: function () { ins(' '); } }));
        d.appendChild(el('button', { type: 'button', class: 'mid', text: 'Löschen', onclick: function () {
          var a = ta.selectionStart == null ? ta.value.length : ta.selectionStart, b = ta.selectionEnd == null ? a : ta.selectionEnd;
          if (a === b && a > 0) a--; ta.value = ta.value.slice(0, a) + ta.value.slice(b); ta.selectionStart = ta.selectionEnd = a; } }));
      }
      kb.appendChild(d);
    });
    return kb;
  }

  // ---------- Vokabeln ----------
  var DAYS = [0, 1, 3, 7, 14, 30];
  function vocabView() {
    header(el('h1', { text: 'Vokabeln' }));
    drawTabs('vocab');
    app.innerHTML = '';
    if (!vocab.length) {
      app.appendChild(el('h2', { text: 'Noch keine Wörter' }));
      app.appendChild(el('p', { class: 'lead', text: 'Tippe im Gespräch auf ein arabisches Wort. Es landet dann automatisch hier.' }));
      return;
    }
    var seg = el('div', { class: 'seg' });
    [['table', 'Liste'], ['cards', 'Karteikarten']].forEach(function (s) {
      seg.appendChild(el('button', { 'aria-pressed': String(view.vmode === s[0]), text: s[1], onclick: function () { view.vmode = s[0]; vocabView(); } }));
    });
    app.appendChild(seg);
    if (view.vmode === 'cards') return cards();
    var tb = el('tbody');
    vocab.forEach(function (v) {
      tb.appendChild(el('tr', null, [
        el('td', { class: 'ar', lang: 'ar' }, [el('span', { class: 'w', role: 'button', tabindex: '0', text: v.ar, onclick: function () { speak(v.ar); } })]),
        el('td', { class: 'tr', text: v.tr }), el('td', { text: v.de }), el('td', { class: 'root', lang: 'ar', text: v.root || '' }),
        el('td', null, [el('button', { class: 'x', 'aria-label': v.de + ' entfernen', html: I.x, onclick: function () { vocab = vocab.filter(function (x) { return x !== v; }); save(); vocabView(); } })])
      ]));
    });
    app.appendChild(el('div', { class: 'tblw' }, [el('table', null, [
      el('thead', null, [el('tr', null, [el('th', { class: 'arh', text: 'Arabisch' }), el('th', { text: 'Umschrift' }), el('th', { text: 'Deutsch' }), el('th', { text: 'Wurzel' }), el('th', { 'aria-label': 'Entfernen' })])]), tb])]));
    app.appendChild(el('p', { class: 'note', style: 'margin-top:18px', text: vocab.length + (vocab.length === 1 ? ' Wort' : ' Wörter') + '. Tippen auf das arabische Wort liest es vor.' }));
  }
  function cards() {
    var now = Date.now();
    var due = vocab.filter(function (v) { return (v.due || 0) <= now; }).sort(function (a, b) { return (a.due || 0) - (b.due || 0); });
    if (!due.length) {
      app.appendChild(el('h2', { text: 'Für heute alles wiederholt' }));
      app.appendChild(el('p', { class: 'lead', text: 'Die nächsten Karten sind später wieder dran.' }));
      app.appendChild(el('button', { class: 'btn', text: 'Trotzdem alle wiederholen', onclick: function () { vocab.forEach(function (v) { v.due = 0; }); save(); vocabView(); } }));
      return;
    }
    var v = due[0], open = false;
    var card = el('div', { class: 'fc' }), bar = el('div', { class: 'fcb' });
    app.appendChild(el('p', { class: 'note', text: 'Noch ' + due.length + (due.length === 1 ? ' Karte' : ' Karten') }));
    app.appendChild(card); app.appendChild(bar);
    draw();
    function draw() {
      card.innerHTML = ''; bar.innerHTML = '';
      card.appendChild(el('p', { class: 'ar', lang: 'ar', text: v.ar }));
      if (open) {
        card.appendChild(el('p', { class: 'tr', text: v.tr }));
        card.appendChild(el('p', { class: 'de', text: v.de }));
        card.appendChild(el('p', { class: 'root' }, [v.root ? 'Wurzel: ' : '', v.root ? el('span', { class: 'ar', lang: 'ar', style: 'font-size:22px;letter-spacing:.2em', text: v.root }) : null, v.pos ? (v.root ? ' · ' : '') + v.pos : '']));
        bar.appendChild(el('button', { class: 'btn', text: 'Noch nicht', onclick: function () { rate(false); } }));
        bar.appendChild(el('button', { class: 'btn pri', text: 'Wusste ich', onclick: function () { rate(true); } }));
      } else {
        bar.appendChild(el('button', { class: 'btn', text: 'Anhören', onclick: function () { speak(v.ar); } }));
        bar.appendChild(el('button', { class: 'btn pri', text: 'Aufdecken', onclick: function () { open = true; draw(); } }));
      }
    }
    function rate(ok) {
      v.box = ok ? Math.min((v.box || 1) + 1, 5) : 1;
      v.due = ok ? Date.now() + DAYS[v.box] * 864e5 : Date.now() + 60e3;
      save(); vocabView();
    }
  }

  // ---------- Einstellungen ----------
  function settings() {
    header(el('h1', { text: 'Einstellungen' }));
    drawTabs('settings');
    app.innerHTML = '';
    app.appendChild(select('prov', 'Sprachmodell', [['gemini', 'Google Gemini (kostenlos)'], ['claude', 'Anthropic Claude (bezahlt, genauer)']], null, settings));
    var g = S.prov === 'gemini', kf = g ? 'gkey' : 'key';
    var key = el('input', { type: 'password', id: 'key', autocomplete: 'off', spellcheck: 'false', placeholder: g ? 'AIza…' : 'sk-ant-…' }); key.value = S[kf];
    var st = el('p', { class: 'hint', role: 'status', text: S[kf] ? 'Ein Schlüssel ist gespeichert.' : 'Noch kein Schlüssel gespeichert.' });
    app.appendChild(el('div', { class: 'field' }, [
      el('label', { for: 'key', text: g ? 'Gemini-Schlüssel' : 'Claude-Schlüssel' }),
      el('div', { class: 'rowf' }, [key, el('button', { class: 'btn pri', text: 'Speichern', onclick: function () { S[kf] = key.value.trim(); save(); st.textContent = S[kf] ? 'Gespeichert. Du kannst jetzt ein Gespräch starten.' : 'Schlüssel entfernt.'; } })]),
      st,
      el('ol', { class: 'steps' }, g ? [
        el('li', null, ['Auf ', el('a', { href: 'https://aistudio.google.com/apikey', target: '_blank', rel: 'noopener', text: 'aistudio.google.com/apikey' }), ' mit einem Google-Konto anmelden.']),
        el('li', { text: 'Auf „API-Schlüssel erstellen“ tippen. Eine Kreditkarte ist dafür nicht nötig.' }),
        el('li', { text: 'Den Schlüssel kopieren und hier einfügen.' })
      ] : [
        el('li', null, ['Auf ', el('a', { href: 'https://platform.claude.com/', target: '_blank', rel: 'noopener', text: 'platform.claude.com' }), ' ein Konto anlegen (das ist getrennt von einem Claude-Abo).']),
        el('li', { text: 'Unter „Billing“ ein kleines Guthaben aufladen, zum Beispiel 5 Dollar.' }),
        el('li', { text: 'Unter „API Keys“ einen Schlüssel erstellen, kopieren und hier einfügen.' })
      ]),
      el('p', { class: 'hint', text: g
        ? 'Kostenlos heißt bei Google: begrenzte Anfragen pro Minute und Tag, und Google darf die Gespräche zur Verbesserung seiner Produkte auswerten. Schreib also nichts Privates hinein.'
        : 'Mit dem günstigen Modell kostet eine Antwort weit unter einem Cent, 5 Dollar reichen für mehrere tausend Antworten.' }),
      el('p', { class: 'hint', text: 'Der Schlüssel bleibt nur in diesem Browser auf diesem Gerät gespeichert und geht ausschließlich an ' + (g ? 'Google' : 'Anthropic') + ', wenn du eine Nachricht schickst. Trage ihn nicht auf fremden Geräten ein.' })
    ]));
    if (g) app.appendChild(select('gmodel', 'Modell', GMODELS));
    else app.appendChild(select('model', 'Modell', MODELS, 'Das beste Modell setzt die Ḥarakāt am zuverlässigsten, kostet aber grob 1 bis 2 Cent pro Antwort.'));
    app.appendChild(select('book', 'Wortschatz und Satzmuster', Object.keys(BOOKS).map(function (k) { return [k, BOOKS[k].de]; }), 'Das Modell lehnt sich an den Stoff des Buches an, so gut es ihn kennt. Es zitiert keine Texte daraus.'));
    app.appendChild(select('theme', 'Farbschema', [['', 'Wie das Gerät'], ['light', 'Hell'], ['dark', 'Dunkel']], null, applyTheme));
    app.appendChild(el('hr'));
    app.appendChild(el('div', { class: 'field' }, [
      el('label', { text: 'Daten auf diesem Gerät' }),
      el('p', { class: 'hint', style: 'margin:0 0 12px', text: 'Gespräche und Vokabeln liegen nur hier im Browser. Wer die Browserdaten löscht, löscht auch sie.' }),
      el('button', { class: 'btn', text: 'Gespräche und Vokabeln löschen', onclick: function () {
        if (this.dataset.sure) { chats = {}; vocab = []; save(); this.textContent = 'Gelöscht'; this.disabled = true; }
        else { this.dataset.sure = '1'; this.textContent = 'Wirklich alles löschen? Nochmal tippen'; } } })
    ]));
  }
  function select(key, label, opts, hint, after) {
    var s = el('select', { id: 'f-' + key, onchange: function () { S[key] = this.value; save(); if (after) after(); } });
    opts.forEach(function (o) { var op = el('option', { value: o[0], text: o[1] }); if (S[key] === o[0]) op.selected = true; s.appendChild(op); });
    return el('div', { class: 'field' }, [el('label', { for: 'f-' + key, text: label }), s, hint ? el('p', { class: 'hint', text: hint }) : null]);
  }

  applyTheme();
  show('home');
})();
