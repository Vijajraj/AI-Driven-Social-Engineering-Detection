// extension/content-whatsapp.js

let activeFloatingBtn = null;

document.addEventListener('mouseup', () => {
  setTimeout(handleSelectionChange, 250);
});

function handleSelectionChange() {
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
    'div._akbu',   // WhatsApp message bubble class (structural, relatively stable)
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

    btn.classList.add('loading');
    btn.innerHTML = '<span>⏳ Inspecting...</span>';

    chrome.runtime.sendMessage(
      { type: 'ANALYZE', text, source },
      (response) => {
        removeFloatingButton();
        if (window.SEDetectorPopover) {
          window.SEDetectorPopover.showPopover(rect, response || { type: 'ERROR' }, text);
        }
      }
    );
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
