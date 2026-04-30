(function (config) {
  // ── Config ──────────────────────────────────────────────────────────────────
  const BOT      = config.bot;       // "store" | "restaurant"
  const API_BASE = config.apiBase;   // e.g. "https://your-backend.railway.app"
  const SUGGESTIONS = config.suggestions || [];

  // ── State ───────────────────────────────────────────────────────────────────
  let messages    = [];
  let sessionId   = localStorage.getItem("drai_session_id") || null;
  let isOpen      = false;
  let isTyping    = false;

  // ── Inject styles ────────────────────────────────────────────────────────────
  const style = document.createElement("style");
  style.textContent = `
    .drai-widget *{box-sizing:border-box;font-family:'Plus Jakarta Sans',sans-serif;}
    .drai-toggle{position:fixed;bottom:28px;right:28px;width:56px;height:56px;border-radius:50%;
      background:linear-gradient(135deg,#2563eb,#1d4ed8);border:none;cursor:pointer;
      display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(37,99,235,.45);
      z-index:9999;transition:transform .2s;}
    .drai-toggle:hover{transform:scale(1.08);}
    .drai-toggle svg{width:26px;height:26px;fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}
    .drai-window{position:fixed;bottom:96px;right:28px;width:380px;max-height:580px;
      background:#fff;border-radius:20px;box-shadow:0 12px 48px rgba(0,0,0,.18);
      display:flex;flex-direction:column;z-index:9998;overflow:hidden;
      opacity:0;pointer-events:none;transform:translateY(16px);
      transition:opacity .25s,transform .25s;}
    .drai-window.open{opacity:1;pointer-events:all;transform:translateY(0);}
    .drai-header{padding:16px 20px;background:linear-gradient(135deg,#2563eb,#1d4ed8);
      display:flex;align-items:center;gap:12px;}
    .drai-avatar{width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.2);
      display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;}
    .drai-header-info{flex:1;}
    .drai-header-name{color:#fff;font-weight:700;font-size:15px;}
    .drai-header-status{color:rgba(255,255,255,.75);font-size:12px;display:flex;align-items:center;gap:5px;}
    .drai-status-dot{width:7px;height:7px;border-radius:50%;background:#4ade80;}
    .drai-close{background:none;border:none;cursor:pointer;color:rgba(255,255,255,.8);font-size:22px;padding:0;line-height:1;}
    .drai-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;
      background:#f8faff;}
    .drai-messages::-webkit-scrollbar{width:4px;}
    .drai-messages::-webkit-scrollbar-thumb{background:#dde3f0;border-radius:4px;}
    .drai-bubble{max-width:82%;padding:10px 14px;border-radius:16px;font-size:14px;line-height:1.5;word-break:break-word;}
    .drai-bubble.user{background:#2563eb;color:#fff;align-self:flex-end;border-bottom-right-radius:4px;}
    .drai-bubble.bot{background:#fff;color:#1e293b;align-self:flex-start;border-bottom-left-radius:4px;
      box-shadow:0 1px 4px rgba(0,0,0,.08);}
    .drai-typing{display:flex;gap:4px;align-items:center;padding:10px 14px;background:#fff;
      border-radius:16px;border-bottom-left-radius:4px;align-self:flex-start;
      box-shadow:0 1px 4px rgba(0,0,0,.08);}
    .drai-typing span{width:7px;height:7px;border-radius:50%;background:#94a3b8;
      animation:draiDot 1.2s infinite;}
    .drai-typing span:nth-child(2){animation-delay:.2s;}
    .drai-typing span:nth-child(3){animation-delay:.4s;}
    @keyframes draiDot{0%,60%,100%{transform:translateY(0);}30%{transform:translateY(-5px);}}
    .drai-suggestions{display:flex;flex-wrap:wrap;gap:6px;padding:8px 16px;background:#f8faff;}
    .drai-suggestion{background:#fff;border:1px solid #dde3f0;border-radius:20px;
      padding:6px 12px;font-size:12px;color:#2563eb;cursor:pointer;transition:all .15s;white-space:nowrap;}
    .drai-suggestion:hover{background:#2563eb;color:#fff;border-color:#2563eb;}
    .drai-input-row{display:flex;gap:8px;padding:12px 16px;background:#fff;
      border-top:1px solid #f0f4ff;}
    .drai-input{flex:1;border:1.5px solid #e2e8f0;border-radius:12px;padding:10px 14px;
      font-size:14px;outline:none;resize:none;font-family:inherit;transition:border-color .15s;
      max-height:80px;}
    .drai-input:focus{border-color:#2563eb;}
    .drai-send{width:40px;height:40px;border-radius:12px;background:#2563eb;border:none;
      cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;
      transition:background .15s;}
    .drai-send:hover{background:#1d4ed8;}
    .drai-send svg{width:18px;height:18px;fill:none;stroke:#fff;stroke-width:2;
      stroke-linecap:round;stroke-linejoin:round;}
    @media(max-width:440px){
      .drai-window{right:12px;left:12px;width:auto;bottom:88px;}
      .drai-toggle{right:16px;bottom:20px;}
    }
  `;
  document.head.appendChild(style);

  // ── Build DOM ────────────────────────────────────────────────────────────────
  const wrap = document.createElement("div");
  wrap.className = "drai-widget";

  const avatarEmoji = BOT === "store" ? "🛍️" : "🍣";
  const botName     = BOT === "store" ? "Lumi — Bloom Beauty" : "Hiro — Sakura Restaurant";
  const greeting    = BOT === "store"
    ? "Hi! I'm Lumi, your Bloom Beauty assistant. Ask me about our products or place an order! 🌸"
    : "Konnichiwa! I'm Hiro from Sakura. I can help with reservations or food orders. 🍣";

  wrap.innerHTML = `
    <button class="drai-toggle" id="draiToggle" aria-label="Open chat">
      <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    </button>
    <div class="drai-window" id="draiWindow">
      <div class="drai-header">
        <div class="drai-avatar">${avatarEmoji}</div>
        <div class="drai-header-info">
          <div class="drai-header-name">${botName}</div>
          <div class="drai-header-status"><span class="drai-status-dot"></span>Online now</div>
        </div>
        <button class="drai-close" id="draiClose" aria-label="Close">×</button>
      </div>
      <div class="drai-messages" id="draiMessages"></div>
      <div class="drai-suggestions" id="draiSuggestions"></div>
      <div class="drai-input-row">
        <textarea class="drai-input" id="draiInput" rows="1" placeholder="Type a message..."></textarea>
        <button class="drai-send" id="draiSend" aria-label="Send">
          <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);

  // ── Element refs ─────────────────────────────────────────────────────────────
  const toggleBtn  = document.getElementById("draiToggle");
  const window_    = document.getElementById("draiWindow");
  const closeBtn   = document.getElementById("draiClose");
  const msgList    = document.getElementById("draiMessages");
  const input      = document.getElementById("draiInput");
  const sendBtn    = document.getElementById("draiSend");
  const suggestBox = document.getElementById("draiSuggestions");

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function scrollBottom() {
    msgList.scrollTop = msgList.scrollHeight;
  }

  function addBubble(role, text) {
    const div = document.createElement("div");
    div.className = `drai-bubble ${role}`;
    div.textContent = text;
    msgList.appendChild(div);
    scrollBottom();
  }

  function showTyping() {
    const div = document.createElement("div");
    div.className = "drai-typing";
    div.id = "draiTyping";
    div.innerHTML = "<span></span><span></span><span></span>";
    msgList.appendChild(div);
    scrollBottom();
  }

  function removeTyping() {
    const t = document.getElementById("draiTyping");
    if (t) t.remove();
  }

  function renderSuggestions(show) {
    suggestBox.innerHTML = "";
    if (!show || !SUGGESTIONS.length) return;
    SUGGESTIONS.forEach(q => {
      const btn = document.createElement("button");
      btn.className = "drai-suggestion";
      btn.textContent = q;
      btn.onclick = () => sendMessage(q);
      suggestBox.appendChild(btn);
    });
  }

  // ── Open / close ─────────────────────────────────────────────────────────────
  function openWidget() {
    isOpen = true;
    window_.classList.add("open");
    toggleBtn.innerHTML = `<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    if (messages.length === 0) {
      addBubble("bot", greeting);
      renderSuggestions(true);
    }
    setTimeout(() => input.focus(), 250);
  }

  function closeWidget() {
    isOpen = false;
    window_.classList.remove("open");
    toggleBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
  }

  toggleBtn.addEventListener("click", () => isOpen ? closeWidget() : openWidget());
  closeBtn.addEventListener("click", closeWidget);

  // ── Send message ─────────────────────────────────────────────────────────────
  async function sendMessage(text) {
    const msg = (text || input.value).trim();
    if (!msg || isTyping) return;

    input.value = "";
    input.style.height = "auto";
    renderSuggestions(false);
    addBubble("user", msg);
    isTyping = true;
    showTyping();
    sendBtn.disabled = true;

    try {
      const res = await fetch(`${API_BASE}/api/chat/${BOT}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, messages, session_id: sessionId })
      });

      const data = await res.json();
      removeTyping();

      if (data.reply) {
        messages = data.messages || messages;
        addBubble("bot", data.reply);
      } else {
        addBubble("bot", "Sorry, something went wrong. Please try again.");
      }
    } catch (err) {
      removeTyping();
      addBubble("bot", "Having trouble connecting. Please try again in a moment.");
    }

    isTyping = false;
    sendBtn.disabled = false;
    input.focus();
  }

  sendBtn.addEventListener("click", () => sendMessage());
  input.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  // Auto-resize textarea
  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 80) + "px";
  });

})(window.__DRAI_CONFIG__ || {});
