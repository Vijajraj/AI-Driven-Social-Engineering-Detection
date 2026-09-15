// extension/background.js

const API_BASE_URL = 'https://ai-driven-social-engineering-detection.onrender.com';

// Register context menu item on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'se-detector-check',
    title: '🔍 Check with SE Detector',
    contexts: ['selection'],
  });
});

// Context menu click listener
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'se-detector-check' && info.selectionText) {
    const text = info.selectionText.trim();
    if (text.length >= 5) {
      const response = await handleAnalyze(text, 'other');
      // Send result back to active tab content script to display popover
      if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'SE_DETECTOR_RESULT',
          text: text,
          result: response,
        });
      }
    }
  }
});

// Runtime message listener for content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ANALYZE') {
    handleAnalyze(message.text, message.source || 'other')
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ error: true, message: err.message }));
    return true; // Async response
  }

  if (message.type === 'GET_RECENT') {
    chrome.storage.session.get(['recent_checks', 'rate_limit_until'], (data) => {
      sendResponse({
        recent: data.recent_checks || [],
        rateLimitUntil: data.rate_limit_until || 0,
      });
    });
    return true;
  }
});

async function handleAnalyze(text, source) {
  // Check if rate limited in session storage
  try {
    const sessionData = await chrome.storage.session.get(['rate_limit_until']);
    const rateLimitUntil = sessionData.rate_limit_until || 0;
    const now = Date.now();

    if (rateLimitUntil > now) {
      const retryAfterSeconds = Math.ceil((rateLimitUntil - now) / 1000);
      return {
        type: 'RATE_LIMITED',
        error: 'rate_limited',
        message: 'Analysis limit reached (7 checks). Try again later.',
        retryAfterSeconds,
      };
    }
  } catch (e) {
    console.warn('Session storage read failed:', e);
  }

  try {
    const res = await fetch(`${API_BASE_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, source }),
    });

    if (res.status === 429) {
      const errData = await res.json();
      const retryAfterSeconds = errData.detail?.retry_after_seconds || 25200;
      const rateLimitUntil = Date.now() + retryAfterSeconds * 1000;

      await chrome.storage.session.set({ rate_limit_until: rateLimitUntil });

      return {
        type: 'RATE_LIMITED',
        error: 'rate_limited',
        message: errData.detail?.message || 'Analysis limit reached. Try again later.',
        retryAfterSeconds,
      };
    }

    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }

    const data = await res.json();

    // Cache recent 5 checks in chrome.storage.session
    try {
      const sessionData = await chrome.storage.session.get(['recent_checks']);
      const recent = sessionData.recent_checks || [];
      const updated = [
        {
          id: data.analysis_id || Date.now().toString(),
          text: text.substring(0, 80) + (text.length > 80 ? '...' : ''),
          label: data.label,
          confidence: data.confidence,
          risk_score: data.risk_score,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        ...recent.slice(0, 4),
      ];
      await chrome.storage.session.set({ recent_checks: updated });
    } catch (e) {
      console.warn('Failed to cache recent check:', e);
    }

    return { type: 'SUCCESS', data };
  } catch (err) {
    return { type: 'ERROR', message: err.message };
  }
}
