// extension/content-gmail.js

let activeFloatingBtn = null;

// Guard: check if extension context is still valid before using chrome.runtime
function isContextValid() {
  try {
    return !!(chrome && chrome.runtime && chrome.runtime.id);
  } catch {
    return false;
  }
}

document.addEventListener('mouseup', (e) => {
  if (!isContextValid()) return;
  setTimeout(handleSelectionChange, 200);
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

  // Ensure selection is inside Gmail email message body or compose box
  const range = selection.getRangeAt(0);
  const containerNode = range.commonAncestorContainer;
  const parentEl = containerNode.nodeType === 1 ? containerNode : containerNode.parentElement;

  const isGmailMessage = parentEl.closest('div.a3s, div[role="textbox"], .ii.gt');
  if (!isGmailMessage) {
    return;
  }

  const rect = range.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return;

  createFloatingButton(rect, selectedText, 'email');
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
        { type: 'ANALYZE', text: text, source: source },
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

// Listen for messages from background context menus
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
