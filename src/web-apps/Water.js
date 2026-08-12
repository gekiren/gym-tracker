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
    <title>水分補給トラッカー</title>
    <style>
:root {
    --primary-color: #4facfe;
    --primary-gradient: linear-gradient(135deg, #4facfe, #00f2fe);
    --secondary-color: #1e1e1e;
    --text-color: #ffffff;
    --text-muted: #a0a0a0;
    --bg-color: #121212;
    --card-bg: #1e1e1e;
    --header-text: #ffffff;
    --border-color: #333333;
    --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.2);
    --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
    --radius-lg: 24px;
    --radius-md: 16px;
    --radius-sm: 8px;
    --font-family: 'Noto Sans JP', sans-serif;
}

/* Reset & Base */
* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    font-family: var(--font-family);
    background-color: var(--bg-color);
    color: var(--text-color);
    -webkit-font-smoothing: antialiased;
}

button {
    font-family: inherit;
    border: none;
    cursor: pointer;
    background: none;
    outline: none;
}

input {
    font-family: inherit;
}

/* Layout */
.app-container {
    max-width: 100%;
    margin: 0;
    background-color: var(--bg-color);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

/* Header Section */
.header-section {
    background: var(--primary-gradient);
    padding: 24px 20px 28px;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    color: var(--header-text);
    position: relative;
    display: flex;
    justify-content: center;
    box-shadow: var(--shadow-sm);
    z-index: 10;
}

.settings-button {
    position: absolute;
    top: 20px;
    right: 20px;
    color: white;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.3s;
}

.settings-button:active {
    background: rgba(255, 255, 255, 0.3);
}

.progress-container {
    position: relative;
    width: 270px;
    height: 270px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.progress-ring {
    transform: rotate(-90deg);
}

.progress-ring__circle {
    stroke-dasharray: 766.5;
    /* 2 * PI * 122 */
    stroke-dashoffset: 766.5;
    transition: stroke-dashoffset 0.5s ease-out;
}

.progress-ring__caffeine {
    stroke-dasharray: 653.5;
    /* 2 * PI * 104 */
    stroke-dashoffset: 653.5;
    transition: stroke-dashoffset 0.5s ease-out;
}

.progress-text {
    position: absolute;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.current-amount {
    font-size: 3rem;
    font-weight: 700;
    line-height: 1;
}

.current-amount .unit {
    font-size: 1rem;
    font-weight: 500;
    margin-left: 2px;
}

.goal-amount {
    font-size: 0.9rem;
    opacity: 0.9;
    margin-top: 4px;
}

.percentage {
    display: none;
    font-size: 0.8rem;
    background: rgba(255, 255, 255, 0.2);
    padding: 2px 8px;
    border-radius: 12px;
    margin-top: 8px;
}

/* Main Content */
.main-content {
    flex: 1;
    padding: 0 0 40px 0;
    margin-top: 0;
    z-index: 20;
}

/* Controls Section */
.controls-section {
    background: transparent;
    border-radius: 0;
    padding: 20px 16px;
    box-shadow: none;
    margin-bottom: 0;
    border-bottom: 1px solid var(--border-color);
}

.quick-add-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-bottom: 16px;
}

.presets-container {
    display: contents;
}

.quick-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    aspect-ratio: 1;
    background-color: rgba(79, 172, 254, 0.15);
    color: var(--primary-color);
    border-radius: var(--radius-md);
    transition: transform 0.1s, background-color 0.2s;
    font-weight: 700;
}

.quick-btn:active {
    transform: scale(0.95);
    background-color: rgba(79, 172, 254, 0.3);
}

.quick-btn .icon {
    font-size: 24px;
    margin-bottom: 4px;
}

.action-button.secondary {
    width: 100%;
    padding: 12px;
    border-radius: var(--radius-md);
    border: 2px dashed var(--border-color);
    color: var(--primary-color);
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: background 0.2s;
}

.action-button.secondary:active {
    background-color: #e0f7fa;
}

/* History Section */
.history-section {
    background: transparent;
    border-radius: 0;
    padding: 20px 16px;
    box-shadow: none;
    min-height: 200px;
}

.tabs {
    display: flex;
    gap: 16px;
    margin-bottom: 20px;
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 8px;
}

.tab-btn {
    font-size: 0.95rem;
    font-weight: 500;
    color: var(--text-muted);
    padding: 8px 4px;
    position: relative;
    transition: color 0.3s;
}

.tab-btn.active {
    color: var(--primary-color);
}

.tab-btn.active::after {
    content: '';
    position: absolute;
    bottom: -9px;
    left: 0;
    width: 100%;
    height: 3px;
    background-color: var(--primary-color);
    border-radius: 3px 3px 0 0;
}

.tab-content {
    display: none;
}

.tab-content.active {
    display: block;
    animation: fadeIn 0.3s;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Lists */
.log-list {
    list-style: none;
}

.log-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px solid var(--border-color);
}

.log-item:last-child {
    border-bottom: none;
}

.log-item .time {
    color: var(--text-muted);
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    gap: 6px;
}

.log-item .amount {
    font-weight: 600;
    color: var(--primary-color);
}

.empty-state {
    text-align: center;
    padding: 40px 0;
    color: var(--text-muted);
    font-size: 0.9rem;
}

.delete-btn {
    color: #ff3b30;
    padding: 8px;
    border-radius: 50%;
    display: flex;
}

.delete-btn:active {
    background-color: rgba(255, 59, 48, 0.15);
}

/* Modal */
.modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s;
}

.modal.visible {
    opacity: 1;
    pointer-events: auto;
}

.modal-content {
    background: var(--card-bg);
    width: 90%;
    max-width: 320px;
    border-radius: var(--radius-lg);
    padding: 24px;
    box-shadow: var(--shadow-md);
    transform: scale(0.9);
    transition: transform 0.3s;
}

.modal.visible .modal-content {
    transform: scale(1);
}

.modal h3 {
    margin-bottom: 20px;
    text-align: center;
}

.input-group {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 24px;
    background: var(--bg-color);
    border-radius: var(--radius-md);
    padding: 12px;
}

.input-group input {
    border: none;
    background: none;
    font-size: 2rem;
    width: 120px;
    text-align: right;
    outline: none;
    color: var(--text-color);
}

.input-group .unit-label {
    font-size: 1.2rem;
    color: var(--text-muted);
    margin-left: 8px;
    font-weight: 500;
}

.setting-item {
    margin-bottom: 24px;
}

.setting-item label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: var(--text-muted);
}

.setting-item input {
    width: 100%;
    padding: 12px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    font-size: 1.1rem;
    outline: none;
    background: var(--bg-color);
    color: var(--text-color);
}

.setting-item input:focus {
    border-color: var(--primary-color);
}

.modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 16px;
}

.text-button {
    color: var(--text-muted);
    font-weight: 500;
}

.primary-button {
    background-color: var(--primary-color);
    color: white;
    padding: 10px 24px;
    border-radius: 20px;
    font-weight: 600;
    box-shadow: 0 4px 10px rgba(79, 172, 254, 0.3);
}

.primary-button:active {
    transform: translateY(1px);
    box-shadow: 0 2px 5px rgba(79, 172, 254, 0.3);
}

/* Weekly Chart Styles */
.week-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    padding: 0 8px;
}

.week-label {
    font-weight: 500;
    font-size: 0.95rem;
    color: var(--text-color);
}

.icon-button.small {
    padding: 4px;
    color: var(--text-muted);
}

.icon-button.small:active {
    background-color: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
}

.bar-chart {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    height: 180px;
    /* Increased height for labels */
    padding-top: 10px;
}

.bar-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 13%;
    font-size: 0.75rem;
    color: var(--text-muted);
    gap: 4px;
    cursor: pointer;
    transition: opacity 0.2s;
}

.bar-col:active {
    opacity: 0.7;
}

.bar-value {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--primary-color);
    margin-bottom: 2px;
}

.bar-bg {
    width: 100%;
    height: 100%;
    background: #2a2a2a;
    border-radius: 4px;
    position: relative;
    overflow: hidden;
    height: 120px;
}

.bar-fill {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    background-color: var(--primary-color);
    border-radius: 4px;
    transition: height 0.5s ease-out;
}

.bar-date {
    font-size: 0.7rem;
}

/* Date Selector Header Styles */
.date-header {
    display: none !important;
    align-items: center;
    justify-content: space-between;
    background-color: var(--card-bg);
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-color);
}
.date-header .icon-button {
    padding: 8px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.05);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
}
.date-header .icon-button:active {
    background: rgba(255, 255, 255, 0.15);
}
.date-text-container {
    display: flex;
    align-items: center;
    gap: 8px;
}
.date-text {
    color: #fff;
    font-size: 1.1rem;
    font-weight: 700;
}
.today-badge {
    background: rgba(79, 172, 254, 0.2);
    color: var(--primary-color);
    padding: 4px 8px;
    border-radius: 8px;
    font-size: 0.75rem;
    font-weight: 600;
    transition: background 0.2s;
}
.today-badge:active {
    background: rgba(79, 172, 254, 0.35);
}
.today-badge.hidden {
    display: none;
}
</style>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet">
    
</head>

<body>
    <div class="app-container">
        <!-- Date Selector Header -->
        <div class="date-header">
            <button id="prevDayBtn" class="icon-button" aria-label="前日">
                <span class="material-icons-round">chevron_left</span>
            </button>
            <div class="date-text-container">
                <span id="dateText" class="date-text"></span>
                <button id="todayBadge" class="today-badge hidden">今日に戻る</button>
            </div>
            <button id="nextDayBtn" class="icon-button" aria-label="翌日">
                <span class="material-icons-round">chevron_right</span>
            </button>
        </div>

        <!-- Header / Progress Section -->
        <header class="header-section">
            <div class="progress-container">
                <svg class="progress-ring" width="270" height="270">
                    <!-- 水の円（外側） -->
                    <circle class="progress-ring__circle-bg" stroke="rgba(255,255,255,0.2)" stroke-width="10"
                        fill="transparent" r="122" cx="135" cy="135" />
                    <circle class="progress-ring__circle" stroke="#ffffff" stroke-width="10" stroke-linecap="round"
                        fill="transparent" r="122" cx="135" cy="135" />
                    
                    <!-- カフェインの円（内側） -->
                    <circle class="progress-ring__caffeine-bg" stroke="rgba(255,255,255,0.15)" stroke-width="8"
                        fill="transparent" r="104" cx="135" cy="135" />
                    <circle class="progress-ring__caffeine" stroke="#ffb74d" stroke-width="8" stroke-linecap="round"
                        fill="transparent" r="104" cx="135" cy="135" />
                </svg>
                <div class="progress-text">
                    <div class="current-amount"><span id="currentAmount">0</span><span class="unit">ml</span></div>
                    <div class="goal-amount">目標: <span id="goalAmount">2000</span>ml</div>
                    <div class="caffeine-amount" id="caffeineAmount" style="font-size: 0.85rem; opacity: 0.9; margin-top: 4px; color: #000000; display: flex; align-items: center; justify-content: center; gap: 4px;">
                        <span class="material-icons-round" style="font-size: 16px;">coffee</span>カフェイン: <span id="todayCaffeine">0</span> / <span id="caffeineLimit">400</span>mg
                    </div>
                    <div class="percentage" id="percentage">0%</div>
                </div>
            </div>
            <button id="settingsBtn" class="icon-button settings-button" aria-label="設定">
                <span class="material-icons-round">settings</span>
            </button>
        </header>

        <!-- Main Content -->
        <main class="main-content">
            <!-- Quick Add Controls -->
            <section class="controls-section">
                <div class="quick-add-grid" id="quickAddButtons">
                    <!-- Buttons injected by JS -->
                </div>
                <button id="customAddBtn" class="action-button secondary">
                    <span class="material-icons-round">add</span>
                    <span>任意入力</span>
                </button>
            </section>

            <!-- History Tabs -->
            <section class="history-section">
                <div class="tabs">
                    <button class="tab-btn active" data-tab="today">今日の記録</button>
                    <button class="tab-btn" data-tab="weekly">過去1週間</button>
                </div>

                <div id="todayView" class="tab-content active">
                    <ul class="log-list" id="todayLogList">
                        <!-- Log items injected by JS -->
                        <li class="empty-state">まだ記録がありません</li>
                    </ul>
                </div>

                <div id="weeklyView" class="tab-content">
                    <div class="week-nav">
                        <button id="prevWeekBtn" class="icon-button small">
                            <span class="material-icons-round">chevron_left</span>
                        </button>
                        <span id="weekRangeLabel" class="week-label"></span>
                        <button id="nextWeekBtn" class="icon-button small">
                            <span class="material-icons-round">chevron_right</span>
                        </button>
                    </div>
                    <div class="chart-container" id="weeklyChart">
                        <!-- Chart injected by JS -->
                        <div class="empty-state">データがありません</div>
                    </div>
                </div>
            </section>
        </main>
    </div>

    <!-- Custom Amount Modal -->
    <div id="customModal" class="modal hidden">
        <div class="modal-content">
            <h3>水分量を追加</h3>
            <div class="input-group">
                <input type="number" id="customAmountInput" placeholder="200" inputmode="numeric">
                <span class="unit-label">ml</span>
            </div>
            <label for="customCaffeineInput" style="display: block; text-align: center; margin-bottom: 6px; font-size: 0.85rem; color: var(--text-muted); font-weight: 500;">カフェイン入力欄</label>
            <div class="input-group" style="margin-top: 0;">
                <input type="number" id="customCaffeineInput" placeholder="0 (オプション)" inputmode="numeric" style="font-size: 1.2rem; width: 120px;">
                <span class="unit-label">mg</span>
            </div>
            <div class="modal-actions">
                <button id="closeCustomModal" class="text-button">キャンセル</button>
                <button id="confirmCustomAdd" class="primary-button">追加</button>
            </div>
        </div>
    </div>

    <!-- Settings Modal -->
    <div id="settingsModal" class="modal hidden">
        <div class="modal-content">
            <h3>設定</h3>
            <div class="setting-item">
                <label for="goalInput">1日の目標 (ml)</label>
                <input type="number" id="goalInput" value="2000" inputmode="numeric">
            </div>
            <div class="setting-item">
                <label for="widgetQuickAddInput">ウィジェットのクイック追加量 (ml)</label>
                <input type="number" id="widgetQuickAddInput" value="200" inputmode="numeric">
            </div>
            <div class="setting-item">
                <label>クイック追加設定 (水分 ml / カフェイン mg)</label>
                <div class="preset-inputs-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; max-height: 180px; overflow-y: auto; padding-right: 4px;">
                    <div style="display: flex; flex-direction: column; gap: 4px; border: 1px solid var(--border-color); padding: 8px; border-radius: var(--radius-sm);">
                        <span style="font-size: 0.75rem; color: var(--text-muted);">ボタン 1</span>
                        <div style="display: flex; gap: 6px;">
                            <input type="number" id="preset1_amount" placeholder="ml" inputmode="numeric" style="padding: 6px; font-size: 0.9rem; width: 50%;">
                            <input type="number" id="preset1_caffeine" placeholder="mg" inputmode="numeric" style="padding: 6px; font-size: 0.9rem; width: 50%;">
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px; border: 1px solid var(--border-color); padding: 8px; border-radius: var(--radius-sm);">
                        <span style="font-size: 0.75rem; color: var(--text-muted);">ボタン 2</span>
                        <div style="display: flex; gap: 6px;">
                            <input type="number" id="preset2_amount" placeholder="ml" inputmode="numeric" style="padding: 6px; font-size: 0.9rem; width: 50%;">
                            <input type="number" id="preset2_caffeine" placeholder="mg" inputmode="numeric" style="padding: 6px; font-size: 0.9rem; width: 50%;">
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px; border: 1px solid var(--border-color); padding: 8px; border-radius: var(--radius-sm);">
                        <span style="font-size: 0.75rem; color: var(--text-muted);">ボタン 3</span>
                        <div style="display: flex; gap: 6px;">
                            <input type="number" id="preset3_amount" placeholder="ml" inputmode="numeric" style="padding: 6px; font-size: 0.9rem; width: 50%;">
                            <input type="number" id="preset3_caffeine" placeholder="mg" inputmode="numeric" style="padding: 6px; font-size: 0.9rem; width: 50%;">
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px; border: 1px solid var(--border-color); padding: 8px; border-radius: var(--radius-sm);">
                        <span style="font-size: 0.75rem; color: var(--text-muted);">ボタン 4</span>
                        <div style="display: flex; gap: 6px;">
                            <input type="number" id="preset4_amount" placeholder="ml" inputmode="numeric" style="padding: 6px; font-size: 0.9rem; width: 50%;">
                            <input type="number" id="preset4_caffeine" placeholder="mg" inputmode="numeric" style="padding: 6px; font-size: 0.9rem; width: 50%;">
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px; border: 1px solid var(--border-color); padding: 8px; border-radius: var(--radius-sm);">
                        <span style="font-size: 0.75rem; color: var(--text-muted);">ボタン 5</span>
                        <div style="display: flex; gap: 6px;">
                            <input type="number" id="preset5_amount" placeholder="ml" inputmode="numeric" style="padding: 6px; font-size: 0.9rem; width: 50%;">
                            <input type="number" id="preset5_caffeine" placeholder="mg" inputmode="numeric" style="padding: 6px; font-size: 0.9rem; width: 50%;">
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px; border: 1px solid var(--border-color); padding: 8px; border-radius: var(--radius-sm);">
                        <span style="font-size: 0.75rem; color: var(--text-muted);">ボタン 6</span>
                        <div style="display: flex; gap: 6px;">
                            <input type="number" id="preset6_amount" placeholder="ml" inputmode="numeric" style="padding: 6px; font-size: 0.9rem; width: 50%;">
                            <input type="number" id="preset6_caffeine" placeholder="mg" inputmode="numeric" style="padding: 6px; font-size: 0.9rem; width: 50%;">
                        </div>
                    </div>
                </div>
            </div>
            <div class="setting-item">
                <label for="caffeineLimitInput">1日のカフェイン上限 (mg)</label>
                <input type="number" id="caffeineLimitInput" value="400" inputmode="numeric">
            </div>
            <div class="modal-actions">
                <button id="closeSettingsModal" class="text-button">キャンセル</button>
                <button id="saveSettings" class="primary-button">保存</button>
            </div>
        </div>
    </div>

    <!-- Daily Detail Modal -->
    <div id="dailyDetailModal" class="modal hidden">
        <div class="modal-content">
            <h3 id="dailyDetailDate">2026/01/01</h3>
            <ul class="log-list" id="dailyLogList" style="max-height: 200px; overflow-y: auto; margin-bottom: 20px;">
                <!-- Log items injected by JS -->
            </ul>

            <div class="input-group" style="margin-bottom: 8px;">
                <input type="number" id="manualAddInput" placeholder="200" inputmode="numeric">
                <span class="unit-label">ml</span>
            </div>
            <label for="manualAddCaffeineInput" style="display: block; text-align: center; margin-bottom: 6px; font-size: 0.85rem; color: var(--text-muted); font-weight: 500;">カフェイン入力欄</label>
            <div class="input-group" style="margin-bottom: 16px;">
                <input type="number" id="manualAddCaffeineInput" placeholder="0 (オプション)" inputmode="numeric" style="font-size: 1.2rem; width: 120px;">
                <span class="unit-label">mg</span>
            </div>

            <div class="modal-actions">
                <button id="closeDailyDetail" class="text-button">閉じる</button>
                <button id="manualAddBtn" class="primary-button">追加</button>
            </div>
        </div>
    </div>

    <script>
/**
 * Hydration Tracker PWA
 * Core Logic
 */

// --- Constants & Config ---
const DEFAULT_GOAL = 2000;
const DEFAULT_PRESETS = [
    { amount: 150, caffeine: 0 },
    { amount: 250, caffeine: 0 },
    { amount: 500, caffeine: 0 },
    { amount: 150, caffeine: 80 },
    { amount: 350, caffeine: 40 },
    { amount: 250, caffeine: 100 }
];
const DEFAULT_CAFFEINE_LIMIT = 400;
const STORAGE_KEY = 'hydration_data_v1';
const SETTINGS_KEY = 'hydration_settings_v1';

// --- State ---
let state = {
    intakeHistory: [], // Array of { id, timestamp, amount }
    weekOffset: 0, // 0 = current week, -1 = previous week
    currentDate: ''
};

let settings = {
    goal: DEFAULT_GOAL,
    presets: [...DEFAULT_PRESETS],
    caffeineLimit: DEFAULT_CAFFEINE_LIMIT,
    widgetQuickAddAmount: 200
};

// --- DOM Elements ---
const els = {
    currentAmount: document.getElementById('currentAmount'),
    goalAmount: document.getElementById('goalAmount'),
    percentage: document.getElementById('percentage'),
    progressCircle: document.querySelector('.progress-ring__circle'),
    caffeineCircle: document.querySelector('.progress-ring__caffeine'),
    quickAddContainer: document.getElementById('quickAddButtons'),
    customAddBtn: document.getElementById('customAddBtn'),
    settingsBtn: document.getElementById('settingsBtn'),

    // Tabs
    tabs: document.querySelectorAll('.tab-btn'),
    todayView: document.getElementById('todayView'),
    weeklyView: document.getElementById('weeklyView'),
    todayLogList: document.getElementById('todayLogList'),
    weeklyChart: document.getElementById('weeklyChart'),

    // Date Selector
    prevDayBtn: document.getElementById('prevDayBtn'),
    nextDayBtn: document.getElementById('nextDayBtn'),
    dateText: document.getElementById('dateText'),
    todayBadge: document.getElementById('todayBadge'),

    // Week Nav
    prevWeekBtn: document.getElementById('prevWeekBtn'),
    nextWeekBtn: document.getElementById('nextWeekBtn'),
    weekRangeLabel: document.getElementById('weekRangeLabel'),

    // Modals
    customModal: document.getElementById('customModal'),
    settingsModal: document.getElementById('settingsModal'),
    widgetQuickAddInput: document.getElementById('widgetQuickAddInput'),

    // Inputs
    customInput: document.getElementById('customAmountInput'),
    customCaffeineInput: document.getElementById('customCaffeineInput'),
    caffeineLimitInput: document.getElementById('caffeineLimitInput'),
    goalInput: document.getElementById('goalInput'),
    presetInputs: [
        { amount: document.getElementById('preset1_amount'), caffeine: document.getElementById('preset1_caffeine') },
        { amount: document.getElementById('preset2_amount'), caffeine: document.getElementById('preset2_caffeine') },
        { amount: document.getElementById('preset3_amount'), caffeine: document.getElementById('preset3_caffeine') },
        { amount: document.getElementById('preset4_amount'), caffeine: document.getElementById('preset4_caffeine') },
        { amount: document.getElementById('preset5_amount'), caffeine: document.getElementById('preset5_caffeine') },
        { amount: document.getElementById('preset6_amount'), caffeine: document.getElementById('preset6_caffeine') }
    ],

    // Modal Actions
    closeCustom: document.getElementById('closeCustomModal'),
    confirmCustom: document.getElementById('confirmCustomAdd'),
    closeSettings: document.getElementById('closeSettingsModal'),
    saveSettings: document.getElementById('saveSettings'),
    todayCaffeine: document.getElementById('todayCaffeine'),
    caffeineLimit: document.getElementById('caffeineLimit'),
};

// --- Initialization ---
function init() {
    state.currentDate = window.__TARGET_DATE__ || formatDateLocal(new Date());
    loadData();
    renderControlButtons(); // Render presets
    updateUI();
    setupEventListeners();
}

// --- Data Management ---
function loadData() {
    // Load Settings
    try {
        const savedSettings = localStorage.getItem(SETTINGS_KEY);
        if (savedSettings) {
            const parsed = JSON.parse(savedSettings);
            let presets = (parsed && parsed.presets) || [...DEFAULT_PRESETS];
            // 旧形式 (number[]) から新形式 ({amount, caffeine}[]) へのマイグレーション
            if (presets.length > 0 && typeof presets[0] === 'number') {
                presets = presets.map(val => ({ amount: val, caffeine: 0 }));
            }
            while (presets.length < 6) {
                const idx = presets.length;
                presets.push(DEFAULT_PRESETS[idx] || { amount: 200, caffeine: 0 });
            }
            presets = presets.slice(0, 6);

            settings = {
                ...settings,
                ...parsed,
                presets: presets,
                caffeineLimit: (parsed && typeof parsed.caffeineLimit === 'number') ? parsed.caffeineLimit : DEFAULT_CAFFEINE_LIMIT
            };
        }
    } catch (e) {
        console.error("Failed to load settings:", e);
    }

    // Load History
    try {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData) {
            state.intakeHistory = JSON.parse(savedData) || [];
        }
    } catch (e) {
        console.error("Failed to load intake history:", e);
        state.intakeHistory = [];
    }
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.intakeHistory));
}

function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// --- Logic ---
// Helper to format date locally in WebView
function formatDateLocal(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dStr = String(d.getDate()).padStart(2, '0');
    return \`\${y}/\${m}/\${dStr}\`;
}

function addIntake(amount, dateOverride = null, caffeine = 0) {
    if (!amount || amount <= 0) return;

    let timestamp;
    let dateStr;

    if (dateOverride) {
        timestamp = dateOverride.getTime();
        dateStr = formatDateLocal(dateOverride);
    } else {
        const parts = state.currentDate.split('/').map(Number);
        const now = new Date();
        const dateObj = new Date(parts[0], parts[1] - 1, parts[2], now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
        timestamp = dateObj.getTime();
        dateStr = state.currentDate;
    }

    const entry = {
        id: timestamp,
        timestamp: timestamp,
        amount: parseInt(amount),
        caffeine: parseInt(caffeine) || 0,
        date: dateStr
    };

    state.intakeHistory.push(entry);
    saveData();
    updateUI();

    // If we added to a specific past date, re-render that detail view
    if (dateOverride) {
        openDailyDetail(dateOverride);
    }
}

function deleteIntake(id) {
    state.intakeHistory = state.intakeHistory.filter(item => item.id !== id);
    saveData();
    updateUI();
}

function getTodayIntake() {
    return state.intakeHistory.filter(item => item.date === state.currentDate);
}

function getTotalToday() {
    const todayEntries = getTodayIntake();
    return todayEntries.reduce((sum, item) => sum + item.amount, 0);
}

function getTotalCaffeineToday() {
    const todayEntries = getTodayIntake();
    return todayEntries.reduce((sum, item) => sum + (item.caffeine || 0), 0);
}

function getWeeklyData(offset = 0) {
    // Determine the "end date" of the requested week.
    // Logic: Anchor date + (offset * 7 days)
    const parts = state.currentDate.split('/').map(Number);
    const anchorDate = new Date(parts[0], parts[1] - 1, parts[2]);
    anchorDate.setDate(anchorDate.getDate() + (offset * 7));

    const days = [];
    // Just iterate 6 days back from the anchor date
    // Note: If user wants "Standard Week" (Mon-Sun), logic differs.
    // User asked for "Any 1 week selection". "Last 7 days" style shifted by week is easiest to understand
    // BUT standard calendar weeks are often better for "history".
    // Let's stick to "7 days ending at Anchor" for simplest continuity, OR fixed 7-day blocks.
    // Fixed blocks (Sunday to Saturday) are usually clearer for "Previous Week".

    // Let's implement Sunday-Saturday logic based on offset.
    // 1. Find current week's Last Day (Saturday)
    const current = new Date(parts[0], parts[1] - 1, parts[2]);
    const dayOfWeek = current.getDay(); // 0(Sun) - 6(Sat)
    const diffToSat = 6 - dayOfWeek;

    const endOfWeek = new Date(current);
    endOfWeek.setDate(current.getDate() + diffToSat + (offset * 7));

    // Now generate 7 days ending on that Saturday
    for (let i = 6; i >= 0; i--) {
        const d = new Date(endOfWeek);
        d.setDate(endOfWeek.getDate() - i);

        const dayString = formatDateLocal(d);
        const total = state.intakeHistory
            .filter(item => item.date === dayString)
            .reduce((sum, item) => sum + item.amount, 0);

        days.push({
            date: d,
            total: total,
            label: \`\${d.getMonth() + 1}/\${d.getDate()}\`,
            dayName: ['日', '月', '火', '水', '木', '金', '土'][d.getDay()]
        });
    }
    return days;
}

// --- UI Rendering ---
function renderControlButtons() {
    els.quickAddContainer.innerHTML = '';
    settings.presets.forEach(preset => {
        const btn = document.createElement('button');
        btn.className = 'quick-btn';
        
        const hasCaffeine = preset.caffeine > 0;
        btn.innerHTML = \`
            <span class="material-icons-round icon">\${hasCaffeine ? 'coffee' : 'water_drop'}</span>
            <span style="font-size: 0.9rem;">\${preset.amount}ml</span>
            \${hasCaffeine ? '<span style="font-size: 0.75rem; color: #ffb74d; font-weight: 500;">☕ ' + preset.caffeine + 'mg</span>' : ''}
        \`;
        btn.onclick = () => addIntake(preset.amount, null, preset.caffeine);
        els.quickAddContainer.appendChild(btn);
    });
}

function updateUI() {
    const total = getTotalToday();
    const totalCaffeine = getTotalCaffeineToday();
    const percent = Math.min(100, Math.round((total / settings.goal) * 100));

    // Update Header
    els.currentAmount.innerText = total.toLocaleString();
    els.goalAmount.innerText = settings.goal.toLocaleString();
    els.percentage.innerText = \`\${percent}%\`;
    if (els.todayCaffeine) {
        els.todayCaffeine.innerText = totalCaffeine.toLocaleString();
    }
    if (els.caffeineLimit) {
        els.caffeineLimit.innerText = (settings.caffeineLimit || DEFAULT_CAFFEINE_LIMIT).toLocaleString();
    }

    // Update Date Selector
    els.dateText.innerText = state.currentDate;
    const todayStr = formatDateLocal(new Date());
    if (state.currentDate === todayStr) {
        els.todayBadge.classList.add('hidden');
    } else {
        els.todayBadge.classList.remove('hidden');
    }

    // Update Tab Text based on selected date
    const todayTab = document.querySelector('.tab-btn[data-tab="today"]');
    if (todayTab) {
        todayTab.innerText = (state.currentDate === todayStr) ? '今日の記録' : '選択日の記録';
    }

    // Progress Ring (Water)
    const radius = els.progressCircle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percent / 100) * circumference;
    els.progressCircle.style.strokeDashoffset = offset;

    // Progress Ring (Caffeine)
    if (els.caffeineCircle) {
        const limit = settings.caffeineLimit || DEFAULT_CAFFEINE_LIMIT;
        const caffeinePercent = Math.min(100, Math.round((totalCaffeine / limit) * 100));
        const caffeineRadius = els.caffeineCircle.r.baseVal.value;
        const caffeineCircumference = caffeineRadius * 2 * Math.PI;
        const caffeineOffset = caffeineCircumference - (caffeinePercent / 100) * caffeineCircumference;
        els.caffeineCircle.style.strokeDashoffset = caffeineOffset;
    }

    // Render Lists based on active tab
    if (els.todayView.classList.contains('active')) {
        renderTodayLog();
    } else {
        renderWeeklyChart();
    }
}

function renderTodayLog() {
    const entries = getTodayIntake().sort((a, b) => b.timestamp - a.timestamp); // Newest first

    if (entries.length === 0) {
        els.todayLogList.innerHTML = '<li class="empty-state">まだ記録がありません</li>';
        return;
    }

    els.todayLogList.innerHTML = '';
    entries.forEach(item => {
        const date = new Date(item.timestamp);
        const timeStr = date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

        const li = document.createElement('li');
        li.className = 'log-item';
        li.innerHTML = \`
            <div class="time">
                <span class="material-icons-round" style="font-size: 16px;">schedule</span>
                \${timeStr}
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="text-align: right;">
                    <span class="amount">\${item.amount}ml</span>
                    \${item.caffeine ? \`<br><span style="font-size: 0.75rem; color: #ffffff; font-weight: 500;">☕ \${item.caffeine}mg</span>\` : ''}
                </div>
                <button class="delete-btn" onclick="deleteIntake(\${item.id})">
                    <span class="material-icons-round" style="font-size: 20px;">close</span>
                </button>
            </div>
        \`;
        els.todayLogList.appendChild(li);
    });
}

function renderWeeklyChart() {
    const data = getWeeklyData(state.weekOffset);

    // Update Range Label
    const start = data[0].date;
    const end = data[6].date;
    const fmt = d => \`\${d.getFullYear()}/\${d.getMonth() + 1}/\${d.getDate()}\`;
    els.weekRangeLabel.innerText = \`\${fmt(start)} - \${fmt(end)}\`;

    const maxVal = Math.max(...data.map(d => d.total), settings.goal);

    let chartHTML = '<div class="bar-chart">';
    data.forEach(day => {
        const heightPercent = Math.min(100, Math.round((day.total / maxVal) * 100));
        const isToday = new Date().toDateString() === day.date.toDateString();
        const color = isToday ? 'var(--primary-color)' : '#90a4ae';

        // Pass ISO string to avoid issues, we'll parse it back
        const dateParam = day.date.toISOString();

        chartHTML += \`
            <div class="bar-col" onclick="openDailyDetail(new Date('\${dateParam}'))">
                <div class="bar-value">\${day.total}</div>
                <div class="bar-bg">
                    <div class="bar-fill" style="height: \${heightPercent}%; background-color: \${color};"></div>
                </div>
                <div class="bar-date" style="\${isToday ? 'font-weight:bold; color:var(--primary-color)' : ''}">
                    \${day.label}<br>\${day.dayName}
                </div>
            </div>
        \`;
    });
    chartHTML += '</div>';

    els.weeklyChart.innerHTML = chartHTML;
}

// --- Event Listeners ---

// Helper to toggle modal
const toggleModal = (modal, show) => {
    if (show) {
        modal.classList.remove('hidden');
        // small timeout to allow display:block to apply before opacity transition
        setTimeout(() => modal.classList.add('visible'), 10);
    } else {
        modal.classList.remove('visible');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
};

// --- Date Navigation Functions ---
function changeDay(offset) {
    const parts = state.currentDate.split('/').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() + offset);
    state.currentDate = formatDateLocal(d);
    notifyDateChanged();
    updateUI();
}

function goToday() {
    state.currentDate = formatDateLocal(new Date());
    notifyDateChanged();
    updateUI();
}

function notifyDateChanged() {
    try {
        if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'DATE_CHANGED',
                date: state.currentDate
            }));
        }
    } catch (e) {
        console.error("Failed to post DATE_CHANGED message", e);
    }
}

function setupEventListeners() {
    // Date Selector Events
    els.prevDayBtn.addEventListener('click', () => changeDay(-1));
    els.nextDayBtn.addEventListener('click', () => changeDay(1));
    els.todayBadge.addEventListener('click', () => goToday());

    // Week Nav
    els.prevWeekBtn.addEventListener('click', () => {
        state.weekOffset--;
        renderWeeklyChart();
    });

    els.nextWeekBtn.addEventListener('click', () => {
        state.weekOffset++;
        renderWeeklyChart();
    });

    // Daily Detail Modal state
    const detailEls = {
        modal: document.getElementById('dailyDetailModal'),
        dateTitle: document.getElementById('dailyDetailDate'),
        list: document.getElementById('dailyLogList'),
        input: document.getElementById('manualAddInput'),
        caffeineInput: document.getElementById('manualAddCaffeineInput'),
        addBtn: document.getElementById('manualAddBtn'),
        closeBtn: document.getElementById('closeDailyDetail')
    };

    let currentDetailDate = null;

    window.openDailyDetail = (date) => {
        currentDetailDate = date;
        detailEls.dateTitle.innerText = \`\${date.getFullYear()}/\${date.getMonth() + 1}/\${date.getDate()}\`;

        // Filter logs for this date
        const dayStr = formatDateLocal(date);
        const logs = state.intakeHistory.filter(item => item.date === dayStr);
        logs.sort((a, b) => b.timestamp - a.timestamp);

        detailEls.list.innerHTML = '';
        if (logs.length === 0) {
            detailEls.list.innerHTML = '<li class="empty-state">記録がありません</li>';
        } else {
            logs.forEach(item => {
                const li = document.createElement('li');
                li.className = 'log-item';
                li.innerHTML = \`
                    <div style="display: flex; flex-direction: column;">
                        <div style="font-weight:bold;">\${item.amount}ml</div>
                        \${item.caffeine ? \`<div style="font-size:0.75rem; color:#ffffff; font-weight: 500;">☕ \${item.caffeine}mg</div>\` : ''}
                    </div>
                    <button class="delete-btn" onclick="deleteHistoryItem(\${item.id})">
                        <span class="material-icons-round" style="font-size: 20px;">close</span>
                    </button>
                \`;
                detailEls.list.appendChild(li);
            });
        }

        detailEls.input.value = '';
        if (detailEls.caffeineInput) detailEls.caffeineInput.value = '';
        toggleModal(detailEls.modal, true);
    };

    window.deleteHistoryItem = (id) => {
        deleteIntake(id);
        // Refresh detail view if open
        if (currentDetailDate && !detailEls.modal.classList.contains('hidden')) {
            openDailyDetail(currentDetailDate);
        }
    };

    detailEls.closeBtn.addEventListener('click', () => toggleModal(detailEls.modal, false));

    detailEls.addBtn.addEventListener('click', () => {
        const val = parseInt(detailEls.input.value);
        const caffeineVal = parseInt(detailEls.caffeineInput.value) || 0;
        if (val > 0 && currentDetailDate) {
            // Set time to current time but date to selected date
            // OR just set to noon to avoid timezone trickiness, but let's try to keep it simple
            // We'll create a new Date object based on currentDetailDate
            const newDate = new Date(currentDetailDate);
            const now = new Date();
            newDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

            addIntake(val, newDate, caffeineVal);
        }
    });

    // Custom Add Modal
    els.customAddBtn.addEventListener('click', () => {
        els.customInput.value = '';
        if (els.customCaffeineInput) els.customCaffeineInput.value = '';
        toggleModal(els.customModal, true);
        els.customInput.focus();
    });

    els.closeCustom.addEventListener('click', () => toggleModal(els.customModal, false));

    els.confirmCustom.addEventListener('click', () => {
        const val = parseInt(els.customInput.value);
        const caffeineVal = parseInt(els.customCaffeineInput.value) || 0;
        if (val > 0) {
            addIntake(val, null, caffeineVal);
            toggleModal(els.customModal, false);
        }
    });

    // Settings Modal
    els.settingsBtn.addEventListener('click', () => {
        els.goalInput.value = settings.goal;
        els.caffeineLimitInput.value = settings.caffeineLimit || DEFAULT_CAFFEINE_LIMIT;
        els.widgetQuickAddInput.value = settings.widgetQuickAddAmount || 200;
        // Populate preset inputs
        settings.presets.forEach((val, idx) => {
            if (els.presetInputs[idx]) {
                els.presetInputs[idx].amount.value = val.amount;
                els.presetInputs[idx].caffeine.value = val.caffeine;
            }
        });
        toggleModal(els.settingsModal, true);
    });

    els.closeSettings.addEventListener('click', () => toggleModal(els.settingsModal, false));

    els.saveSettings.addEventListener('click', () => {
        const newGoal = parseInt(els.goalInput.value);
        const newCaffeineLimit = parseInt(els.caffeineLimitInput.value);
        const widgetQuickAdd = parseInt(els.widgetQuickAddInput.value) || 200;

        // Get new presets
        const newPresets = [];
        for (let i = 0; i < 6; i++) {
            const amtVal = parseInt(els.presetInputs[i].amount.value);
            const cafVal = parseInt(els.presetInputs[i].caffeine.value) || 0;
            if (amtVal > 0) {
                newPresets.push({ amount: amtVal, caffeine: cafVal });
            }
        }

        if (newGoal > 0 && newCaffeineLimit > 0 && newPresets.length === 6 && widgetQuickAdd > 0) {
            settings.goal = newGoal;
            settings.caffeineLimit = newCaffeineLimit;
            settings.presets = newPresets;
            settings.widgetQuickAddAmount = widgetQuickAdd;
            saveSettings();
            renderControlButtons(); // Re-render buttons with new values
            updateUI();
            toggleModal(els.settingsModal, false);
        }
    });

    // Dismiss software keyboard on Enter key for all inputs in settings modal
    if (els.settingsModal) {
        const settingsInputs = els.settingsModal.querySelectorAll('input');
        settingsInputs.forEach(input => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.keyCode === 13) {
                    e.preventDefault();
                    input.blur();
                }
            });
        });
    }

    // Dismiss software keyboard on Enter key for preset6 caffeine
    if (els.presetInputs[5] && els.presetInputs[5].caffeine) {
        els.presetInputs[5].caffeine.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                els.presetInputs[5].caffeine.blur();
            }
        });
    }

    // Dismiss software keyboard on Enter key for custom caffeine input
    if (els.customCaffeineInput) {
        els.customCaffeineInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                els.customCaffeineInput.blur();
            }
        });
    }

    // Dismiss software keyboard on Enter key for manual add caffeine input
    if (detailEls.caffeineInput) {
        detailEls.caffeineInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                detailEls.caffeineInput.blur();
            }
        });
    }

    // Tabs
    els.tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs & contents
            els.tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            // Add to click target
            tab.classList.add('active');
            const targetId = tab.dataset.tab === 'today' ? 'todayView' : 'weeklyView';
            document.getElementById(targetId).classList.add('active');

            // Re-render to ensure fresh data
            updateUI();
        });
    });

    // Expose delete to global scope for HTML onclick
    window.deleteIntake = deleteIntake;
}

// Run
init();

</script>
    <script>
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js')
                    .then(reg => console.log('Service Worker: Registered (Scope: ' + reg.scope + ')'))
                    .catch(err => console.log('Service Worker: Error: ' + err));
            });
        }
    </script>
</body>

</html>`;
