// extension/content-whatsapp.js

let activeFloatingBtn = null;

document.addEventListener('mouseup', (e) => {
  setTimeout(handleSelectionChange, 200);
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

  // Ensure selection is inside WhatsApp message bubbles / text spans
  const range = selection.getRangeAt(0);
  const containerNode = range.commonAncestorContainer;
  const parentEl = containerNode.nodeType === 1 ? containerNode : containerNode.parentElement;

  const isWhatsAppMessage = parentEl.closest('div.copyable-text, span.selectable-text, div[role="textbox"]');
  if (!isWhatsAppMessage) {
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

  btn.style.top = `${Math.max(10, rect.top - 36)}px`;
  btn.style.left = `${Math.max(10, rect.left + rect.width / 2 - 40)}px`;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();

    btn.classList.add('loading');
    btn.innerHTML = '<span>⏳ Inspecting...</span>';

    chrome.runtime.sendMessage(
      { type: 'ANALYZE', text: text, source: source },
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

// Listen for background context menu trigger
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
