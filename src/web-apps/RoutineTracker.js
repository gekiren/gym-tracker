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
        const routineVal = storageStore['routine_tracker_data'];
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'WEB_DEBUG',
          message: '[RoutineTracker] init storageStore. routine_tracker_data type=' + (typeof routineVal) + ' len=' + (routineVal ? String(routineVal).length : 0) + ' __INITIAL_WEBVIEW_DATA__ keys=' + (initData ? Object.keys(initData).join(',') : 'NULL')
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
    <title>Routine Tracker</title>
    <script>
    (function() {
      if (window.__BACKGROUND_THEME__ === 'pureBlack') {
        var style = document.createElement('style');
        style.innerHTML = 'body { background-color: #000000 !important; color: #ffffff !important; } .card, .routine-card, .routine-item, .item-card, div[class*="card"], .confirm-content, .modal-content { background-color: #080808 !important; border: 1px solid #1f1f1f !important; } .task-card, .setting-row { background-color: #111113 !important; border-color: #222226 !important; } .form-input, .task-name-input, .task-time-input-min, .task-time-input-sec { background-color: #000000 !important; border-color: #2a2a2e !important; } .text-muted, small, span.sub { color: #888888 !important; }';
        document.head.appendChild(style);
      }
    })();
    </script>
    <style>
:root {
    --bg-color: #121212;
    --card-bg: #1e1e24;
    --card-inner-bg: #26262d;
    --input-bg: #18181c;
    --border-color: rgba(255, 255, 255, 0.1);
    --border-focus: #4facfe;
    --primary-color: #2563eb;
    --primary-gradient: linear-gradient(135deg, #4facfe 0%, #00c6fb 100%);
    --danger-color: #ef4444;
    --danger-bg: rgba(239, 68, 68, 0.15);
    --text-primary: #ffffff;
    --text-secondary: #a0a0ab;
    --text-muted: #71717a;
    --radius-lg: 16px;
    --radius-md: 10px;
    --radius-sm: 6px;
}

body {
    background-color: var(--bg-color);
    color: var(--text-primary);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    margin: 0;
    padding: 20px 16px;
    display: flex;
    justify-content: center;
    min-height: 100vh;
    box-sizing: border-box;
    -webkit-font-smoothing: antialiased;
}

#app {
    width: 100%;
    max-width: 480px;
    padding-bottom: 80px;
}

h1, h2 {
    color: #ffffff;
    margin-bottom: 20px;
    text-align: center;
    font-weight: 700;
    letter-spacing: -0.3px;
}

/* Routine Card */
.routine-card {
    background: #1e1e24;
    padding: 16px;
    margin: 12px 0;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-color);
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    touch-action: manipulation;
    min-height: 80px;
    background-size: cover;
    background-position: center;
    transition: transform 0.15s ease, border-color 0.2s;
}

.routine-card:active {
    background: #282830;
    transform: scale(0.98);
}

.icon-btn {
    padding: 8px 12px;
    margin-left: 5px;
    background: #33333d;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: white;
    border-radius: var(--radius-sm);
    font-size: 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    cursor: pointer;
    transition: background 0.15s;
}

.icon-btn:active {
    background: #444452;
}

.delete-btn {
    background: var(--danger-bg);
    border-color: rgba(239, 68, 68, 0.3);
    color: var(--danger-color);
}

/* FAB (Floating Action Button) */
.floating-fab {
    position: fixed;
    bottom: 30px;
    right: 24px;
    width: 58px;
    height: 58px;
    border-radius: 29px;
    background: var(--primary-gradient);
    color: white;
    border: none;
    font-size: 26px;
    box-shadow: 0 6px 16px rgba(0, 198, 251, 0.35);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;
    cursor: pointer;
    transition: transform 0.15s ease;
}

.floating-fab:active {
    transform: scale(0.92);
}

/* Timer */
#timer {
    font-size: 68px;
    font-weight: 800;
    margin: 36px 0;
    color: #4cd964;
    text-align: center;
    letter-spacing: 2px;
    font-variant-numeric: tabular-nums;
    text-shadow: 0 0 20px rgba(76, 217, 100, 0.3);
}

.btn-large-primary {
    width: 100%;
    padding: 16px;
    background: var(--primary-gradient);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    font-size: 17px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(79, 172, 254, 0.3);
    transition: opacity 0.15s, transform 0.1s;
}

.btn-large-primary:active {
    opacity: 0.9;
    transform: scale(0.98);
}

.btn-large-secondary {
    width: 100%;
    padding: 14px;
    background: #2a2a32;
    border: 1px solid var(--border-color);
    color: #e0e0e8;
    border-radius: var(--radius-md);
    font-size: 15px;
    font-weight: 600;
    margin-top: 16px;
    cursor: pointer;
    transition: background 0.15s;
}

.btn-large-secondary:active {
    background: #363640;
}

/* Modal */
.modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: max(24px, 4vh);
    padding-bottom: 24px;
    box-sizing: border-box;
    z-index: 1000;
    overflow-y: auto;
}

.modal.modal-center {
    align-items: center !important;
    padding-top: 0 !important;
}

.hidden {
    display: none !important;
}

.modal.hidden {
    display: none !important;
}

.modal-content {
    background-color: #1c1c22;
    padding: 24px 20px;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    width: 92%;
    max-width: 440px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.65);
    box-sizing: border-box;
}

.modal-content h2 {
    font-size: 20px;
    font-weight: 700;
    margin-top: 0;
    margin-bottom: 18px;
    color: #ffffff;
    letter-spacing: -0.2px;
}

.confirm-content {
    background-color: #1c1c22;
    padding: 24px;
    border-radius: 18px;
    width: 88%;
    max-width: 340px;
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.12);
    animation: popIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    box-sizing: border-box;
}

@keyframes popIn {
    0% { transform: scale(0.92); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
}

.confirm-title {
    color: #ffffff;
    font-size: 1.15rem;
    font-weight: 700;
    margin-top: 0;
    margin-bottom: 12px;
}

.confirm-message {
    color: #c0c0cb;
    font-size: 0.95rem;
    line-height: 1.5;
    margin: 0 0 20px 0;
    white-space: pre-wrap;
}

.confirm-actions {
    display: flex;
    gap: 12px;
}

.confirm-actions button {
    flex: 1;
    padding: 12px 16px;
    border: none;
    border-radius: var(--radius-md);
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s, transform 0.1s;
}

.confirm-actions button:active {
    transform: scale(0.97);
    opacity: 0.85;
}

.modal-actions {
    display: flex;
    gap: 12px;
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.modal-actions button {
    flex: 1;
    padding: 14px;
    border: none;
    border-radius: var(--radius-md);
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.1s, opacity 0.15s;
}

.modal-actions button:active {
    transform: scale(0.98);
}

.btn-save {
    background: var(--primary-gradient);
    color: white;
    box-shadow: 0 4px 14px rgba(79, 172, 254, 0.35);
}

.btn-cancel {
    background: #2a2a32;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #d0d0d8;
}

.btn-danger {
    background: var(--danger-color);
    color: #ffffff;
}

.btn-confirm-ok {
    background: var(--primary-gradient);
    color: #ffffff;
}

.text-center {
    text-align: center;
}

/* Modern Form Controls */
.form-group {
    margin-bottom: 16px;
}

.form-label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 6px;
}

.full-width-input,
.form-input {
    width: 100%;
    padding: 12px 14px;
    background: var(--input-bg);
    border: 1px solid var(--border-color);
    color: #ffffff;
    border-radius: var(--radius-md);
    font-size: 15px;
    box-sizing: border-box;
    transition: border-color 0.2s, box-shadow 0.2s;
}

.full-width-input:focus,
.form-input:focus {
    border-color: var(--border-focus);
    box-shadow: 0 0 0 3px rgba(79, 172, 254, 0.25);
    outline: none;
}

.full-width-input::placeholder,
.form-input::placeholder {
    color: var(--text-muted);
}

/* Custom Image Upload Box */
.image-upload-section {
    margin-bottom: 16px;
}

.custom-file-upload-btn {
    width: 100%;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px dashed rgba(255, 255, 255, 0.2);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font-size: 13px;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    cursor: pointer;
    box-sizing: border-box;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.custom-file-upload-btn:active {
    background: rgba(255, 255, 255, 0.08);
    border-color: var(--border-focus);
    color: #ffffff;
}

.image-preview-wrapper {
    position: relative;
    margin-top: 10px;
    background: #141418;
    border-radius: var(--radius-md);
    padding: 8px;
    border: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    gap: 12px;
}

.image-preview-wrapper img {
    width: 64px;
    height: 64px;
    border-radius: var(--radius-sm);
    object-fit: cover;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.image-preview-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.image-preview-info span {
    font-size: 12px;
    color: #a0a0ab;
}

.image-action-btns {
    display: flex;
    gap: 8px;
}

.btn-mini-action {
    padding: 5px 10px;
    font-size: 12px;
    font-weight: 600;
    border-radius: var(--radius-sm);
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: #2a2a32;
    color: #ffffff;
    cursor: pointer;
}

.btn-mini-action.danger {
    background: var(--danger-bg);
    border-color: rgba(239, 68, 68, 0.3);
    color: var(--danger-color);
}

/* Settings Switch Rows (iOS Style) */
.settings-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 20px;
}

.setting-row {
    background: var(--card-inner-bg);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: 10px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    cursor: pointer;
    user-select: none;
    transition: background 0.15s, border-color 0.15s;
}

.setting-row:active {
    background: #2e2e38;
}

.setting-info {
    flex: 1;
}

.setting-title {
    font-size: 13px;
    font-weight: 600;
    color: #ffffff;
    display: block;
    line-height: 1.3;
}

.setting-desc {
    font-size: 11px;
    color: var(--text-muted);
    display: block;
    margin-top: 2px;
    line-height: 1.3;
}

/* Toggle Switch Element */
.toggle-switch {
    position: relative;
    display: inline-block;
    width: 44px;
    height: 26px;
    flex-shrink: 0;
}

.toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
    position: absolute;
}

.toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #3e3e48;
    border-radius: 26px;
    transition: background-color 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.toggle-slider::before {
    position: absolute;
    content: "";
    height: 20px;
    width: 20px;
    left: 3px;
    bottom: 3px;
    background-color: #ffffff;
    border-radius: 50%;
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
}

.toggle-switch input:checked + .toggle-slider {
    background: var(--primary-gradient);
}

.toggle-switch input:checked + .toggle-slider::before {
    transform: translateX(18px);
}

/* Task Cards */
.task-list-section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.task-list-section-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
}

.task-card {
    background: var(--card-inner-bg);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: 12px;
    margin-bottom: 10px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    transition: border-color 0.2s;
}

.task-card:focus-within {
    border-color: rgba(79, 172, 254, 0.4);
}

.task-card-header {
    display: flex;
    align-items: center;
    gap: 8px;
}

.task-index-badge {
    width: 22px;
    height: 22px;
    border-radius: 6px;
    background: rgba(79, 172, 254, 0.15);
    color: #4facfe;
    font-size: 11px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.task-name-input {
    flex: 1;
    background: var(--input-bg);
    border: 1px solid var(--border-color);
    color: #ffffff;
    padding: 8px 12px;
    border-radius: var(--radius-sm);
    font-size: 14px;
    box-sizing: border-box;
    transition: border-color 0.2s, box-shadow 0.2s;
}

.task-name-input:focus {
    border-color: var(--border-focus);
    box-shadow: 0 0 0 2px rgba(79, 172, 254, 0.2);
    outline: none;
}

.task-name-input::placeholder {
    color: var(--text-muted);
}

.task-delete-btn {
    width: 32px;
    height: 32px;
    background: var(--danger-bg);
    border: 1px solid rgba(239, 68, 68, 0.25);
    color: var(--danger-color);
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 16px;
    font-weight: 700;
    flex-shrink: 0;
    transition: background 0.15s, transform 0.1s;
}

.task-delete-btn:active {
    background: rgba(239, 68, 68, 0.3);
    transform: scale(0.92);
}

.task-card-body {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.task-image-picker {
    display: flex;
    align-items: center;
    gap: 8px;
}

.task-img-btn {
    padding: 5px 10px;
    background: var(--input-bg);
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    border-radius: var(--radius-sm);
    font-size: 12px;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    cursor: pointer;
    transition: background 0.15s;
}

.task-img-btn:active {
    background: #2e2e38;
}

.task-thumb-img {
    height: 30px;
    width: 30px;
    object-fit: cover;
    border-radius: var(--radius-sm);
    border: 1px solid rgba(255, 255, 255, 0.2);
    cursor: pointer;
}

.task-time-wrapper {
    display: flex;
    align-items: center;
    gap: 4px;
}

.task-time-input-min,
.task-time-input-sec {
    width: 44px;
    padding: 5px 4px;
    background: var(--input-bg);
    border: 1px solid var(--border-color);
    color: #ffffff;
    border-radius: var(--radius-sm);
    font-size: 13px;
    font-weight: 600;
    text-align: center;
    box-sizing: border-box;
    transition: border-color 0.2s;
}

.task-time-input-min:focus,
.task-time-input-sec:focus {
    border-color: var(--border-focus);
    outline: none;
}

.task-time-unit {
    font-size: 12px;
    color: var(--text-muted);
    font-weight: 500;
    margin-right: 4px;
}

.task-time-unit:last-child {
    margin-right: 0;
}

/* + Add Task Button */
.add-task-btn {
    width: 100%;
    padding: 12px;
    background: rgba(79, 172, 254, 0.08);
    border: 1px dashed #4facfe;
    border-radius: var(--radius-md);
    color: #4facfe;
    font-size: 14px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
    margin-top: 6px;
    margin-bottom: 8px;
    box-sizing: border-box;
}

.add-task-btn:active {
    background: rgba(79, 172, 254, 0.18);
    transform: scale(0.99);
}

.chart-container {
    position: relative;
    height: 250px;
    width: 100%;
    margin-bottom: 20px;
}

.result-item {
    background: #2c2c2c;
    padding: 12px;
    margin: 8px 0;
    border-radius: 8px;
    text-align: left;
    font-size: 14px;
}

/* History Styles */
.history-item {
    background: #333;
    border-radius: 8px;
    margin-bottom: 10px;
    overflow: hidden;
}

.history-summary {
    padding: 15px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    background: #3a3a3a;
}

.history-summary:active {
    background: #444;
}

.history-date {
    font-weight: bold;
    color: #fff;
}

.history-total {
    color: #cecece;
}

.history-arrow {
    transition: transform 0.2s;
}

.history-details {
    padding: 10px 15px;
    background: #2a2a2a;
    border-top: 1px solid #444;
}

.history-detail-row {
    display: flex;
    justify-content: space-between;
    padding: 5px 0;
    border-bottom: 1px solid #333;
    font-size: 14px;
}

.history-detail-row:last-child {
    border-bottom: none;
}
</style>
    
    <meta name="theme-color" content="#121212">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <link rel="apple-touch-icon" href="https://cdn-icons-png.flaticon.com/512/2693/2693507.png">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>

<body>
    <div id="app">
        <!-- ホーム画面 -->
        <div id="home-screen">
            <div style="display: none;">
                <h1 style="margin: 0; text-align: left;">Select Routine</h1>
                <button onclick="showManageScreen()" class="icon-btn" style="font-size: 14px; padding: 8px 12px; background: #2563eb; font-weight: bold; border: none; color: white; border-radius: 6px;">⚙️ 管理メニュー</button>
            </div>
            <div id="routine-list">
                <!-- ここにルーティンリストが生成される -->
            </div>
        </div>

        <!-- 管理画面 (専用メニュー) -->
        <div id="manage-screen" class="hidden">
            <h1>ルーティン編集</h1>
            <button id="create-routine-btn" class="btn-large-primary" style="margin-top: 20px;">+ 追加</button>
            <button onclick="goHome()" class="btn-large-secondary" style="margin-top: 20px; margin-bottom: 20px;">閉じる</button>
            <div id="manage-routine-list">
                <!-- ここに管理用のルーティンリストが生成される -->
            </div>
        </div>

        <!-- ルーティン作成モーダル -->
        <div id="create-modal" class="modal hidden">
            <div class="modal-content">
                <h2 id="modal-title">ルーティン作成</h2>
                <input type="hidden" id="edit-routine-id">
                
                <div class="form-group">
                    <label class="form-label" for="new-routine-name">ルーティン名</label>
                    <input type="text" id="new-routine-name" placeholder="例: 朝のストレッチ" class="form-input">
                </div>

                <!-- Image Upload -->
                <div class="image-upload-section">
                    <label class="form-label">カバー画像 (任意)</label>
                    <input type="file" id="routine-image-input" accept="image/*" style="display: none;">
                    <div id="image-upload-trigger-btn" class="custom-file-upload-btn" onclick="document.getElementById('routine-image-input').click()">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        <span>画像を選択 / アップロード</span>
                    </div>
                    <div id="image-preview-container" class="image-preview-wrapper" style="display: none;">
                        <img id="image-preview" src="" alt="Preview">
                        <div class="image-preview-info">
                            <span>カバー画像を設定中</span>
                            <div class="image-action-btns">
                                <button type="button" class="btn-mini-action" onclick="document.getElementById('routine-image-input').click()">変更</button>
                                <button type="button" class="btn-mini-action danger" onclick="clearImage()">削除</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Settings Switches (iOS Style) -->
                <div class="settings-group">
                    <label class="setting-row" for="auto-update-estimates">
                        <div class="setting-info">
                            <span class="setting-title">完了後に時間を自動更新</span>
                            <span class="setting-desc">実績時間を次回の目安時間に反映します</span>
                        </div>
                        <div class="toggle-switch">
                            <input type="checkbox" id="auto-update-estimates" checked>
                            <span class="toggle-slider"></span>
                        </div>
                    </label>

                    <label class="setting-row" for="auto-advance">
                        <div class="setting-info">
                            <span class="setting-title">自動で次のタスクに進む</span>
                            <span class="setting-desc">タイマー終了時に自動で次タスクへ切り替え</span>
                        </div>
                        <div class="toggle-switch">
                            <input type="checkbox" id="auto-advance">
                            <span class="toggle-slider"></span>
                        </div>
                    </label>

                    <label class="setting-row" for="enable-vibration">
                        <div class="setting-info">
                            <span class="setting-title">バイブレーション通知</span>
                            <span class="setting-desc">タイマー終了時に振動でお知らせします</span>
                        </div>
                        <div class="toggle-switch">
                            <input type="checkbox" id="enable-vibration" checked>
                            <span class="toggle-slider"></span>
                        </div>
                    </label>
                </div>

                <!-- Task List Section -->
                <div class="task-list-section-header">
                    <span class="task-list-section-title">タスク一覧</span>
                </div>
                <div id="new-task-list" class="task-list-container">
                    <!-- タスク入力欄 -->
                </div>

                <button id="add-task-btn" type="button" onclick="addTaskInput()" class="add-task-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    <span>タスクを追加</span>
                </button>

                <div class="modal-actions">
                    <button type="button" onclick="closeModal()" class="btn-cancel">キャンセル</button>
                    <button type="button" onclick="saveNewRoutine()" class="btn-save">保存する</button>
                </div>
            </div>
        </div>

        <!-- アクティブ画面（実行中） -->
        <div id="active-screen" class="hidden">
            <!-- 開始準備コンテナ -->
            <div id="prepare-container">
                <h2 id="prepare-routine-name" style="text-align: center; margin-bottom: 20px;">Routine Name</h2>
                
                <!-- ルーティン詳細表示エリア -->
                <div id="prepare-routine-details" style="background: #1e1e1e; border: 1px solid #333; padding: 15px; border-radius: 8px; margin-bottom: 25px; font-size: 14px; color: #b0b0b0; max-height: 250px; overflow-y: auto;">
                    <!-- ここにタスク一覧が生成される -->
                </div>

                <button id="start-routine-btn" class="btn-large-primary" style="background: #51cf66;">開始する</button>
                <button onclick="goHome()" class="btn-large-secondary" style="margin-top: 20px;">キャンセル</button>
            </div>

            <!-- 実行中コンテナ -->
            <div id="running-container" class="hidden">
                <h2 id="current-task-name">Task Name</h2>
                <img id="current-task-image" src="" alt="Task Image"
                    style="max-width: 100%; max-height: 300px; display: none; margin: 0 auto 20px auto; border-radius: 8px;">
                <div id="timer">00:00</div>

                <!-- 進行状況および次のタスク情報表示エリア -->
                <div id="running-progress-info" style="background: #1e1e1e; border: 1px solid #333; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; text-align: left;">
                    <div id="running-next-task" style="color: #cecece; margin-bottom: 8px; line-height: 1.4;">次のタスク: -</div>
                    <div id="running-remaining-tasks" style="color: #888; font-size: 12px; line-height: 1.4;">残りタスク: -</div>
                </div>

                <button id="next-btn" class="btn-large-primary">Next Task</button>
            </div>
        </div>

        <!-- 結果画面 -->
        <div id="result-screen" class="hidden">
            <h1>Result</h1>

            <div class="chart-container">
                <canvas id="resultChart"></canvas>
            </div>

            <div id="result-list">
                <!-- 結果詳細 -->
            </div>
            <button onclick="goHome()" class="btn-large-secondary" style="margin-top: 20px;">Back to Home</button>
        </div>

        <!-- 履歴画面 -->
        <div id="history-screen" class="hidden">
            <h1 id="history-title">History</h1>
            <div id="history-list" class="history-list-container">
                <!-- 履歴リスト -->
            </div>
            <button onclick="showManageScreen()" class="btn-large-secondary" style="margin-top: 20px;">Back to Management</button>
        </div>

        <!-- 汎用確認・アラートモーダル -->
        <div id="confirm-modal" class="modal modal-center hidden">
            <div class="confirm-content text-center">
                <h3 id="confirm-title" class="confirm-title">確認</h3>
                <p id="confirm-message" class="confirm-message">メッセージ</p>
                <div class="confirm-actions">
                    <button id="confirm-cancel-btn" class="btn-cancel">キャンセル</button>
                    <button id="confirm-ok-btn" class="btn-danger">削除</button>
                </div>
            </div>
        </div>
    </div>
    <script>
// Chart.jsがロードできなかった場合のフォールバック定義
if (typeof Chart === 'undefined') {
    window.Chart = function() {
        this.destroy = function() {};
    };
}

// --- PWA Service Worker Registration ---
if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker Registered'))
            .catch(err => console.log('Service Worker Failed', err));
    });
}

// --- Data Management (LocalStorage) ---
const STORAGE_KEY = 'routine_tracker_data';

function getRoutines() {
    try {
        const storage = window.appStorage || { getItem: () => null, setItem: () => {} };
        const data = storage.getItem(STORAGE_KEY);
        if (!data) return [];
        let parsed = JSON.parse(data);
        if (typeof parsed === 'string') {
            try {
                parsed = JSON.parse(parsed);
            } catch (e) {}
        }
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.error("Storage access failed:", e);
        return [];
    }
}

function saveRoutines(routines) {
    try {
        const storage = window.appStorage || { getItem: () => null, setItem: () => {} };
        storage.setItem(STORAGE_KEY, JSON.stringify(routines));
    } catch (e) {
        showAlert("エラー", "データの保存に失敗しました: " + e.message);
    }
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// --- Core Logic (Weighted Average) ---
function updateRoutineEstimates(routineId, taskLogs) {
    const routines = getRoutines();
    const routineIndex = routines.findIndex(r => r.id === routineId);
    if (routineIndex === -1) return null;

    const routine = routines[routineIndex];
    const updates = [];

    taskLogs.forEach(log => {
        const taskIndex = routine.tasks.findIndex(t => t.id === log.task_id);
        if (taskIndex !== -1) {
            const task = routine.tasks[taskIndex];
            const oldEst = task.estimated_seconds;
            const actual = log.actual_seconds;

            // Weighted Average: 70% history, 30% recent
            // If auto_update_estimates is explicitly false, keep the old estimate.
            // (Default to true if undefined for backward compatibility)
            const shouldUpdate = (routine.auto_update_estimates !== false);

            const newEst = shouldUpdate
                ? Math.round((oldEst * 0.7) + (actual * 0.3))
                : oldEst;

            routine.tasks[taskIndex].estimated_seconds = newEst;

            updates.push({
                task_name: task.name,
                old_est: oldEst,
                new_est: newEst,
                actual: actual
            });
        }
    });

    // --- Save History ---
    if (!routine.history) routine.history = [];

    // Create history entry
    const historyEntry = {
        timestamp: Date.now(),
        total_actual_seconds: taskLogs.reduce((sum, log) => sum + log.actual_seconds, 0),
        logs: updates.map(u => ({
            task_name: u.task_name,
            actual_seconds: u.actual,
            estimated_seconds: u.old_est // Store what the estimate was AT THAT TIME
        }))
    };

    // Add to beginning
    routine.history.unshift(historyEntry);

    // Limit to 50 items
    if (routine.history.length > 50) {
        routine.history = routine.history.slice(0, 50);
    }

    saveRoutines(routines);
    return { updates, routine };
}

// --- App State ---
let currentRoutine = null;
let currentTaskIndex = 0;
let taskStartTime = null;
let taskTimerInterval = null;
let taskLogs = [];
let chartInstance = null;
let confirmCallback = null;
let isExecuting = false;
let lastVibratedRemaining = null;

function triggerVibration(pattern) {
    try {
        if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'VIBRATE',
                pattern: pattern
            }));
        }
    } catch (e) {
        console.error("Failed to send VIBRATE message:", e);
    }
    try {
        if (navigator.vibrate) {
            navigator.vibrate(pattern);
        }
    } catch (e) {}
}

function sendRoutineStateToRN() {
    try {
        if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'ROUTINE_STATE_CHANGE',
                state: {
                    isExecuting: isExecuting,
                    currentRoutine: currentRoutine,
                    currentTaskIndex: currentTaskIndex,
                    taskStartTime: taskStartTime,
                    taskLogs: taskLogs
                }
            }));
        }
    } catch (e) {
        console.error("Failed to send routine state to RN:", e);
    }
}

// --- DOM Elements ---
const screens = {
    home: document.getElementById('home-screen'),
    manage: document.getElementById('manage-screen'),
    active: document.getElementById('active-screen'),
    result: document.getElementById('result-screen'),
    history: document.getElementById('history-screen')
};

const components = {
    list: document.getElementById('routine-list'),
    timer: document.getElementById('timer'),
    taskName: document.getElementById('current-task-name'),
    nextBtn: document.getElementById('next-btn'),
    resultList: document.getElementById('result-list'),
    chartEntry: document.getElementById('resultChart')
};

// --- Navigation ---
function notifyModalState(show) {
    if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
        try {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MODAL_STATE_CHANGE', visible: show }));
        } catch (e) {
            console.warn('Failed to post MODAL_STATE_CHANGE:', e);
        }
    }
}

function showScreen(screenName) {
    Object.values(screens).forEach(el => el.classList.add('hidden'));
    screens[screenName].classList.remove('hidden');
    window.scrollTo(0, 0);
}

function goHome() {
    isExecuting = false;
    sendRoutineStateToRN();
    showScreen('home');
    loadRoutines();
    notifyModalState(false);
}

function showManageScreen() {
    showScreen('manage');
    loadRoutines();
    notifyModalState(true);
}
window.showManageScreen = showManageScreen;
window.openManageScreen = showManageScreen;
window.openManageView = showManageScreen;

// --- Routine List & Management ---
function isRoutineCompletedOnTargetDate(routine, targetDateStr) {
    if (!routine.history || routine.history.length === 0) return false;
    if (!targetDateStr) {
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const d = String(today.getDate()).padStart(2, '0');
        targetDateStr = y + '/' + m + '/' + d;
    }
    
    const normalizedTarget = targetDateStr.replace(/-/g, '/');
    
    return routine.history.some(entry => {
        const entryDate = new Date(entry.timestamp);
        const y = entryDate.getFullYear();
        const m = String(entryDate.getMonth() + 1).padStart(2, '0');
        const d = String(entryDate.getDate()).padStart(2, '0');
        const entryDateStr = y + '/' + m + '/' + d;
        return entryDateStr === normalizedTarget;
    });
}

function toggleVisibility(id) {
    const routines = getRoutines();
    const index = routines.findIndex(r => r.id === id);
    if (index !== -1) {
        routines[index].hidden = !routines[index].hidden;
        saveRoutines(routines);
        loadRoutines();
    }
}

function moveRoutine(id, direction) {
    const routines = getRoutines();
    const index = routines.findIndex(r => r.id === id);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
        const temp = routines[index];
        routines[index] = routines[index - 1];
        routines[index - 1] = temp;
    } else if (direction === 'down' && index < routines.length - 1) {
        const temp = routines[index];
        routines[index] = routines[index + 1];
        routines[index + 1] = temp;
    } else {
        return;
    }

    saveRoutines(routines);
    loadRoutines();
}

function loadRoutines() {
    const routines = getRoutines();
    
    // 1. 通常ホーム画面のリスト生成
    const list = components.list;
    list.innerHTML = '';

    const visibleRoutines = routines.filter(r => !r.hidden);

    if (visibleRoutines.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">ルーティンがありません。</div>';
    } else {
        visibleRoutines.forEach(r => {
            const card = document.createElement('div');
            card.className = 'routine-card';

            // Image handling
            if (r.image) {
                card.style.backgroundImage = \`linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.7)), url(\${r.image})\`;
                card.style.backgroundSize = 'cover';
                card.style.backgroundPosition = 'center';
                card.style.textShadow = '0 1px 3px rgba(0,0,0,0.8)';
            }

            const targetDateStr = window.__TARGET_DATE__;
            const isCompleted = isRoutineCompletedOnTargetDate(r, targetDateStr);
            const checkmark = isCompleted 
                ? '<div style="display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; background: #4cd964; box-shadow: 0 2px 8px rgba(76, 217, 100, 0.4); margin-left: 12px; flex-shrink: 0;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>' 
                : '';
            
            // Format task list
            const totalSeconds = r.tasks ? r.tasks.reduce((sum, t) => sum + t.estimated_seconds, 0) : 0;
            const totalTimeStr = formatTime(totalSeconds);
            const taskListHtml = r.tasks && r.tasks.length > 0 
                ? \`<div style="font-size: 13px; color: #b0b0b0; margin-top: 6px; line-height: 1.4;">
                     \${r.tasks.map((t, idx) => (idx + 1) + '. ' + t.name + ' (' + formatTime(t.estimated_seconds) + ')').join('<br>')}
                   </div>\`
                : '';

            card.innerHTML = \`
                <div style="display: flex; flex-direction: column; flex-grow: 1; text-align: left;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-weight:bold; font-size:18px;">\${r.name}</span>
                        <span style="font-size: 12px; color: #cecece; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px;">\${totalTimeStr}</span>
                    </div>
                    \${taskListHtml}
                </div>
                \${checkmark}
            \`;
            card.onclick = () => prepareRoutine(r.id);
            list.appendChild(card);
        });
    }

    // 2. 管理画面 of リスト生成
    const manageList = document.getElementById('manage-routine-list');
    if (manageList) {
        manageList.innerHTML = '';
        if (routines.length === 0) {
            manageList.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">ルーティンがありません。<br>"+ New" を押して作成してください。</div>';
        } else {
            routines.forEach((r, idx) => {
                const card = document.createElement('div');
                card.className = 'routine-card';
                if (r.hidden) {
                    card.style.opacity = '0.6';
                }

                // Image handling
                if (r.image) {
                    card.style.backgroundImage = \`linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.7)), url(\${r.image})\`;
                    card.style.backgroundSize = 'cover';
                    card.style.backgroundPosition = 'center';
                    card.style.textShadow = '0 1px 3px rgba(0,0,0,0.8)';
                }

                const isHidden = r.hidden === true;
                const visibilityBtn = \`<button class="icon-btn" style="background: \${isHidden ? '#c53030' : '#444'}; margin-left: 0;" onclick="event.stopPropagation(); toggleVisibility('\${r.id}')">\${isHidden ? '💤' : '💡'}</button>\`;

                const isFirst = idx === 0;
                const isLast = idx === routines.length - 1;
                const upBtn = \`<button class="icon-btn" style="margin-left: 0;" \${isFirst ? 'disabled style="opacity:0.3; cursor:default; margin-left: 0;"' : ''} onclick="event.stopPropagation(); moveRoutine('\${r.id}', 'up')">▲</button>\`;
                const downBtn = \`<button class="icon-btn" style="margin-left: 0;" \${isLast ? 'disabled style="opacity:0.3; cursor:default; margin-left: 0;"' : ''} onclick="event.stopPropagation(); moveRoutine('\${r.id}', 'down')">▼</button>\`;

                card.style.flexDirection = 'column';
                card.style.alignItems = 'stretch';
                card.style.justifyContent = 'center';
                card.style.padding = '14px 16px';
                card.style.gap = '12px';

                card.innerHTML = \`
                    <div style="display:flex; align-items:center; justify-content:space-between; width:100%;">
                        <span style="font-weight:bold; font-size:17px; color:#ffffff; word-break:break-word; line-height:1.4;">\${r.name}\${isHidden ? ' <span style="font-size:12px; color:#ff6b6b; font-weight:normal;">(非表示)</span>' : ''}</span>
                    </div>
                    <div style="display:flex; align-items:center; justify-content:flex-end; gap:8px; width:100%;">
                        \${upBtn}
                        \${downBtn}
                        <button class="icon-btn" style="margin-left: 0;" onclick="event.stopPropagation(); openEditModal('\${r.id}')">✎</button>
                        \${visibilityBtn}
                        <button class="icon-btn delete-btn" style="margin-left: 0;" onclick="event.stopPropagation(); confirmDelete('\${r.id}')">🗑</button>
                    </div>
                \`;
                card.onclick = () => openEditModal(r.id);
                manageList.appendChild(card);
            });
        }
    }
}


// --- Create/Edit Modal ---
const modal = document.getElementById('create-modal');
const newTaskList = document.getElementById('new-task-list');

// Reuse resizeImage, but specialized for task inputs
async function handleTaskImageInput(input, imgPreview) {
    if (input.files && input.files[0]) {
        try {
            const resized = await resizeImage(input.files[0]);
            imgPreview.src = resized;
            imgPreview.style.display = 'block';
            input.setAttribute('data-base64', resized); // Store in DOM temporarily
        } catch (err) {
            console.error(err);
            showAlert("画像エラー", "画像処理中にエラーが発生しました");
        }
    }
}

function removeTaskImage(img) {
    img.src = '';
    img.style.display = 'none';
    const picker = img.closest('.task-image-picker');
    if (picker) {
        const fileInput = picker.querySelector('input[type="file"]');
        if (fileInput) {
            fileInput.value = '';
            fileInput.removeAttribute('data-base64');
        }
    }
}

function removeTaskRow(btn) {
    const card = btn.closest('.task-card') || btn.closest('.task-input-row');
    if (card) {
        card.remove();
        updateTaskIndices();
    }
}

function updateTaskIndices() {
    const rows = newTaskList.querySelectorAll('.task-card');
    rows.forEach((row, index) => {
        const badge = row.querySelector('.task-index-badge');
        if (badge) badge.innerText = String(index + 1);
    });
}

document.getElementById('create-routine-btn').onclick = () => openModal();

// --- Image Handling ---
let currentImageBase64 = null;

function handleImagePreview(base64) {
    const previewContainer = document.getElementById('image-preview-container');
    const triggerBtn = document.getElementById('image-upload-trigger-btn');
    const previewImg = document.getElementById('image-preview');

    if (base64) {
        currentImageBase64 = base64;
        previewImg.src = base64;
        previewContainer.style.display = 'flex';
        if (triggerBtn) triggerBtn.style.display = 'none';
    } else {
        clearImage();
    }
}

function clearImage() {
    currentImageBase64 = null;
    const fileInput = document.getElementById('routine-image-input');
    if (fileInput) fileInput.value = ""; // Reset file input
    const previewImg = document.getElementById('image-preview');
    if (previewImg) previewImg.src = "";
    const previewContainer = document.getElementById('image-preview-container');
    if (previewContainer) previewContainer.style.display = 'none';
    const triggerBtn = document.getElementById('image-upload-trigger-btn');
    if (triggerBtn) triggerBtn.style.display = 'flex';
}

function resizeImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const maxWidth = 800;
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Compress to JPEG 0.7
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Add event listener for file input
document.getElementById('routine-image-input').addEventListener('change', async function (e) {
    if (e.target.files && e.target.files[0]) {
        try {
            const resized = await resizeImage(e.target.files[0]);
            handleImagePreview(resized);
        } catch (err) {
            showAlert("画像エラー", "画像の読み込みに失敗しました");
            console.error(err);
        }
    }
});


function openModal(isEdit = false) {
    modal.classList.remove('hidden');
    // Clear image state
    clearImage();

    if (!isEdit) {
        document.getElementById('modal-title').innerText = "ルーティン作成";
        document.getElementById('edit-routine-id').value = "";
        document.getElementById('new-routine-name').value = "";
        document.getElementById('auto-update-estimates').checked = true; // Default ON
        document.getElementById('auto-advance').checked = false; // Default OFF
        document.getElementById('enable-vibration').checked = true; // Default ON
        newTaskList.innerHTML = "";
        addTaskInput();
    }
}

function closeModal() {
    modal.classList.add('hidden');
    clearImage();
}

function openEditModal(id) {
    const routines = getRoutines();
    const routine = routines.find(r => r.id === id);
    if (!routine) return;

    openModal(true);
    document.getElementById('modal-title').innerText = "ルーティン編集";
    document.getElementById('edit-routine-id').value = routine.id;
    document.getElementById('new-routine-name').value = routine.name;
    // Default to true if the property doesn't exist
    document.getElementById('auto-update-estimates').checked = (routine.auto_update_estimates !== false);
    // Default to false if the property doesn't exist
    document.getElementById('auto-advance').checked = (routine.auto_advance === true);
    // Default to true if the property doesn't exist
    document.getElementById('enable-vibration').checked = (routine.enable_vibration !== false);

    // Set existing image
    if (routine.image) {
        handleImagePreview(routine.image);
    }

    newTaskList.innerHTML = "";
    routine.tasks.forEach(t => addTaskInput(t.name, t.estimated_seconds, t.image));
}

function addTaskInput(name = "", seconds = 300, imageBase64 = null) {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    const taskCount = newTaskList.querySelectorAll('.task-card').length + 1;

    const div = document.createElement('div');
    div.className = 'task-card task-input-row';
    div.innerHTML = \`
        <div class="task-card-header">
            <div class="task-index-badge">\${taskCount}</div>
            <input type="text" class="task-name-input" placeholder="タスク名 (例: ストレッチ)" value="\${name}">
            <button type="button" class="task-delete-btn remove-task-btn" onclick="removeTaskRow(this)" title="削除">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>
        
        <div class="task-card-body">
            <div class="task-image-picker">
                <button type="button" class="task-img-btn" onclick="this.nextElementSibling.click()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                    <span>画像</span>
                </button>
                <input type="file" accept="image/*" style="display:none;" onchange="handleTaskImageInput(this, this.parentNode.querySelector('.task-thumb-img'))">
                <img class="task-thumb-img" src="\${imageBase64 || ''}" style="display:\${imageBase64 ? 'block' : 'none'};" title="タップして画像を削除" onclick="removeTaskImage(this)">
            </div>

            <div class="task-time-wrapper">
                <input type="tel" class="task-time-input-min" placeholder="0" value="\${min}">
                <span class="task-time-unit">分</span>
                <input type="tel" class="task-time-input-sec" placeholder="0" value="\${sec}">
                <span class="task-time-unit">秒</span>
            </div>
        </div>
    \`;

    // Initialize data attribute if existing image
    if (imageBase64) {
        const fileInput = div.querySelector('input[type="file"]');
        if (fileInput) fileInput.setAttribute('data-base64', imageBase64);
    }

    newTaskList.appendChild(div);
}

// Note: saveNewRoutine is now async-like in logic but we handle file input via event listener updating \`currentImageBase66\`
function saveNewRoutine() {
    const name = document.getElementById('new-routine-name').value;
    const editId = document.getElementById('edit-routine-id').value;
    const autoUpdate = document.getElementById('auto-update-estimates').checked;
    const autoAdvance = document.getElementById('auto-advance').checked;
    const enableVibration = document.getElementById('enable-vibration').checked;

    if (!name) return showAlert("入力エラー", "ルーティン名を入力してください");

    const tasks = [];
    newTaskList.querySelectorAll('.task-input-row').forEach(row => {
        const tName = row.querySelector('.task-name-input').value;
        const tMin = parseInt(row.querySelector('.task-time-input-min').value) || 0;
        const tSec = parseInt(row.querySelector('.task-time-input-sec').value) || 0;

        // Retrieve stored base64 from file input attribute
        const fileInput = row.querySelector('input[type="file"]');
        const tImage = fileInput ? fileInput.getAttribute('data-base64') : null;

        if (tName) {
            tasks.push({
                id: generateId(),
                name: tName,
                estimated_seconds: (tMin * 60) + tSec,
                image: tImage // Save task image
            });
        }
    });

    if (tasks.length === 0) return showAlert("入力エラー", "最低1つのタスクを追加してください");

    const routines = getRoutines();

    if (editId) {
        const index = routines.findIndex(r => r.id === editId);
        if (index !== -1) {
            routines[index].name = name;
            routines[index].tasks = tasks;
            routines[index].auto_update_estimates = autoUpdate;
            routines[index].auto_advance = autoAdvance;
            routines[index].enable_vibration = enableVibration;
            routines[index].image = currentImageBase64; // Update image
        }
    } else {
        routines.push({
            id: generateId(),
            name: name,
            tasks: tasks,
            auto_update_estimates: autoUpdate,
            auto_advance: autoAdvance,
            enable_vibration: enableVibration,
            image: currentImageBase64 // Save image
        });
    }

    saveRoutines(routines);
    closeModal();
    loadRoutines();
}

function confirmDelete(id) {
    showConfirm("ルーティンの削除", "本当にこのルーティンを削除しますか？", () => {
        const routines = getRoutines();
        const filtered = routines.filter(r => r.id !== id);
        saveRoutines(filtered);
        loadRoutines();
    }, "削除", "キャンセル", true);
}

// --- History ---
function showHistory(id) {
    const routines = getRoutines();
    const routine = routines.find(r => r.id === id);
    if (!routine) return;

    showScreen('history');
    document.getElementById('history-title').innerText = \`History: \${routine.name}\`;

    const container = document.getElementById('history-list');
    container.innerHTML = '';

    if (!routine.history || routine.history.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">No history yet.</div>';
        return;
    }

    routine.history.forEach((entry, index) => {
        const date = new Date(entry.timestamp);
        const dateStr = date.toLocaleString('ja-JP', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
        });

        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = \`
            <div class="history-summary" onclick="toggleHistoryDetails(this)">
                <span class="history-date">\${dateStr}</span>
                <span class="history-total">Total: \${formatTime(entry.total_actual_seconds)}</span>
                <span class="history-arrow">▼</span>
            </div>
            <div class="history-details hidden">
                \${entry.logs.map(log => \`
                    <div class="history-detail-row">
                        <span style="flex-grow:1;">\${log.task_name}</span>
                        <span>\${formatTime(log.actual_seconds)}</span>
                        <span style="color:#666; font-size:12px; margin-left:8px;">(Est: \${formatTime(log.estimated_seconds || 0)})</span>
                    </div>
                \`).join('')}
            </div>
        \`;
        container.appendChild(div);
    });
}

function toggleHistoryDetails(el) {
    const details = el.nextElementSibling;
    const arrow = el.querySelector('.history-arrow');

    if (details.classList.contains('hidden')) {
        details.classList.remove('hidden');
        arrow.style.transform = 'rotate(180deg)';
    } else {
        details.classList.add('hidden');
        arrow.style.transform = 'rotate(0deg)';
    }
}

// --- Routine Execution ---
function prepareRoutine(id) {
    const routines = getRoutines();
    currentRoutine = routines.find(r => r.id === id);
    if (!currentRoutine || !currentRoutine.tasks.length) return showAlert("エラー", "ルーティンにタスクが登録されていません");

    currentTaskIndex = 0;
    taskLogs = [];

    // 開始準備画面の表示設定
    document.getElementById('prepare-routine-name').innerText = currentRoutine.name;

    // ルーティン詳細（タスク一覧）の生成
    const detailsContainer = document.getElementById('prepare-routine-details');
    if (detailsContainer) {
        const totalSeconds = currentRoutine.tasks.reduce((sum, t) => sum + t.estimated_seconds, 0);
        const totalTimeStr = formatTime(totalSeconds);
        
        let html = '<div style="font-weight: bold; color: #fff; margin-bottom: 8px; display: flex; justify-content: space-between; border-bottom: 1px solid #444; padding-bottom: 8px;">';
        html += '<span>タスク一覧 (' + currentRoutine.tasks.length + '件)</span>';
        html += '<span style="color: #51cf66;">想定時間: ' + totalTimeStr + '</span>';
        html += '</div>';

        const isVibrate = (currentRoutine.enable_vibration !== false);
        const isAutoAdv = (currentRoutine.auto_advance === true);
        html += '<div style="display: flex; gap: 6px; margin-bottom: 10px; font-size: 11px;">';
        html += '<span style="background: ' + (isVibrate ? 'rgba(81, 207, 102, 0.15)' : 'rgba(255, 255, 255, 0.05)') + '; color: ' + (isVibrate ? '#51cf66' : '#888') + '; padding: 2px 6px; border-radius: 4px;">📳 バイブ: ' + (isVibrate ? 'ON' : 'OFF') + '</span>';
        html += '<span style="background: ' + (isAutoAdv ? 'rgba(37, 99, 235, 0.15)' : 'rgba(255, 255, 255, 0.05)') + '; color: ' + (isAutoAdv ? '#60a5fa' : '#888') + '; padding: 2px 6px; border-radius: 4px;">⏩ 自動進行: ' + (isAutoAdv ? 'ON' : 'OFF') + '</span>';
        html += '</div>';

        html += '<div style="display: flex; flex-direction: column; gap: 8px;">';
        currentRoutine.tasks.forEach((t, idx) => {
            html += '<div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0;">';
            html += '<div style="display: flex; align-items: center; gap: 8px; text-align: left; flex: 1; min-width: 0;">';
            if (t.image) {
                html += '<img src="' + t.image + '" style="width: 28px; height: 28px; object-fit: cover; border-radius: 4px; flex-shrink: 0;">';
            } else {
                html += '<div style="width: 28px; height: 28px; background: #333; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #666; flex-shrink: 0;">No Image</div>';
            }
            html += '<span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #e0e0e0;">' + (idx + 1) + '. ' + t.name + '</span>';
            html += '</div>';
            html += '<span style="color: #888; font-size: 13px; margin-left: 8px; flex-shrink: 0;">' + formatTime(t.estimated_seconds) + '</span>';
            html += '</div>';
        });
        html += '</div>';
        detailsContainer.innerHTML = html;
    }

    document.getElementById('prepare-container').classList.remove('hidden');
    document.getElementById('running-container').classList.add('hidden');

    showScreen('active');
}

function startRoutine() {
    if (!currentRoutine) return;
    isExecuting = true;
    sendRoutineStateToRN();
    document.getElementById('prepare-container').classList.add('hidden');
    document.getElementById('running-container').classList.remove('hidden');
    startTask();
}


function startTask() {
    const task = currentRoutine.tasks[currentTaskIndex];
    components.taskName.innerText = \`\${task.name} (\${formatTime(task.estimated_seconds)})\`;

    // Update Task Image
    const imgEl = document.getElementById('current-task-image');
    if (task.image) {
        imgEl.src = task.image;
        imgEl.style.display = 'block';
    } else {
        imgEl.style.display = 'none';
        imgEl.src = "";
    }

    // 進行状況および次のタスク情報の表示更新
    const nextTaskEl = document.getElementById('running-next-task');
    const remainingTasksEl = document.getElementById('running-remaining-tasks');
    if (nextTaskEl && remainingTasksEl) {
        const totalTasks = currentRoutine.tasks.length;
        
        // 次のタスク
        if (currentTaskIndex + 1 < totalTasks) {
            const nextTask = currentRoutine.tasks[currentTaskIndex + 1];
            nextTaskEl.innerHTML = '次のタスク: <strong style="color: #fff;">' + nextTask.name + '</strong> (' + formatTime(nextTask.estimated_seconds) + ')';
        } else {
            nextTaskEl.innerHTML = '次のタスク: <strong style="color: #51cf66;">なし (最後のタスクです)</strong>';
        }
        
        // 残りタスク数と合計想定時間
        const remainingCount = totalTasks - (currentTaskIndex + 1);
        let remainingSeconds = 0;
        for (let i = currentTaskIndex + 1; i < totalTasks; i++) {
            remainingSeconds += currentRoutine.tasks[i].estimated_seconds;
        }
        
        remainingTasksEl.innerHTML = '進捗: <strong style="color: #fff;">' + (currentTaskIndex + 1) + '</strong> / ' + totalTasks + ' | 残り: <strong style="color: #fff;">' + remainingCount + '</strong>個 (約' + formatTime(remainingSeconds) + ')';
    }

    lastVibratedRemaining = null;
    taskStartTime = Date.now();

    clearInterval(taskTimerInterval);
    taskTimerInterval = setInterval(updateTimer, 1000);
    updateTimer();

    sendRoutineStateToRN();
}

function nextTask() {
    const elapsed = Math.floor((Date.now() - taskStartTime) / 1000);
    taskLogs.push({
        task_id: currentRoutine.tasks[currentTaskIndex].id,
        actual_seconds: elapsed
    });

    currentTaskIndex++;
    if (currentTaskIndex < currentRoutine.tasks.length) {
        startTask();
    } else {
        finishRoutine();
    }
}

function updateTimer() {
    const elapsed = Math.floor((Date.now() - taskStartTime) / 1000);
    const task = currentRoutine.tasks[currentTaskIndex];
    const remaining = task.estimated_seconds - elapsed;

    components.timer.innerText = formatTime(remaining > 0 ? remaining : 0);

    if (remaining < 0) {
        components.timer.style.color = '#ff6b6b';
        components.timer.innerText = \`+ \${formatTime(Math.abs(remaining))}\`;
    } else {
        components.timer.style.color = '#51cf66';
    }

    // バイブレーション判定（ルーティン設定で有効な場合）
    const isVibrateEnabled = (currentRoutine && currentRoutine.enable_vibration !== false);
    if (isVibrateEnabled && remaining !== lastVibratedRemaining) {
        if (remaining === 3 || remaining === 2 || remaining === 1) {
            triggerVibration(60);
            lastVibratedRemaining = remaining;
        } else if (remaining <= 0 && lastVibratedRemaining !== 0) {
            triggerVibration([0, 500, 200, 500]);
            lastVibratedRemaining = 0;
        }
    }

    if (remaining <= 0 && currentRoutine.auto_advance) {
        nextTask();
    }
}

components.nextBtn.onclick = nextTask;

function finishRoutine() {
    clearInterval(taskTimerInterval);
    const result = updateRoutineEstimates(currentRoutine.id, taskLogs);

    isExecuting = false;
    sendRoutineStateToRN();

    showScreen('result');
    renderResultList(result.updates);
    renderChart(result.updates);
}

function renderResultList(updates) {
    components.resultList.innerHTML = updates.map(u => \`
        <div class="result-item">
            <strong>\${u.task_name}</strong><br>
            Act: \${formatTime(u.actual)} <br>
            <span style="color:#888;">Est: \${formatTime(u.old_est)} → \${formatTime(u.new_est)}</span>
        </div>
    \`).join('');
}

function renderChart(updates) {
    const ctx = components.chartEntry.getContext('2d');
    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: updates.map(u => u.task_name),
            datasets: [
                {
                    label: 'Est',
                    data: updates.map(u => u.old_est),
                    backgroundColor: 'rgba(75, 192, 192, 0.5)'
                },
                {
                    label: 'Act',
                    data: updates.map(u => u.actual),
                    backgroundColor: 'rgba(255, 99, 132, 0.5)'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, ticks: { color: '#fff' } },
                x: { ticks: { color: '#fff' } }
            },
            plugins: { legend: { labels: { color: '#fff' } } }
        }
    });
}

// --- Utils ---
function formatTime(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return \`\${m}:\${s}\`;
}

const confirmModal = document.getElementById('confirm-modal');
const confirmOkBtn = document.getElementById('confirm-ok-btn');
const confirmCancelBtn = document.getElementById('confirm-cancel-btn');

function showConfirm(title, msg, onOk, okText = "削除", cancelText = "キャンセル", isDanger = true) {
    document.getElementById('confirm-title').innerText = title;
    document.getElementById('confirm-message').innerText = msg;
    confirmOkBtn.innerText = okText;
    confirmCancelBtn.innerText = cancelText;
    confirmCancelBtn.style.display = 'block';

    if (isDanger) {
        confirmOkBtn.className = 'btn-danger';
    } else {
        confirmOkBtn.className = 'btn-confirm-ok';
    }

    confirmCallback = onOk;
    confirmModal.classList.remove('hidden');
}

function showAlert(title, msg, onOk = null, okText = "OK") {
    document.getElementById('confirm-title').innerText = title;
    document.getElementById('confirm-message').innerText = msg;
    confirmOkBtn.innerText = okText;
    confirmOkBtn.className = 'btn-confirm-ok';
    confirmCancelBtn.style.display = 'none';

    confirmCallback = onOk;
    confirmModal.classList.remove('hidden');
}

confirmOkBtn.onclick = () => {
    confirmModal.classList.add('hidden');
    if (confirmCallback) {
        const cb = confirmCallback;
        confirmCallback = null;
        cb();
    }
};

confirmCancelBtn.onclick = () => {
    confirmModal.classList.add('hidden');
    confirmCallback = null;
};

// Start
document.getElementById('start-routine-btn').onclick = startRoutine;
loadRoutines();

// Restore active state if any
(function() {
    try {
        const activeState = window.__ACTIVE_ROUTINE_STATE__;
        if (activeState && activeState.isExecuting) {
            isExecuting = true;
            currentRoutine = activeState.currentRoutine;
            currentTaskIndex = activeState.currentTaskIndex;
            taskStartTime = activeState.taskStartTime;
            taskLogs = activeState.taskLogs;

            // UIを復元
            document.getElementById('prepare-container').classList.add('hidden');
            document.getElementById('running-container').classList.remove('hidden');
            showScreen('active');

            // タスク開始
            const task = currentRoutine.tasks[currentTaskIndex];
            components.taskName.innerText = task.name + ' (' + formatTime(task.estimated_seconds) + ')';

            const imgEl = document.getElementById('current-task-image');
            if (task.image) {
                imgEl.src = task.image;
                imgEl.style.display = 'block';
            } else {
                imgEl.style.display = 'none';
                imgEl.src = "";
            }

            // 進行状況の更新
            const nextTaskEl = document.getElementById('running-next-task');
            const remainingTasksEl = document.getElementById('running-remaining-tasks');
            if (nextTaskEl && remainingTasksEl) {
                const totalTasks = currentRoutine.tasks.length;
                if (currentTaskIndex + 1 < totalTasks) {
                    const nextTask = currentRoutine.tasks[currentTaskIndex + 1];
                    nextTaskEl.innerHTML = '次のタスク: <strong style="color: #fff;">' + nextTask.name + '</strong> (' + formatTime(nextTask.estimated_seconds) + ')';
                } else {
                    nextTaskEl.innerHTML = '次のタスク: <strong style="color: #51cf66;">なし (最後のタスクです)</strong>';
                }
                const remainingCount = totalTasks - (currentTaskIndex + 1);
                let remainingSeconds = 0;
                for (let i = currentTaskIndex + 1; i < totalTasks; i++) {
                    remainingSeconds += currentRoutine.tasks[i].estimated_seconds;
                }
                remainingTasksEl.innerHTML = '進捗: <strong style="color: #fff;">' + (currentTaskIndex + 1) + '</strong> / ' + totalTasks + ' | 残り: <strong style="color: #fff;">' + remainingCount + '</strong>個 (約' + formatTime(remainingSeconds) + ')';
            }

            // タイマーの復元
            clearInterval(taskTimerInterval);
            taskTimerInterval = setInterval(updateTimer, 1000);
            updateTimer();
        }
    } catch (e) {
        console.error("Failed to restore active routine state:", e);
    }
})();

</script>
</body>

</html>`;
