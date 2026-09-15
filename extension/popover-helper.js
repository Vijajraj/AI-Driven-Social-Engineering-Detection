// extension/popover-helper.js

window.SEDetectorPopover = {
  activePopoverHost: null,

  showPopover(rect, response, selectedText) {
    this.removePopover();

    const host = document.createElement('div');
    host.id = 'se-detector-popover-host';
    host.style.position = 'fixed';
    host.style.zIndex = '999999';
    host.style.top = `${Math.max(10, rect.bottom + 8)}px`;
    host.style.left = `${Math.max(10, Math.min(window.innerWidth - 340, rect.left))}px`;

    const shadow = host.attachShadow({ mode: 'open' });

    const styles = `
      :host {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .card {
        width: 320px;
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
        border-bottom: 1px solid #1e293b;
      }
      .title {
        font-size: 13px;
        font-weight: 700;
        color: #60a5fa;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .close-btn {
        background: none;
        border: none;
        color: #94a3b8;
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
      .badge-phishing { background: rgba(239, 68, 68, 0.2); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.4); }
      .badge-benign { background: rgba(16, 185, 129, 0.2); color: #6ee7b7; border: 1px solid rgba(16, 185, 129, 0.4); }
      .badge-impersonation { background: rgba(168, 85, 247, 0.2); color: #e9d5ff; border: 1px solid rgba(168, 85, 247, 0.4); }
      .badge-urgency_manipulation { background: rgba(245, 158, 11, 0.2); color: #fde68a; border: 1px solid rgba(245, 158, 11, 0.4); }
      .badge-baiting { background: rgba(234, 179, 8, 0.2); color: #fef08a; border: 1px solid rgba(234, 179, 8, 0.4); }
      .badge-pretexting { background: rgba(59, 130, 246, 0.2); color: #bfdbfe; border: 1px solid rgba(59, 130, 246, 0.4); }
      
      .score {
        font-size: 12px;
        font-weight: 700;
      }
      .score-high { color: #f87171; }
      .score-medium { color: #fbbf24; }
      .score-low { color: #34d399; }
      
      .reasoning {
        font-size: 12px;
        line-height: 1.5;
        color: #e2e8f0;
        font-style: italic;
        background: #1e293b;
        padding: 8px 10px;
        border-radius: 8px;
        border-left: 3px solid #3b82f6;
        margin-bottom: 8px;
      }
      .rate-limit-card {
        background: rgba(245, 158, 11, 0.15);
        border: 1px solid rgba(245, 158, 11, 0.4);
        color: #fef3c7;
        font-size: 12px;
        padding: 10px;
        border-radius: 8px;
      }
      .footer {
        font-size: 10px;
        color: #64748b;
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
