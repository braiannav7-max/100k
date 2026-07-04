// ═══════════════════════════════════════════════════════════════
//  CHATBOT VENDEDOR — Prime90 (widget flotante, motor Gemini vía /api/chat)
// ═══════════════════════════════════════════════════════════════
(function () {
  var css = `
    #p90-chat-launcher {
      position:fixed; bottom:90px; right:18px; z-index:1001;
      width:60px; height:60px; border-radius:50%; border:none; cursor:pointer;
      background:linear-gradient(135deg,#7c3aed,#4f46e5);
      box-shadow:0 4px 24px rgba(139,92,246,0.6);
      display:flex; align-items:center; justify-content:center;
      font-size:26px; transition:transform 0.25s;
    }
    #p90-chat-launcher:hover { transform:scale(1.08); }
    #p90-chat-launcher .p90-dot {
      position:absolute; top:2px; right:2px; width:14px; height:14px; border-radius:50%;
      background:#34d399; border:2px solid #050508;
    }

    #p90-chat-panel {
      position:fixed; bottom:160px; right:18px; z-index:1002;
      width:min(340px,calc(100vw - 32px)); height:min(480px,calc(100vh - 200px));
      background:#0b0b12; border:1px solid rgba(139,92,246,0.35); border-radius:18px;
      box-shadow:0 20px 60px rgba(0,0,0,0.6); display:none; flex-direction:column; overflow:hidden;
      font-family:'Inter',sans-serif;
    }
    #p90-chat-panel.open { display:flex; }

    #p90-chat-header {
      background:linear-gradient(135deg,#7c3aed,#4f46e5); padding:14px 16px;
      display:flex; align-items:center; justify-content:space-between; flex-shrink:0;
    }
    #p90-chat-header .p90-title { color:#fff; font-weight:800; font-size:14px; display:flex; align-items:center; gap:8px; }
    #p90-chat-header .p90-title .p90-online { width:8px; height:8px; border-radius:50%; background:#34d399; display:inline-block; }
    #p90-chat-header button { background:none; border:none; color:#fff; font-size:18px; cursor:pointer; opacity:0.85; }

    #p90-chat-messages { flex:1; overflow-y:auto; padding:14px; display:flex; flex-direction:column; gap:10px; background:#050508; }
    .p90-msg { max-width:85%; padding:10px 13px; border-radius:14px; font-size:13.5px; line-height:1.55; white-space:pre-wrap; }
    .p90-msg.bot { align-self:flex-start; background:rgba(139,92,246,0.12); border:1px solid rgba(139,92,246,0.25); color:#e2e8f0; border-bottom-left-radius:4px; }
    .p90-msg.user { align-self:flex-end; background:linear-gradient(135deg,#7c3aed,#4f46e5); color:#fff; border-bottom-right-radius:4px; }
    .p90-msg.typing { align-self:flex-start; color:#94a3b8; font-style:italic; font-size:12.5px; }

    #p90-chat-form { display:flex; gap:8px; padding:10px; border-top:1px solid rgba(139,92,246,0.15); background:#0b0b12; flex-shrink:0; }
    #p90-chat-input {
      flex:1; background:rgba(255,255,255,0.05); border:1px solid rgba(139,92,246,0.3); border-radius:10px;
      color:#fff; padding:10px 12px; font-size:13.5px; outline:none; font-family:'Inter',sans-serif;
    }
    #p90-chat-form button {
      background:linear-gradient(135deg,#7c3aed,#4f46e5); border:none; border-radius:10px; color:#fff;
      padding:0 16px; font-weight:800; cursor:pointer; font-size:13.5px;
    }
    #p90-chat-form button:disabled { opacity:0.5; cursor:default; }

    @media (max-width:480px) {
      #p90-chat-panel { right:12px; bottom:150px; }
      #p90-chat-launcher { right:12px; }
    }
  `;
  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  document.body.insertAdjacentHTML('beforeend', `
    <button id="p90-chat-launcher" aria-label="Abrir chat">💬<span class="p90-dot"></span></button>
    <div id="p90-chat-panel">
      <div id="p90-chat-header">
        <span class="p90-title"><span class="p90-online"></span>Asistente Prime90</span>
        <button id="p90-chat-close" aria-label="Cerrar">✕</button>
      </div>
      <div id="p90-chat-messages"></div>
      <form id="p90-chat-form">
        <input id="p90-chat-input" type="text" placeholder="Escribí tu pregunta..." autocomplete="off">
        <button type="submit">➤</button>
      </form>
    </div>
  `);

  var launcher = document.getElementById('p90-chat-launcher');
  var panel = document.getElementById('p90-chat-panel');
  var closeBtn = document.getElementById('p90-chat-close');
  var messagesEl = document.getElementById('p90-chat-messages');
  var form = document.getElementById('p90-chat-form');
  var input = document.getElementById('p90-chat-input');

  var history = []; // [{role:'user'|'model', text:'...'}]
  var opened = false;

  function addMessage(role, text) {
    var div = document.createElement('div');
    div.className = 'p90-msg ' + (role === 'user' ? 'user' : 'bot');
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  function track(event, params) {
    if (typeof fbq !== 'undefined') fbq('trackCustom', event, params || {});
    if (typeof gtag !== 'undefined') gtag('event', event, params || {});
  }

  launcher.addEventListener('click', function () {
    panel.classList.toggle('open');
    if (!opened) {
      opened = true;
      track('chat_opened', {});
      addMessage('bot', '¡Hola! 👋 Soy el asistente de Prime90. ¿Tenés alguna duda antes de empezar tu transformación? Puedo contarte sobre el contenido, el precio, la garantía o cómo es el pago.');
    }
  });
  closeBtn.addEventListener('click', function () { panel.classList.remove('open'); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text) return;
    input.value = '';
    addMessage('user', text);
    history.push({ role: 'user', text: text });
    track('chat_message_sent', {});

    var typingEl = document.createElement('div');
    typingEl.className = 'p90-msg typing';
    typingEl.textContent = 'Escribiendo...';
    messagesEl.appendChild(typingEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    var sendBtn = form.querySelector('button');
    sendBtn.disabled = true;

    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history: history.slice(0, -1), page: location.pathname }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        typingEl.remove();
        var reply = (data && data.reply) || 'Perdón, no pude responder. Probá de nuevo en un momento.';
        addMessage('bot', reply);
        history.push({ role: 'model', text: reply });
        if (/checkout\.html|QUIERO EMPEZAR|bot[oó]n de compra/i.test(reply)) {
          track('chat_pushed_checkout', {});
        }
      })
      .catch(function () {
        typingEl.remove();
        addMessage('bot', 'Perdón, tuve un problema de conexión. Probá de nuevo en unos segundos 🙏');
      })
      .finally(function () {
        sendBtn.disabled = false;
        input.focus();
      });
  });
})();
