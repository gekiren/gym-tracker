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
    <title>時間内訳管理</title>
    <meta name="theme-color" content="#121212">
    <script>
    (function() {
      if (window.__BACKGROUND_THEME__ === 'pureBlack') {
        var style = document.createElement('style');
        style.innerHTML = ':root { --bg-color: #000000 !important; --surface-color: #080808 !important; --text-primary: #ffffff !important; --text-secondary: #888888 !important; --primary-color: #6d28d9 !important; } body { background-color: #000000 !important; } #current-date { color: #888888 !important; } button.btn-primary, #save-log, .btn-primary { background-color: #6d28d9 !important; color: #ffffff !important; }';
        document.head.appendChild(style);
      }
    })();
    </script>
    <style>
:root {
  --bg-color: #121212;
  --surface-color: #1E1E1E;
  --primary-color: #6d28d9;
  --primary-variant: #3700B3;
  --plan-color: #2563EB;
  --plan-variant: #1D4ED8;
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
  box-sizing: border-box;
}

input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: var(--primary-color);
}

/* Buttons */
.btn {
  display: block;
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  text-align: center;
  transition: background-color 0.2s, transform 0.1s;
}

.btn:active {
  transform: scale(0.98);
}

.btn-primary {
  background-color: var(--primary-color);
  color: var(--text-primary);
}

.btn-plan {
  background-color: var(--plan-color);
  color: var(--text-primary);
}

.btn-secondary {
  background-color: transparent;
  border: 1px solid var(--primary-color);
  color: var(--primary-color);
}

/* Flex utilities */
.flex-row {
  display: flex;
  gap: var(--spacing-unit);
  align-items: center;
}

.justify-between {
  justify-content: space-between;
}

.hidden {
  display: none !important;
}

/* Mode Switch Segmented Control */
.mode-tab-group {
  display: flex;
  background-color: #181818;
  border-radius: 10px;
  padding: 4px;
  margin-bottom: 16px;
  border: 1px solid #333;
  gap: 4px;
}

.mode-tab {
  flex: 1;
  padding: 9px 12px;
  border-radius: 7px;
  font-size: 0.95rem;
  font-weight: 600;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.mode-tab.active-actual {
  background-color: var(--primary-color);
  color: #ffffff;
  box-shadow: 0 2px 6px rgba(109, 40, 217, 0.4);
}

.mode-tab.active-plan {
  background-color: var(--plan-color);
  color: #ffffff;
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.4);
}

/* Tags */
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.tag-chip {
  background-color: #2C2C2C;
  color: var(--text-primary);
  border: 1px solid #444;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 0.9rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.tag-chip.selected {
  background-color: var(--primary-color);
  color: #fff;
  border-color: var(--primary-color);
}

.tag-chip.plan-selected {
  background-color: var(--plan-color);
  color: #fff;
  border-color: var(--plan-color);
}

/* Simultaneous rows */
.simultaneous-row {
  border: 1px solid #333;
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 8px;
  transition: all 0.2s ease;
  background-color: rgba(255, 255, 255, 0.02);
  cursor: pointer;
  align-items: center;
}

.simultaneous-row.active {
  border-color: var(--primary-color);
  background-color: rgba(187, 134, 252, 0.08);
  box-shadow: 0 0 8px rgba(187, 134, 252, 0.15);
}

.sim-active-indicator {
  font-size: 1.1rem;
  margin-right: 8px;
  color: var(--text-secondary);
  user-select: none;
  transition: color 0.2s;
}

.simultaneous-row.active .sim-active-indicator {
  color: var(--primary-color);
}

/* Log Item & Plan Item */
.log-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background-color: #262626;
  border-radius: 8px;
  margin-bottom: 8px;
  border-left: 4px solid var(--primary-color);
}

.plan-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background-color: rgba(37, 99, 235, 0.08);
  border-radius: 8px;
  margin-bottom: 8px;
  border: 1px solid rgba(37, 99, 235, 0.3);
  border-left: 4px solid var(--plan-color);
}

.time-badge {
  display: inline-block;
  font-size: 0.85rem;
  font-weight: bold;
  color: #a78bfa;
  font-family: monospace;
}

.plan-time-badge {
  display: inline-block;
  font-size: 0.85rem;
  font-weight: bold;
  color: #93c5fd;
  font-family: monospace;
}

.btn-copy-plan {
  background-color: #059669;
  border: 1px solid #10b981;
  color: #ffffff;
  padding: 4px 8px;
  font-size: 0.8rem;
  border-radius: 6px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  transition: opacity 0.2s;
  width: auto;
  margin-right: 6px;
  margin-bottom: 0;
}

.btn-copy-plan:active {
  opacity: 0.8;
}

/* Summary & Habit Score Cards */
.summary-nav-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
  border-bottom: 1px solid #333;
  padding-bottom: 8px;
}

.summary-nav-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 0.95rem;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.summary-nav-btn.active {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.12);
}

.score-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.score-card {
  background: #262626;
  border-radius: 8px;
  padding: 10px 6px;
  text-align: center;
  border: 1px solid #383838;
}

.score-card .val {
  font-size: 1.1rem;
  font-weight: bold;
  color: #a78bfa;
}

.score-card .lbl {
  font-size: 0.72rem;
  color: var(--text-secondary);
  margin-top: 2px;
}

/* Plan vs Actual Comparison Table */
.diff-badge {
  font-size: 0.75rem;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
  display: inline-block;
  white-space: nowrap;
}

.diff-badge.match { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid #10b981; }
.diff-badge.short { background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid #3b82f6; }
.diff-badge.over { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid #f59e0b; }
.diff-badge.unplanned { background: rgba(236, 72, 153, 0.2); color: #f472b6; border: 1px solid #ec4899; }
.diff-badge.pending { background: rgba(107, 114, 128, 0.2); color: #9ca3af; border: 1px solid #6b7280; }

.compare-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #2e2e2e;
}

.compare-row:last-child {
  border-bottom: none;
}

.compare-left {
  flex: 1;
}

.compare-title {
  font-weight: 600;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 6px;
}

.compare-meta {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-top: 2px;
}

.compare-right {
  text-align: right;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

/* Pie Chart Container */
.pie-chart-container {
  display: flex;
  justify-content: center;
  margin: 16px 0;
}

.pie-chart {
  width: 100%;
  max-width: 320px;
  position: relative;
}

/* Modal Overlay */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.75);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: max(40px, 6vh);
  box-sizing: border-box;
  z-index: 1000;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s ease, visibility 0.3s ease;
  overflow-y: auto;
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
  max-height: 300px;
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
  word-break: break-all;
  padding-right: 8px;
}

.edit-tag-move-btn {
  background: #2C2C2C;
  border: 1px solid #444;
  color: var(--text-primary);
  width: 32px !important;
  height: 32px;
  padding: 0 !important;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s;
  margin-bottom: 0 !important;
}

.edit-tag-move-btn:active {
  background: #3D3D3D;
}

.edit-tag-move-btn:disabled {
  opacity: 0.2;
  cursor: not-allowed;
  background: #1E1E1E;
  border-color: #222;
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

header {
  display: none !important;
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
        <div style="text-align: center; margin-bottom: 16px; padding-top: 16px;">
            <input type="date" id="current-date"
                style="width: auto; padding: 8px; font-size: 1rem; color-scheme: dark;">
        </div>
    </header>

    <div class="container">
        <!-- Input Section -->
        <section class="card" id="input-section">
            <!-- Mode Switch Segmented Control -->
            <div class="mode-tab-group">
                <button type="button" id="mode-actual-tab" class="mode-tab active-actual" onclick="switchInputMode('actual')">
                    ⏱ 実績を記録
                </button>
                <button type="button" id="mode-plan-tab" class="mode-tab" onclick="switchInputMode('plan')">
                    📅 予定を作成
                </button>
            </div>

            <div class="flex-row justify-between" style="margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                <div class="flex-row" style="gap: 8px; flex-wrap: wrap;">
                    <button type="button" id="toggle-continuous" class="btn btn-secondary"
                        style="width: auto; padding: 6px 12px; font-size: 0.8rem;">
                        連続記録モード: <span id="continuous-status">OFF</span>
                    </button>
                    <button type="button" id="toggle-simultaneous" class="btn btn-secondary"
                        style="width: auto; padding: 6px 12px; font-size: 0.8rem;">
                        同時進行モード: <span id="simultaneous-status">OFF</span>
                    </button>
                </div>
            </div>

            <!-- Tag list -->
            <div id="tag-selection-container" style="margin-bottom: 16px;">
                <label id="tag-selection-label">活動内容</label>
                <div class="tags" id="quick-list">
                    <!-- Javascript will populate this -->
                </div>
            </div>

            <!-- Single Mode Input -->
            <div id="single-mode-inputs">
                <input type="hidden" id="activity-name">
            </div>

            <!-- Simultaneous Mode Inputs (Hidden by default) -->
            <div id="simultaneous-mode-inputs" class="hidden">
                <label>同時進行する活動を追加</label>
                <div id="simultaneous-list" style="margin-bottom: 12px;">
                    <!-- Javascript will add rows dynamically here -->
                </div>
                <button type="button" id="add-simultaneous-row" class="btn btn-secondary" style="margin-top: 8px;">+ 活動を追加</button>
            </div>

            <!-- Memo Input -->
            <div style="margin-top: 16px;">
                <label for="activity-memo">メモ（詳細）</label>
                <input type="text" id="activity-memo" placeholder="例: 資料作成、会議、散歩など（省略可）" style="margin-bottom: 0;">
            </div>

            <!-- Time Input -->
            <div style="margin-top: 16px;">
                <label id="time-input-label">時間</label>
                <div class="flex-row">
                    <input type="time" id="start-time">
                    <span>~</span>
                    <input type="time" id="end-time">
                </div>
                <div class="flex-row" style="margin-top:8px;" id="time-quick-set-row">
                    <button type="button" class="btn btn-secondary" id="set-now-start">現在時刻を開始に</button>
                    <button type="button" class="btn btn-secondary" id="set-now-end">現在時刻を終了に</button>
                </div>
            </div>

            <button type="button" id="save-btn" class="btn btn-primary" style="margin-top: 24px;">記録する</button>
        </section>

        <!-- Plans Section (今日の予定) -->
        <section class="card" id="plan-section">
            <div class="flex-row justify-between" style="align-items: center;">
                <h3>今日の予定 (Plan)</h3>
                <button type="button" id="copy-all-plans-btn" class="btn btn-secondary"
                    style="width: auto; font-size: 0.8rem; padding: 4px 10px; border-color: #2563EB; color: #93c5fd;">
                    一括で実績に反映
                </button>
            </div>
            <div id="plan-list" style="margin-top: 10px;">
                <!-- Javascript will populate this -->
                <div style="text-align:center; color: var(--text-secondary); padding: 16px;">
                    予定はまだありません（上部の「予定を作成」から追加できます）
                </div>
            </div>
        </section>

        <!-- Templates Section -->
        <section class="card">
            <div class="flex-row justify-between" style="flex-wrap: wrap; gap: 6px; align-items: center;">
                <h3>テンプレート</h3>
                <div class="flex-row" style="gap: 6px; margin-bottom: 0;">
                    <button type="button" id="save-plan-template-btn" class="btn btn-secondary"
                        style="width:auto; font-size: 0.78rem; padding: 4px 8px; border-color: #2563EB; color: #93c5fd;">予定を保存</button>
                    <button type="button" id="save-template-btn" class="btn btn-secondary"
                        style="width:auto; font-size: 0.78rem; padding: 4px 8px;">実績を保存</button>
                </div>
            </div>
            <div id="template-list" class="tags" style="margin-top: 10px;">
                <!-- Javascript will populate -->
            </div>
        </section>

        <!-- Log List (今日の実績) -->
        <section class="card" id="log-section">
            <h3>今日の記録 (Actual)</h3>
            <div id="log-list">
                <!-- Javascript will populate this -->
                <div style="text-align:center; color: var(--text-secondary); padding: 20px;">
                    記録はまだありません
                </div>
            </div>
        </section>

        <!-- Summary & Plan vs Actual Comparison -->
        <section class="card" id="summary-section">
            <div class="flex-row justify-between" style="align-items: center;">
                <h3>今日の集計 ＆ 予実比較</h3>
                <button type="button" id="export-md-btn" class="btn btn-secondary"
                    style="width: auto; font-size: 0.8rem; padding: 4px 12px;">MD出力</button>
            </div>

            <!-- Summary Navigation Tabs -->
            <div class="summary-nav-tabs" style="margin-top: 12px;">
                <button type="button" id="tab-summary-compare" class="summary-nav-btn active" onclick="switchSummaryTab('compare')">
                    ⚖ 予実比較（予定 vs 実績）
                </button>
                <button type="button" id="tab-summary-actual" class="summary-nav-btn" onclick="switchSummaryTab('actual')">
                    📊 実績内訳
                </button>
            </div>

            <!-- 24h Dual Ring Timeline Chart -->
            <div class="pie-chart-container">
                <div id="summary-pie-chart" class="pie-chart"></div>
            </div>

            <!-- Score Summary Cards -->
            <div id="score-summary-container" class="score-summary-grid">
                <!-- Javascript will populate -->
            </div>

            <!-- Compare Tab Content -->
            <div id="summary-compare-view">
                <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px; font-weight: 600;">
                    活動別の予定・実績差異
                </div>
                <div id="summary-compare-list">
                    <!-- Javascript will populate -->
                </div>
            </div>

            <!-- Actual Breakdown Tab Content -->
            <div id="summary-actual-view" class="hidden">
                <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px; font-weight: 600;">
                    実績の活動別内訳
                </div>
                <div id="summary-list">
                    <!-- Javascript will populate -->
                </div>
            </div>
        </section>

        <!-- Export/Clear -->
        <section style="margin-top: 20px; text-align: center;">
            <button type="button" id="clear-day-btn"
                style="background:none; border:none; color: var(--error-color); text-decoration: underline; cursor: pointer; font-size: 0.95rem;">
                今日のデータをリセット...
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
                <div class="flex-row" style="margin-bottom: 16px;">
                    <input type="text" id="modal-new-tag-input" placeholder="新しいタグ名を入力" style="flex: 1; margin-bottom: 0;">
                    <button type="button" id="modal-add-tag-btn" class="btn btn-secondary" style="width: auto; padding: 12px 20px; white-space: nowrap; margin-bottom: 0;">追加</button>
                </div>
                <label>現在のタグ一覧 (クリックで削除)</label>
                <div id="modal-tag-list" class="edit-tag-list">
                    <!-- Javascript will populate this -->
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" id="modal-close-btn" class="btn btn-primary" style="margin-bottom: 0; width: auto; padding: 8px 16px;">完了</button>
            </div>
        </div>
    </div>

    <!-- Template Action Modal -->
    <div id="template-action-modal" class="modal-overlay">
        <div class="modal-content">
            <div class="modal-header">
                <h3 id="template-modal-title">テンプレート適用</h3>
                <span id="close-template-modal-btn" style="cursor: pointer; font-size: 1.5rem; font-weight: bold; color: var(--text-secondary);">&times;</span>
            </div>
            <div class="modal-body" style="display: flex; flex-direction: column; gap: 10px;">
                <p id="template-modal-desc" style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 8px;"></p>
                <button type="button" id="tmpl-apply-plan-btn" class="btn btn-plan" style="display: flex; align-items: center; justify-content: center; gap: 6px;">
                    📅 今日の「予定」として読み込む
                </button>
                <button type="button" id="tmpl-apply-actual-btn" class="btn btn-primary" style="display: flex; align-items: center; justify-content: center; gap: 6px;">
                    ⏱ 今日の「実績」として読み込む
                </button>
                <button type="button" id="tmpl-delete-btn" class="btn btn-secondary" style="color: var(--error-color); border-color: var(--error-color); margin-top: 10px;">
                    🗑 このテンプレートを削除
                </button>
            </div>
        </div>
    </div>

    <!-- Reset Choice Modal -->
    <div id="reset-choice-modal" class="modal-overlay">
        <div class="modal-content">
            <div class="modal-header">
                <h3>データのリセット</h3>
                <span id="close-reset-modal-btn" style="cursor: pointer; font-size: 1.5rem; font-weight: bold; color: var(--text-secondary);">&times;</span>
            </div>
            <div class="modal-body" style="display: flex; flex-direction: column; gap: 10px;">
                <p id="reset-modal-date" style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 8px;">選択中の日のデータを消去します：</p>
                <button type="button" id="reset-actual-only-btn" class="btn btn-secondary" style="border-color: var(--primary-color); color: #fff;">
                    ⏱ 実績データのみ消去
                </button>
                <button type="button" id="reset-plan-only-btn" class="btn btn-secondary" style="border-color: var(--plan-color); color: #fff;">
                    📅 予定データのみ消去
                </button>
                <button type="button" id="reset-all-btn" class="btn btn-secondary" style="border-color: var(--error-color); color: var(--error-color); margin-top: 6px;">
                    ⚠️ 実績・予定の両方を消去
                </button>
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
const planList = document.getElementById('plan-list');
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
const savePlanTemplateBtn = document.getElementById('save-plan-template-btn');
const templateList = document.getElementById('template-list');
const clearDayBtn = document.getElementById('clear-day-btn');
const currentDateInput = document.getElementById('current-date');
const copyAllPlansBtn = document.getElementById('copy-all-plans-btn');

// Mode Switch Elements
const modeActualTab = document.getElementById('mode-actual-tab');
const modePlanTab = document.getElementById('mode-plan-tab');

// Modal Elements
const tagEditModal = document.getElementById('tag-edit-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const modalNewTagInput = document.getElementById('modal-new-tag-input');
const modalAddTagBtn = document.getElementById('modal-add-tag-btn');
const modalTagList = document.getElementById('modal-tag-list');
const modalCloseBtn = document.getElementById('modal-close-btn');

// Template Modal
const templateActionModal = document.getElementById('template-action-modal');
const closeTemplateModalBtn = document.getElementById('close-template-modal-btn');
const templateModalTitle = document.getElementById('template-modal-title');
const templateModalDesc = document.getElementById('template-modal-desc');
const tmplApplyPlanBtn = document.getElementById('tmpl-apply-plan-btn');
const tmplApplyActualBtn = document.getElementById('tmpl-apply-actual-btn');
const tmplDeleteBtn = document.getElementById('tmpl-delete-btn');

// Reset Modal
const resetChoiceModal = document.getElementById('reset-choice-modal');
const closeResetModalBtn = document.getElementById('close-reset-modal-btn');
const resetModalDate = document.getElementById('reset-modal-date');
const resetActualOnlyBtn = document.getElementById('reset-actual-only-btn');
const resetPlanOnlyBtn = document.getElementById('reset-plan-only-btn');
const resetAllBtn = document.getElementById('reset-all-btn');

// State
const storage = window.appStorage || { getItem: function() { return null; }, setItem: function() {} };
let isContinuousMode = JSON.parse(storage.getItem('zikankanri_continuous_mode')) || false;
let isSimultaneousMode = false;
let currentInputMode = 'actual';
let editingId = null;
let editingPlanId = null;
let currentSummaryTab = 'compare';
let selectedTemplateId = null;

let logs = JSON.parse(storage.getItem('zikankanri_logs')) || [];
let plans = JSON.parse(storage.getItem('zikankanri_plans')) || [];
let templates = JSON.parse(storage.getItem('zikankanri_templates')) || [];

function loadTagsFromStorage() {
    try {
        const raw = storage.getItem('zikankanri_tags');
        if (raw) {
            let parsed = JSON.parse(raw);
            if (typeof parsed === 'string') parsed = JSON.parse(parsed);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
        }
    } catch (e) {
        console.warn('Failed to parse zikankanri_tags', e);
    }
    return ["睡眠", "仕事", "食事", "移動", "休憩", "家事", "運動", "学習"];
}
let defaultTags = loadTagsFromStorage();

function notifyModalState(show) {
    if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
        try {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MODAL_STATE_CHANGE', visible: show }));
        } catch (e) {
            console.warn('Failed to post MODAL_STATE_CHANGE:', e);
        }
    }
}

function sanitizeDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const cleaned = dateStr.replace(/\\\\//g, '-').trim();
    if (/^\\\\d{4}-\\\\d{2}-\\\\d{2}$/.test(cleaned)) {
        return cleaned;
    }
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
    renderPlans();
    renderTemplates();
    renderSummary();
    registerSW();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

currentDateInput.addEventListener('change', function() {
    updateDefaultStartTime();
    renderLogs();
    renderPlans();
    renderSummary();
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

window.switchInputMode = function(mode) {
    currentInputMode = mode;
    if (mode === 'plan') {
        modePlanTab.classList.add('active-plan');
        modeActualTab.classList.remove('active-actual');
        saveBtn.classList.remove('btn-primary');
        saveBtn.classList.add('btn-plan');
        saveBtn.textContent = editingPlanId ? "予定を更新" : "予定を追加";
        document.getElementById('time-input-label').textContent = "予定時間";
    } else {
        modeActualTab.classList.add('active-actual');
        modePlanTab.classList.remove('active-plan');
        saveBtn.classList.remove('btn-plan');
        saveBtn.classList.add('btn-primary');
        saveBtn.textContent = editingId ? "更新する" : "記録する";
        document.getElementById('time-input-label').textContent = "時間";
    }
    highlightTag(activityNameInput.value);
};

window.switchSummaryTab = function(tab) {
    currentSummaryTab = tab;
    const tabCompareBtn = document.getElementById('tab-summary-compare');
    const tabActualBtn = document.getElementById('tab-summary-actual');
    const compareView = document.getElementById('summary-compare-view');
    const actualView = document.getElementById('summary-actual-view');

    if (tab === 'compare') {
        tabCompareBtn.classList.add('active');
        tabActualBtn.classList.remove('active');
        compareView.classList.remove('hidden');
        actualView.classList.add('hidden');
    } else {
        tabActualBtn.classList.add('active');
        tabCompareBtn.classList.remove('active');
        actualView.classList.remove('hidden');
        compareView.classList.add('hidden');
    }
};

function highlightTag(tagName) {
    const isPlan = (currentInputMode === 'plan');
    document.querySelectorAll('#quick-list .tag-chip').forEach(function(c) {
        if (tagName && c.dataset.value === tagName) {
            c.classList.add(isPlan ? 'plan-selected' : 'selected');
            c.classList.remove(isPlan ? 'selected' : 'plan-selected');
        } else {
            c.classList.remove('selected', 'plan-selected');
        }
    });
}

function setActiveSimRow(rowElement) {
    document.querySelectorAll('.simultaneous-row').forEach(function(row) {
        row.classList.remove('active');
        const indicator = row.querySelector('.sim-active-indicator');
        if (indicator) {
            indicator.innerHTML = '○';
        }
    });

    if (rowElement) {
        rowElement.classList.add('active');
        const indicator = rowElement.querySelector('.sim-active-indicator');
        if (indicator) {
            indicator.innerHTML = '●';
        }
        const nameVal = rowElement.querySelector('.sim-name').value;
        highlightTag(nameVal);
    } else {
        highlightTag(null);
    }
}

function selectTag(tagName) {
    if (isSimultaneousMode) {
        const activeRow = document.querySelector('.simultaneous-row.active');
        if (activeRow) {
            const input = activeRow.querySelector('.sim-name');
            if (input) {
                input.value = tagName;
                highlightTag(tagName);
            }
        }
    } else {
        highlightTag(tagName);
        activityNameInput.value = tagName;
    }
}

function initTags() {
    quickListNodesContainer.innerHTML = '';

    const editBtn = document.createElement('span');
    editBtn.className = 'tag-chip';
    editBtn.style.borderStyle = 'dashed';
    editBtn.style.cursor = 'pointer';
    editBtn.textContent = '+ タグ編集';
    editBtn.addEventListener('click', openTagEditor);
    quickListNodesContainer.appendChild(editBtn);

    defaultTags.forEach(function(tag) {
        const chip = document.createElement('span');
        chip.className = 'tag-chip';
        chip.dataset.value = tag;
        chip.style.cursor = 'pointer';

        const textSpan = document.createElement('span');
        textSpan.textContent = tag;
        chip.appendChild(textSpan);

        chip.addEventListener('click', function() {
            selectTag(tag);
        });

        quickListNodesContainer.insertBefore(chip, editBtn);
    });

    if (activityNameInput.value) {
        selectTag(activityNameInput.value);
    }
}

function openTagEditor() {
    tagEditModal.classList.add('active');
    notifyModalState(true);
    renderModalTags();
    modalNewTagInput.value = '';
    setTimeout(function() {
        modalNewTagInput.focus();
    }, 100);
}

function closeTagEditor() {
    tagEditModal.classList.remove('active');
    notifyModalState(false);
    initTags();
}

window.openTagEditor = openTagEditor;
window.closeTagEditor = closeTagEditor;

function renderModalTags() {
    modalTagList.innerHTML = '';
    defaultTags.forEach(function(tag, index) {
        const item = document.createElement('div');
        item.className = 'edit-tag-item';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'edit-tag-name';
        nameSpan.textContent = tag;
        item.appendChild(nameSpan);

        const rightContainer = document.createElement('div');
        rightContainer.className = 'flex-row';
        rightContainer.style.gap = '6px';
        rightContainer.style.marginBottom = '0';

        const upBtn = document.createElement('button');
        upBtn.type = 'button';
        upBtn.className = 'edit-tag-move-btn';
        upBtn.innerHTML = '▲';
        if (index === 0) {
            upBtn.disabled = true;
        } else {
            upBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                moveTag(index, -1);
            });
        }
        rightContainer.appendChild(upBtn);

        const downBtn = document.createElement('button');
        downBtn.type = 'button';
        downBtn.className = 'edit-tag-move-btn';
        downBtn.innerHTML = '▼';
        if (index === defaultTags.length - 1) {
            downBtn.disabled = true;
        } else {
            downBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                moveTag(index, 1);
            });
        }
        rightContainer.appendChild(downBtn);

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'edit-tag-delete-btn';
        delBtn.style.marginLeft = '4px';
        delBtn.innerHTML = '&times;';
        delBtn.setAttribute('title', '削除');
        delBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            defaultTags = defaultTags.filter(function(t) { return t !== tag; });
            storage.setItem('zikankanri_tags', JSON.stringify(defaultTags));
            renderModalTags();
            initTags();
            if (activityNameInput.value === tag) {
                activityNameInput.value = '';
            }
        });
        rightContainer.appendChild(delBtn);

        item.appendChild(rightContainer);
        modalTagList.appendChild(item);
    });
}

function moveTag(index, direction) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= defaultTags.length) return;
    const temp = defaultTags[index];
    defaultTags[index] = defaultTags[targetIndex];
    defaultTags[targetIndex] = temp;
    storage.setItem('zikankanri_tags', JSON.stringify(defaultTags));
    renderModalTags();
    initTags();
}

function addModalTag() {
    const val = modalNewTagInput.value.trim();
    if (!val) return;
    if (defaultTags.includes(val)) {
        modalNewTagInput.style.borderColor = 'var(--error-color)';
        setTimeout(function() {
            modalNewTagInput.style.borderColor = '';
        }, 1200);
        return;
    }
    defaultTags.push(val);
    storage.setItem('zikankanri_tags', JSON.stringify(defaultTags));
    renderModalTags();
    initTags();
    modalNewTagInput.value = '';
}

closeModalBtn.addEventListener('click', closeTagEditor);
modalCloseBtn.addEventListener('click', closeTagEditor);
modalAddTagBtn.addEventListener('click', addModalTag);
modalNewTagInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        addModalTag();
    }
});
tagEditModal.addEventListener('click', function(e) {
    if (e.target === tagEditModal) {
        closeTagEditor();
    }
});

function registerSW() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(function(res) { console.log('SW registered'); })
            .catch(function(err) { console.log('SW failed', err); });
    }
}

document.getElementById('set-now-start').addEventListener('click', function() {
    startTimeInput.value = getCurrentTimeStr();
});

document.getElementById('set-now-end').addEventListener('click', function() {
    endTimeInput.value = getCurrentTimeStr();
});

toggleContinuousBtn.addEventListener('click', function() {
    setContinuousMode(!isContinuousMode);
    updateDefaultStartTime();
});

function setContinuousMode(enabled) {
    isContinuousMode = enabled;
    storage.setItem('zikankanri_continuous_mode', JSON.stringify(isContinuousMode));
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

toggleSimultaneousBtn.addEventListener('click', function() {
    setSimultaneousMode(!isSimultaneousMode);
    if (isSimultaneousMode && simultaneousList.children.length === 0) {
        addSimultaneousRow('', 50);
        addSimultaneousRow('', 50);
    }
});

function setSimultaneousMode(enabled) {
    isSimultaneousMode = enabled;
    const tagLabel = document.getElementById('tag-selection-label');
    if (isSimultaneousMode) {
        singleModeInputs.classList.add('hidden');
        simultaneousModeInputs.classList.remove('hidden');
        simultaneousStatusSpan.textContent = "ON";
        toggleSimultaneousBtn.classList.remove('btn-secondary');
        toggleSimultaneousBtn.classList.add('btn-primary');
        if (tagLabel) tagLabel.textContent = "活動内容タグ (選択中の行に入力されます)";
        
        const activeRow = simultaneousList.querySelector('.simultaneous-row.active');
        if (!activeRow) {
            const firstRow = simultaneousList.querySelector('.simultaneous-row');
            if (firstRow) {
                setActiveSimRow(firstRow);
            } else {
                setActiveSimRow(null);
            }
        }
    } else {
        singleModeInputs.classList.remove('hidden');
        simultaneousModeInputs.classList.add('hidden');
        simultaneousStatusSpan.textContent = "OFF";
        toggleSimultaneousBtn.classList.remove('btn-primary');
        toggleSimultaneousBtn.classList.add('btn-secondary');
        if (tagLabel) tagLabel.textContent = "活動内容";
        highlightTag(activityNameInput.value);
    }
}

addSimultaneousRowBtn.addEventListener('click', function() {
    addSimultaneousRow();
});

function addSimultaneousRow(name, percent) {
    if (name === undefined) name = '';
    if (percent === undefined) percent = 50;

    const div = document.createElement('div');
    div.className = 'simultaneous-row flex-row';
    div.style.flexDirection = 'column';
    div.style.alignItems = 'stretch';
    div.style.gap = '6px';
    div.innerHTML =
        '<div class="flex-row" style="width: 100%; align-items: center;">' +
            '<span class="sim-active-indicator">○</span>' +
            '<input type="text" placeholder="活動名" class="sim-name" value="' + name + '" style="flex: 1; margin-bottom: 0;">' +
            '<button type="button" class="btn btn-secondary sim-delete-btn" style="width: auto; padding: 12px 14px; margin-bottom: 0; margin-left: 8px;">×</button>' +
        '</div>' +
        '<div class="flex-row" style="width: 100%; align-items: center; padding-left: 24px; gap: 12px;">' +
            '<span style="font-size: 0.85rem; color: var(--text-secondary); min-width: 35px;">割合:</span>' +
            '<input type="range" class="sim-percent" min="0" max="100" step="10" value="' + percent + '" style="flex: 1; margin-bottom: 0; accent-color: var(--primary-color);">' +
            '<span class="sim-percent-text" style="min-width: 45px; text-align: right; font-family: monospace; font-size: 0.95rem; font-weight: 600; color: var(--primary-color);">' + percent + '%</span>' +
        '</div>';

    div.addEventListener('click', function(e) {
        if (e.target.classList.contains('sim-delete-btn')) return;
        setActiveSimRow(div);
    });

    const nameInput = div.querySelector('.sim-name');
    nameInput.addEventListener('focus', function() {
        setActiveSimRow(div);
    });
    nameInput.addEventListener('input', function(e) {
        highlightTag(e.target.value);
    });

    const percentInput = div.querySelector('.sim-percent');
    const percentText = div.querySelector('.sim-percent-text');
    percentInput.addEventListener('focus', function() {
        setActiveSimRow(div);
    });
    percentInput.addEventListener('input', function(e) {
        percentText.textContent = e.target.value + '%';
        setActiveSimRow(div);
    });

    const deleteBtn = div.querySelector('.sim-delete-btn');
    deleteBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        const isActive = div.classList.contains('active');
        div.remove();
        if (isActive) {
            const firstRow = simultaneousList.querySelector('.simultaneous-row');
            if (firstRow) {
                setActiveSimRow(firstRow);
            } else {
                setActiveSimRow(null);
            }
        }
    });

    simultaneousList.appendChild(div);
    setActiveSimRow(div);
}

saveBtn.addEventListener('click', function() {
    const start = startTimeInput.value;
    const end = endTimeInput.value;
    const selectedDate = currentDateInput.value.replace(/-/g, '/');
    const memo = activityMemoInput.value.trim();

    if (!start && !end) {
        alert('開始時間または終了時間を入力してください。');
        return;
    }

    let newItems = [];
    if (isSimultaneousMode) {
        const rows = document.querySelectorAll('.simultaneous-row');
        rows.forEach(function(row) {
            const name = row.querySelector('.sim-name').value.trim();
            const percent = parseInt(row.querySelector('.sim-percent').value) || 0;
            newItems.push({ name: name || "", percent: percent });
        });
        if (newItems.length === 0) {
            newItems.push({ name: "", percent: 100 });
        }
    } else {
        const name = activityNameInput.value.trim();
        newItems.push({ name: name || "", percent: 100 });
    }

    if (currentInputMode === 'plan') {
        if (editingPlanId) {
            const index = plans.findIndex(function(p) { return p.id === editingPlanId; });
            if (index !== -1) {
                plans[index] = {
                    ...plans[index],
                    date: selectedDate,
                    start: start || "",
                    end: end || "",
                    items: newItems,
                    memo: memo
                };
            }
        } else {
            const newPlan = {
                id: Date.now(),
                date: selectedDate,
                start: start || "",
                end: end || "",
                items: newItems,
                memo: memo
            };
            plans.push(newPlan);
        }
        savePlans();
        renderPlans();
        renderSummary();
        resetForm(isContinuousMode ? (end || start || getCurrentTimeStr()) : getCurrentTimeStr());
    } else {
        const hasTimeInterval = start && end;

        if (hasTimeInterval) {
            const newStartMins = timeToMins(start);
            const newEndMins = timeToMins(end);
            let effectiveEndMins = newEndMins;
            if (effectiveEndMins < newStartMins) effectiveEndMins += 1440;

            const dayLogs = logs.filter(function(l) { return l.date === selectedDate && l.id !== editingId && l.start && l.end; });
            const overlaps = dayLogs.filter(function(l) {
                const lS = timeToMins(l.start);
                let lE = timeToMins(l.end);
                if (lE < lS) lE += 1440;
                return Math.max(lS, newStartMins) < Math.min(lE, effectiveEndMins);
            });

            if (overlaps.length > 0) {
                const targetLog = overlaps[0];
                const confirmMerge = confirm('「' + targetLog.items.map(function(i) { return i.name; }).join('/') + '」(' + targetLog.start + '-' + targetLog.end + ') と時間が重なっています。\\\\n重なっている部分を同時進行として記録しますか？\\\\n（キャンセルすると通常通り追加・更新します）');

                if (confirmMerge) {
                    const existingNames = targetLog.items.map(function(i) { return i.name; }).join('/');
                    const newNames = newItems.map(function(i) { return i.name; }).join('/');
                    const ratioStr = prompt('重複区間の割合を設定してください。\\\\n既存「' + existingNames + '」の割合(%):', "50");
                    if (ratioStr === null) return;

                    const existingRatio = parseInt(ratioStr) || 50;
                    const newRatio = 100 - existingRatio;

                    if (editingId) {
                        logs = logs.filter(function(l) { return l.id !== editingId; });
                    }

                    handleOverlapMerge(targetLog, { start: start, end: end, items: newItems, memo: memo }, selectedDate, existingRatio, newRatio);
                    resetForm(isContinuousMode ? end : getCurrentTimeStr());
                    return;
                }
            }
        }

        if (editingId) {
            const index = logs.findIndex(function(l) { return l.id === editingId; });
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
        renderSummary();
        resetForm(isContinuousMode ? (end || start || getCurrentTimeStr()) : getCurrentTimeStr());
    }
});

function handleOverlapMerge(existingLog, newLogObj, date, existingWeight, newWeight) {
    logs = logs.filter(function(l) { return l.id !== existingLog.id; });

    const eS = timeToMins(existingLog.start);
    let eE = timeToMins(existingLog.end);
    if (eE < eS) eE += 1440;

    const nS = timeToMins(newLogObj.start);
    let nE = timeToMins(newLogObj.end);
    if (nE < nS) nE += 1440;

    const overlapStart = Math.max(eS, nS);
    const overlapEnd = Math.min(eE, nE);
    const segments = [];

    if (eS < overlapStart) {
        segments.push({ start: eS, end: overlapStart, items: existingLog.items, memo: existingLog.memo });
    }
    if (nS < overlapStart) {
        segments.push({ start: nS, end: overlapStart, items: newLogObj.items, memo: newLogObj.memo });
    }

    if (overlapStart < overlapEnd) {
        let mergedItems = [];
        existingLog.items.forEach(function(i) {
            mergedItems.push({ name: i.name, percent: Math.round(i.percent * (existingWeight / 100)) });
        });
        newLogObj.items.forEach(function(i) {
            mergedItems.push({ name: i.name, percent: Math.round(i.percent * (newWeight / 100)) });
        });
        let mergedMemo = [existingLog.memo, newLogObj.memo].filter(function(m) { return m && m.trim() !== ''; }).join(' / ');
        segments.push({ start: overlapStart, end: overlapEnd, items: mergedItems, memo: mergedMemo });
    }

    if (eE > overlapEnd) {
        segments.push({ start: overlapEnd, end: eE, items: existingLog.items, memo: existingLog.memo });
    }
    if (nE > overlapEnd) {
        segments.push({ start: overlapEnd, end: nE, items: newLogObj.items, memo: newLogObj.memo });
    }

    segments.forEach(function(seg) {
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
    renderSummary();
}

window.startEdit = function(id) {
    const log = logs.find(function(l) { return l.id === id; });
    if (!log) return;

    editingId = id;
    editingPlanId = null;
    switchInputMode('actual');

    saveBtn.textContent = "更新する";
    saveBtn.style.border = "2px solid #BB86FC";

    startTimeInput.value = log.start;
    endTimeInput.value = log.end;
    activityMemoInput.value = log.memo || "";

    if (log.items.length > 1) {
        setSimultaneousMode(true);
        simultaneousList.innerHTML = '';
        log.items.forEach(function(item) {
            addSimultaneousRow(item.name, item.percent);
        });
        const firstRow = simultaneousList.querySelector('.simultaneous-row');
        if (firstRow) setActiveSimRow(firstRow);
    } else {
        setSimultaneousMode(false);
        selectTag(log.items[0].name);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.startEditPlan = function(id) {
    const plan = plans.find(function(p) { return p.id === id; });
    if (!plan) return;

    editingPlanId = id;
    editingId = null;
    switchInputMode('plan');

    saveBtn.textContent = "予定を更新";
    saveBtn.style.border = "2px solid #93C5FD";

    startTimeInput.value = plan.start;
    endTimeInput.value = plan.end;
    activityMemoInput.value = plan.memo || "";

    if (plan.items.length > 1) {
        setSimultaneousMode(true);
        simultaneousList.innerHTML = '';
        plan.items.forEach(function(item) {
            addSimultaneousRow(item.name, item.percent);
        });
        const firstRow = simultaneousList.querySelector('.simultaneous-row');
        if (firstRow) setActiveSimRow(firstRow);
    } else {
        setSimultaneousMode(false);
        selectTag(plan.items[0].name);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.copyPlanToActual = function(planId) {
    const plan = plans.find(function(p) { return p.id === planId; });
    if (!plan) return;

    editingId = null;
    editingPlanId = null;
    switchInputMode('actual');

    startTimeInput.value = plan.start;
    endTimeInput.value = plan.end;
    activityMemoInput.value = plan.memo || "";

    if (plan.items.length > 1) {
        setSimultaneousMode(true);
        simultaneousList.innerHTML = '';
        plan.items.forEach(function(item) {
            addSimultaneousRow(item.name, item.percent);
        });
        const firstRow = simultaneousList.querySelector('.simultaneous-row');
        if (firstRow) setActiveSimRow(firstRow);
    } else {
        setSimultaneousMode(false);
        selectTag(plan.items[0].name);
    }

    saveBtn.textContent = "記録する";
    saveBtn.style.border = "none";
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

copyAllPlansBtn.addEventListener('click', function() {
    const selectedDate = currentDateInput.value.replace(/-/g, '/');
    const dayPlans = plans.filter(function(p) { return p.date === selectedDate; });

    if (dayPlans.length === 0) {
        alert('今日の予定がありません。');
        return;
    }

    if (confirm('今日の予定（' + dayPlans.length + '件）を一括で実績として反映しますか？')) {
        const newLogs = dayPlans.map(function(p) {
            return {
                id: Date.now() + Math.random(),
                date: selectedDate,
                start: p.start,
                end: p.end,
                items: p.items,
                memo: p.memo
            };
        });

        logs = logs.concat(newLogs);
        saveLogs();
        renderLogs();
        renderSummary();
    }
});

function resetForm(nextStart) {
    editingId = null;
    editingPlanId = null;
    saveBtn.style.border = "none";

    if (currentInputMode === 'plan') {
        saveBtn.textContent = "予定を追加";
    } else {
        saveBtn.textContent = "記録する";
    }

    if (nextStart !== undefined) {
        startTimeInput.value = nextStart;
    } else {
        updateDefaultStartTime();
    }
    endTimeInput.value = "";
    activityNameInput.value = "";
    activityMemoInput.value = "";
    simultaneousList.innerHTML = '';
    if (isSimultaneousMode) {
        addSimultaneousRow('', 50);
        addSimultaneousRow('', 50);
    }
    document.querySelectorAll('#quick-list .tag-chip').forEach(function(c) {
        c.classList.remove('selected', 'plan-selected');
    });
}

clearDayBtn.addEventListener('click', function() {
    const selectedDate = currentDateInput.value.replace(/-/g, '/');
    resetModalDate.textContent = selectedDate + ' のデータをリセットします：';
    resetChoiceModal.classList.add('active');
    notifyModalState(true);
});

closeResetModalBtn.addEventListener('click', function() {
    resetChoiceModal.classList.remove('active');
    notifyModalState(false);
});

resetChoiceModal.addEventListener('click', function(e) {
    if (e.target === resetChoiceModal) {
        resetChoiceModal.classList.remove('active');
        notifyModalState(false);
    }
});

resetActualOnlyBtn.addEventListener('click', function() {
    const selectedDate = currentDateInput.value.replace(/-/g, '/');
    logs = logs.filter(function(log) { return log.date !== selectedDate; });
    saveLogs();
    renderLogs();
    renderSummary();
    resetChoiceModal.classList.remove('active');
    notifyModalState(false);
    resetForm();
});

resetPlanOnlyBtn.addEventListener('click', function() {
    const selectedDate = currentDateInput.value.replace(/-/g, '/');
    plans = plans.filter(function(p) { return p.date !== selectedDate; });
    savePlans();
    renderPlans();
    renderSummary();
    resetChoiceModal.classList.remove('active');
    notifyModalState(false);
    resetForm();
});

resetAllBtn.addEventListener('click', function() {
    const selectedDate = currentDateInput.value.replace(/-/g, '/');
    logs = logs.filter(function(log) { return log.date !== selectedDate; });
    plans = plans.filter(function(p) { return p.date !== selectedDate; });
    saveLogs();
    savePlans();
    renderLogs();
    renderPlans();
    renderSummary();
    resetChoiceModal.classList.remove('active');
    notifyModalState(false);
    resetForm();
});

const exportMdBtn = document.getElementById('export-md-btn');
if (exportMdBtn) {
    exportMdBtn.addEventListener('click', function() {
        const selectedDate = currentDateInput.value.replace(/-/g, '/');
        const targetLogs = logs.filter(function(l) { return l.date === selectedDate; });
        const targetPlans = plans.filter(function(p) { return p.date === selectedDate; });
        targetLogs.sort(function(a, b) { return a.start.localeCompare(b.start); });
        targetPlans.sort(function(a, b) { return a.start.localeCompare(b.start); });

        if (targetLogs.length === 0 && targetPlans.length === 0) {
            alert('データがありません。');
            return;
        }

        const actualTotals = {};
        let totalActualMins = 0;
        targetLogs.forEach(function(log) {
            const duration = calculateDuration(log.start, log.end);
            log.items.forEach(function(item) {
                const minutes = duration * (item.percent / 100);
                if (!actualTotals[item.name]) actualTotals[item.name] = 0;
                actualTotals[item.name] += minutes;
                totalActualMins += minutes;
            });
        });

        const planTotals = {};
        let totalPlanMins = 0;
        targetPlans.forEach(function(plan) {
            const duration = calculateDuration(plan.start, plan.end);
            plan.items.forEach(function(item) {
                const minutes = duration * (item.percent / 100);
                if (!planTotals[item.name]) planTotals[item.name] = 0;
                planTotals[item.name] += minutes;
                totalPlanMins += minutes;
            });
        });

        const allNames = Array.from(new Set([...Object.keys(actualTotals), ...Object.keys(planTotals)]));

        let md = '# ' + selectedDate + ' 24時間活動・予実記録\\\\n\\\\n';

        md += '## 予実サマリー\\\\n';
        md += '- **予定総時間**: ' + Math.round(totalPlanMins) + '分 (' + (totalPlanMins / 60).toFixed(1) + 'h)\\\\n';
        md += '- **実績総時間**: ' + Math.round(totalActualMins) + '分 (' + (totalActualMins / 60).toFixed(1) + 'h)\\\\n';
        const diffTotal = totalActualMins - totalPlanMins;
        md += '- **時間差分**: ' + (diffTotal >= 0 ? '+' : '') + Math.round(diffTotal) + '分\\\\n\\\\n';

        md += '## 活動別 予実対比\\\\n';
        md += '| 活動名 | 予定 (分) | 実績 (分) | 差異 (分) | 状況 |\\\\n';
        md += '| :--- | :---: | :---: | :---: | :---: |\\\\n';

        allNames.forEach(function(name) {
            const pMins = Math.round(planTotals[name] || 0);
            const aMins = Math.round(actualTotals[name] || 0);
            const diff = aMins - pMins;
            const diffStr = diff >= 0 ? ('+' + diff) : String(diff);
            let status = '予定通り';
            if (pMins > 0 && aMins === 0) status = '未実施';
            else if (pMins === 0 && aMins > 0) status = '予定外';
            else if (diff > 5) status = '超過';
            else if (diff < -5) status = '短縮';

            const displayName = name.trim() ? name : '(未設定)';
            md += '| ' + displayName + ' | ' + pMins + ' | ' + aMins + ' | ' + diffStr + ' | ' + status + ' |\\\\n';
        });

        if (targetPlans.length > 0) {
            md += '\\\\n## 予定一覧 (Plans)\\\\n';
            targetPlans.forEach(function(plan) {
                const duration = calculateDuration(plan.start, plan.end);
                let content = plan.items.map(function(i) { return i.name.trim() || '(未設定)'; }).join(' / ');
                if (plan.memo && plan.memo.trim()) content += ' [' + plan.memo.trim() + ']';
                md += '- **' + plan.start + ' - ' + plan.end + '** (' + duration + '分): ' + content + '\\\\n';
            });
        }

        if (targetLogs.length > 0) {
            md += '\\\\n## 実績ログ (Actual)\\\\n';
            targetLogs.forEach(function(log) {
                const duration = calculateDuration(log.start, log.end);
                let content = log.items.map(function(i) { return i.name.trim() || '(未設定)'; }).join(' / ');
                if (log.memo && log.memo.trim()) content += ' [' + log.memo.trim() + ']';
                md += '- **' + log.start + ' - ' + log.end + '** (' + duration + '分): ' + content + '\\\\n';
            });
        }

        navigator.clipboard.writeText(md).then(function() {
            alert('クリップボードにコピーしました！\\\\nObsidianやGeminiに貼り付けて習慣化を分析してください。');
        }).catch(function(err) {
            console.error('Copy failed', err);
            alert('コピーに失敗しました。');
        });
    });
}

saveTemplateBtn.addEventListener('click', function() {
    saveTemplateFromCurrentDay('actual');
});

savePlanTemplateBtn.addEventListener('click', function() {
    saveTemplateFromCurrentDay('plan');
});

function saveTemplateFromCurrentDay(type) {
    const selectedDate = currentDateInput.value.replace(/-/g, '/');
    const sourceData = (type === 'plan')
        ? plans.filter(function(p) { return p.date === selectedDate; })
        : logs.filter(function(l) { return l.date === selectedDate; });

    const typeLabel = (type === 'plan') ? '予定' : '実績';

    if (sourceData.length === 0) {
        alert('保存する' + typeLabel + 'がありません。');
        return;
    }

    const name = prompt(typeLabel + 'テンプレート名を入力してください (例: 平日ルーティン):');
    if (name) {
        templates.push({
            id: Date.now(),
            name: name,
            type: type,
            data: sourceData
        });
        storage.setItem('zikankanri_templates', JSON.stringify(templates));
        renderTemplates();
    }
}

function openTemplateModal(templateId) {
    const tmpl = templates.find(function(t) { return t.id == templateId; });
    if (!tmpl) return;

    selectedTemplateId = templateId;
    templateModalTitle.textContent = 'テンプレート: ' + tmpl.name;
    templateModalDesc.textContent = '項目数: ' + (tmpl.data ? tmpl.data.length : 0) + '件';
    templateActionModal.classList.add('active');
    notifyModalState(true);
}

closeTemplateModalBtn.addEventListener('click', function() {
    templateActionModal.classList.remove('active');
    notifyModalState(false);
});

templateActionModal.addEventListener('click', function(e) {
    if (e.target === templateActionModal) {
        templateActionModal.classList.remove('active');
        notifyModalState(false);
    }
});

tmplApplyPlanBtn.addEventListener('click', function() {
    if (selectedTemplateId) {
        applyTemplate(selectedTemplateId, 'plan');
        templateActionModal.classList.remove('active');
        notifyModalState(false);
    }
});

tmplApplyActualBtn.addEventListener('click', function() {
    if (selectedTemplateId) {
        applyTemplate(selectedTemplateId, 'actual');
        templateActionModal.classList.remove('active');
        notifyModalState(false);
    }
});

tmplDeleteBtn.addEventListener('click', function() {
    if (selectedTemplateId) {
        templates = templates.filter(function(t) { return t.id != selectedTemplateId; });
        storage.setItem('zikankanri_templates', JSON.stringify(templates));
        renderTemplates();
        templateActionModal.classList.remove('active');
        notifyModalState(false);
    }
});

function applyTemplate(templateId, targetType) {
    const tmpl = templates.find(function(t) { return t.id == templateId; });
    if (!tmpl) return;

    const selectedDate = currentDateInput.value.replace(/-/g, '/');
    const newItems = tmpl.data.map(function(l) {
        return {
            ...l,
            id: Date.now() + Math.random(),
            date: selectedDate
        };
    });

    if (targetType === 'plan') {
        plans = plans.filter(function(p) { return p.date !== selectedDate; }).concat(newItems);
        savePlans();
        renderPlans();
    } else {
        logs = logs.filter(function(l) { return l.date !== selectedDate; }).concat(newItems);
        saveLogs();
        renderLogs();
    }

    renderSummary();
    resetForm();
}

function renderTemplates() {
    templateList.innerHTML = '';
    if (templates.length === 0) {
        templateList.innerHTML = '<span style="color: var(--text-secondary); font-size: 0.85rem;">テンプレートはありません</span>';
        return;
    }
    templates.forEach(function(tmpl) {
        const chip = document.createElement('span');
        chip.className = 'tag-chip';
        chip.textContent = tmpl.name;
        chip.onclick = function() { openTemplateModal(tmpl.id); };
        templateList.appendChild(chip);
    });
}

function renderPlans() {
    planList.innerHTML = '';
    const selectedDate = currentDateInput.value.replace(/-/g, '/');
    const targetPlans = plans.filter(function(p) { return p.date === selectedDate; });
    targetPlans.sort(function(a, b) { return a.start.localeCompare(b.start); });

    if (targetPlans.length === 0) {
        planList.innerHTML = '<div style="text-align:center; color: var(--text-secondary); padding: 16px;">予定はまだありません</div>';
        return;
    }

    targetPlans.forEach(function(plan) {
        const el = document.createElement('div');
        el.className = 'plan-item';

        let content = '';
        if (plan.items.length === 1) {
            const name = plan.items[0].name.trim();
            content = name ? ('<strong>' + name + '</strong>') : '<span style="color: var(--text-secondary); font-style: italic;">(未設定)</span>';
        } else {
            content = '<div style="font-size:0.9rem;">' +
                plan.items.map(function(i) {
                    const name = i.name.trim() || '(未設定)';
                    return name + ' (' + i.percent + '%)';
                }).join(' / ') +
                '</div>';
        }

        if (plan.memo && plan.memo.trim() !== '') {
            content += '<div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 2px;">📝 ' + plan.memo.trim() + '</div>';
        }

        const duration = calculateDuration(plan.start, plan.end);
        const durationStr = duration > 0 ? (' (' + duration + '分)') : '';
        const timeStr = (plan.start || '?') + ' - ' + (plan.end || '?');

        const isEditing = (plan.id === editingPlanId);
        const editClass = isEditing ? 'btn-plan' : 'btn-secondary';
        const editText = isEditing ? '編集中' : '編集';

        el.innerHTML =
            '<div>' +
                '<div class="plan-time-badge">' + timeStr + durationStr + '</div>' +
                '<div style="margin-top: 4px;">' + content + '</div>' +
            '</div>' +
            '<div class="flex-row" style="margin-bottom: 0;">' +
                '<button type="button" class="btn-copy-plan" onclick="copyPlanToActual(' + plan.id + ')">▶ 実績にコピー</button>' +
                '<button type="button" class="btn ' + editClass + '" style="width: auto; padding: 4px 8px; font-size: 0.8rem; margin-right: 6px; border-color: #2563EB; color: #93c5fd;" onclick="startEditPlan(' + plan.id + ')">' + editText + '</button>' +
                '<button type="button" class="btn btn-secondary" style="width: auto; padding: 4px 8px; font-size: 0.8rem; border-color: #666; color: #888;" onclick="deletePlan(' + plan.id + ')">削除</button>' +
            '</div>';
        planList.appendChild(el);
    });
}

function renderLogs() {
    logList.innerHTML = '';
    const selectedDate = currentDateInput.value.replace(/-/g, '/');
    const targetLogs = logs.filter(function(l) { return l.date === selectedDate; });
    targetLogs.sort(function(a, b) { return a.start.localeCompare(b.start); });

    if (targetLogs.length === 0) {
        logList.innerHTML = '<div style="text-align:center; color: var(--text-secondary); padding: 20px;">記録はまだありません</div>';
        return;
    }

    targetLogs.forEach(function(log) {
        const el = document.createElement('div');
        el.className = 'log-item';

        let content = '';
        if (log.items.length === 1) {
            const name = log.items[0].name.trim();
            content = name ? ('<strong>' + name + '</strong>') : '<span style="color: var(--text-secondary); font-style: italic;">(未設定)</span>';
        } else {
            content = '<div style="font-size:0.9rem;">' +
                log.items.map(function(i) {
                    const name = i.name.trim() || '(未設定)';
                    return name + ' (' + i.percent + '%)';
                }).join(' / ') +
                '</div>';
        }

        if (log.memo && log.memo.trim() !== '') {
            content += '<div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 2px;">📝 ' + log.memo.trim() + '</div>';
        }

        const duration = calculateDuration(log.start, log.end);
        const durationStr = duration > 0 ? (' (' + duration + '分)') : '';
        const timeStr = (log.start || '?') + ' - ' + (log.end || '?');

        const isEditing = (log.id === editingId);
        const editClass = isEditing ? 'btn-primary' : 'btn-secondary';
        const editText = isEditing ? '編集中' : '編集';

        el.innerHTML =
            '<div>' +
                '<div class="time-badge">' + timeStr + durationStr + '</div>' +
                '<div style="margin-top: 4px;">' + content + '</div>' +
            '</div>' +
            '<div class="flex-row" style="margin-bottom: 0;">' +
                '<button type="button" class="btn ' + editClass + '" style="width: auto; padding: 4px 8px; font-size: 0.8rem; margin-right: 8px;" onclick="startEdit(' + log.id + ')">' + editText + '</button>' +
                '<button type="button" class="btn btn-secondary" style="width: auto; padding: 4px 8px; font-size: 0.8rem; border-color: #666; color: #888;" onclick="deleteLog(' + log.id + ')">削除</button>' +
            '</div>';
        logList.appendChild(el);
    });
}

function renderSummary() {
    const selectedDate = currentDateInput.value.replace(/-/g, '/');
    const targetLogs = logs.filter(function(l) { return l.date === selectedDate; });
    const targetPlans = plans.filter(function(p) { return p.date === selectedDate; });

    const summaryList = document.getElementById('summary-list');
    const compareList = document.getElementById('summary-compare-list');
    const scoreContainer = document.getElementById('score-summary-container');
    const pieChartContainer = document.getElementById('summary-pie-chart');

    if (!summaryList || !compareList || !pieChartContainer) return;

    summaryList.innerHTML = '';
    compareList.innerHTML = '';
    scoreContainer.innerHTML = '';

    const actualTotals = {};
    let totalActualMins = 0;
    targetLogs.forEach(function(log) {
        const duration = calculateDuration(log.start, log.end);
        log.items.forEach(function(item) {
            const minutes = duration * (item.percent / 100);
            if (!actualTotals[item.name]) actualTotals[item.name] = 0;
            actualTotals[item.name] += minutes;
            totalActualMins += minutes;
        });
    });

    const planTotals = {};
    let totalPlanMins = 0;
    targetPlans.forEach(function(plan) {
        const duration = calculateDuration(plan.start, plan.end);
        plan.items.forEach(function(item) {
            const minutes = duration * (item.percent / 100);
            if (!planTotals[item.name]) planTotals[item.name] = 0;
            planTotals[item.name] += minutes;
            totalPlanMins += minutes;
        });
    });

    let matchMins = 0;
    const allCategories = Array.from(new Set([...Object.keys(actualTotals), ...Object.keys(planTotals)]));
    allCategories.forEach(function(name) {
        const p = planTotals[name] || 0;
        const a = actualTotals[name] || 0;
        matchMins += Math.min(p, a);
    });

    const adherenceRate = totalPlanMins > 0 ? Math.min(100, Math.round((matchMins / totalPlanMins) * 100)) : (totalActualMins > 0 ? 100 : 0);

    scoreContainer.innerHTML =
        '<div class="score-card">' +
            '<div class="val" style="color: #93c5fd;">' + Math.round(totalPlanMins) + '分</div>' +
            '<div class="lbl">📅 予定総時間</div>' +
        '</div>' +
        '<div class="score-card">' +
            '<div class="val" style="color: #c4b5fd;">' + Math.round(totalActualMins) + '分</div>' +
            '<div class="lbl">⏱ 実績総時間</div>' +
        '</div>' +
        '<div class="score-card">' +
            '<div class="val" style="color: ' + (adherenceRate >= 80 ? '#34d399' : (adherenceRate >= 50 ? '#fbbf24' : '#f87171')) + ';">' + adherenceRate + '%</div>' +
            '<div class="lbl">🎯 予定遵守率</div>' +
        '</div>';

    if (allCategories.length === 0) {
        compareList.innerHTML = '<div style="text-align:center; color: var(--text-secondary); padding: 10px;">データなし</div>';
    } else {
        const sortedCats = allCategories.sort(function(a, b) {
            return ((planTotals[b] || 0) + (actualTotals[b] || 0)) - ((planTotals[a] || 0) + (actualTotals[a] || 0));
        });

        sortedCats.forEach(function(name) {
            const pMins = Math.round(planTotals[name] || 0);
            const aMins = Math.round(actualTotals[name] || 0);
            const diff = aMins - pMins;

            let badgeHtml = '';
            if (pMins > 0 && aMins === 0) {
                badgeHtml = '<span class="diff-badge pending">⚪ 未実施</span>';
            } else if (pMins === 0 && aMins > 0) {
                badgeHtml = '<span class="diff-badge unplanned">🟣 予定外 (+' + aMins + '分)</span>';
            } else if (Math.abs(diff) <= 5) {
                badgeHtml = '<span class="diff-badge match">🟢 予定通り</span>';
            } else if (diff > 5) {
                badgeHtml = '<span class="diff-badge over">🟠 +' + diff + '分 超過</span>';
            } else {
                badgeHtml = '<span class="diff-badge short">🔵 ' + diff + '分 短縮</span>';
            }

            const row = document.createElement('div');
            row.className = 'compare-row';
            const displayName = name.trim() ? name : '<span style="color: var(--text-secondary); font-style: italic;">(未設定)</span>';

            row.innerHTML =
                '<div class="compare-left">' +
                    '<div class="compare-title">' + displayName + '</div>' +
                    '<div class="compare-meta">予定: ' + pMins + '分 | 実績: ' + aMins + '分</div>' +
                '</div>' +
                '<div class="compare-right">' +
                    badgeHtml +
                '</div>';
            compareList.appendChild(row);
        });
    }

    const sortedActual = Object.entries(actualTotals).sort(function(a, b) { return b[1] - a[1]; });
    if (sortedActual.length === 0) {
        summaryList.innerHTML = '<div style="text-align:center; color: var(--text-secondary); padding: 10px;">実績データなし</div>';
    } else {
        sortedActual.forEach(function(entry) {
            const name = entry[0];
            const mins = entry[1];
            const row = document.createElement('div');
            row.className = 'flex-row justify-between';
            row.style.padding = '8px 0';
            row.style.borderBottom = '1px solid #333';
            const displayName = name.trim() ? name : '<span style="color: var(--text-secondary); font-style: italic;">(未設定)</span>';
            const pct = totalActualMins > 0 ? Math.round((mins / totalActualMins) * 100) : 0;
            row.innerHTML = '<span style="display:flex; align-items:center; gap:8px;">' + displayName + ' <span style="font-size:0.8rem; color:var(--text-secondary);">(' + pct + '%)</span></span><span>' + Math.round(mins) + '分</span>';
            summaryList.appendChild(row);
        });
    }

    renderDualRingSVG(targetPlans, targetLogs);
}

function renderDualRingSVG(targetPlans, targetLogs) {
    const pieChartContainer = document.getElementById('summary-pie-chart');
    if (!pieChartContainer) return;

    pieChartContainer.innerHTML = '';
    pieChartContainer.style.background = 'none';

    if (targetPlans.length === 0 && targetLogs.length === 0) {
        return;
    }

    const size = 320;
    const cx = size / 2;
    const cy = size / 2;
    const outerRingOuterR = 120;
    const outerRingInnerR = 100;
    const innerCircleR = 92;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "auto");
    svg.setAttribute("viewBox", "0 0 " + size + " " + size);
    svg.style.maxWidth = "320px";
    svg.style.display = "block";
    svg.style.margin = "0 auto";

    const bgOuter = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    bgOuter.setAttribute("cx", cx);
    bgOuter.setAttribute("cy", cy);
    bgOuter.setAttribute("r", outerRingOuterR);
    bgOuter.setAttribute("fill", "#1E1E1E");
    svg.appendChild(bgOuter);

    const bgInner = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    bgInner.setAttribute("cx", cx);
    bgInner.setAttribute("cy", cy);
    bgInner.setAttribute("r", innerCircleR);
    bgInner.setAttribute("fill", "#2C2C2C");
    svg.appendChild(bgInner);

    const colors = ['#FFCDD2', '#F8BBD0', '#E1BEE7', '#D1C4E9', '#C5CAE9', '#BBDEFB', '#B3E5FC', '#B2EBF2', '#B2DFDB', '#C8E6C9', '#DCEDC8', '#F0F4C3', '#FFF9C4', '#FFECB3', '#FFE0B2', '#FFCCBC'];
    const activityColorMap = {};
    let colorIdx = 0;

    const getColor = function(name) {
        if (!activityColorMap[name]) {
            activityColorMap[name] = colors[colorIdx % colors.length];
            colorIdx++;
        }
        return activityColorMap[name];
    };

    for (let i = 0; i < 24; i++) {
        const angle = (i * 15) - 90;
        const rad = angle * (Math.PI / 180);
        const textR = outerRingOuterR + 18;
        const x = cx + textR * Math.cos(rad);
        const y = cy + textR * Math.sin(rad);

        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", x);
        text.setAttribute("y", y);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("dominant-baseline", "middle");
        text.setAttribute("fill", (i % 6 === 0) ? "#a78bfa" : "#888888");
        text.setAttribute("font-size", (i % 6 === 0) ? "11" : "9");
        text.setAttribute("font-weight", (i % 6 === 0) ? "bold" : "normal");
        text.textContent = i;
        svg.appendChild(text);
    }

    function createDonutArc(cx, cy, rOut, rIn, startAngle, endAngle) {
        const sRad = startAngle * Math.PI / 180;
        const eRad = endAngle * Math.PI / 180;
        const x1 = cx + rOut * Math.cos(sRad);
        const y1 = cy + rOut * Math.sin(sRad);
        const x2 = cx + rOut * Math.cos(eRad);
        const y2 = cy + rOut * Math.sin(eRad);
        const x3 = cx + rIn * Math.cos(eRad);
        const y3 = cy + rIn * Math.sin(eRad);
        const x4 = cx + rIn * Math.cos(sRad);
        const y4 = cy + rIn * Math.sin(sRad);

        const largeArc = (endAngle - startAngle) > 180 ? 1 : 0;
        return 'M ' + x1 + ' ' + y1 + ' A ' + rOut + ' ' + rOut + ' 0 ' + largeArc + ' 1 ' + x2 + ' ' + y2 + ' L ' + x3 + ' ' + y3 + ' A ' + rIn + ' ' + rIn + ' 0 ' + largeArc + ' 0 ' + x4 + ' ' + y4 + ' Z';
    }

    targetPlans.forEach(function(plan) {
        const primName = plan.items[0].name;
        const color = getColor(primName);
        const [sh, sm] = plan.start.split(':').map(Number);
        const [eh, em] = plan.end.split(':').map(Number);
        let sMins = sh * 60 + sm;
        let eMins = eh * 60 + em;
        if (eMins < sMins) eMins += 1440;

        const sAngle = (sMins / 1440) * 360 - 90;
        const eAngle = (eMins / 1440) * 360 - 90;

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", createDonutArc(cx, cy, outerRingOuterR, outerRingInnerR, sAngle, eAngle));
        path.setAttribute("fill", color);
        path.setAttribute("fill-opacity", "0.85");
        path.setAttribute("stroke", "#121212");
        path.setAttribute("stroke-width", "1");
        svg.appendChild(path);
    });

    targetLogs.forEach(function(log) {
        const primName = log.items[0].name;
        const color = getColor(primName);
        const [sh, sm] = log.start.split(':').map(Number);
        const [eh, em] = log.end.split(':').map(Number);
        let sMins = sh * 60 + sm;
        let eMins = eh * 60 + em;
        if (eMins < sMins) eMins += 1440;

        const sAngle = (sMins / 1440) * 360 - 90;
        const eAngle = (eMins / 1440) * 360 - 90;

        const x1 = cx + innerCircleR * Math.cos(sAngle * Math.PI / 180);
        const y1 = cy + innerCircleR * Math.sin(sAngle * Math.PI / 180);
        const x2 = cx + innerCircleR * Math.cos(eAngle * Math.PI / 180);
        const y2 = cy + innerCircleR * Math.sin(eAngle * Math.PI / 180);
        const largeArc = (eAngle - sAngle) > 180 ? 1 : 0;

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", 'M ' + cx + ' ' + cy + ' L ' + x1 + ' ' + y1 + ' A ' + innerCircleR + ' ' + innerCircleR + ' 0 ' + largeArc + ' 1 ' + x2 + ' ' + y2 + ' Z');
        path.setAttribute("fill", color);
        path.setAttribute("stroke", "#121212");
        path.setAttribute("stroke-width", "1");
        svg.appendChild(path);
    });

    const centerCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    centerCircle.setAttribute("cx", cx);
    centerCircle.setAttribute("cy", cy);
    centerCircle.setAttribute("r", "28");
    centerCircle.setAttribute("fill", "#181818");
    centerCircle.setAttribute("stroke", "#333");
    centerCircle.setAttribute("stroke-width", "1");
    svg.appendChild(centerCircle);

    const centerText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    centerText.setAttribute("x", cx);
    centerText.setAttribute("y", cy - 4);
    centerText.setAttribute("text-anchor", "middle");
    centerText.setAttribute("dominant-baseline", "middle");
    centerText.setAttribute("fill", "#93c5fd");
    centerText.setAttribute("font-size", "8");
    centerText.textContent = "外:予定";
    svg.appendChild(centerText);

    const centerText2 = document.createElementNS("http://www.w3.org/2000/svg", "text");
    centerText2.setAttribute("x", cx);
    centerText2.setAttribute("y", cy + 8);
    centerText2.setAttribute("text-anchor", "middle");
    centerText2.setAttribute("dominant-baseline", "middle");
    centerText2.setAttribute("fill", "#c4b5fd");
    centerText2.setAttribute("font-size", "8");
    centerText2.textContent = "内:実績";
    svg.appendChild(centerText2);

    targetLogs.forEach(function(log) {
        const [sh, sm] = log.start.split(':').map(Number);
        const [eh, em] = log.end.split(':').map(Number);
        let sMins = sh * 60 + sm;
        let eMins = eh * 60 + em;
        if (eMins < sMins) eMins += 1440;

        const sAngle = (sMins / 1440) * 360 - 90;
        const eAngle = (eMins / 1440) * 360 - 90;
        const midAngle = (sAngle + eAngle) / 2;
        const midRad = midAngle * (Math.PI / 180);

        let labelR = innerCircleR * 0.65;
        let lx = cx + labelR * Math.cos(midRad);
        let ly = cy + labelR * Math.sin(midRad);

        const isVisible = (eMins - sMins) >= 15;
        let textContent = '';
        if (isVisible) {
            textContent = log.items.map(function(i) { return i.name.trim(); }).filter(function(n) { return n !== ''; }).join('/');
            if (textContent.length > 5) textContent = textContent.substring(0, 4) + '..';
        }

        if (isVisible && textContent) {
            const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
            label.setAttribute("x", lx);
            label.setAttribute("y", ly);
            label.setAttribute("text-anchor", "middle");
            label.setAttribute("dominant-baseline", "middle");
            label.setAttribute("fill", "#222");
            label.setAttribute("stroke", "#ffffff");
            label.setAttribute("stroke-width", "2");
            label.setAttribute("paint-order", "stroke fill");
            label.setAttribute("font-size", "10");
            label.setAttribute("font-weight", "bold");
            label.setAttribute("pointer-events", "none");
            label.textContent = textContent;

            svg.appendChild(label);
        }
    });

    pieChartContainer.appendChild(svg);
}

function saveLogs() {
    storage.setItem('zikankanri_logs', JSON.stringify(logs));
}

function savePlans() {
    storage.setItem('zikankanri_plans', JSON.stringify(plans));
}

function deleteLog(id) {
    if (confirm('実績記録を削除しますか？')) {
        const wasEditing = (editingId === id);
        logs = logs.filter(function(l) { return l.id !== id; });
        saveLogs();
        renderLogs();
        renderSummary();
        if (wasEditing) resetForm();
        else updateDefaultStartTime();
    }
}

window.deleteLog = deleteLog;

function deletePlan(id) {
    if (confirm('予定を削除しますか？')) {
        const wasEditing = (editingPlanId === id);
        plans = plans.filter(function(p) { return p.id !== id; });
        savePlans();
        renderPlans();
        renderSummary();
        if (wasEditing) resetForm();
    }
}

window.deletePlan = deletePlan;

function getCurrentTimeStr() {
    const now = new Date();
    return now.toTimeString().substring(0, 5);
}

function calculateDuration(start, end) {
    if (!start || !end) return 0;
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    let min1 = h1 * 60 + m1;
    let min2 = h2 * 60 + m2;
    if (min2 < min1) min2 += 1440;
    return min2 - min1;
}

function timeToMins(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

function minsToTime(mins) {
    let m = mins % 1440;
    if (m < 0) m += 1440;
    const h = Math.floor(m / 60);
    const min = m % 60;
    return String(h).padStart(2, '0') + ':' + String(min).padStart(2, '0');
}

function updateDefaultStartTime() {
    if (editingId !== null || editingPlanId !== null) return;
    const selectedDate = currentDateInput.value.replace(/-/g, '/');
    const dayLogs = (currentInputMode === 'plan')
        ? plans.filter(function(p) { return p.date === selectedDate; })
        : logs.filter(function(l) { return l.date === selectedDate; });
    
    if (isContinuousMode) {
        if (dayLogs.length > 0) {
            dayLogs.sort(function(a, b) { return a.start.localeCompare(b.start); });
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

</html>
`;
