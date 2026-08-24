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
    // DEBUG: Report initialization state
    try {
      if (window.ReactNativeWebView) {
        const habitVal = storageStore['habit-items'];
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'WEB_DEBUG',
          message: '[HabitCounter] init storageStore. habit-items type=' + (typeof habitVal) + ' len=' + (habitVal ? String(habitVal).length : 0) + ' __INITIAL_WEBVIEW_DATA__ keys=' + (initData ? Object.keys(initData).join(',') : 'NULL')
        }));
      }
    } catch (e) {}
  } catch (e) {
    console.error("Failed to copy from __INITIAL_WEBVIEW_DATA__", e);
  }

  const appStorage = {
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

  window.appStorage = appStorage;
})();
</script>

    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>習慣カウンター</title>
    <script>
    (function() {
      if (window.__BACKGROUND_THEME__ === 'pureBlack') {
        var style = document.createElement('style');
        style.innerHTML = ':root { --bg-color: #000000 !important; --text-color: #ffffff !important; } body { background-color: #000000 !important; } .habit-card .habit-name, .habit-card .habit-count { color: #ffffff !important; opacity: 1 !important; } .add-card span { color: #888888 !important; }';
        document.head.appendChild(style);
      }
    })();
    </script>
    <style>
:root {
    --bg-color: #121212;
    --text-color: #ffffff;
    --card-bg: rgba(255, 255, 255, 0.05);
    --glass-border: rgba(255, 255, 255, 0.1);
    --primary-gradient: linear-gradient(135deg, #6C5CE7, #a29bfe);
    --danger-color: #ff6b6b;
    --font-main: 'Outfit', sans-serif;
}

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    -webkit-tap-highlight-color: transparent;
}

body {
    background-color: var(--bg-color);
    color: var(--text-color);
    font-family: var(--font-main);
    min-height: 100vh;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    display: flex;
    flex-direction: column;
}

.app-container {
    display: flex;
    flex-direction: column;
    padding: 20px;
    max-width: 600px;
    /* Tablet limit */
    margin: 0 auto;
    width: 100%;
}

header {
    position: sticky;
    top: 0;
    z-index: 10;
    background-color: var(--bg-color);
    padding: 10px 0;
    margin-bottom: 10px;
    display: flex;
    justify-content: flex-end;
    align-items: center;
}

h1 {
    font-weight: 700;
    font-size: 1.5rem;
    letter-spacing: 0.5px;
}

.icon-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 10px;
    border-radius: 50%;
    transition: background 0.2s;
}

.icon-btn:active {
    background: rgba(255, 255, 255, 0.1);
}

.grid-container {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 15px;
    padding-bottom: 20px;
}

/* Card Styles */
.habit-card,
.add-card {
    background: var(--card-bg);
    border: 1px solid var(--glass-border);
    border-radius: 20px;
    padding: 16px 10px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    aspect-ratio: 1 / 1;
    cursor: pointer;
    transition: transform 0.1s, background 0.2s;
    user-select: none;
    position: relative;
    overflow: hidden;
}

.habit-card:active {
    transform: scale(0.95);
    background: rgba(255, 255, 255, 0.1);
}

.add-card {
    border: 2px dashed var(--glass-border);
    justify-content: center;
}

.add-card span {
    font-size: 3rem;
    color: rgba(255, 255, 255, 0.5);
}

.habit-count {
    font-size: 2.8rem;
    font-weight: 700;
    margin-top: auto;
    margin-bottom: auto;
}

.habit-name {
    font-size: 0.9rem;
    font-weight: 300;
    opacity: 0.8;
    text-align: center;
    word-break: break-all;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.2;
    height: 2.4em;
}

/* Ripple Animation */
.ripple {
    position: absolute;
    border-radius: 50%;
    transform: scale(0);
    animation: ripple-effect 0.6s linear;
    background-color: rgba(255, 255, 255, 0.3);
    pointer-events: none;
}

@keyframes ripple-effect {
    to {
        transform: scale(4);
        opacity: 0;
    }
}

/* Modal Styles */
.modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: max(40px, 8vh);
    box-sizing: border-box;
    z-index: 100;
    opacity: 1;
    transition: opacity 0.3s;
    backdrop-filter: blur(5px);
    overflow-y: auto;
}

.hidden {
    display: none !important;
}

.modal.hidden {
    display: none !important;
    opacity: 0;
    pointer-events: none;
}

.modal.modal-center {
    align-items: center !important;
    padding-top: 0 !important;
}

.modal.modal-high-z {
    z-index: 200 !important;
}

.modal-content.glass {
    background: rgba(30, 30, 30, 0.9);
    border: 1px solid var(--glass-border);
    padding: 24px 24px 20px;
    border-radius: 24px;
    width: 85%;
    max-width: 350px;
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
    text-align: center;
    max-height: 80vh;
    overflow-y: auto;
    box-sizing: border-box;
}

.modal-content h2 {
    margin-bottom: 20px;
    font-size: 1.2rem;
}

input {
    width: 100%;
    padding: 12px;
    margin-bottom: 20px;
    border-radius: 12px;
    border: 1px solid var(--glass-border);
    background: rgba(255, 255, 255, 0.05);
    color: white;
    font-size: 1rem;
    outline: none;
}

input:focus {
    border-color: #a29bfe;
}

/* Color Picker */
.color-picker {
    display: flex;
    justify-content: center;
    gap: 10px;
    margin-bottom: 25px;
}

.color-btn {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    border: 2px solid transparent;
    background: var(--bg);
    cursor: pointer;
}

.color-btn.selected {
    border-color: white;
    transform: scale(1.2);
}

/* Buttons */
.modal-actions {
    display: flex;
    justify-content: space-around;
    gap: 10px;
}

.text-btn {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.6);
    padding: 10px 20px;
    font-size: 1rem;
    cursor: pointer;
}

.text-btn:active {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
}

.primary-btn {
    background: white;
    color: black;
    border: none;
    padding: 10px 30px;
    border-radius: 20px;
    font-weight: 500;
    font-size: 1rem;
    cursor: pointer;
}

/* Stats List */
.stats-list {
    list-style: none;
    text-align: left;
    max-height: 50vh;
    overflow-y: auto;
    margin-bottom: 20px;
}

.stats-item {
    display: flex;
    justify-content: space-between;
    padding: 15px 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    cursor: pointer;
    transition: background 0.2s;
    border-radius: 8px;
}

.stats-item:active {
    background: rgba(255, 255, 255, 0.1);
}

.stats-count {
    font-weight: 700;
    color: #a29bfe;
}

.date-label {
    margin-bottom: 15px;
    opacity: 0.6;
    font-size: 0.9rem;
}

/* Stats Navigation */
.date-nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.icon-btn-small {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: white;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 0.8rem;
}

/* Detail View */
.detail-header {
    display: flex;
    align-items: center;
    gap: 15px;
    margin-bottom: 20px;
}

.text-btn-small {
    background: none;
    border: none;
    color: #a29bfe;
    cursor: pointer;
    font-size: 0.9rem;
}

/* Trend Chart */
.trend-chart {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    height: 150px;
    margin-bottom: 30px;
    padding-top: 20px;
    gap: 5px;
}

.chart-bar-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    height: 100%;
}

.chart-bar {
    width: 80%;
    background: var(--primary-gradient);
    border-radius: 4px 4px 0 0;
    transition: height 0.5s ease;
    min-height: 4px;
}

.chart-label {
    font-size: 0.7rem;
    margin-top: 5px;
    opacity: 0.6;
}

.chart-value {
    font-size: 0.7rem;
    margin-bottom: 2px;
    font-weight: bold;
}

/* Edit Modal Controls */
.counter-control {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 20px;
    margin: 30px 0;
}

.circle-btn {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.2);
    background: none;
    color: white;
    font-size: 1.5rem;
    cursor: pointer;
}

.circle-btn:active {
    background: rgba(255, 255, 255, 0.1);
    border-color: white;
}

.count-display {
    font-size: 3rem;
    font-weight: 700;
    min-width: 80px;
}
header h1 {
    display: none !important;
}
header {
    justify-content: flex-end !important;
}
#prev-day, #next-day {
    display: none !important;
}
.hidden {
    display: none !important;
}
.manage-item-container {
    display: flex;
    flex-direction: column;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding: 8px 0;
}
.manage-item {
    display: flex;
    align-items: center;
    gap: 12px;
}
.manage-reorder {
    display: flex;
    flex-direction: column;
    gap: 4px;
}
.manage-reorder-btn {
    background: rgba(255, 255, 255, 0.15);
    border: none;
    color: white;
    width: 36px;
    height: 30px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85rem;
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    touch-action: manipulation;
    transition: background 0.15s, transform 0.1s;
}
.manage-reorder-btn:active {
    background: rgba(255, 255, 255, 0.35);
    transform: scale(0.92);
}
.manage-reorder-btn:disabled {
    opacity: 0.2;
    cursor: not-allowed;
    transform: none;
}
.manage-color-dot {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid rgba(255, 255, 255, 0.3);
    flex-shrink: 0;
}
.manage-input {
    flex: 1;
    background: transparent;
    border: 1px solid transparent;
    color: white;
    font-family: inherit;
    font-size: 1rem;
    padding: 8px;
    border-radius: 8px;
    outline: none;
    margin-bottom: 0 !important;
}
.manage-input:focus {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.3);
}
.manage-delete-btn {
    background: none;
    border: none;
    font-size: 1.3rem;
    cursor: pointer;
    padding: 8px;
    opacity: 0.7;
}
.manage-delete-btn:active {
    opacity: 1;
}
.color-btn-mini.selected {
    transform: scale(1.1);
}
.manage-visibility-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 8px;
    opacity: 0.7;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
}
.manage-visibility-btn:active {
    opacity: 1;
}
.manage-visibility-btn.is-hidden-item {
    color: rgba(255, 255, 255, 0.3);
}
.manage-item-container.is-hidden-item .manage-input {
    opacity: 0.5;
}
</style>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;500;700&display=swap" rel="stylesheet">
    <meta name="theme-color" content="#121212">
</head>

<body>
    <div class="app-container">
        <header style="display: none;">
            <h1>習慣カウンター</h1>
            <button id="manage-btn" class="icon-btn" aria-label="管理" style="margin-right: 8px;">
                ⚙️
            </button>
            <button id="stats-btn" class="icon-btn" aria-label="統計">
                📊
            </button>
        </header>

        <main id="grid-container" class="grid-container">
            <!-- Items will be injected here -->
            <button id="add-btn" class="add-card" aria-label="項目を追加">
                <span>+</span>
            </button>
        </main>
    </div>

    <!-- Add Item Modal -->
    <div id="add-modal" class="modal hidden">
        <div class="modal-content glass">
            <h2>新しい習慣を追加</h2>
            <input type="text" id="new-item-name" placeholder="例: 水を飲む" autocomplete="off">
            <div class="color-picker">
                <button class="color-btn" style="--bg: linear-gradient(135deg, #FF6B6B, #EE5253)"
                    data-color="red"></button>
                <button class="color-btn" style="--bg: linear-gradient(135deg, #48DBFB, #0ABDE3)"
                    data-color="blue"></button>
                <button class="color-btn" style="--bg: linear-gradient(135deg, #1DD1A1, #10AC84)"
                    data-color="green"></button>
                <button class="color-btn" style="--bg: linear-gradient(135deg, #FECA57, #FF9F43)"
                    data-color="yellow"></button>
                <button class="color-btn" style="--bg: linear-gradient(135deg, #A29BFE, #6C5CE7)"
                    data-color="purple"></button>
            </div>
            <div class="modal-actions">
                <button id="cancel-add" class="text-btn">キャンセル</button>
                <button id="confirm-add" class="primary-btn">追加</button>
            </div>
        </div>
    </div>

    <!-- Stats Modal -->
    <div id="stats-modal" class="modal hidden">
        <div class="modal-content glass" style="max-width: 400px;">
            <h2>記録の統計</h2>

            <!-- Date Navigation -->
            <div class="date-nav">
                <button id="prev-day" class="icon-btn-small">◀</button>
                <p id="current-date" class="date-label">2026年X月X日</p>
                <button id="next-day" class="icon-btn-small">▶</button>
            </div>

            <!-- Main Stats List -->
            <div id="stats-view-main">
                <ul id="stats-list" class="stats-list">
                    <!-- Stats will be injected here -->
                </ul>
            </div>

            <!-- Detail/Trend View (Hidden by default) -->
            <div id="stats-view-detail" class="hidden">
                <div class="detail-header">
                    <button id="back-to-stats" class="text-btn-small">← 戻る</button>
                    <h3 id="detail-item-name">項目名</h3>
                </div>

                <!-- Trend Navigation -->
                <div class="date-nav" style="margin-bottom: 10px;">
                    <button id="trend-prev" class="icon-btn-small">◀</button>
                    <span id="trend-date-range" class="date-label" style="margin:0; font-size: 0.8rem;">期間</span>
                    <button id="trend-next" class="icon-btn-small">▶</button>
                </div>

                <!-- Simple CSS Bar Chart -->
                <div id="trend-chart" class="trend-chart">
                    <!-- Bars will be injected here -->
                </div>
            </div>

            <button id="close-stats" class="text-btn">閉じる</button>
        </div>
    </div>

    <!-- Edit Count Modal -->
    <div id="edit-modal" class="modal hidden">
        <div class="modal-content glass">
            <h2>回数の修正</h2>
            <p id="edit-item-name" class="date-label">項目名</p>
            <div class="counter-control">
                <button id="decrease-count" class="circle-btn">-</button>
                <span id="edit-count-value" class="count-display">0</span>
                <button id="increase-count" class="circle-btn">+</button>
            </div>
            <div class="modal-actions">
                <button id="delete-item" class="text-btn" style="color: var(--danger-color);">削除</button>
                <button id="cancel-edit" class="text-btn">キャンセル</button>
                <button id="save-edit" class="primary-btn">保存</button>
            </div>
        </div>
    </div>

    <!-- Manage Items Modal -->
    <div id="manage-modal" class="modal hidden">
        <div class="modal-content glass" style="max-width: 450px; width: 90%;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0; font-size: 1.2rem;">習慣の管理</h2>
                <button id="close-manage-x" class="text-btn-small" style="font-size: 1.2rem; color: white;">✕</button>
            </div>
            
            <div style="max-height: 60vh; overflow-y: auto; margin-bottom: 20px; text-align: left;">
                <ul id="manage-list" style="list-style: none; padding: 0; margin: 0;">
                    <!-- Manage items will be injected here -->
                </ul>
            </div>

            <button id="close-manage" class="primary-btn" style="width: 100%;">閉じる</button>
        </div>
    </div>

    <!-- Confirm / Alert Modal -->
    <div id="confirm-modal" class="modal modal-center modal-high-z hidden">
        <div class="modal-content glass" style="max-width: 340px; padding: 24px; box-sizing: border-box;">
            <h2 id="confirm-title" style="margin-top: 0; margin-bottom: 12px; font-size: 1.15rem;">習慣の削除</h2>
            <p id="confirm-message" style="color: rgba(255, 255, 255, 0.85); font-size: 0.95rem; line-height: 1.5; margin: 0 0 20px 0; white-space: pre-wrap;">この習慣とこれまでの記録をすべて削除しますか？\nこの操作は取り消せません。</p>
            <div class="modal-actions" style="gap: 12px;">
                <button id="confirm-cancel-btn" class="text-btn" style="background: rgba(255, 255, 255, 0.1); border-radius: 12px; flex: 1; padding: 12px; color: #fff;">キャンセル</button>
                <button id="confirm-ok-btn" class="primary-btn" style="background: var(--danger-color, #ff6b6b); border-radius: 12px; flex: 1; padding: 12px;">削除</button>
            </div>
        </div>
    </div>

    <script>
// State
let items = [];
let logs = [];

function getTodayStr() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dStr = String(d.getDate()).padStart(2, '0');
    return \`\${y}/\${m}/\${dStr}\`;
}

function parseDateStr(str) {
    const parts = str.split('/');
    if (parts.length === 3) {
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
    return new Date();
}

// 共通の日付クレンジング関数
function sanitizeDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    
    // スラッシュをハイフンに統一し、余計な空白をトリム
    const cleaned = dateStr.replace(/\\//g, '-').trim();
    
    // YYYY-MM-DD 形式の正規表現チェック
    if (/^\\d{4}-\\d{2}-\\d{2}$/.test(cleaned)) {
        return cleaned.replace(/-/g, '/');
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
                return y + '/' + m + '/' + d;
            }
        }
    }
    return null;
}

let currentDateStr = sanitizeDate(window.__TARGET_DATE__) || getTodayStr();
let currentStatsDate = parseDateStr(currentDateStr);
let longPressTimer;
let isLongPress = false;
let editingItemId = null;
let editingDate = null;

// Trend View State
let currentTrendItemId = null;
let currentTrendEndDate = new Date();

// DOM Elements
const gridContainer = document.getElementById('grid-container');
const addBtn = document.getElementById('add-btn');
const addModal = document.getElementById('add-modal');
const confirmAddBtn = document.getElementById('confirm-add');
const cancelAddBtn = document.getElementById('cancel-add');
const newItemInput = document.getElementById('new-item-name');
const colorBtns = document.querySelectorAll('.color-btn');

const statsBtn = document.getElementById('stats-btn');
const statsModal = document.getElementById('stats-modal');
const closeStatsBtn = document.getElementById('close-stats');
const statsList = document.getElementById('stats-list');
const currentDateEl = document.getElementById('current-date');
const prevDayBtn = document.getElementById('prev-day');
const nextDayBtn = document.getElementById('next-day');
const statsViewMain = document.getElementById('stats-view-main');
const statsViewDetail = document.getElementById('stats-view-detail');
const detailItemName = document.getElementById('detail-item-name');
const trendChart = document.getElementById('trend-chart');
const backToStatsBtn = document.getElementById('back-to-stats');
// Trend Nav Elements
const trendPrevBtn = document.getElementById('trend-prev');
const trendNextBtn = document.getElementById('trend-next');
const trendDateRangeEl = document.getElementById('trend-date-range');


// Edit Modal Elements
const editModal = document.getElementById('edit-modal');
const editItemName = document.getElementById('edit-item-name');
const editCountValue = document.getElementById('edit-count-value');
const decreaseCountBtn = document.getElementById('decrease-count');
const increaseCountBtn = document.getElementById('increase-count');
const cancelEditBtn = document.getElementById('cancel-edit');
const saveEditBtn = document.getElementById('save-edit');
const deleteBtn = document.getElementById('delete-item');

// Manage Modal Elements
const manageBtn = document.getElementById('manage-btn');
const manageModal = document.getElementById('manage-modal');
const closeManageBtn = document.getElementById('close-manage');
const closeManageXBtn = document.getElementById('close-manage-x');
const manageList = document.getElementById('manage-list');

// Confirm Modal Elements
const confirmModal = document.getElementById('confirm-modal');
const confirmTitle = document.getElementById('confirm-title');
const confirmMessage = document.getElementById('confirm-message');
const confirmOkBtn = document.getElementById('confirm-ok-btn');
const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
let confirmCallback = null;

function showConfirm(title, msg, onOk, okText = "削除", cancelText = "キャンセル", isDanger = true) {
    if (confirmTitle) confirmTitle.innerText = title;
    if (confirmMessage) confirmMessage.innerText = msg;
    if (confirmOkBtn) {
        confirmOkBtn.innerText = okText;
        confirmOkBtn.style.background = isDanger ? 'var(--danger-color, #ff6b6b)' : 'var(--primary-color, #6c5ce7)';
    }
    if (confirmCancelBtn) {
        confirmCancelBtn.innerText = cancelText;
        confirmCancelBtn.style.display = 'block';
    }
    confirmCallback = onOk;
    if (confirmModal) confirmModal.classList.remove('hidden');
}

function showAlert(title, msg, onOk = null, okText = "OK") {
    if (confirmTitle) confirmTitle.innerText = title;
    if (confirmMessage) confirmMessage.innerText = msg;
    if (confirmOkBtn) {
        confirmOkBtn.innerText = okText;
        confirmOkBtn.style.background = 'var(--primary-color, #6c5ce7)';
    }
    if (confirmCancelBtn) {
        confirmCancelBtn.style.display = 'none';
    }
    confirmCallback = onOk;
    if (confirmModal) confirmModal.classList.remove('hidden');
}

if (confirmOkBtn) {
    confirmOkBtn.onclick = () => {
        if (confirmModal) confirmModal.classList.add('hidden');
        if (confirmCallback) {
            const cb = confirmCallback;
            confirmCallback = null;
            cb();
        }
    };
}

if (confirmCancelBtn) {
    confirmCancelBtn.onclick = () => {
        if (confirmModal) confirmModal.classList.add('hidden');
        confirmCallback = null;
    };
}

// Selected Color State
let selectedColor = 'linear-gradient(135deg, #FF6B6B, #EE5253)'; // default

// Initialization
function init() {
    loadData();
    render();
    setupEventListeners();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

function loadData() {
    const storage = window.appStorage || { getItem: () => null, setItem: () => {} };
    const savedItems = storage.getItem('habit-items');
    const savedLogs = storage.getItem('habit-logs');

    if (savedItems) {
        try {
            let parsed = JSON.parse(savedItems);
            if (typeof parsed === 'string') {
                try {
                    parsed = JSON.parse(parsed);
                } catch (e) {}
            }
            items = Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.error('Failed to parse habit-items:', e);
            items = [];
        }
    } else {
        items = [];
    }

    if (savedLogs) {
        try {
            let parsed = JSON.parse(savedLogs);
            if (typeof parsed === 'string') {
                try {
                    parsed = JSON.parse(parsed);
                } catch (e) {}
            }
            logs = Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.error('Failed to parse habit-logs:', e);
            logs = [];
        }
    } else {
        logs = [];
    }
}

function saveData() {
    const storage = window.appStorage || { getItem: () => null, setItem: () => {} };
    storage.setItem('habit-items', JSON.stringify(items));
    storage.setItem('habit-logs', JSON.stringify(logs));
}

function notifyModalState(show) {
    if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
        try {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MODAL_STATE_CHANGE', visible: show }));
        } catch (e) {
            console.warn('Failed to post MODAL_STATE_CHANGE:', e);
        }
    }
}

function setupEventListeners() {
    // Modals
    addBtn.addEventListener('click', () => {
        newItemInput.value = '';
        addModal.classList.remove('hidden');
        notifyModalState(true);
        newItemInput.focus();
    });

    cancelAddBtn.addEventListener('click', () => {
        addModal.classList.add('hidden');
        notifyModalState(false);
    });

    // Enter key to dismiss keyboard on input
    newItemInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            newItemInput.blur();
        }
    });

    // Color Picker
    colorBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            colorBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedColor = btn.style.getPropertyValue('--bg');
        });
    });
    // Set first color as default selected
    if (colorBtns.length > 0) colorBtns[0].click();

    // Add Item Confirm
    confirmAddBtn.addEventListener('click', addItem);

    // Stats
    statsBtn.addEventListener('click', () => {
        currentStatsDate = parseDateStr(currentDateStr); // Use selected date
        showStats();
        notifyModalState(true);
    });
    closeStatsBtn.addEventListener('click', () => {
        statsModal.classList.add('hidden');
        notifyModalState(false);
        statsViewMain.classList.remove('hidden');
        statsViewDetail.classList.add('hidden');
    });

    // Date Navigation
    prevDayBtn.addEventListener('click', () => {
        currentStatsDate.setDate(currentStatsDate.getDate() - 1);
        notifyDateChanged(currentStatsDate);
        showStats();
    });
    nextDayBtn.addEventListener('click', () => {
        currentStatsDate.setDate(currentStatsDate.getDate() + 1);
        notifyDateChanged(currentStatsDate);
        showStats();
    });

    // Detail View Navigation
    backToStatsBtn.addEventListener('click', () => {
        statsViewDetail.classList.add('hidden');
        statsViewMain.classList.remove('hidden');
    });

function notifyDateChanged(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    currentDateStr = \`\${y}/\${m}/\${d}\`;
    render();
    try {
        if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'DATE_CHANGED',
                date: currentDateStr
            }));
        }
    } catch (e) {
        console.error("Failed to post DATE_CHANGED message", e);
    }
}

    // Trend View Navigation
    trendPrevBtn.addEventListener('click', () => {
        currentTrendEndDate.setDate(currentTrendEndDate.getDate() - 7);
        renderTrendChart(currentTrendItemId);
    });

    trendNextBtn.addEventListener('click', () => {
        currentTrendEndDate.setDate(currentTrendEndDate.getDate() + 7);
        renderTrendChart(currentTrendItemId);
    });

    // Edit Modal Buttons
    cancelEditBtn.addEventListener('click', () => {
        editModal.classList.add('hidden');
    });

    decreaseCountBtn.addEventListener('click', () => {
        let val = parseInt(editCountValue.textContent);
        if (val > 0) editCountValue.textContent = val - 1;
    });

    increaseCountBtn.addEventListener('click', () => {
        let val = parseInt(editCountValue.textContent);
        editCountValue.textContent = val + 1;
    });

    saveEditBtn.addEventListener('click', saveEditCount);
    deleteBtn.addEventListener('click', deleteItem);

    // Manage Modal Buttons
    manageBtn.addEventListener('click', showManageModal);
    closeManageBtn.addEventListener('click', () => {
        manageModal.classList.add('hidden');
        render();
    });
    closeManageXBtn.addEventListener('click', () => {
        manageModal.classList.add('hidden');
        render();
    });

    // Close modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target === addModal) { addModal.classList.add('hidden'); notifyModalState(false); }
        if (e.target === statsModal) { statsModal.classList.add('hidden'); notifyModalState(false); }
        if (e.target === editModal) { editModal.classList.add('hidden'); notifyModalState(false); }
        if (e.target === manageModal) {
            manageModal.classList.add('hidden');
            notifyModalState(false);
            render();
        }
    });
}

function addItem() {
    const name = newItemInput.value.trim();
    if (!name) return;

    const newItem = {
        id: Date.now().toString(),
        name: name,
        color: selectedColor,
        createdAt: Date.now()
    };

    items.push(newItem);
    saveData();
    render();
    addModal.classList.add('hidden');
    notifyModalState(false);
}

const COLOR_OPTIONS = [
    { name: 'red', value: 'linear-gradient(135deg, #FF6B6B, #EE5253)' },
    { name: 'blue', value: 'linear-gradient(135deg, #48DBFB, #0ABDE3)' },
    { name: 'green', value: 'linear-gradient(135deg, #1DD1A1, #10AC84)' },
    { name: 'yellow', value: 'linear-gradient(135deg, #FECA57, #FF9F43)' },
    { name: 'purple', value: 'linear-gradient(135deg, #A29BFE, #6C5CE7)' }
];

function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function showManageModal() {
    renderManageList();
    manageModal.classList.remove('hidden');
    notifyModalState(true);
}
window.showManageModal = showManageModal;
window.openManageModal = showManageModal;

function renderManageList() {
    manageList.innerHTML = '';
    if (items.length === 0) {
        manageList.innerHTML = '<li style="text-align: center; opacity: 0.5; padding: 20px 0; color: white;">項目がありません</li>';
        return;
    }

    items.forEach((item, index) => {
        const isFirst = index === 0;
        const isLast = index === items.length - 1;
        const isHidden = item.visible === false;

        const li = document.createElement('li');
        li.className = 'manage-item-container' + (isHidden ? ' is-hidden-item' : '');
        li.id = \`manage-item-\${item.id}\`;

        const eyeIcon = isHidden
            ? \`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>\`
            : \`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>\`;

        const hiddenBadge = isHidden ? ' <span style="font-size:0.75rem; opacity:0.6; color:#ffaaaa; margin-left:4px;">(非表示中)</span>' : '';

        li.innerHTML = \`
            <div class="manage-item">
                <div class="manage-reorder">
                    <button class="manage-reorder-btn" onclick="moveItemUp('\${item.id}', event)" \${isFirst ? 'disabled' : ''}>▲</button>
                    <button class="manage-reorder-btn" onclick="moveItemDown('\${item.id}', event)" \${isLast ? 'disabled' : ''}>▼</button>
                </div>
                <div class="manage-color-dot" style="background: \${item.color}" onclick="toggleColorPicker('\${item.id}')"></div>
                <input type="text" class="manage-input" value="\${escapeHtml(item.name)}" onchange="renameItem('\${item.id}', this.value)" onkeydown="if(event.key==='Enter') this.blur()" />
                <button class="manage-visibility-btn \${isHidden ? 'is-hidden-item' : ''}" onclick="toggleItemVisibility('\${item.id}')" aria-label="表示・非表示">\${eyeIcon}</button>
                <button class="manage-delete-btn" onclick="deleteItemFromManage('\${item.id}')" aria-label="削除">🗑</button>
            </div>
            <div id="color-picker-\${item.id}" class="manage-color-picker-inline hidden" style="padding-left: 40px; display: flex; gap: 8px; margin-top: 8px; margin-bottom: 8px;">
                \${COLOR_OPTIONS.map(c => '<div class="color-btn-mini ' + (item.color === c.value ? "selected" : "") + '" style="background: ' + c.value + '; width: 24px; height: 24px; border-radius: 50%; border: 2px solid ' + (item.color === c.value ? "white" : "transparent") + '; cursor: pointer;" onclick="changeItemColor(\\\'' + item.id + '\\\', \\\'' + c.value + '\\\')"></div>').join('')}
            </div>
        \`;
        manageList.appendChild(li);
    });
}

function toggleColorPicker(id) {
    const el = document.getElementById(\`color-picker-\${id}\`);
    if (el) {
        el.classList.toggle('hidden');
    }
}

function changeItemColor(id, color) {
    const item = items.find(i => i.id === id);
    if (item) {
        item.color = color;
        saveData();
        render();
        renderManageList();
    }
}

function renameItem(id, newName) {
    const item = items.find(i => i.id === id);
    const trimmed = newName.trim();
    if (item && trimmed) {
        item.name = trimmed;
        saveData();
        render();
    } else {
        renderManageList();
    }
}

function moveItemUp(id, e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
    }

    const idx = items.findIndex(i => i.id === id);
    if (idx > 0) {
        const temp = items[idx];
        items[idx] = items[idx - 1];
        items[idx - 1] = temp;
        saveData();
        render();
        renderManageList();
    }
}

function moveItemDown(id, e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
    }

    const idx = items.findIndex(i => i.id === id);
    if (idx !== -1 && idx < items.length - 1) {
        const temp = items[idx];
        items[idx] = items[idx + 1];
        items[idx + 1] = temp;
        saveData();
        render();
        renderManageList();
    }
}

function deleteItemFromManage(id) {
    const item = items.find(i => i.id === id);
    if (!item) return;

    showConfirm('習慣の削除', 'この習慣とこれまでの記録をすべて削除しますか？\nこの操作は取り消せません。', () => {
        items = items.filter(i => i.id !== id);
        logs = logs.filter(log => log.itemId !== id);
        saveData();
        render();
        renderManageList();
    });
}

function toggleItemVisibility(id) {
    const item = items.find(i => i.id === id);
    if (item) {
        item.visible = (item.visible === undefined) ? false : !item.visible;
        saveData();
        render();
        renderManageList();
    }
}

function track(id, event) {
    if (isLongPress || isMoving) return; // Prevent track after long press or moving/scrolling

    const parts = currentDateStr.split('/').map(Number);
    const now = new Date();
    const dateObj = new Date(parts[0], parts[1] - 1, parts[2], now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    const timestamp = dateObj.getTime();

    logs.push({
        itemId: id,
        timestamp: timestamp
    });
    saveData();

    // Trigger Ripple
    if (event) {
        createRipple(event);
    }

    render(); // Update counts
}

let touchStartX = 0;
let touchStartY = 0;
const MOVE_THRESHOLD = 10; // pixels
let isMoving = false;

// Long Press Handling
function handleTouchStart(id, event) {
    isLongPress = false;
    isMoving = false;
    const touch = event.touches ? event.touches[0] : event;
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;

    longPressTimer = setTimeout(() => {
        isLongPress = true;
        openEditModal(id);
        try {
            if (navigator.vibrate) navigator.vibrate(50);
        } catch (e) {}
    }, 800); // 800ms for long press
}

function handleTouchMove(event) {
    const touch = event.touches ? event.touches[0] : event;
    const diffX = Math.abs(touch.clientX - touchStartX);
    const diffY = Math.abs(touch.clientY - touchStartY);
    if (diffX > MOVE_THRESHOLD || diffY > MOVE_THRESHOLD) {
        isMoving = true;
        clearTimeout(longPressTimer);
    }
}

function handleTouchEnd() {
    clearTimeout(longPressTimer);
}

function openEditModal(id) {
    const item = items.find(i => i.id === id);
    if (!item) return;

    editingItemId = id;
    editingDate = parseDateStr(currentDateStr); // Default edit for selected date

    const count = getCountForDate(id, editingDate);

    const isToday = currentDateStr === getTodayStr();
    editItemName.textContent = \`\${item.name} (\${isToday ? '今日' : currentDateStr})\`;
    editCountValue.textContent = count;

    editModal.classList.remove('hidden');
}

function saveEditCount() {
    if (!editingItemId) return;

    const targetCount = parseInt(editCountValue.textContent);
    const itemLogs = logs.filter(log => log.itemId === editingItemId);
    const dayStart = new Date(editingDate.getFullYear(), editingDate.getMonth(), editingDate.getDate()).getTime();
    const dayEnd = dayStart + 86400000;

    const todayLogs = itemLogs.filter(log => log.timestamp >= dayStart && log.timestamp < dayEnd);
    const currentCount = todayLogs.length;

    if (targetCount > currentCount) {
        // Add logs
        for (let i = 0; i < targetCount - currentCount; i++) {
            logs.push({
                itemId: editingItemId,
                timestamp: dayStart + 43200000 // Noon of that day
            });
        }
    } else if (targetCount < currentCount) {
        // Remove logs but keep others
        logs = logs.filter(log => !(log.itemId === editingItemId && log.timestamp >= dayStart && log.timestamp < dayEnd));
        for (let i = 0; i < targetCount; i++) {
            logs.push({
                itemId: editingItemId,
                timestamp: dayStart + 43200000
            });
        }
    }

    saveData();
    render();
    editModal.classList.add('hidden');
}

function deleteItem() {
    if (!editingItemId) return;

    showConfirm('習慣の削除', 'この習慣とこれまでの記録をすべて削除しますか？\nこの操作は取り消せません。', () => {
        items = items.filter(item => item.id !== editingItemId);
        logs = logs.filter(log => log.itemId !== editingItemId);
        saveData();
        render();
        editModal.classList.add('hidden');
    });
}


function createRipple(event) {
    const card = event.currentTarget;
    const ripple = document.createElement('span');
    const rect = card.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = \`\${size}px\`;
    ripple.style.left = \`\${x}px\`;
    ripple.style.top = \`\${y}px\`;
    ripple.classList.add('ripple');

    card.appendChild(ripple);

    setTimeout(() => {
        ripple.remove();
    }, 600);
}

function getCountForDate(itemId, date) {
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const endOfDay = startOfDay + 86400000;

    const targetStr = String(itemId);
    const item = items.find(i => String(i.id) === targetStr || (i.createdAt && String(i.createdAt) === targetStr) || i.name === itemId);
    const validIds = new Set();
    validIds.add(targetStr);
    if (item) {
        if (item.id) validIds.add(String(item.id));
        if (item.createdAt) validIds.add(String(item.createdAt));
        if (item.name) validIds.add(item.name);
    }

    return logs.filter(log =>
        validIds.has(String(log.itemId)) && log.timestamp >= startOfDay && log.timestamp < endOfDay
    ).length;
}

function render() {
    gridContainer.innerHTML = '';

    // We always use 2 columns for clear touch targets on mobile when scrolling.
    const visibleItems = items.filter(item => item.visible !== false);

    visibleItems.forEach(item => {
        const card = document.createElement('div');
        card.className = 'habit-card';
        card.style.background = item.color;

        const count = getCountForDate(item.id, parseDateStr(currentDateStr));

        card.innerHTML = \`
            <div class="habit-name">\${item.name}</div>
            <div class="habit-count">\${count}</div>
        \`;

        // Touch events for long press and scrolling
        card.addEventListener('mousedown', (e) => handleTouchStart(item.id, e));
        card.addEventListener('touchstart', (e) => handleTouchStart(item.id, e), { passive: true });

        card.addEventListener('mousemove', handleTouchMove);
        card.addEventListener('touchmove', handleTouchMove, { passive: true });

        card.addEventListener('mouseup', handleTouchEnd);
        card.addEventListener('touchend', handleTouchEnd);
        card.addEventListener('touchcancel', handleTouchEnd);

        card.addEventListener('click', (e) => track(item.id, e));

        gridContainer.appendChild(card);
    });

    gridContainer.appendChild(addBtn);
}

function showStats() {
    // Update Date Display
    currentDateEl.textContent = \`\${currentStatsDate.getFullYear()}年\${currentStatsDate.getMonth() + 1}月\${currentStatsDate.getDate()}日\`;

    statsList.innerHTML = '';

    const itemsToShow = items.filter(item => {
        const isVisible = item.visible !== false;
        if (isVisible) return true;
        const count = getCountForDate(item.id, currentStatsDate);
        return count > 0;
    });

    if (itemsToShow.length === 0) {
        statsList.innerHTML = '<li class="stats-item" style="justify-content:center; opacity:0.5;">項目がありません</li>';
        statsModal.classList.remove('hidden');
        return;
    }

    itemsToShow.forEach(item => {
        const count = getCountForDate(item.id, currentStatsDate);
        const li = document.createElement('li');
        li.className = 'stats-item';
        
        const isItemHidden = item.visible === false;
        const displayName = isItemHidden ? \`\${item.name} <span style="font-size:0.8rem; opacity:0.5;">(非表示中)</span>\` : item.name;

        li.innerHTML = \`
            <span>\${displayName}</span>
            <span class="stats-count">\${count}回</span>
        \`;
        if (isItemHidden) {
            li.style.opacity = '0.7';
        }

        li.addEventListener('click', () => showTrend(item.id));
        statsList.appendChild(li);
    });

    statsModal.classList.remove('hidden');
}

function showTrend(itemId) {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    currentTrendItemId = itemId;
    currentTrendEndDate = new Date(); // Reset to today initially

    detailItemName.textContent = \`\${item.name} の推移\`;
    statsViewMain.classList.add('hidden');
    statsViewDetail.classList.remove('hidden');

    renderTrendChart(itemId);
}

function renderTrendChart(itemId) {
    trendChart.innerHTML = '';
    const days = 7;
    const endDate = currentTrendEndDate;

    // Update labels to show range
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - (days - 1));
    trendDateRangeEl.textContent = \`\${startDate.getMonth() + 1}/\${startDate.getDate()} - \${endDate.getMonth() + 1}/\${endDate.getDate()}\`;

    let maxCount = 0;
    const data = [];

    // Calculate last 7 days ending at endDate
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(endDate);
        d.setDate(endDate.getDate() - i);
        const count = getCountForDate(itemId, d);
        if (count > maxCount) maxCount = count;
        data.push({ date: d, count: count });
    }

    // Render bars
    data.forEach(d => {
        const container = document.createElement('div');
        container.className = 'chart-bar-container';

        const heightPercent = maxCount > 0 ? (d.count / maxCount) * 100 : 0;

        // Date Label (e.g., "2/7")
        const dateLabel = document.createElement('div');
        dateLabel.className = 'chart-label';
        dateLabel.textContent = \`\${d.date.getMonth() + 1}/\${d.date.getDate()}\`;

        // Value Label
        const valLabel = document.createElement('div');
        valLabel.className = 'chart-value';
        valLabel.textContent = d.count;

        const bar = document.createElement('div');
        bar.className = 'chart-bar';
        bar.style.height = \`\${Math.max(heightPercent, 1)}%\`; // Ensure at least a tiny bit visible

        container.appendChild(valLabel);
        container.appendChild(bar);
        container.appendChild(dateLabel);

        trendChart.appendChild(container);
    });
}

</script>
    <script>
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js');
        }
    </script>
</body>

</html>`;
