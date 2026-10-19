(function () {
  const PHONETIC_MAP = {
    'a': 'ا', 'A': 'آ',
    'b': 'ب', 'B': 'ؓ',
    'c': 'چ', 'C': 'ث',
    'd': 'د', 'D': 'ڈ',
    'e': 'ع', 'E': 'ؑ',
    'f': 'ف', 'F': 'ٖ',
    'g': 'گ', 'G': 'غ',
    'h': 'ھ', 'H': 'ح',
    'i': 'ی', 'I': 'ٰ',
    'j': 'ج', 'J': 'ض',
    'k': 'ک', 'K': 'خ',
    'l': 'ل', 'L': 'ؒ',
    'm': 'م', 'M': 'م',
    'n': 'ن', 'N': 'ں',
    'o': 'ہ', 'O': 'ۃ',
    'p': 'پ', 'P': 'ُ',
    'q': 'ق', 'Q': 'ْ',
    'r': 'ر', 'R': 'ڑ',
    's': 'س', 'S': 'ص',
    't': 'ت', 'T': 'ٹ',
    'u': 'ء', 'U': 'ئ',
    'v': 'ط', 'V': 'ظ',
    'w': 'و', 'W': 'ﷺ',
    'x': 'ش', 'X': 'ژ',
    'y': 'ے', 'Y': 'َ',
    'z': 'ز', 'Z': 'ذ',
    '.': '۔', ',': '،',
    ';': '؛', '?': '؟',
    '<': 'ِ', '>': 'َ',
    '~': 'ّ', '`': 'ٍ',
    '-': '-', '=': '='
  };

  const KB_LAYOUT = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '?']
  ];

  const editor = document.getElementById('urduEditor');
  const copyBtn = document.getElementById('copyBtn');
  const pasteBtn = document.getElementById('pasteBtn');
  const selectAllBtn = document.getElementById('selectAllBtn');
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');
  const clearBtn = document.getElementById('clearBtn');
  const fontDecBtn = document.getElementById('fontDecBtn');
  const fontIncBtn = document.getElementById('fontIncBtn');
  const modeToggleBtn = document.getElementById('modeToggleBtn');
  const toggleKbBtn = document.getElementById('toggleKbBtn');
  const toggleKbArrow = document.getElementById('toggleKbArrow');
  const keyboardSection = document.getElementById('keyboardSection');
  const keyboardRows = document.getElementById('keyboardRows');
  const statsText = document.getElementById('statsText');
  const toastBadge = document.getElementById('toastBadge');
  const pasteFallbackBox = document.getElementById('pasteFallbackBox');
  const pasteFallbackInput = document.getElementById('pasteFallbackInput');
  const pasteConfirmBtn = document.getElementById('pasteConfirmBtn');
  const pasteCancelBtn = document.getElementById('pasteCancelBtn');

  let isPhoneticUrdu = true;
  let isShiftActive = false;
  let currentFontSize = 30;
  let toastTimeout = null;
  let historyStack = [''];
  let redoStack = [];

  function pushHistory(val) {
    if (historyStack[historyStack.length - 1] !== val) {
      historyStack.push(val);
      if (historyStack.length > 50) historyStack.shift();
      redoStack = [];
    }
  }

  function showToast(msg) {
    toastBadge.textContent = msg;
    toastBadge.classList.add('visible');
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(function () {
      toastBadge.classList.remove('visible');
    }, 1800);
  }

  function saveDraft() {
    const val = editor.value;
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ savedUrduDraft: val });
      }
      localStorage.setItem('savedUrduDraft', val);
    } catch (e) {}
  }

  function loadDraft() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['savedUrduDraft'], function (res) {
          if (res && typeof res.savedUrduDraft === 'string') {
            editor.value = res.savedUrduDraft;
            historyStack = [res.savedUrduDraft];
            updateStats();
          }
        });
      } else {
        const saved = localStorage.getItem('savedUrduDraft');
        if (saved) {
          editor.value = saved;
          historyStack = [saved];
          updateStats();
        }
      }
    } catch (e) {}
  }

  function updateStats() {
    const text = editor.value.trim();
    const chars = editor.value.length;
    const words = text ? text.split(/\s+/).length : 0;
    statsText.textContent = words + ' words | ' + chars + ' chars';
    saveDraft();
  }

  function insertAtCursor(str) {
    pushHistory(editor.value);
    const start = editor.selectionStart || 0;
    const end = editor.selectionEnd || 0;
    const before = editor.value.substring(0, start);
    const after = editor.value.substring(end);
    editor.value = before + str + after;
    const nextPos = start + str.length;
    editor.setSelectionRange(nextPos, nextPos);
    editor.focus();
    pushHistory(editor.value);
    updateStats();
  }

  function setMode(urduMode) {
    isPhoneticUrdu = urduMode;
    if (isPhoneticUrdu) {
      modeToggleBtn.textContent = 'اردو';
      modeToggleBtn.classList.remove('en-mode');
    } else {
      modeToggleBtn.textContent = 'EN';
      modeToggleBtn.classList.add('en-mode');
    }
    renderKeyboard();
    editor.focus();
  }

  function renderKeyboard() {
    keyboardRows.innerHTML = '';
    KB_LAYOUT.forEach(function (rowKeys) {
      const rowEl = document.createElement('div');
      rowEl.className = 'kb-row';
      rowKeys.forEach(function (baseKey) {
        const lookupKey = isShiftActive ? baseKey.toUpperCase() : baseKey;
        const mappedChar = isPhoneticUrdu
          ? (PHONETIC_MAP[lookupKey] || PHONETIC_MAP[baseKey] || lookupKey)
          : lookupKey;

        const keyBtn = document.createElement('button');
        keyBtn.type = 'button';
        keyBtn.className = 'kb-key';
        keyBtn.innerHTML =
          '<span class="key-urdu">' + mappedChar + '</span>' +
          '<span class="key-en">' + lookupKey + '</span>';

        keyBtn.addEventListener('click', function () {
          insertAtCursor(mappedChar);
          if (isShiftActive) {
            isShiftActive = false;
            renderKeyboard();
          }
        });
        rowEl.appendChild(keyBtn);
      });
      keyboardRows.appendChild(rowEl);
    });

    const bottomRow = document.createElement('div');
    bottomRow.className = 'kb-row';

    const shiftBtn = document.createElement('button');
    shiftBtn.type = 'button';
    shiftBtn.className = 'kb-key wide' + (isShiftActive ? ' active-shift' : '');
    shiftBtn.textContent = 'Shift';
    shiftBtn.addEventListener('click', function () {
      isShiftActive = !isShiftActive;
      renderKeyboard();
    });

    const spaceKeyBtn = document.createElement('button');
    spaceKeyBtn.type = 'button';
    spaceKeyBtn.className = 'kb-key space';
    spaceKeyBtn.textContent = 'Space (وقفہ)';
    spaceKeyBtn.addEventListener('click', function () {
      insertAtCursor(' ');
    });

    const bkspBtn = document.createElement('button');
    bkspBtn.type = 'button';
    bkspBtn.className = 'kb-key wide';
    bkspBtn.textContent = '⌫ Back';
    bkspBtn.addEventListener('click', function () {
      const start = editor.selectionStart || 0;
      const end = editor.selectionEnd || 0;
      if (start !== end) {
        insertAtCursor('');
      } else if (start > 0) {
        pushHistory(editor.value);
        const before = editor.value.substring(0, start - 1);
        const after = editor.value.substring(end);
        editor.value = before + after;
        editor.setSelectionRange(start - 1, start - 1);
        editor.focus();
        pushHistory(editor.value);
        updateStats();
      }
    });

    bottomRow.appendChild(shiftBtn);
    bottomRow.appendChild(spaceKeyBtn);
    bottomRow.appendChild(bkspBtn);
    keyboardRows.appendChild(bottomRow);
  }

  editor.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'm') {
      e.preventDefault();
      setMode(!isPhoneticUrdu);
      showToast(isPhoneticUrdu ? 'Phonetic Urdu Mode' : 'English Mode');
      return;
    }

    if (e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }

    if (!isPhoneticUrdu) {
      return;
    }

    if (e.key.length === 1) {
      const mapped = PHONETIC_MAP[e.key];
      if (mapped) {
        e.preventDefault();
        insertAtCursor(mapped);
      }
    }
  });

  editor.addEventListener('input', function () {
    pushHistory(editor.value);
    updateStats();
  });

  modeToggleBtn.addEventListener('click', function () {
    setMode(!isPhoneticUrdu);
    showToast(isPhoneticUrdu ? 'Phonetic Urdu' : 'English Mode');
  });

  copyBtn.addEventListener('click', async function () {
    if (!editor.value) {
      showToast('Empty!');
      return;
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(editor.value);
        showToast('Copied!');
        return;
      }
    } catch (err) {}
    editor.select();
    document.execCommand('copy');
    showToast('Copied!');
  });

  pasteBtn.addEventListener('click', async function () {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const clipText = await navigator.clipboard.readText();
        if (clipText !== undefined) {
          insertAtCursor(clipText);
          showToast('Pasted!');
          return;
        }
      }
    } catch (err) {}
    pasteFallbackBox.classList.add('active');
    pasteFallbackInput.value = '';
    pasteFallbackInput.focus();
  });

  pasteConfirmBtn.addEventListener('click', function () {
    if (pasteFallbackInput.value) {
      insertAtCursor(pasteFallbackInput.value);
      showToast('Inserted!');
    }
    pasteFallbackBox.classList.remove('active');
  });

  pasteCancelBtn.addEventListener('click', function () {
    pasteFallbackBox.classList.remove('active');
    editor.focus();
  });

  selectAllBtn.addEventListener('click', function () {
    editor.focus();
    editor.select();
    showToast('Selected All');
  });

  undoBtn.addEventListener('click', function () {
    if (historyStack.length > 1) {
      const current = historyStack.pop();
      redoStack.push(current);
      editor.value = historyStack[historyStack.length - 1] || '';
      updateStats();
      showToast('Undo');
    }
  });

  redoBtn.addEventListener('click', function () {
    if (redoStack.length > 0) {
      const nextVal = redoStack.pop();
      historyStack.push(nextVal);
      editor.value = nextVal;
      updateStats();
      showToast('Redo');
    }
  });

  clearBtn.addEventListener('click', function () {
    pushHistory(editor.value);
    editor.value = '';
    pushHistory('');
    updateStats();
    showToast('Cleared!');
    editor.focus();
  });

  fontDecBtn.addEventListener('click', function () {
    currentFontSize = Math.max(18, currentFontSize - 3);
    editor.style.fontSize = currentFontSize + 'px';
  });

  fontIncBtn.addEventListener('click', function () {
    currentFontSize = Math.min(48, currentFontSize + 3);
    editor.style.fontSize = currentFontSize + 'px';
  });

  toggleKbBtn.addEventListener('click', function () {
    const isExpanded = keyboardSection.classList.toggle('expanded');
    toggleKbBtn.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
    toggleKbArrow.textContent = isExpanded ? '▴' : '▾';
  });

  renderKeyboard();
  loadDraft();
  editor.focus();
})();
