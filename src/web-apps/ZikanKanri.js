export default `<!DOCTYPE html>
<html lang="ja">

<head>

<script>
(function() {
  // 1. 未キャッチのエラーをReactNativeに通知、およびconsole.errorに出力
  window.onerror = function(message, source, lineno, colno, error) {
    const errorMsg = "[JS Error] " + message + " at " + source + ":" + lineno + ":" + colno;
    console.error(errorMsg);
    try {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'WEB_ERROR',
          message: errorMsg
        }));
      }
    } catch (e) {}
    return false;
  };

  // 2. Service Worker登録の無効化（エラー防止）
  if ('serviceWorker' in navigator) {
    Object.defineProperty(navigator, 'serviceWorker', {
      get: function() { return undefined; },
      configurable: true
    });
  }

  // 3. Android WebViewのセキュリティ制限対策：localStorageをインメモリのモック（ポリフィル）に差し替え
  const storageStore = {};
  try {
    const initData = window.__INITIAL_WEBVIEW_DATA__;
    if (initData) {
      for (const key in initData) {
        if (initData.hasOwnProperty(key)) {
          storageStore[key] = initData[key];
        }
      }
    }
  } catch (e) {
    console.error("Failed to copy from __INITIAL_WEBVIEW_DATA__", e);
  }

  const mockLocalStorage = {
    getItem: function(key) {
      return storageStore.hasOwnProperty(key) ? storageStore[key] : null;
    },
    setItem: function(key, value) {
      storageStore[key] = String(value);
      if (window.isInitialSync) return;
      try {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'LOCAL_STORAGE_SET',
            key: key,
            value: String(value)
          }));
        }
      } catch (e) {
        console.error("Failed to post setItem message", e);
      }
    },
    removeItem: function(key) {
      delete storageStore[key];
      if (window.isInitialSync) return;
      try {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'LOCAL_STORAGE_REMOVE',
            key: key
          }));
        }
      } catch (e) {
        console.error("Failed to post removeItem message", e);
      }
    },
    clear: function() {
      for (const key in storageStore) {
        delete storageStore[key];
      }
      if (window.isInitialSync) return;
      try {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'LOCAL_STORAGE_CLEAR'
          }));
        }
      } catch (e) {
        console.error("Failed to post clear message", e);
      }
    },
    key: function(index) {
      const keys = Object.keys(storageStore);
      return keys[index] || null;
    },
    get length() {
      return Object.keys(storageStore).length;
    }
  };

  // window.localStorageをモックで上書き
  try {
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true
    });
  } catch (e) {
    console.error("Failed to override window.localStorage", e);
  }
})();
</script>

    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>時間内訳管理</title>
    <meta name="theme-color" content="#121212">
    <style>
:root {
  --bg-color: #121212;
  --surface-color: #1E1E1E;
  --primary-color: #BB86FC;
  --primary-variant: #3700B3;
  --secondary-color: #03DAC6;
  --text-primary: #FFFFFF;
  --text-secondary: #B0B0B0;
  --error-color: #CF6679;
  --border-radius: 12px;
  --spacing-unit: 8px;
  --font-family: 'Inter', system-ui, -apple-system, sans-serif;
  --box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-family);
  background-color: var(--bg-color);
  color: var(--text-primary);
  line-height: 1.6;
  padding: 0;
  margin: 0;
  -webkit-font-smoothing: antialiased;
}

/* Typography */
h1,
h2,
h3 {
  font-weight: 600;
  margin-bottom: var(--spacing-unit);
}

h1 {
  font-size: 1.5rem;
  text-align: center;
  padding: 16px;
}

/* Layout */
.container {
  max-width: 600px;
  margin: 0 auto;
  padding: 16px;
  padding-bottom: 80px;
  /* Space for FAB or footer */
}

/* Cards */
.card {
  background-color: var(--surface-color);
  border-radius: var(--border-radius);
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: var(--box-shadow);
  transition: transform 0.2s ease;
}

.card:active {
  transform: scale(0.99);
}

/* Forms & Inputs */
input,
select,
textarea {
  width: 100%;
  padding: 12px;
  margin-bottom: 12px;
  background-color: #2C2C2C;
  border: 1px solid #333;
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 1rem;
  color-scheme: dark;
}

input:focus,
select:focus {
  outline: 2px solid var(--primary-color);
  border-color: transparent;
}

label {
  display: block;
  color: var(--text-secondary);
  font-size: 0.85rem;
  margin-bottom: 4px;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-primary {
  background-color: var(--primary-color);
  color: #000;
}

.btn-secondary {
  background-color: transparent;
  border: 1px solid var(--primary-color);
  color: var(--primary-color);
}

.btn:active {
  opacity: 0.8;
}

/* Utility Classes */
.flex-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.justify-between {
  justify-content: space-between;
}

.hidden {
  display: none !important;
}

/* List Items */
.log-item {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #333;
}

.log-item:last-child {
  border-bottom: none;
}

.time-badge {
  background-color: #333;
  padding: 4px 8px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.9rem;
}

/* Sliders for Weight */
.slider-container {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

/* Tags */
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.tag-chip {
  background-color: #2C2C2C;
  border: 1px solid #444;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 0.9rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.tag-chip.selected {
  background-color: var(--primary-color);
  color: #000;
  border-color: var(--primary-color);
}

.tag-chip .delete-btn {
  color: var(--text-secondary);
  font-weight: bold;
  font-size: 1.1rem;
  padding: 0 2px;
  line-height: 1;
  transition: color 0.2s;
}

.tag-chip .delete-btn:hover {
  color: var(--error-color);
}

.no-margin {
  margin-bottom: 0 !important;
}

/* Pie Chart */
.pie-chart-container {
  display: flex;
  justify-content: center;
  margin: 20px 0;
}

.pie-chart {
  width: 100%;
  max-width: 300px;
  position: relative;
}

/* Modal Overlay */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s ease, visibility 0.3s ease;
}

.modal-overlay.active {
  opacity: 1;
  visibility: visible;
}

.modal-content {
  background-color: var(--surface-color);
  border-radius: var(--border-radius);
  width: 90%;
  max-width: 400px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
  transform: scale(0.9);
  transition: transform 0.3s ease;
}

.modal-overlay.active .modal-content {
  transform: scale(1);
}

.modal-header {
  padding: 16px;
  border-bottom: 1px solid #333;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.2rem;
  color: var(--text-primary);
}

.modal-body {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  padding: 12px 16px;
  border-top: 1px solid #333;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.edit-tag-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
  max-height: 200px;
  overflow-y: auto;
}

.edit-tag-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.05);
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #333;
}

.edit-tag-name {
  font-size: 0.95rem;
  color: var(--text-primary);
}

.edit-tag-delete-btn {
  background: none;
  border: none;
  color: var(--error-color);
  font-size: 1.3rem;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.edit-tag-delete-btn:hover {
  opacity: 0.8;
}
</style>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Noto+Sans+JP:wght@400;500;700&display=swap"
        rel="stylesheet">
    
</head>

<body>
    <header>
        <h1>Daily Tracker</h1>
        <div style="text-align: center; margin-bottom: 16px;">
            <input type="date" id="current-date"
                style="width: auto; padding: 8px; font-size: 1rem; color-scheme: dark;">
        </div>
    </header>

    <div class="container">
        <!-- Input Section -->
        <section class="card" id="input-section">
            <div class="flex-row justify-between" style="margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                <h2>新しい活動</h2>
                <div class="flex-row" style="gap: 8px; flex-wrap: wrap;">
                    <button id="toggle-continuous" class="btn btn-secondary"
                        style="width: auto; padding: 6px 12px; font-size: 0.8rem;">
                        連続記録モード: <span id="continuous-status">OFF</span>
                    </button>
                    <button id="toggle-simultaneous" class="btn btn-secondary"
                        style="width: auto; padding: 6px 12px; font-size: 0.8rem;">
                        同時進行モード: <span id="simultaneous-status">OFF</span>
                    </button>
                </div>
            </div>

            <!-- Single Mode Input -->
            <div id="single-mode-inputs">
                <label>活動内容</label>

                <!-- Toggle between Manual and List -->
                <div class="tags" id="quick-list">
                    <!-- Javascript will populate this -->
                </div>

                <input type="hidden" id="activity-name">
            </div>

            <!-- Simultaneous Mode Inputs (Hidden by default) -->
            <div id="simultaneous-mode-inputs" class="hidden">
                <label>同時進行する活動を追加</label>
                <div id="simultaneous-list">
                    <!-- Javascript will add rows here -->
                    <div class="simultaneous-row flex-row">
                        <input type="text" placeholder="活動A" class="sim-name">
                        <input type="number" placeholder="%" class="sim-percent" value="50">
                    </div>
                    <div class="simultaneous-row flex-row">
                        <input type="text" placeholder="活動B" class="sim-name">
                        <input type="number" placeholder="%" class="sim-percent" value="50">
                    </div>
                </div>
                <button id="add-simultaneous-row" class="btn btn-secondary" style="margin-top: 8px;">+ 活動を追加</button>
            </div>

            <!-- Memo Input -->
            <div style="margin-top: 16px;">
                <label for="activity-memo">メモ（詳細）</label>
                <input type="text" id="activity-memo" placeholder="例: 資料作成、会議、散歩など（省略可）" style="margin-bottom: 0;">
            </div>

            <!-- Time Input -->
            <div style="margin-top: 16px;">
                <label>時間</label>
                <div class="flex-row">
                    <input type="time" id="start-time">
                    <span>~</span>
                    <input type="time" id="end-time">
                </div>
                <div class="flex-row" style="margin-top:8px;">
                    <button class="btn btn-secondary" id="set-now-start">現在時刻を開始に</button>
                    <button class="btn btn-secondary" id="set-now-end">現在時刻を終了に</button>
                </div>
            </div>

            <button id="save-btn" class="btn btn-primary" style="margin-top: 24px;">記録する</button>
        </section>

        <!-- Templates Section -->
        <section class="card">
            <div class="flex-row justify-between">
                <h3>テンプレート</h3>
                <button id="save-template-btn" class="btn btn-secondary"
                    style="width:auto; font-size: 0.8rem;">今日の記録を保存</button>
            </div>
            <div id="template-list" class="tags">
                <!-- Javascript will populate -->
            </div>
        </section>

        <!-- Log List -->
        <section class="card">
            <h3>今日の記録</h3>
            <div id="log-list">
                <!-- Javascript will populate this -->
                <div style="text-align:center; color: var(--text-secondary); padding: 20px;">
                    記録はまだありません
                </div>
            </div>
        </section>

        <!-- Summary -->
        <section class="card">
            <div class="flex-row justify-between">
                <h3>今日の集計</h3>
                <button id="export-md-btn" class="btn btn-secondary"
                    style="width: auto; font-size: 0.8rem; padding: 4px 12px;">MD出力</button>
            </div>
            <div class="pie-chart-container">
                <div id="summary-pie-chart" class="pie-chart"></div>
            </div>
            <div id="summary-list">
                <!-- Javascript will populate -->
            </div>
        </section>

        <!-- Export/Clear -->
        <section style="margin-top: 20px; text-align: center;">
            <button id="clear-day-btn"
                style="background:none; border:none; color: var(--error-color); text-decoration: underline; cursor: pointer;">
                今日のデータをリセット
            </button>
        </section>
    </div>

    <!-- Tag Edit Modal -->
    <div id="tag-edit-modal" class="modal-overlay">
        <div class="modal-content">
            <div class="modal-header">
                <h3>タグの編集</h3>
                <span id="close-modal-btn" style="cursor: pointer; font-size: 1.5rem; font-weight: bold; color: var(--text-secondary);">&times;</span>
            </div>
            <div class="modal-body">
                <!-- Add Tag Input Form -->
                <div class="flex-row" style="margin-bottom: 16px;">
                    <input type="text" id="modal-new-tag-input" placeholder="新しいタグ名を入力" style="flex: 1; margin-bottom: 0;">
                    <button id="modal-add-tag-btn" class="btn btn-secondary" style="width: auto; padding: 12px 20px; white-space: nowrap; margin-bottom: 0;">追加</button>
                </div>
                <!-- Current Tags List -->
                <label>現在のタグ一覧 (クリックで削除)</label>
                <div id="modal-tag-list" class="edit-tag-list">
                    <!-- Javascript will populate this -->
                </div>
            </div>
            <div class="modal-footer">
                <button id="modal-close-btn" class="btn btn-primary" style="margin-bottom: 0; width: auto; padding: 8px 16px;">完了</button>
            </div>
        </div>
    </div>

    <script>

// DOM Elements
const activityNameInput = document.getElementById('activity-name');
const activityMemoInput = document.getElementById('activity-memo');
const startTimeInput = document.getElementById('start-time');
const endTimeInput = document.getElementById('end-time');
const saveBtn = document.getElementById('save-btn');
const logList = document.getElementById('log-list');
const quickListNodesContainer = document.getElementById('quick-list');
const toggleContinuousBtn = document.getElementById('toggle-continuous');
const continuousStatusSpan = document.getElementById('continuous-status');
const toggleSimultaneousBtn = document.getElementById('toggle-simultaneous');
const simultaneousStatusSpan = document.getElementById('simultaneous-status');
const singleModeInputs = document.getElementById('single-mode-inputs');
const simultaneousModeInputs = document.getElementById('simultaneous-mode-inputs');
const simultaneousList = document.getElementById('simultaneous-list');
const addSimultaneousRowBtn = document.getElementById('add-simultaneous-row');
const saveTemplateBtn = document.getElementById('save-template-btn');
const templateList = document.getElementById('template-list');
const clearDayBtn = document.getElementById('clear-day-btn');
const currentDateInput = document.getElementById('current-date');

// Modal Elements
const tagEditModal = document.getElementById('tag-edit-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const modalNewTagInput = document.getElementById('modal-new-tag-input');
const modalAddTagBtn = document.getElementById('modal-add-tag-btn');
const modalTagList = document.getElementById('modal-tag-list');
const modalCloseBtn = document.getElementById('modal-close-btn');

// State
let isContinuousMode = JSON.parse(localStorage.getItem('zikankanri_continuous_mode')) || false;
let isSimultaneousMode = false;
let editingId = null; // Track if we are editing an existing log
let logs = JSON.parse(localStorage.getItem('zikankanri_logs')) || [];
let templates = JSON.parse(localStorage.getItem('zikankanri_templates')) || [];
let defaultTags = JSON.parse(localStorage.getItem('zikankanri_tags')) || ["睡眠", "仕事", "食事", "移動", "休憩", "家事", "運動", "学習"];

// 共通の日付クレンジング関数
function sanitizeDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    
    // スラッシュをハイフンに統一し、余計な空白をトリム
    const cleaned = dateStr.replace(/\\//g, '-').trim();
    
    // YYYY-MM-DD 形式の正規表現チェック
    if (/^\\d{4}-\\d{2}-\\d{2}$/.test(cleaned)) {
        return cleaned;
    }
    
    // YYYY-M-D 形式（1桁）の補正
    const parts = cleaned.split('-');
    if (parts.length === 3) {
        const y = parts[0];
        const m = parts[1].padStart(2, '0');
        const d = parts[2].padStart(2, '0');
        if (y.length === 4 && !isNaN(y) && !isNaN(m) && !isNaN(d)) {
            const numM = parseInt(m, 10);
            const numD = parseInt(d, 10);
            if (numM >= 1 && numM <= 12 && numD >= 1 && numD <= 31) {
                return y + '-' + m + '-' + d;
            }
        }
    }
    return null;
}

// Initialize
function init() {
    let dateVal = sanitizeDate(window.__TARGET_DATE__);
    if (dateVal) {
        currentDateInput.value = dateVal;
    } else {
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const d = String(today.getDate()).padStart(2, '0');
        currentDateInput.value = y + '-' + m + '-' + d;
    }
    initTags();
    setContinuousMode(isContinuousMode);
    updateDefaultStartTime();
    renderLogs();
    renderTemplates();
    registerSW();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Date Change Listener
currentDateInput.addEventListener('change', () => {
    updateDefaultStartTime();
    renderLogs();
    notifyDateChanged();
});

function notifyDateChanged() {
    try {
        if (window.ReactNativeWebView) {
            const selectedDate = currentDateInput.value.replace(/-/g, '/');
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'DATE_CHANGED',
                date: selectedDate
            }));
        }
    } catch (e) {
        console.error("Failed to post DATE_CHANGED message", e);
    }
}

function selectTag(tagName) {
    document.querySelectorAll('#quick-list .tag-chip').forEach(c => {
        if (c.dataset.value === tagName) {
            c.classList.add('selected');
        } else {
            c.classList.remove('selected');
        }
    });
    activityNameInput.value = tagName;
}

// Init Tags
function initTags() {
    quickListNodesContainer.innerHTML = '';

    // Edit Button
    const editBtn = document.createElement('span');
    editBtn.className = 'tag-chip';
    editBtn.style.borderStyle = 'dashed';
    editBtn.textContent = '+ タグ編集';
    editBtn.onclick = openTagEditor;
    quickListNodesContainer.appendChild(editBtn);

    defaultTags.forEach(tag => {
        const chip = document.createElement('span');
        chip.className = 'tag-chip';
        chip.dataset.value = tag;

        // Tag text element
        const textSpan = document.createElement('span');
        textSpan.textContent = tag;
        textSpan.style.cursor = 'pointer';
        textSpan.addEventListener('click', () => {
            selectTag(tag);
        });
        chip.appendChild(textSpan);

        quickListNodesContainer.insertBefore(chip, editBtn);
    });

    // Restore selected state on render if active
    if (activityNameInput.value) {
        selectTag(activityNameInput.value);
    }
}

function openTagEditor() {
    tagEditModal.classList.add('active');
    renderModalTags();
    modalNewTagInput.value = '';
    modalNewTagInput.focus();
}

function closeTagEditor() {
    tagEditModal.classList.remove('active');
    initTags();
}

function renderModalTags() {
    modalTagList.innerHTML = '';
    defaultTags.forEach(tag => {
        const item = document.createElement('div');
        item.className = 'edit-tag-item';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'edit-tag-name';
        nameSpan.textContent = tag;
        item.appendChild(nameSpan);

        const delBtn = document.createElement('button');
        delBtn.className = 'edit-tag-delete-btn';
        delBtn.innerHTML = '&times;';
        delBtn.onclick = () => {
            if (confirm(\`タグ「\${tag}」を削除しますか？\`)) {
                defaultTags = defaultTags.filter(t => t !== tag);
                localStorage.setItem('zikankanri_tags', JSON.stringify(defaultTags));
                renderModalTags();
                // If the deleted tag was in the input, clear it
                if (activityNameInput.value === tag) {
                    activityNameInput.value = '';
                }
            }
        };
        item.appendChild(delBtn);

        modalTagList.appendChild(item);
    });
}

function addModalTag() {
    const val = modalNewTagInput.value.trim();
    if (!val) return;
    if (defaultTags.includes(val)) {
        alert('そのタグは既に存在します。');
        return;
    }
    defaultTags.push(val);
    localStorage.setItem('zikankanri_tags', JSON.stringify(defaultTags));
    renderModalTags();
    modalNewTagInput.value = '';
}

// Bind modal events
closeModalBtn.addEventListener('click', closeTagEditor);
modalCloseBtn.addEventListener('click', closeTagEditor);
modalAddTagBtn.addEventListener('click', addModalTag);
modalNewTagInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        addModalTag();
    }
});
tagEditModal.addEventListener('click', (e) => {
    if (e.target === tagEditModal) {
        closeTagEditor();
    }
});

// Service Worker Registration
function registerSW() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(res => console.log('SW registered'))
            .catch(err => console.log('SW failed', err));
    }
}

// Event Listeners
document.getElementById('set-now-start').addEventListener('click', () => {
    startTimeInput.value = getCurrentTimeStr();
});

document.getElementById('set-now-end').addEventListener('click', () => {
    endTimeInput.value = getCurrentTimeStr();
});


// Toggle Continuous Mode
toggleContinuousBtn.addEventListener('click', () => {
    setContinuousMode(!isContinuousMode);
    updateDefaultStartTime();
});

function setContinuousMode(enabled) {
    isContinuousMode = enabled;
    localStorage.setItem('zikankanri_continuous_mode', JSON.stringify(isContinuousMode));
    if (isContinuousMode) {
        continuousStatusSpan.textContent = "ON";
        toggleContinuousBtn.classList.remove('btn-secondary');
        toggleContinuousBtn.classList.add('btn-primary');
    } else {
        continuousStatusSpan.textContent = "OFF";
        toggleContinuousBtn.classList.remove('btn-primary');
        toggleContinuousBtn.classList.add('btn-secondary');
    }
}

// Toggle Simultaneous Mode
toggleSimultaneousBtn.addEventListener('click', () => {
    setSimultaneousMode(!isSimultaneousMode);
});

function setSimultaneousMode(enabled) {
    isSimultaneousMode = enabled;
    if (isSimultaneousMode) {
        singleModeInputs.classList.add('hidden');
        simultaneousModeInputs.classList.remove('hidden');
        simultaneousStatusSpan.textContent = "ON";
        toggleSimultaneousBtn.classList.remove('btn-secondary');
        toggleSimultaneousBtn.classList.add('btn-primary');
    } else {
        singleModeInputs.classList.remove('hidden');
        simultaneousModeInputs.classList.add('hidden');
        simultaneousStatusSpan.textContent = "OFF";
        toggleSimultaneousBtn.classList.remove('btn-primary');
        toggleSimultaneousBtn.classList.add('btn-secondary');
    }
}

// Add Simultaneous Row
addSimultaneousRowBtn.addEventListener('click', () => {
    addSimultaneousRow();
});

function addSimultaneousRow(name = '', percent = 0) {
    const div = document.createElement('div');
    div.className = 'simultaneous-row flex-row';
    div.innerHTML = \`
        <input type="text" placeholder="活動名" class="sim-name" value="\${name}">
        <input type="number" placeholder="%" class="sim-percent" value="\${percent}">
        <button class="btn btn-secondary" style="width: auto; padding: 4px 8px;" onclick="this.parentElement.remove()">×</button>
    \`;
    simultaneousList.appendChild(div);
}

// Save Entry
// Save Entry
saveBtn.addEventListener('click', () => {
    const start = startTimeInput.value;
    const end = endTimeInput.value;
    const selectedDate = currentDateInput.value.replace(/-/g, '/');
    const memo = activityMemoInput.value.trim();

    if (!start && !end) {
        alert('開始時間または終了時間を入力してください。');
        return;
    }

    // Build New Item Object
    let newItems = [];
    if (isSimultaneousMode) {
        const rows = document.querySelectorAll('.simultaneous-row');
        rows.forEach(row => {
            const name = row.querySelector('.sim-name').value.trim();
            const percent = parseInt(row.querySelector('.sim-percent').value) || 0;
            newItems.push({ name: name || "", percent });
        });
        if (newItems.length === 0) {
            newItems.push({ name: "", percent: 100 });
        }
    } else {
        const name = activityNameInput.value.trim();
        newItems.push({ name: name || "", percent: 100 });
    }

    const hasTimeInterval = start && end;

    if (hasTimeInterval) {
        // Check for Overlaps
        const newStartMins = timeToMins(start);
        const newEndMins = timeToMins(end);
        let effectiveEndMins = newEndMins;
        if (effectiveEndMins < newStartMins) effectiveEndMins += 1440;

        // Find overlapping logs (only checking against logs that have both start and end times)
        const dayLogs = logs.filter(l => l.date === selectedDate && l.id !== editingId && l.start && l.end);
        const overlaps = dayLogs.filter(l => {
            const lS = timeToMins(l.start);
            let lE = timeToMins(l.end);
            if (lE < lS) lE += 1440;

            return Math.max(lS, newStartMins) < Math.min(lE, effectiveEndMins);
        });

        if (overlaps.length > 0) {
            // Handle Overlap
            const targetLog = overlaps[0];

            const confirmMerge = confirm(\`「\${targetLog.items.map(i => i.name).join('/')}」(\${targetLog.start}-\${targetLog.end}) と時間が重なっています。\\n重なっている部分を同時進行として記録しますか？\\n（キャンセルすると通常通り追加・更新します）\`);

            if (confirmMerge) {
                // Ask for ratio
                const existingNames = targetLog.items.map(i => i.name).join('/');
                const newNames = newItems.map(i => i.name).join('/');

                const ratioStr = prompt(\`重複区間の割合を設定してください。\\n既存「\${existingNames}」の割合(%):\`, "50");
                if (ratioStr === null) return;

                const existingRatio = parseInt(ratioStr) || 50;
                const newRatio = 100 - existingRatio;

                // If editing, we first remove the old entry since we are merging into a new split structure
                if (editingId) {
                    logs = logs.filter(l => l.id !== editingId);
                }

                handleOverlapMerge(targetLog, { start, end, items: newItems, memo: memo }, selectedDate, existingRatio, newRatio);

                // Clean up UI
                resetForm(isContinuousMode ? end : getCurrentTimeStr());
                return;
            }
        }
    }

    if (editingId) {
        // Update Existing
        const index = logs.findIndex(l => l.id === editingId);
        if (index !== -1) {
            logs[index] = {
                ...logs[index],
                date: selectedDate,
                start: start || "",
                end: end || "",
                items: newItems,
                memo: memo
            };
        }
    } else {
        // Create New
        const newEntry = {
            id: Date.now(),
            date: selectedDate,
            start: start || "",
            end: end || "",
            items: newItems,
            memo: memo
        };
        logs.push(newEntry);
    }

    saveLogs();
    renderLogs();
    resetForm(isContinuousMode ? (end || start || getCurrentTimeStr()) : getCurrentTimeStr());
});

function handleOverlapMerge(existingLog, newLogObj, date, existingWeight, newWeight) {
    // 1. Remove existing log
    logs = logs.filter(l => l.id !== existingLog.id);

    // Convert times to mins
    const eS = timeToMins(existingLog.start);
    let eE = timeToMins(existingLog.end);
    if (eE < eS) eE += 1440;

    const nS = timeToMins(newLogObj.start);
    let nE = timeToMins(newLogObj.end);
    if (nE < nS) nE += 1440;

    const points = [eS, eE, nS, nE].sort((a, b) => a - b);

    // Overlap Range
    const overlapStart = Math.max(eS, nS);
    const overlapEnd = Math.min(eE, nE);

    const segments = [];

    // Before Overlap (Existing)
    if (eS < overlapStart) {
        segments.push({
            start: eS, end: overlapStart, items: existingLog.items, memo: existingLog.memo
        });
    }
    // Before Overlap (New)
    if (nS < overlapStart) {
        segments.push({
            start: nS, end: overlapStart, items: newLogObj.items, memo: newLogObj.memo
        });
    }

    // Overlap
    if (overlapStart < overlapEnd) {
        let mergedItems = [];
        existingLog.items.forEach(i => {
            mergedItems.push({
                name: i.name,
                percent: Math.round(i.percent * (existingWeight / 100))
            });
        });
        newLogObj.items.forEach(i => {
            mergedItems.push({
                name: i.name,
                percent: Math.round(i.percent * (newWeight / 100))
            });
        });

        // Merge memos if both exist
        let mergedMemo = '';
        const memos = [existingLog.memo, newLogObj.memo].filter(m => m && m.trim() !== '');
        mergedMemo = memos.join(' / ');

        segments.push({
            start: overlapStart, end: overlapEnd, items: mergedItems, memo: mergedMemo
        });
    }

    // After Overlap (Existing)
    if (eE > overlapEnd) {
        segments.push({
            start: overlapEnd, end: eE, items: existingLog.items, memo: existingLog.memo
        });
    }
    // After Overlap (New)
    if (nE > overlapEnd) {
        segments.push({
            start: overlapEnd, end: nE, items: newLogObj.items, memo: newLogObj.memo
        });
    }

    // Create Logs from segments
    segments.forEach(seg => {
        if (seg.end > seg.start) {
            logs.push({
                id: Date.now() + Math.random(),
                date: date,
                start: minsToTime(seg.start),
                end: minsToTime(seg.end),
                items: seg.items,
                memo: seg.memo || ""
            });
        }
    });

    saveLogs();
    renderLogs();
}

function startEdit(id) {
    const log = logs.find(l => l.id === id);
    if (!log) return;

    editingId = id;
    saveBtn.textContent = "更新する";
    saveBtn.classList.replace('btn-primary', 'btn-secondary'); // Visual cue? Or keep primary.
    // Let's add a visual cue.
    saveBtn.style.border = "2px solid #BB86FC";

    startTimeInput.value = log.start;
    endTimeInput.value = log.end;
    activityMemoInput.value = log.memo || "";

    // Determine Mode
    if (log.items.length > 1) {
        setSimultaneousMode(true);
        simultaneousList.innerHTML = '';
        log.items.forEach(item => {
            addSimultaneousRow(item.name, item.percent);
        });
    } else {
        setSimultaneousMode(false);
        selectTag(log.items[0].name);
    }

    // Scroll top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm(nextStart) {
    editingId = null;
    saveBtn.textContent = "記録する";
    saveBtn.style.border = "none";

    if (nextStart !== undefined) {
        startTimeInput.value = nextStart;
    } else {
        updateDefaultStartTime();
    }
    endTimeInput.value = "";
    activityNameInput.value = "";
    activityMemoInput.value = "";
    newTagInput.value = "";
    simultaneousList.innerHTML = ''; // Clear rows
    document.querySelectorAll('#quick-list .tag-chip').forEach(c => c.classList.remove('selected'));
}

// Clear Data
clearDayBtn.addEventListener('click', () => {
    const selectedDate = currentDateInput.value.replace(/-/g, '/');
    if (confirm(\`\${selectedDate} のデータを全て消去しますか？\`)) {
        logs = logs.filter(log => log.date !== selectedDate);
        saveLogs();
        renderLogs();
        resetForm();
    }
});

// Export Markdown
const exportMdBtn = document.getElementById('export-md-btn');
if (exportMdBtn) {
    exportMdBtn.addEventListener('click', () => {
        const selectedDate = currentDateInput.value.replace(/-/g, '/');
        const targetLogs = logs.filter(l => l.date === selectedDate);
        targetLogs.sort((a, b) => a.start.localeCompare(b.start));

        if (targetLogs.length === 0) {
            alert('データがありません。');
            return;
        }

        // Calculate Totals
        const totals = {};
        let totalMins = 0;
        targetLogs.forEach(log => {
            const duration = calculateDuration(log.start, log.end);
            log.items.forEach(item => {
                const minutes = duration * (item.percent / 100);
                if (!totals[item.name]) totals[item.name] = 0;
                totals[item.name] += minutes;
                totalMins += minutes;
            });
        });

        const sortedTotals = Object.entries(totals).sort((a, b) => b[1] - a[1]);

        // Generate MD
        let md = \`# \${selectedDate} 活動記録\\n\\n\`;

        md += \`## 集計\\n\`;
        md += \`| 活動 | 時間 (分) | 割合 |\\n\`;
        md += \`| :--- | :---: | :---: |\\n\`;

        sortedTotals.forEach(([name, mins]) => {
            const percent = totalMins > 0 ? Math.round((mins / totalMins) * 100) : 0;
            const displayName = name.trim() ? name : '(未設定)';
            md += \`| \${displayName} | \${Math.round(mins)} | \${percent}% |\\n\`;
        });

        md += \`\\n## 詳細ログ\\n\`;
        targetLogs.forEach(log => {
            const duration = calculateDuration(log.start, log.end);
            let content = '';
            if (log.items.length === 1) {
                content = log.items[0].name.trim() || '(未設定)';
            } else {
                content = log.items.map(i => {
                    const itemName = i.name.trim();
                    return \`\${itemName || '(未設定)'}(\${i.percent}%)\`;
                }).join(', ');
            }
            if (log.memo && log.memo.trim() !== '') {
                content += \` [\${log.memo.trim()}]\`;
            }
            const timeStr = (log.start || '?') + ' - ' + (log.end || '?');
            const durationStr = duration > 0 ? \` (\${duration}分)\` : '';
            md += \`- **\${timeStr}**\${durationStr}: \${content}\\n\`;
        });

        // Copy to clipboard
        navigator.clipboard.writeText(md).then(() => {
            alert('クリップボードにコピーしました！\\nGeminiなどに貼り付けて分析してください。');
        }).catch(err => {
            console.error('Copy failed', err);
            alert('コピーに失敗しました。');
            console.log(md);
        });
    });
}

// Templates
saveTemplateBtn.addEventListener('click', () => {
    const selectedDate = currentDateInput.value.replace(/-/g, '/');
    const logsForDate = logs.filter(l => l.date === selectedDate);

    if (logsForDate.length === 0) {
        alert("保存する記録がありません。");
        return;
    }

    const name = prompt("テンプレート名を入力してください (例: 平日パターン):");
    if (name) {
        templates.push({
            id: Date.now(),
            name,
            data: logsForDate
        });
        localStorage.setItem('zikankanri_templates', JSON.stringify(templates));
        renderTemplates();
    }
});

function loadTemplate(templateId) {
    const tmpl = templates.find(t => t.id == templateId);
    if (!tmpl) return;

    if (confirm(\`テンプレート「\${tmpl.name}」を読み込みますか？\\n現在選択中の日の記録は上書きされます。\`)) {
        const selectedDate = currentDateInput.value.replace(/-/g, '/');

        // Remove existing logs for this date
        logs = logs.filter(l => l.date !== selectedDate);

        // Add template logs with target date
        const newLogs = tmpl.data.map(l => ({
            ...l,
            id: Date.now() + Math.random(), // New IDs
            date: selectedDate
        }));

        logs = logs.concat(newLogs);

        saveLogs();
        renderLogs();
        resetForm();
    }
}

// Rendering
function renderLogs() {
    logList.innerHTML = '';
    const selectedDate = currentDateInput.value.replace(/-/g, '/');

    const targetLogs = logs.filter(l => l.date === selectedDate);
    targetLogs.sort((a, b) => a.start.localeCompare(b.start));

    if (targetLogs.length === 0) {
        logList.innerHTML = '<div style="text-align:center; color: var(--text-secondary); padding: 20px;">記録はまだありません</div>';
    }

    targetLogs.forEach(log => {
        const el = document.createElement('div');
        el.className = 'log-item';

        let content = '';
        if (log.items.length === 1) {
            const name = log.items[0].name.trim();
            content = name ? \`<strong>\${name}</strong>\` : \`<span style="color: var(--text-secondary); font-style: italic;">(未設定)</span>\`;
        } else {
            content = '<div style="font-size:0.9rem;">' +
                log.items.map(i => {
                    const name = i.name.trim();
                    const displayName = name ? name : '(未設定)';
                    return \`\${displayName} (\${i.percent}%)\`;
                }).join(' / ') +
                '</div>';
        }

        if (log.memo && log.memo.trim() !== '') {
            content += \`<div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 2px;">📝 \${log.memo.trim()}</div>\`;
        }

        const duration = calculateDuration(log.start, log.end);
        const durationStr = duration > 0 ? \` (\${duration}分)\` : '';
        const timeStr = (log.start || '?') + ' - ' + (log.end || '?');

        // Edit Button Logic
        const isEditing = (log.id === editingId);
        const editClass = isEditing ? 'btn-primary' : 'btn-secondary';
        const editText = isEditing ? '編集中' : '編集';

        el.innerHTML = \`
            <div>
                <div class="time-badge">\${timeStr}\${durationStr}</div>
                <div style="margin-top: 4px;">\${content}</div>
            </div>
            <div class="flex-row">
                <button class="btn \${editClass}" style="width: auto; padding: 4px 8px; font-size: 0.8rem; margin-right: 8px;" onclick="startEdit(\${log.id})">\${editText}</button>
                <button class="btn btn-secondary" style="width: auto; padding: 4px 8px; font-size: 0.8rem; border-color: #666; color: #888;" onclick="deleteLog(\${log.id})">削除</button>
            </div>
        \`;
        logList.appendChild(el);
    });

    renderSummary(targetLogs);
}

function renderSummary(targetLogs) {
    const summaryList = document.getElementById('summary-list');
    const pieChartContainer = document.getElementById('summary-pie-chart');
    if (!summaryList || !pieChartContainer) return;

    summaryList.innerHTML = '';

    // --- Aggregation for List ---
    const totals = {};
    targetLogs.forEach(log => {
        const duration = calculateDuration(log.start, log.end);
        log.items.forEach(item => {
            const minutes = duration * (item.percent / 100);
            if (!totals[item.name]) totals[item.name] = 0;
            totals[item.name] += minutes;
        });
    });

    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);

    // Render List
    if (sorted.length === 0) {
        summaryList.innerHTML = '<div style="text-align:center; color: var(--text-secondary); padding: 10px;">データなし</div>';
        pieChartContainer.innerHTML = '';
        pieChartContainer.style.background = 'none';
        return;
    }

    const colors = ['#FFCDD2', '#F8BBD0', '#E1BEE7', '#D1C4E9', '#C5CAE9', '#BBDEFB', '#B3E5FC', '#B2EBF2', '#B2DFDB', '#C8E6C9', '#DCEDC8', '#F0F4C3', '#FFF9C4', '#FFECB3', '#FFE0B2', '#FFCCBC'];

    sorted.forEach(([name, mins], index) => {
        const row = document.createElement('div');
        row.className = 'flex-row justify-between';
        row.style.padding = '8px 0';
        row.style.borderBottom = '1px solid #333';
        const displayName = name.trim() ? name : \`<span style="color: var(--text-secondary); font-style: italic;">(未設定)</span>\`;
        row.innerHTML = \`<span style="display:flex; align-items:center; gap:8px;">\${displayName}</span><span>\${Math.round(mins)}分</span>\`;
        summaryList.appendChild(row);
    });

    // --- Render SVG Chart (Timeline) ---
    pieChartContainer.style.background = 'none';
    pieChartContainer.innerHTML = '';

    const size = 300;
    const cx = size / 2;
    const cy = size / 2;
    const radius = 100;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "auto");
    svg.setAttribute("viewBox", "0 0 " + size + " " + size);
    svg.style.maxWidth = "300px";
    svg.style.display = "block";
    svg.style.margin = "0 auto";

    // Draw Background Circle (Optional, prevents gaps)
    const bgCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    bgCircle.setAttribute("cx", cx);
    bgCircle.setAttribute("cy", cy);
    bgCircle.setAttribute("r", radius);
    bgCircle.setAttribute("fill", "#2C2C2C");
    svg.appendChild(bgCircle);

    // 1. Draw Hour Markers
    for (let i = 0; i < 24; i++) {
        const angle = (i * 15) - 90; // 0h = -90deg
        const rad = angle * (Math.PI / 180);
        const textR = radius + 25; // Outside
        const x = cx + textR * Math.cos(rad);
        const y = cy + textR * Math.sin(rad);

        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", x);
        text.setAttribute("y", y);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("dominant-baseline", "middle");
        text.setAttribute("fill", "#FF8A65");
        text.setAttribute("font-size", "12");
        text.textContent = i;
        svg.appendChild(text);
    }

    // 2. Draw Sectors
    const activityColorMap = {};
    let colorIdx = 0;

    targetLogs.forEach(log => {
        const primName = log.items[0].name;
        if (!activityColorMap[primName]) {
            activityColorMap[primName] = colors[colorIdx % colors.length];
            colorIdx++;
        }
        const color = activityColorMap[primName];

        const [sh, sm] = log.start.split(':').map(Number);
        const [eh, em] = log.end.split(':').map(Number);

        let startMins = sh * 60 + sm;
        let endMins = eh * 60 + em;
        if (endMins < startMins) endMins += 1440; // Cross midnight

        const startAngle = (startMins / 1440) * 360 - 90;
        const endAngle = (endMins / 1440) * 360 - 90;

        // Path definition
        const x1 = cx + radius * Math.cos(startAngle * Math.PI / 180);
        const y1 = cy + radius * Math.sin(startAngle * Math.PI / 180);
        const x2 = cx + radius * Math.cos(endAngle * Math.PI / 180);
        const y2 = cy + radius * Math.sin(endAngle * Math.PI / 180);

        const largeArcFlag = (endAngle - startAngle) > 180 ? 1 : 0;

        // If full circle? (1440 mins)
        if (endMins - startMins >= 1440) {
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", cx);
            circle.setAttribute("cy", cy);
            circle.setAttribute("r", radius);
            circle.setAttribute("fill", color);
            svg.appendChild(circle);
        } else {
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            const d = "M " + cx + " " + cy + " L " + x1 + " " + y1 + " A " + radius + " " + radius + " 0 " + largeArcFlag + " 1 " + x2 + " " + y2 + " Z";
            path.setAttribute("d", d);
            path.setAttribute("fill", color);
            path.setAttribute("stroke", "#121212"); // Separator color matching bg
            path.setAttribute("stroke-width", "1");
            svg.appendChild(path);
        }
    });

    // 3. Draw Labels (rendered after all sectors to prevent overlapping sectors from hiding text)
    const renderedLabels = [];
    targetLogs.forEach(log => {
        const [sh, sm] = log.start.split(':').map(Number);
        const [eh, em] = log.end.split(':').map(Number);

        let startMins = sh * 60 + sm;
        let endMins = eh * 60 + em;
        if (endMins < startMins) endMins += 1440; // Cross midnight

        const startAngle = (startMins / 1440) * 360 - 90;
        const endAngle = (endMins / 1440) * 360 - 90;

        const midAngle = (startAngle + endAngle) / 2;
        const midRad = midAngle * (Math.PI / 180);

        let labelR = radius * 0.65;
        const rCandidates = [radius * 0.65, radius * 0.4, radius * 0.85, radius * 0.25];
        let lx = cx + labelR * Math.cos(midRad);
        let ly = cy + labelR * Math.sin(midRad);

        const isVisible = (endMins - startMins) >= 5;
        let textContent = '';
        if (isVisible) {
            textContent = log.items.map(i => i.name.trim()).filter(n => n !== '').join('/');
            if (textContent.length > 5) textContent = textContent.substring(0, 4) + '..';
        }

        if (isVisible && textContent) {
            for (const rCand of rCandidates) {
                labelR = rCand;
                lx = cx + labelR * Math.cos(midRad);
                ly = cy + labelR * Math.sin(midRad);

                let hasCollision = false;
                for (const pos of renderedLabels) {
                    if (Math.abs(lx - pos.x) < 40 && Math.abs(ly - pos.y) < 15) {
                        hasCollision = true;
                        break;
                    }
                }
                if (!hasCollision) {
                    break;
                }
            }

            const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
            label.setAttribute("x", lx);
            label.setAttribute("y", ly);
            label.setAttribute("text-anchor", "middle");
            label.setAttribute("dominant-baseline", "middle");
            label.setAttribute("fill", "#333"); // Dark text for pastel colors
            label.setAttribute("stroke", "#ffffff");
            label.setAttribute("stroke-width", "2");
            label.setAttribute("paint-order", "stroke fill");
            label.setAttribute("stroke-linejoin", "round");
            label.setAttribute("font-size", "12");
            label.setAttribute("font-weight", "bold");
            label.setAttribute("pointer-events", "none");
            label.textContent = textContent;

            svg.appendChild(label);
            renderedLabels.push({ x: lx, y: ly });
        }
    });

    pieChartContainer.appendChild(svg);
}

function renderTemplates() {
    templateList.innerHTML = '';
    templates.forEach(tmpl => {
        const chip = document.createElement('span');
        chip.className = 'tag-chip';
        chip.textContent = tmpl.name;
        chip.onclick = () => loadTemplate(tmpl.id);
        templateList.appendChild(chip);
    });
}

// Helpers
function saveLogs() {
    localStorage.setItem('zikankanri_logs', JSON.stringify(logs));
}

function deleteLog(id) {
    if (confirm('削除しますか？')) {
        const wasEditing = (editingId === id);
        logs = logs.filter(l => l.id !== id);
        saveLogs();
        renderLogs();
        if (wasEditing) {
            resetForm();
        } else {
            updateDefaultStartTime();
        }
    }
}

function getCurrentTimeStr() {
    const now = new Date();
    return now.toTimeString().substring(0, 5);
}

function calculateDuration(start, end) {
    if (!start || !end) return 0;
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    const min1 = h1 * 60 + m1;
    const min2 = h2 * 60 + m2;
    return min2 - min1;
}

function timeToMins(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

function minsToTime(mins) {
    // mins usually < 1440, but if wraps, mod 1440
    let m = mins % 1440;
    if (m < 0) m += 1440;
    const h = Math.floor(m / 60);
    const min = m % 60;
    return \`\${String(h).padStart(2, '0')}:\${String(min).padStart(2, '0')}\`;
}

function updateDefaultStartTime() {
    if (editingId !== null) return;
    const selectedDate = currentDateInput.value.replace(/-/g, '/');
    const dayLogs = logs.filter(l => l.date === selectedDate);
    
    if (isContinuousMode) {
        if (dayLogs.length > 0) {
            dayLogs.sort((a, b) => a.start.localeCompare(b.start));
            const lastLog = dayLogs[dayLogs.length - 1];
            startTimeInput.value = lastLog.end;
        } else {
            startTimeInput.value = getCurrentTimeStr();
        }
    } else {
        startTimeInput.value = getCurrentTimeStr();
    }
}

</script>
</body>

</html>`;
