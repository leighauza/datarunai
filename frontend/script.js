  function showPage(id) {
    // Hide all views
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    // Show target
    document.getElementById('page-' + id).classList.add('active');
    // Update nav active state
    document.querySelectorAll('.nav-links a[data-page]').forEach(a => {
      a.classList.toggle('active', a.dataset.page === id);
    });
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Update browser URL without reload
    history.pushState({ page: id }, '', '#' + id);
    // Trigger animations when home is shown
    if (id === 'home') {
      setTimeout(() => { triggerProofAnimation(); triggerOpsAnimation(); }, 400);
    }
  }

  // Handle browser back/forward
  window.addEventListener('popstate', (e) => {
    const id = e.state?.page || location.hash.replace('#', '') || 'home';
    showPage(id);
  });

  // On first load, check URL hash
  (function init() {
    const hash = location.hash.replace('#', '');
    showPage(['home','products','about','contact','demo'].includes(hash) ? hash : 'home');
  })();

  // Contact form
  // Testimonial carousel
  let currentTestimonial = 0;
  function showTestimonial(index) {
    document.querySelectorAll('.testimonial-slide').forEach((s, i) => s.classList.toggle('active', i === index));
    document.querySelectorAll('.carousel-dot').forEach((d, i) => d.classList.toggle('active', i === index));
    currentTestimonial = index;
  }
  function prevTestimonial() { showTestimonial((currentTestimonial - 1 + 2) % 2); }
  function nextTestimonial() { showTestimonial((currentTestimonial + 1) % 2); }

  function toggleFaq(btn) {
    const item = btn.closest('.faq-item');
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(el => el.classList.remove('open'));
    if (!isOpen) item.classList.add('open');
  }

  // ── Demo page ────────────────────────────────────────────────────────────────
  const DEMO_API = 'https://datarunai-production.up.railway.app';
  const demoState = {
    store:      { messages: [], typing: false, greeted: false },
    restaurant: { messages: [], typing: false, greeted: false }
  };
  const GREETINGS = {
    store:      "Hi! I'm Lumi, your Bloom Beauty assistant. Ask me about our products or place an order! 🌸",
    restaurant: "Konnichiwa! I'm Hiro from Sakura. I can help with reservations or food orders. 🍣"
  };
  let demoSessionId = null;

  document.getElementById('gatewayForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const name     = document.getElementById('gwName').value.trim();
    const industry = document.getElementById('gwIndustry').value;
    const business = document.getElementById('gwBusiness').value.trim();
    if (!name) return;

    // Update welcome bar with user's name
    document.getElementById('demoWelcome').innerHTML =
      `Welcome, <strong>${name}</strong>! <span>You're viewing live demos of DataRunAI's Revenue Bot.</span>`;

    // Try to create Supabase session (graceful fail if backend not live yet)
    try {
      const res = await fetch(`${DEMO_API}/api/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, industry, business_type: business })
      });
      const data = await res.json();
      demoSessionId = data.session_id || null;
    } catch (_) { /* backend not live yet — demo still works */ }

    // Fade out overlay, unlock bots
    const overlay = document.getElementById('demoOverlay');
    overlay.classList.add('fade-out');
    overlay.addEventListener('transitionend', () => overlay.style.display = 'none', { once: true });
    document.getElementById('demoContent').classList.add('unlocked');

    // Greet both bots
    demoGreet('store');
    demoGreet('restaurant');
  });

  function demoGreet(bot) {
    if (demoState[bot].greeted) return;
    demoState[bot].greeted = true;
    demoPushBubble(bot, 'bot', GREETINGS[bot]);
  }

  function demoPushBubble(bot, role, text) {
    const list = document.getElementById(bot + 'Msgs');
    const div  = document.createElement('div');
    div.className = 'demo-bubble ' + role;
    div.textContent = text;
    list.appendChild(div);
    list.scrollTop = list.scrollHeight;
  }

  function demoShowTyping(bot) {
    const list = document.getElementById(bot + 'Msgs');
    const div  = document.createElement('div');
    div.className = 'demo-typing';
    div.id = bot + 'Typing';
    div.innerHTML = '<span></span><span></span><span></span>';
    list.appendChild(div);
    list.scrollTop = list.scrollHeight;
  }

  function demoRemoveTyping(bot) {
    const t = document.getElementById(bot + 'Typing');
    if (t) t.remove();
  }

  async function demoSend(bot, preset) {
    const input = document.getElementById(bot + 'Input');
    const msg   = (preset || input.value).trim();
    if (!msg || demoState[bot].typing) return;

    input.value = '';
    document.getElementById(bot + 'Suggestions').innerHTML = '';
    demoPushBubble(bot, 'user', msg);
    demoState[bot].messages.push({ role: 'user', content: msg });
    demoState[bot].typing = true;
    demoShowTyping(bot);

    try {
      const res = await fetch(`${DEMO_API}/api/chat/${bot}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message:    msg,
          messages:   demoState[bot].messages,
          session_id: demoSessionId
        })
      });
      const data = await res.json();
      demoRemoveTyping(bot);
      if (data.reply) {
        demoState[bot].messages = data.messages || demoState[bot].messages;
        demoPushBubble(bot, 'bot', data.reply);
      } else {
        demoPushBubble(bot, 'bot', 'Sorry, something went wrong. Please try again.');
      }
    } catch (_) {
      demoRemoveTyping(bot);
      demoPushBubble(bot, 'bot', 'Having trouble connecting — the backend may not be live yet.');
    }

    demoState[bot].typing = false;
  }

  // Enter key on demo inputs
  ['store', 'restaurant'].forEach(bot => {
    document.getElementById(bot + 'Input').addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); demoSend(bot); }
    });
  });

  function handleSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('.btn-submit');
    btn.textContent = '✓ Message sent!';
    btn.style.background = '#16a34a';
    btn.style.boxShadow = '0 4px 20px rgba(22,163,74,0.3)';
    btn.disabled = true;
  }

  // ── Hero Proof Section (Tabbed Data) ──────────────────────

  function switchProofTab(name, btn) {
    document.querySelectorAll('.hero-tab-btn, .hero-tab-text').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.hero-content').forEach(p => p.classList.remove('active'));
    document.getElementById('proof-' + name).classList.add('active');
    if (name === 'operations') triggerProofAnimation();
    if (name === 'finance') {
      countUp('fin-val-0', 284000, '₱', '', 1200);
      countUp('fin-val-1', 71,     '',  '%', 1200);
      countUp('fin-val-2', 84000,  '₱', '', 1200);
    }
    if (name === 'marketing') {
      countUp('mkt-val-0', 1847, '',  '',  1200);
      countUp('mkt-val-1', 380,  '₱', '', 1200);
      countUp('mkt-val-2', 34,   '',  '%', 1200);
    }
  }

  // ── Portfolio Carousel ────────────────────────────────────
  let currentProject = 0;
  const totalProjects = 5;
  function showProject(index) {
    document.querySelectorAll('.portfolio-slide').forEach((s, i) => s.classList.toggle('active', i === index));
    document.querySelectorAll('.portfolio-dot').forEach((d, i) => d.classList.toggle('active', i === index));
    currentProject = index;
  }
  function prevProject() { showProject((currentProject - 1 + totalProjects) % totalProjects); }
  function nextProject() { showProject((currentProject + 1) % totalProjects); }

  // Touch swipe support
  (function() {
    const el = document.getElementById('portfolio-slides');
    if (!el) return;
    let startX = 0;
    el.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    el.addEventListener('touchend', e => {
      const diff = startX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) diff > 0 ? nextProject() : prevProject();
    }, { passive: true });
  })();

  function triggerProofAnimation() {
    // Animate SVG lines and dots
    ['proof-line-0','proof-line-1','proof-line-2'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.classList.remove('animate'); void el.offsetWidth; el.classList.add('animate'); }
    });
    ['proof-dot-0','proof-dot-1','proof-dot-2'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.classList.remove('animate'); void el.offsetWidth; el.classList.add('animate'); }
    });
    // Count up numbers — now in reordered sequence: Revenue, Units, Conversations
    countUp('proof-val-0', 284000, '₱', '', 1200);
    countUp('proof-val-1', 234,    '',  '', 1200);
    countUp('proof-val-2', 847,    '',  '', 1200);
  }

  // ── Operations Visual Section ─────────────────────────────

  function switchOpsTab(name, btn) {
    // Update tab buttons
    document.querySelectorAll('.ops-tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    // Update panes
    document.querySelectorAll('.ops-pane').forEach(p => p.classList.remove('active'));
    document.getElementById('ops-pane-' + name).classList.add('active');
    // Trigger animation if operations
    if (name === 'operations') triggerOpsAnimation();
  }

  function countUp(elId, target, prefix, suffix, duration) {
    const el = document.getElementById(elId);
    if (!el) return;
    const start = performance.now();
    const isFloat = String(target).includes('.');
    function step(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      const current = Math.round(ease * target * (isFloat ? 10 : 1)) / (isFloat ? 10 : 1);
      el.textContent = prefix + current.toLocaleString('en-PH') + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function triggerOpsAnimation() {
    // Reset and re-animate SVG lines
    ['ops-line-0','ops-line-1','ops-line-2'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.classList.remove('animate'); void el.offsetWidth; el.classList.add('animate'); }
    });
    ['ops-dot-0','ops-dot-1','ops-dot-2'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.classList.remove('animate'); void el.offsetWidth; el.classList.add('animate'); }
    });
    // Count up numbers
    countUp('ops-val-0', 847,    '',  '', 1200);
    countUp('ops-val-1', 234,    '',  '', 1200);
    countUp('ops-val-2', 284000, '₱', '', 1200);
  }

</script>

</body>
