// extension/content-whatsapp.js

let activeFloatingBtn = null;

// Guard: check if extension context is still valid before using chrome.runtime
function isContextValid() {
  try {
    return !!(chrome && chrome.runtime && chrome.runtime.id);
  } catch {
    return false;
  }
}

document.addEventListener('mouseup', () => {
  if (!isContextValid()) return; // silently stop if extension was reloaded
  setTimeout(handleSelectionChange, 250);
});

function handleSelectionChange() {
  if (!isContextValid()) return;

  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) {
    removeFloatingButton();
    return;
  }

  const selectedText = selection.toString().trim();
  if (selectedText.length < 5) {
    removeFloatingButton();
    return;
  }

  const range = selection.getRangeAt(0);
  const containerNode = range.commonAncestorContainer;
  const parentEl = containerNode.nodeType === 1 ? containerNode : containerNode.parentElement;

  // Broadened WhatsApp Web selectors — covers older and newer DOM structures
  const isWhatsApp = parentEl.closest([
    'div.copyable-text',
    'span.selectable-text',
    'div[role="textbox"]',
    'div[data-pre-plain-text]',
    'div.message-in',
    'div.message-out',
    '[data-testid="msg-container"]',
    '[data-testid="conversation-panel-messages"]',
    'div._akbu',
    'div._ao3e',
  ].join(', '));

  // If no matching container, still allow if we're somewhere inside the chat panel
  const inChatPanel = parentEl.closest(
    '#main, div[tabindex="-1"][role="application"], div[data-tab]'
  );

  if (!isWhatsApp && !inChatPanel) {
    return;
  }

  const rect = range.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return;

  createFloatingButton(rect, selectedText, 'whatsapp');
}

function createFloatingButton(rect, text, source) {
  removeFloatingButton();

  const btn = document.createElement('div');
  btn.className = 'se-floating-btn';
  btn.innerHTML = '<span>🔍 Check</span>';

  const top = Math.max(10, rect.top - 40);
  const left = Math.max(10, Math.min(window.innerWidth - 130, rect.left + rect.width / 2 - 45));
  btn.style.top = `${top}px`;
  btn.style.left = `${left}px`;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();

    if (!isContextValid()) {
      removeFloatingButton();
      if (window.SEDetectorPopover) {
        window.SEDetectorPopover.showPopover(rect, { type: 'ERROR', message: 'Extension was updated. Please refresh this page (F5).' }, text);
      }
      return;
    }

    btn.classList.add('loading');
    btn.innerHTML = '<span>⏳ Inspecting...</span>';

    try {
      chrome.runtime.sendMessage(
        { type: 'ANALYZE', text, source },
        (response) => {
          removeFloatingButton();
          if (chrome.runtime.lastError) {
            console.warn('[SE Detector] sendMessage error:', chrome.runtime.lastError.message);
            if (window.SEDetectorPopover) {
              window.SEDetectorPopover.showPopover(rect, { type: 'ERROR', message: 'Extension reloaded. Please refresh the page (F5).' }, text);
            }
            return;
          }
          if (window.SEDetectorPopover) {
            window.SEDetectorPopover.showPopover(rect, response || { type: 'ERROR' }, text);
          }
        }
      );
    } catch (err) {
      removeFloatingButton();
      console.warn('[SE Detector] Extension context invalidated.');
      if (window.SEDetectorPopover) {
        window.SEDetectorPopover.showPopover(rect, { type: 'ERROR', message: 'Extension was updated. Please refresh this page (F5).' }, text);
      }
    }
  });

  document.body.appendChild(btn);
  activeFloatingBtn = btn;
}

function removeFloatingButton() {
  if (activeFloatingBtn) {
    activeFloatingBtn.remove();
    activeFloatingBtn = null;
  }
}

// Dismiss on scroll
window.addEventListener('scroll', removeFloatingButton, { passive: true });

// Background context menu trigger
if (isContextValid()) {
  try {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'SE_DETECTOR_RESULT') {
        const selection = window.getSelection();
        let rect = { top: 100, left: 100, bottom: 120, width: 200 };
        if (selection && !selection.isCollapsed) {
          rect = selection.getRangeAt(0).getBoundingClientRect();
        }
        if (window.SEDetectorPopover) {
          window.SEDetectorPopover.showPopover(rect, message.result, message.text);
        }
      }
    });
  } catch (err) {
    console.warn('[SE Detector] Could not register message listener:', err.message);
  }
}
