// extension/content-instagram.js

let activeFloatingBtn = null;

// Selection listener
document.addEventListener('mouseup', () => {
  setTimeout(handleSelectionChange, 250);
});

// Dismiss on scroll
window.addEventListener('scroll', removeFloatingButton, { passive: true });

// MutationObserver for Instagram SPA navigation — re-attaches after each navigation
const observer = new MutationObserver(() => {
  const selection = window.getSelection();
  if (selection && !selection.isCollapsed && selection.toString().trim().length >= 5) {
    handleSelectionChange();
  }
});
observer.observe(document.body, { childList: true, subtree: true });

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

  // DM thread selectors (stable attributes, not generated class names)
  const isDM = parentEl.closest([
    'div[role="row"]',
    'div[role="textbox"]',
    'div[aria-label="Direct"]',
    // Structural DM message container
    'div[class*="DirectThread"]',
    'div[data-scope="messages_table"]',
  ].join(', '));

  // Post/Reel comment selectors
  const isComment = parentEl.closest([
    'ul > div > li',
    'article',
    'div[role="article"]',
    'div[class*="Comment"]',
    // Stable attribute on comment container
    'div[aria-label*="comment" i]',
  ].join(', '));

  // Fallback: any text selected anywhere inside the Instagram SPA shell
  const inInstagramShell = parentEl.closest('section main, div#react-root, div[id="mount_0_0_"]');

  if (!isDM && !isComment && !inInstagramShell) {
    return;
  }

  const sourceTag = isDM ? 'instagram_dm' : 'instagram_comment';

  const rect = range.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return;

  createFloatingButton(rect, selectedText, sourceTag);
}

function createFloatingButton(rect, text, sourceTag) {
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
      { type: 'ANALYZE', text, source: sourceTag },
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
