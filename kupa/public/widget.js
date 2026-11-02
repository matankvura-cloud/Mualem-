/* העוזר של אתרי אבלות ישראל, תל"מ ומארגנים. הטמעה:
   <script src="https://family.avlut.org.il/widget.js" data-brand="avlut" data-lang="he" defer></script>
   כפתור צף בפינה, חלון שיחה, תשובות בזרימה מ-/api/chat/<brand>. ללא תלויות. */
(function () {
  var S = document.currentScript; if (!S) return;
  var brand = S.getAttribute('data-brand') || 'avlut';
  var lang = (S.getAttribute('data-lang') || document.documentElement.lang || 'he').slice(0, 2);
  var base = (S.getAttribute('data-api') || S.src.replace(/\/widget\.js.*$/, '')).replace(/\/$/, '');
  var rtl = lang === 'he' || lang === 'ar';
  var T = {
    he: { open: 'יש לי שאלה', title: 'העוזר של', hi: 'שלום. אני העוזר של {b}. אפשר לשאול אותי בחופשיות, ואם משהו דורש אדם, אפנה אתכם אליו.', ph: 'כתבו כאן…', send: 'שלח', call: 'להתקשר', wa: 'וואטסאפ', close: 'סגירה', err: 'העוזר לא זמין כרגע. אפשר להתקשר אלינו.', think: 'חושב…', off: 'העוזר יופעל בקרוב. בינתיים אפשר להתקשר.', clear: 'שיחה חדשה', note: 'השיחה נשמרת רק בדפדפן שלכם. על זכויות, מחירים והלכה העוזר מפנה לאדם.' },
    en: { open: 'Ask a question', title: 'Assistant,', hi: 'Hello. I am the {b} assistant. Ask me anything; when a person is needed, I will point you to one.', ph: 'Type here…', send: 'Send', call: 'Call', wa: 'WhatsApp', close: 'Close', err: 'The assistant is unavailable right now. You can call us.', think: 'Thinking…', off: 'The assistant will be available soon. You can call us meanwhile.', clear: 'New chat', note: 'The chat stays in your browser only. For rights, prices and religious law the assistant refers you to a person.' },
    fr: { open: 'Une question ?', title: 'Assistant,', hi: 'Bonjour. Je suis l’assistant de {b}. Posez vos questions ; si une personne est nécessaire, je vous orienterai.', ph: 'Écrivez ici…', send: 'Envoyer', call: 'Appeler', wa: 'WhatsApp', close: 'Fermer', err: 'L’assistant est indisponible. Vous pouvez nous appeler.', think: 'Je réfléchis…', off: 'L’assistant arrive bientôt. En attendant, appelez-nous.', clear: 'Nouvelle conversation', note: 'La conversation reste dans votre navigateur.' },
    ru: { open: 'Задать вопрос', title: 'Помощник,', hi: 'Здравствуйте. Я помощник {b}. Спрашивайте; если нужен человек, я направлю вас.', ph: 'Напишите здесь…', send: 'Отправить', call: 'Позвонить', wa: 'WhatsApp', close: 'Закрыть', err: 'Помощник недоступен. Вы можете позвонить нам.', think: 'Думаю…', off: 'Помощник скоро появится. Пока можно позвонить.', clear: 'Новый разговор', note: 'Разговор хранится только в вашем браузере.' },
    es: { open: '¿Una pregunta?', title: 'Asistente,', hi: 'Hola. Soy el asistente de {b}. Pregunte con libertad; si hace falta una persona, le indicaré.', ph: 'Escriba aquí…', send: 'Enviar', call: 'Llamar', wa: 'WhatsApp', close: 'Cerrar', err: 'El asistente no está disponible. Puede llamarnos.', think: 'Pensando…', off: 'El asistente estará disponible pronto.', clear: 'Nueva conversación', note: 'La conversación queda solo en su navegador.' },
    de: { open: 'Eine Frage?', title: 'Assistent,', hi: 'Hallo. Ich bin der Assistent von {b}. Fragen Sie frei; wenn ein Mensch nötig ist, verweise ich Sie weiter.', ph: 'Hier schreiben…', send: 'Senden', call: 'Anrufen', wa: 'WhatsApp', close: 'Schließen', err: 'Der Assistent ist gerade nicht verfügbar. Sie können uns anrufen.', think: 'Denke nach…', off: 'Der Assistent kommt bald.', clear: 'Neues Gespräch', note: 'Das Gespräch bleibt nur in Ihrem Browser.' }
  };
  var t = T[lang] || T.he;
  var css = '.kw-btn{position:fixed;z-index:9990;bottom:calc(20px + env(safe-area-inset-bottom,0px));' + (rtl ? 'left' : 'right') + ':16px;display:inline-flex;align-items:center;gap:8px;min-height:48px;padding:0 18px;border-radius:999px;border:0;background:#1E3A4A;color:#fff;font:600 15px Heebo,Assistant,Arial,sans-serif;cursor:pointer;box-shadow:0 8px 24px rgba(30,58,74,.3)}.kw-btn svg{width:20px;height:20px}'
    + '.kw{position:fixed;z-index:9991;bottom:calc(80px + env(safe-area-inset-bottom,0px));' + (rtl ? 'left' : 'right') + ':16px;width:min(400px,calc(100vw - 32px));height:min(620px,calc(100vh - 110px));background:#FBFAF7;border:1px solid #E6E2D8;border-radius:18px;box-shadow:0 18px 50px rgba(30,58,74,.28);display:none;flex-direction:column;overflow:hidden;font:15px Heebo,Assistant,Arial,sans-serif;color:#1F2A33;direction:' + (rtl ? 'rtl' : 'ltr') + '}.kw.on{display:flex}'
    + '.kw-h{background:#1E3A4A;color:#fff;padding:12px 14px;display:flex;align-items:center;gap:10px}.kw-h b{font-size:15px;flex:1}.kw-h small{display:block;font-size:12px;opacity:.75;font-weight:400}.kw-h button{background:rgba(255,255,255,.14);border:0;color:#fff;border-radius:999px;width:34px;height:34px;cursor:pointer;font-size:18px;line-height:1}'
    + '.kw-log{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px}.kw-m{max-width:88%;padding:9px 13px;border-radius:14px;line-height:1.55;white-space:pre-wrap;word-break:break-word}.kw-m.u{align-self:flex-start;background:#1E3A4A;color:#fff}.kw-m.a{align-self:flex-end;background:#fff;border:1px solid #E6E2D8}.kw-m a{color:#2F5D74}.kw-m.e{color:#9B2C2C;background:#FBEAEA;border:0}'
    + '.kw-q{display:flex;flex-wrap:wrap;gap:6px;padding:0 12px 8px}.kw-q button{border:1.5px solid #E6E2D8;background:#fff;border-radius:999px;padding:7px 11px;font:inherit;font-size:13px;color:#1F2A33;cursor:pointer}'
    + '.kw-f{display:flex;gap:8px;padding:10px 12px;border-top:1px solid #E6E2D8;background:#fff}.kw-f input{flex:1;min-width:0;min-height:44px;border:1.5px solid #E1E4E9;border-radius:12px;padding:0 12px;font:inherit;font-size:16px}.kw-f button{min-height:44px;padding:0 16px;border:0;border-radius:12px;background:#B8744A;color:#fff;font:inherit;font-weight:700;cursor:pointer}.kw-f button:disabled{opacity:.5}'
    + '.kw-c{display:flex;gap:8px;padding:0 12px 10px;background:#fff}.kw-c a{flex:1;text-align:center;min-height:36px;line-height:36px;border-radius:10px;border:1.5px solid #E6E2D8;color:#1F2A33;text-decoration:none;font-size:13px;font-weight:600}.kw-n{font-size:11.5px;color:#8B93A0;padding:0 12px 8px;background:#fff;margin:0}.kw-x{background:none;border:0;color:#5B6472;font:inherit;font-size:12px;text-decoration:underline;cursor:pointer;padding:0 12px 6px;align-self:flex-start}'
    + '@media(max-width:480px){.kw{width:calc(100vw - 16px);' + (rtl ? 'left' : 'right') + ':8px;height:min(620px,calc(100vh - 100px))}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var linkify = function (s) { return esc(s).replace(/(https?:\/\/[^\s)]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>'); };
  var icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/></svg>';
  var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'kw-btn'; btn.setAttribute('aria-expanded', 'false'); btn.innerHTML = icon + '<span>' + esc(t.open) + '</span>';
  var box = document.createElement('div'); box.className = 'kw'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', t.open); box.hidden = true;
  document.body.appendChild(btn); document.body.appendChild(box);
  var meta = null, msgs = [], busy = false, key = 'kw-' + brand + '-' + lang;
  try { msgs = JSON.parse(sessionStorage.getItem(key) || '[]'); } catch (e) { msgs = []; }
  function save() { try { sessionStorage.setItem(key, JSON.stringify(msgs.slice(-20))); } catch (e) {} }
  function render() {
    var name = meta ? (lang === 'he' ? meta.name : meta.nameEn) : '';
    var h = '<div class="kw-h"><b>' + esc(t.title) + ' ' + esc(name) + '<small>' + esc(meta && meta.phone ? meta.phone : '') + '</small></b><button type="button" class="kw-close" aria-label="' + esc(t.close) + '">×</button></div>';
    h += '<div class="kw-log" id="kw-log">';
    if (!msgs.length) h += '<div class="kw-m a">' + esc(t.hi.replace('{b}', name)) + '</div>';
    msgs.forEach(function (m) { h += '<div class="kw-m ' + (m.role === 'user' ? 'u' : 'a') + (m.error ? ' e' : '') + '">' + (m.error ? esc(m.error) : (m.content ? linkify(m.content) : esc(t.think))) + '</div>'; });
    h += '</div>';
    if (!msgs.length && meta && meta.quick) h += '<div class="kw-q">' + meta.quick.map(function (q) { return '<button type="button" data-q="' + esc(q) + '">' + esc(q) + '</button>'; }).join('') + '</div>';
    if (meta && !meta.enabled) h += '<p class="kw-n">' + esc(t.off) + '</p>';
    h += '<form class="kw-f"><input type="text" maxlength="1500" placeholder="' + esc(t.ph) + '" autocomplete="off"' + (meta && !meta.enabled ? ' disabled' : '') + '><button type="submit"' + (meta && !meta.enabled ? ' disabled' : '') + '>' + esc(t.send) + '</button></form>';
    if (meta) h += '<div class="kw-c"><a href="tel:' + esc(meta.tel) + '">' + esc(t.call) + ' ' + esc(meta.phone) + '</a><a href="' + esc(meta.whatsapp) + '" target="_blank" rel="noopener">' + esc(t.wa) + '</a></div>';
    if (msgs.length) h += '<button type="button" class="kw-x">' + esc(t.clear) + '</button>';
    h += '<p class="kw-n">' + esc(t.note) + '</p>';
    box.innerHTML = h;
    var log = box.querySelector('#kw-log'); log.scrollTop = log.scrollHeight;
    box.querySelector('.kw-close').onclick = close;
    box.querySelector('.kw-f').onsubmit = function (e) { e.preventDefault(); var i = box.querySelector('.kw-f input'); send(i.value); };
    var x = box.querySelector('.kw-x'); if (x) x.onclick = function () { msgs = []; save(); render(); };
    Array.prototype.forEach.call(box.querySelectorAll('.kw-q button'), function (b) { b.onclick = function () { send(b.getAttribute('data-q')); }; });
  }
  function open() { box.hidden = false; box.classList.add('on'); btn.setAttribute('aria-expanded', 'true'); if (!meta) { fetch(base + '/api/chat/' + brand + '?lang=' + lang).then(function (r) { return r.json(); }).then(function (m) { meta = m; render(); var i = box.querySelector('.kw-f input'); if (i && !i.disabled) i.focus(); }).catch(function () { meta = { enabled: false, name: '', nameEn: '', phone: '', tel: '', whatsapp: '#', quick: [] }; render(); }); } else { render(); } }
  function close() { box.classList.remove('on'); box.hidden = true; btn.setAttribute('aria-expanded', 'false'); btn.focus(); }
  btn.onclick = function () { if (box.hidden) open(); else close(); };
  function send(text) {
    text = String(text || '').trim(); if (!text || busy || !meta || !meta.enabled) return;
    var history = msgs.concat([{ role: 'user', content: text }]);
    msgs = history.concat([{ role: 'assistant', content: '' }]); busy = true; render(); save();
    fetch(base + '/api/chat/' + brand, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ lang: lang, messages: history.map(function (m) { return { role: m.role, content: m.content }; }) }) })
      .then(function (r) {
        if (!r.ok || !r.body) return r.json().catch(function () { return {}; }).then(function (j) { msgs = history.concat([{ role: 'assistant', content: '', error: j.error || t.err }]); });
        var reader = r.body.getReader(), dec = new TextDecoder(), buf = '', text2 = '', err = '';
        function pump() { return reader.read().then(function (res) {
          if (res.done) { msgs = history.concat([{ role: 'assistant', content: text2, error: err || undefined }]); return; }
          buf += dec.decode(res.value, { stream: true }); var lines = buf.split('\n'); buf = lines.pop() || '';
          lines.forEach(function (l) { if (!l.trim()) return; try { var ev = JSON.parse(l); if (ev.t === 'text') text2 += ev.v; else if (ev.t === 'error') err = ev.v; } catch (e) {} });
          msgs = history.concat([{ role: 'assistant', content: text2, error: err || undefined }]); render(); return pump(); }); }
        return pump();
      })
      .catch(function () { msgs = history.concat([{ role: 'assistant', content: '', error: t.err }]); })
      .then(function () { busy = false; render(); save(); var i = box.querySelector('.kw-f input'); if (i) i.focus(); });
  }
})();
