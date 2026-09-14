// extension/popup.js

document.addEventListener('DOMContentLoaded', () => {
  const inputText = document.getElementById('input-text');
  const sourceSelect = document.getElementById('source-select');
  const analyzeBtn = document.getElementById('analyze-btn');
  const resultCard = document.getElementById('result-card');
  const resultLabel = document.getElementById('result-label');
  const resultScore = document.getElementById('result-score');
  const resultReasoning = document.getElementById('result-reasoning');
  const rateLimitBanner = document.getElementById('rate-limit-banner');
  const rateLimitTime = document.getElementById('rate-limit-time');
  const recentList = document.getElementById('recent-list');

  // Load recent checks and rate limit status
  chrome.runtime.sendMessage({ type: 'GET_RECENT' }, (res) => {
    if (res) {
      renderRecentList(res.recent || []);
      if (res.rateLimitUntil && res.rateLimitUntil > Date.now()) {
        showRateLimitBanner(res.rateLimitUntil);
      }
    }
  });

  analyzeBtn.addEventListener('click', async () => {
    const text = inputText.value.trim();
    if (!text || text.length < 5) return;

    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<span>⏳ Inspecting...</span>';
    resultCard.classList.add('hidden');

    chrome.runtime.sendMessage(
      { type: 'ANALYZE', text: text, source: sourceSelect.value },
      (response) => {
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = '<span>🔍 Analyze Message</span>';

        if (response && response.type === 'RATE_LIMITED') {
          const targetTime = new Date(Date.now() + (response.retryAfterSeconds || 25200) * 1000).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });
          rateLimitTime.textContent = targetTime;
          rateLimitBanner.classList.remove('hidden');
          analyzeBtn.disabled = true;
          return;
        }

        if (response && response.type === 'SUCCESS' && response.data) {
          const data = response.data;
          resultLabel.textContent = (data.label || 'unknown').replace('_', ' ');
          resultScore.textContent = `Risk: ${data.risk_score || 0}/100`;
          resultReasoning.textContent = `"${data.llm_reasoning || 'No explanation.'}"`;
          resultCard.classList.remove('hidden');

          // Refresh recent checks list
          chrome.runtime.sendMessage({ type: 'GET_RECENT' }, (res) => {
            if (res) renderRecentList(res.recent || []);
          });
        } else {
          alert(response?.message || 'Failed to inspect message. Ensure backend server is running.');
        }
      }
    );
  });

  function showRateLimitBanner(untilTimestamp) {
    const targetTime = new Date(untilTimestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    rateLimitTime.textContent = targetTime;
    rateLimitBanner.classList.remove('hidden');
    analyzeBtn.disabled = true;
  }

  function renderRecentList(items) {
    if (!items || items.length === 0) {
      recentList.innerHTML = '<div class="empty-state">No recent checks in this session.</div>';
      return;
    }

    recentList.innerHTML = items
      .map(
        (item) => `
      <div class="recent-item">
        <span class="recent-text" title="${item.text}">${item.text}</span>
        <span class="recent-badge">${(item.label || '').replace('_', ' ')} (${item.risk_score}/100)</span>
      </div>
    `
      )
      .join('');
  }
});
