// extension/popover-helper.js

window.SEDetectorPopover = {
  activePopoverHost: null,

  showPopover(rect, response, selectedText) {
    this.removePopover();

    const host = document.createElement('div');
    host.id = 'se-detector-popover-host';
    host.style.position = 'fixed';
    host.style.zIndex = '999999';
    // Temporarily place off-screen to measure height
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
      }
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
          ${response.message || 'Failed to inspect message. Ensure backend is running at http://localhost:8000.'}
        </div>
      `;
    }

    shadow.appendChild(card);
    document.body.appendChild(host);
    this.activePopoverHost = host;

    // Measure actual height and decide placement (above or below selection)
    const cardRect = host.getBoundingClientRect();
    const popoverHeight = cardRect.height;
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;

    let topPos;
    if (spaceBelow >= popoverHeight) {
      // Enough room below — place below selection
      topPos = rect.bottom + 8;
    } else if (spaceAbove >= popoverHeight) {
      // Enough room above — flip above selection
      topPos = rect.top - popoverHeight - 8;
    } else {
      // Not enough room either way — clamp to bottom of viewport
      topPos = Math.max(10, window.innerHeight - popoverHeight - 10);
    }

    host.style.top = `${Math.max(10, topPos)}px`;
    host.style.visibility = 'visible';

    // Attach close listener
    shadow.getElementById('close-popover')?.addEventListener('click', () => {
      this.removePopover();
    });

    // Dismiss on click outside
    setTimeout(() => {
      const dismissHandler = (e) => {
        if (this.activePopoverHost && !this.activePopoverHost.contains(e.target)) {
          this.removePopover();
          document.removeEventListener('click', dismissHandler);
        }
      };
      document.addEventListener('click', dismissHandler);
    }, 100);
  },

  removePopover() {
    if (this.activePopoverHost) {
      this.activePopoverHost.remove();
      this.activePopoverHost = null;
    }
  },
};
