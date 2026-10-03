// extension/popover-helper.js

window.SEDetectorPopover = {
  activePopoverHost: null,
  _cleanup: null,

  showPopover(rect, response, selectedText) {
    this.removePopover();

    const host = document.createElement('div');
    host.id = 'se-detector-popover-host';
    host.style.position = 'fixed';
    host.style.zIndex = '2147483647'; // Max z-index to stay above WhatsApp overlays
    host.style.visibility = 'hidden';
    host.style.top = '0px';
    host.style.left = `${Math.max(10, Math.min(window.innerWidth - 340, rect.left))}px`;

    const shadow = host.attachShadow({ mode: 'open' });

    const styles = `
      :host {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .card {
        width: 320px;
        max-height: calc(100vh - 40px);
        overflow-y: auto;
        background: #0f172a;
        color: #f8fafc;
        border: 1px solid #334155;
        border-radius: 12px;
        padding: 14px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
        position: relative;
      }
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
        padding-bottom: 8px;
        border-bottom: 1px solid #27272a;
        cursor: grab;
        user-select: none;
      }
      .header:active { cursor: grabbing; }
      .title {
        font-size: 12px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #ffffff;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .close-btn {
        background: none;
        border: none;
        color: #71717a;
        font-size: 16px;
        cursor: pointer;
        padding: 0 4px;
        line-height: 1;
      }
      .close-btn:hover { color: #ffffff; }
      .badge-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
      }
      .badge {
        font-size: 11px;
        font-weight: 700;
        padding: 3px 8px;
        border-radius: 12px;
        text-transform: capitalize;
      }
      .badge-phishing { background: #ffffff; color: #09090b; border: 1px solid #ffffff; font-weight: 800; }
      .badge-benign { background: #18181b; color: #a1a1aa; border: 1px solid #27272a; }
      .badge-impersonation { background: #27272a; color: #f4f4f5; border: 1px solid #3f3f46; }
      .badge-urgency_manipulation { background: #27272a; color: #f4f4f5; border: 1px solid #3f3f46; }
      .badge-baiting { background: #27272a; color: #f4f4f5; border: 1px solid #3f3f46; }
      .badge-pretexting { background: #27272a; color: #f4f4f5; border: 1px solid #3f3f46; }
      
      .score {
        font-size: 12px;
        font-weight: 700;
        font-family: monospace;
      }
      .score-high { color: #ffffff; font-weight: 800; }
      .score-medium { color: #d4d4d8; }
      .score-low { color: #71717a; }
      
      .reasoning {
        font-size: 12px;
        line-height: 1.5;
        color: #d4d4d8;
        font-style: italic;
        background: #18181b;
        padding: 8px 10px;
        border-radius: 8px;
        border-left: 2px solid #ffffff;
        margin-bottom: 8px;
        max-height: 200px;
        overflow-y: auto;
      }
      .rate-limit-card {
        background: #18181b;
        border: 1px solid #3f3f46;
        color: #e4e4e7;
        font-size: 12px;
        padding: 10px;
        border-radius: 8px;
      }
      .footer {
        font-size: 9px;
        font-family: monospace;
        color: #52525b;
        text-align: right;
      }
    `;

    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    shadow.appendChild(styleEl);

    const card = document.createElement('div');
    card.className = 'card';

    if (response.type === 'RATE_LIMITED') {
      const targetTime = new Date(Date.now() + (response.retryAfterSeconds || 25200) * 1000).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });

      card.innerHTML = `
        <div class="header">
          <div class="title">⚠️ Rate Limit Reached</div>
          <button class="close-btn" id="close-popover">✕</button>
        </div>
        <div class="rate-limit-card">
          Analysis limit reached (20 checks per hour). Try again at <strong>${targetTime}</strong>.
        </div>
      `;
    } else if (response.type === 'SUCCESS' && response.data) {
      const d = response.data;
      const riskScore = d.risk_score || 0;
      const scoreClass = riskScore >= 70 ? 'score-high' : riskScore >= 40 ? 'score-medium' : 'score-low';
      const badgeClass = `badge-${d.label || 'benign'}`;
      const labelText = (d.label || 'unknown').replace('_', ' ');

      card.innerHTML = `
        <div class="header">
          <div class="title">🛡️ SE Threat Analysis</div>
          <button class="close-btn" id="close-popover">✕</button>
        </div>
        <div class="badge-row">
          <span class="badge ${badgeClass}">${labelText}</span>
          <span class="score ${scoreClass}">Risk: ${riskScore}/100</span>
        </div>
        <div class="reasoning">"${d.llm_reasoning || 'No explanation available.'}"</div>
        <div class="footer">Social Engineering Detector Security Platform</div>
      `;
    } else {
      card.innerHTML = `
        <div class="header">
          <div class="title">❌ Analysis Error</div>
          <button class="close-btn" id="close-popover">✕</button>
        </div>
        <div style="font-size: 12px; color: #f87171;">
          ${response.message || 'Failed to inspect message. Ensure backend is running.'}
        </div>
      `;
    }

    shadow.appendChild(card);
    document.body.appendChild(host);
    this.activePopoverHost = host;

    // --- Smart positioning: measure then place above or below ---
    const cardRect = host.getBoundingClientRect();
    const popoverHeight = cardRect.height;
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;

    let topPos;
    if (spaceBelow >= popoverHeight) {
      topPos = rect.bottom + 8;
    } else if (spaceAbove >= popoverHeight) {
      topPos = rect.top - popoverHeight - 8;
    } else {
      topPos = Math.max(10, window.innerHeight - popoverHeight - 10);
    }

    host.style.top = `${Math.max(10, topPos)}px`;
    host.style.visibility = 'visible';

    // --- Close button ---
    shadow.getElementById('close-popover')?.addEventListener('click', () => {
      this.removePopover();
    });

    // --- Drag-to-move (capture phase on window to bypass WhatsApp/IG event interception) ---
    const headerEl = shadow.querySelector('.header');
    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    const onMouseDown = (e) => {
      // Only start drag from the header, not from the close button
      const path = e.composedPath();
      if (!path.includes(headerEl)) return;
      // Don't drag if clicking the close button
      for (const el of path) {
        if (el.classList && el.classList.contains('close-btn')) return;
      }
      isDragging = true;
      offsetX = e.clientX - host.getBoundingClientRect().left;
      offsetY = e.clientY - host.getBoundingClientRect().top;
      e.preventDefault();
      e.stopPropagation();
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      e.preventDefault();
      e.stopPropagation();
      const newLeft = Math.max(0, Math.min(window.innerWidth - 340, e.clientX - offsetX));
      const newTop = Math.max(0, Math.min(window.innerHeight - 50, e.clientY - offsetY));
      host.style.left = `${newLeft}px`;
      host.style.top = `${newTop}px`;
    };

    const onMouseUp = (e) => {
      if (!isDragging) return;
      isDragging = false;
      e.stopPropagation();
    };

    // Use capture phase (3rd arg = true) so our handlers fire BEFORE WhatsApp's
    window.addEventListener('mousedown', onMouseDown, true);
    window.addEventListener('mousemove', onMouseMove, true);
    window.addEventListener('mouseup', onMouseUp, true);

    // --- Dismiss on click outside (but not during drag) ---
    const dismissHandler = (e) => {
      if (isDragging) return;
      if (this.activePopoverHost && !this.activePopoverHost.contains(e.target)) {
        this.removePopover();
        window.removeEventListener('click', dismissHandler, true);
      }
    };
    setTimeout(() => {
      window.addEventListener('click', dismissHandler, true);
    }, 300);

    // Store cleanup function
    this._cleanup = () => {
      window.removeEventListener('mousedown', onMouseDown, true);
      window.removeEventListener('mousemove', onMouseMove, true);
      window.removeEventListener('mouseup', onMouseUp, true);
      window.removeEventListener('click', dismissHandler, true);
    };
  },

  removePopover() {
    if (this._cleanup) {
      this._cleanup();
      this._cleanup = null;
    }
    if (this.activePopoverHost) {
      this.activePopoverHost.remove();
      this.activePopoverHost = null;
    }
  },
};
