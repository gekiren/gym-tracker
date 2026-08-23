import React, { useState, useEffect } from 'react';
import { useGeminiLive } from './hooks/useGeminiLive';
import type { InitialContext } from './types';
import {
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  Dumbbell,
  Droplets,
  Utensils,
  BookOpen,
  Key,
  Volume2,
  Trash2,
  Copy,
  Check,
  Smartphone,
} from 'lucide-react';

declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
  }
}

export default function App() {
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('gemini_api_key') || '';
  });
  const [modelName, setModelName] = useState<string>('models/gemini-3.1-flash-live-preview');
  const [voiceName, setVoiceName] = useState<string>('Aoede');
  const [showKeyInput, setShowKeyInput] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // URLパラメータからTreNoteのコンテキストを取得（連携時用）
  const [initialContext] = useState<InitialContext>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const ctxParam = urlParams.get('context');
      if (ctxParam) {
        return JSON.parse(decodeURIComponent(ctxParam));
      }
    } catch (_) {}
    return {
      lastWorkout: 'ベンチプレス 90kg 10reps x 3sets',
      currentWaterMl: 400,
      waterGoalMl: 2000,
      bodyWeight: 72.5,
      date: new Date().toISOString().split('T')[0],
    };
  });

  const [showDebugLogs, setShowDebugLogs] = useState<boolean>(true);
  const [inputMessage, setInputMessage] = useState<string>('');
  
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isSecureContextSupported] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  });



  useEffect(() => {
    if (navigator?.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((deviceInfos) => {
        const audioInputs = deviceInfos.filter((d) => d.kind === 'audioinput');
        setDevices(audioInputs);
        if (audioInputs.length > 0) {
          setSelectedDeviceId(audioInputs[0].deviceId);
        }
      }).catch((e) => {
        console.warn('enumerateDevices failed:', e);
      });
    }
  }, []);

  const {
    isConnected,
    isConnecting,
    isMuted,
    micVolume,
    messages,
    extractedData,
    statusText,
    debugLogs,
    connect,
    disconnect,
    toggleMute,
    sendTextMessage,
    setExtractedData,
  } = useGeminiLive({
    apiKey,
    initialContext,
    voiceName,
    modelName,
  });

  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('gemini_api_key', apiKey);
    }
  }, [apiKey]);

  const handleClearData = () => {
    setExtractedData({
      workouts: [],
      waters: [],
      meals: [],
      dailyNotes: [],
    });
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(extractedData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasData = extractedData.workouts.length > 0 || 
    extractedData.waters.length > 0 || 
    extractedData.meals.length > 0 || 
    extractedData.dailyNotes.length > 0;

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logoBadge}>
            <Dumbbell size={20} color="#ff6b00" />
          </div>
          <div>
            <h1 style={styles.title} className="res-title">TreNote AI Live Companion</h1>
            <p style={styles.subtitle} className="res-subtitle">
              Gemini Multimodal Live API (音声リアルタイム対話・自動記録)
            </p>
          </div>
        </div>

        <div style={styles.headerRight}>
          <button
            style={styles.iconButton}
            onClick={() => setShowKeyInput(!showKeyInput)}
            title="APIキー設定"
          >
            <Key size={18} color={apiKey ? '#10b981' : '#f59e0b'} />
            <span style={{ fontSize: 13, marginLeft: 6 }}>
              {apiKey ? 'API Key 設定済' : 'API Key 未設定'}
            </span>
          </button>
        </div>
      </header>

      {!isSecureContextSupported && (
        <div style={{ backgroundColor: '#7f1d1d', color: '#fecaca', padding: '12px 16px', borderRadius: 8, margin: '12px 20px 0 20px', fontSize: 13, lineHeight: 1.5, border: '1px solid #ef4444' }}>
          <strong>⚠️ ブラウザのマイク利用制限について:</strong><br />
          現在 <code>http://192.168...</code>（非HTTPS）で接続されているため、ブラウザのセキュリティ機能によりマイクがブロックされています。<br />
          マイク音声対話を行う場合は、<strong>PC上のブラウザ（<code>http://localhost:5173</code>）</strong> で音声を吹き込んでデータを抽出し、生成された「TreNote アプリに転送」リンクをご利用ください。
        </div>
      )}

      {/* API Key Modal / Expand Area */}
      {showKeyInput && (
        <div style={styles.apiKeyBox}>
          <label style={styles.label}>
            Gemini API Key (Google AI Studio で取得したAPIキー):
          </label>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              style={styles.input}
            />
            <button
              style={styles.buttonPrimary}
              onClick={() => setShowKeyInput(false)}
            >
              保存して閉じる
            </button>
          </div>
          <p style={styles.hint}>
            ※ APIキーはお使いのブラウザ（LocalStorage）にのみ安全に保存され、直接GoogleのLive APIサーバーと通信します。
          </p>
        </div>
      )}

      {/* Control Banner */}
      <div style={styles.controlBanner} className="res-banner">
        <div style={styles.statusSection}>
          <div
            style={{
              ...styles.statusDot,
              backgroundColor: isConnected
                ? '#10b981'
                : isConnecting
                ? '#f59e0b'
                : '#64748b',
              boxShadow: isConnected ? '0 0 12px #10b981' : 'none',
            }}
          />
          <div>
            <div style={styles.statusLabel}>{statusText}</div>
            <div style={styles.voiceSelectWrapper} className="res-voice-select">
              <select
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                disabled={isConnected || isConnecting}
                style={styles.select}
                className="res-select"
              >
                <option value="models/gemini-3.1-flash-live-preview">Gemini 3.1 Flash Live (最新・推奨)</option>
                <option value="models/gemini-2.5-flash-native-audio-preview-12-2025">Gemini 2.5 Flash Native Audio</option>
                <option value="gemini-3.1-flash-live-preview">Gemini 3.1 Flash Live (prefix無)</option>
                <option value="gemini-2.5-flash-native-audio-preview-12-2025">Gemini 2.5 Flash Native Audio (prefix無)</option>
              </select>

              <Volume2 size={14} color="#94a3b8" />
              <select
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value)}
                disabled={isConnected || isConnecting}
                style={styles.select}
                className="res-select"
              >
                <option value="Aoede">音声: Aoede (落ち着いた女性)</option>
                <option value="Puck">音声: Puck (明るい男性)</option>
                <option value="Charon">音声: Charon (深みのある男性)</option>
                <option value="Kore">音声: Kore (クリアな女性)</option>
                <option value="Fenrir">音声: Fenrir (力強い男性)</option>
              </select>
            </div>
            
            {/* Microphone Selection */}
            {!isConnected && devices.length > 0 && (
              <div style={{ ...styles.voiceSelectWrapper, marginTop: 8 }}>
                <Mic size={14} color="#94a3b8" />
                <select
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  disabled={isConnecting}
                  style={{ ...styles.select, width: '100%', maxWidth: 300 }}
                >
                  {devices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `マイク ${d.deviceId.substring(0, 5)}...`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div style={styles.actionButtons} className="res-action-btns">
          {isConnected ? (
            <>
              {/* Mic Volume Level Meter */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: '#0f172a',
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: `1px solid ${micVolume > 0 ? '#10b981' : '#334155'}`,
                  transition: 'border-color 0.1s',
                }}
                title="マイク入力音量レベル"
              >
                <Mic size={16} color={micVolume > 0 ? '#10b981' : '#64748b'} />
                <div
                  style={{
                    width: 60,
                    height: 8,
                    borderRadius: 4,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${Math.max(micVolume > 0 ? 5 : 0, Math.min(100, micVolume))}%`,
                      height: '100%',
                      backgroundColor: '#10b981',
                      transition: 'width 0.05s ease-out',
                    }}
                  />
                </div>
              </div>

              <button
                style={{...styles.muteButton, backgroundColor: isMuted ? '#ef4444' : '#334155'}}
                className="res-btn"
                onClick={toggleMute}
              >
                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                <span>{isMuted ? 'マイク消音中' : 'マイクON'}</span>
              </button>

              <button
                style={styles.disconnectButton}
                className="res-btn"
                onClick={disconnect}
              >
                <PhoneOff size={20} />
                <span>会話を終了</span>
              </button>
            </>
          ) : (
            <button
              style={{...styles.connectButton, opacity: isConnecting ? 0.7 : 1}}
              className="res-btn"
              disabled={isConnecting}
              onClick={() => connect(selectedDeviceId)}
            >
              <PhoneCall size={20} />
              <span>{isConnecting ? '接続中...' : '音声対話を開始'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div style={styles.mainGrid} className="res-grid">
        {/* Left Column: Live Audio Chat Visualizer & Context */}
        <div style={styles.leftCol}>
          {/* App Context Preview */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>
              <Smartphone size={16} color="#ff6b00" />
              TreNote アプリからの前提データ
            </h2>
            <div style={styles.contextGrid}>
              <div style={styles.contextItem}>
                <span style={styles.contextLabel}>前回のトレーニング:</span>
                <span style={styles.contextVal}>
                  {initialContext.lastWorkout || 'なし'}
                </span>
              </div>
              <div style={styles.contextItem}>
                <span style={styles.contextLabel}>今日の水分:</span>
                <span style={styles.contextVal}>
                  {initialContext.currentWaterMl}ml / 目標
                  {initialContext.waterGoalMl}ml
                </span>
              </div>
              <div style={styles.contextItem}>
                <span style={styles.contextLabel}>体重:</span>
                <span style={styles.contextVal}>
                  {initialContext.bodyWeight} kg
                </span>
              </div>
            </div>
          </div>

          {/* Chat / Interaction Log */}
          <div style={{ ...styles.card, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h2 style={styles.cardTitle}>
              <Volume2 size={16} color="#ff6b00" />
              リアルタイム対話ログ
            </h2>
            <div style={styles.chatLog}>
              {messages.length === 0 ? (
                <div style={styles.emptyText}>
                  {isConnected
                    ? 'AIがあなたの声をお待ちしています。「ベンチプレス100kg10回やった」「水500ml飲んだ」など自由に話しかけてください。'
                    : '「音声対話を開始」ボタンを押すと、ハンズフリーで会話がスタートします。'}
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      ...styles.chatBubble,
                      alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                      backgroundColor:
                        m.sender === 'user' ? '#ff6b00' : '#1e293b',
                    }}
                  >
                    <div style={styles.bubbleSender}>
                      {m.sender === 'user' ? 'あなた' : 'TreNote AI'}
                    </div>
                    <div>{m.text}</div>
                  </div>
                ))
              )}
            </div>

            {/* Text Input Fallback / Test Form */}
            {isConnected && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (inputMessage.trim()) {
                    sendTextMessage(inputMessage);
                    setInputMessage('');
                  }
                }}
                style={{
                  display: 'flex',
                  gap: 8,
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: '1px solid #334155',
                }}
              >
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="テキストでも話しかけられます（例: ベンチ100kg10回3セット）"
                  style={{
                    flex: 1,
                    backgroundColor: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: 8,
                    padding: '8px 12px',
                    color: '#f8fafc',
                    fontSize: 13,
                  }}
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim()}
                  style={{
                    backgroundColor: '#ff6b00',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 14px',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: inputMessage.trim() ? 'pointer' : 'default',
                    opacity: inputMessage.trim() ? 1 : 0.5,
                  }}
                >
                  送信
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right Column: Extracted Data (TreNote Sync Preview) */}
        <div style={styles.rightCol}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>
                <BookOpen size={16} color="#10b981" />
                自動抽出データ（TreNote 転送プレビュー）
              </h2>
              {hasData && (
                <button
                  style={styles.clearButton}
                  onClick={handleClearData}
                  title="クリア"
                >
                  <Trash2 size={14} />
                  <span>クリア</span>
                </button>
              )}
            </div>

            <p style={styles.cardDesc}>
              会話の中から自動的に検出・構造化された記録です。
            </p>

            <div style={styles.extractedList}>
              {/* Workouts */}
              {extractedData.workouts.map((w) => (
                <div key={w.id} style={styles.dataCard}>
                  <div style={styles.dataCardIcon}>
                    <Dumbbell size={18} color="#ff6b00" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={styles.dataCardTitle}>{w.exercise_name}</div>
                    <div style={styles.dataCardDetails}>
                      {w.weight_kg !== undefined && `${w.weight_kg}kg `}
                      {w.reps !== undefined && `× ${w.reps}回 `}
                      {w.sets !== undefined && `(${w.sets}セット)`}
                      {w.notes && ` - ${w.notes}`}
                    </div>
                  </div>
                  <span style={styles.badge}>筋トレ</span>
                </div>
              ))}

              {/* Waters */}
              {extractedData.waters.map((wt) => (
                <div key={wt.id} style={styles.dataCard}>
                  <div style={styles.dataCardIcon}>
                    <Droplets size={18} color="#0284c7" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={styles.dataCardTitle}>水分摂取</div>
                    <div style={styles.dataCardDetails}>
                      +{wt.amount_ml} ml
                      {wt.has_caffeine ? '（カフェイン有）' : ''}
                    </div>
                  </div>
                  <span style={{ ...styles.badge, backgroundColor: '#0369a1' }}>
                    水分
                  </span>
                </div>
              ))}

              {/* Meals */}
              {extractedData.meals.map((m) => (
                <div key={m.id} style={styles.dataCard}>
                  <div style={styles.dataCardIcon}>
                    <Utensils size={18} color="#16a34a" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={styles.dataCardTitle}>{m.meal_name}</div>
                    <div style={styles.dataCardDetails}>
                      {m.calories ? `${m.calories} kcal ` : ''}
                      {m.protein ? `(P: ${m.protein}g)` : ''}
                    </div>
                  </div>
                  <span style={{ ...styles.badge, backgroundColor: '#15803d' }}>
                    食事
                  </span>
                </div>
              ))}

              {/* Daily Notes */}
              {extractedData.dailyNotes.map((n) => (
                <div key={n.id} style={styles.dataCard}>
                  <div style={styles.dataCardIcon}>
                    <BookOpen size={18} color="#8b5cf6" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={styles.dataCardTitle}>デイリーノート</div>
                    <div style={styles.dataCardDetails}>
                      {n.condition && `【体調】${n.condition}\n`}
                      {n.summary}
                    </div>
                  </div>
                  <span style={{ ...styles.badge, backgroundColor: '#6d28d9' }}>
                    日記
                  </span>
                </div>
              ))}

              {!hasData && (
                <div style={styles.emptyDataBox}>
                  まだデータが記録されていません。音声でトレーニングや食事の内容を伝えてみてください。
                </div>
              )}
            </div>

            {/* Sync Action Area */}
            <div style={styles.syncActionBox}>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (!hasData) return;
                  
                  // ReactNative の WebView 環境かをチェック
                  if (window.ReactNativeWebView) {
                    const payload = JSON.stringify({
                      type: 'SYNC_DATA',
                      version: '1.0',
                      timestamp: Date.now(),
                      data: extractedData
                    });
                    window.ReactNativeWebView.postMessage(payload);
                  } else {
                    alert('この機能はTreNoteアプリ内でのみ利用可能です。');
                  }
                }}
                style={{
                  ...styles.syncButton,
                  opacity: hasData ? 1 : 0.5,
                  pointerEvents: hasData ? 'auto' : 'none',
                }}
              >
                <Smartphone size={18} />
                <span>TreNote アプリに保存</span>
              </a>

              <button
                style={styles.copyButton}
                onClick={handleCopyJson}
                disabled={!hasData}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? 'コピー完了' : 'JSONコピー'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Debug Logs Footer Card */}
      <div style={{ ...styles.card, marginTop: 12, backgroundColor: '#0b1120' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
          }}
          onClick={() => setShowDebugLogs(!showDebugLogs)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>
            <span>🛠 リアルタイム動作ログ (最新{debugLogs.length}件)</span>
          </div>
          <span style={{ fontSize: 12, color: '#64748b' }}>
            {showDebugLogs ? '▲ 閉じる' : '▼ ログを表示'}
          </span>
        </div>

        {showDebugLogs && (
          <div
            style={{
              marginTop: 10,
              backgroundColor: '#030712',
              borderRadius: 8,
              padding: '10px 12px',
              fontFamily: 'monospace',
              fontSize: 12,
              color: '#10b981',
              maxHeight: 180,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            {debugLogs.length === 0 ? (
              <span style={{ color: '#475569' }}>まだログはありません。「音声対話を開始」を押すとここにリアルタイムログが出ます。</span>
            ) : (
              debugLogs.map((log, index) => (
                <div key={index} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {log}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottom: '1px solid #334155',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #ff6b00',
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: '#f8fafc',
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
  },
  headerRight: {
    display: 'flex',
    gap: 8,
  },
  iconButton: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    border: '1px solid #475569',
    borderRadius: 8,
    padding: '8px 12px',
    color: '#f8fafc',
    cursor: 'pointer',
  },
  apiKeyBox: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    border: '1px solid #475569',
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: '#cbd5e1',
  },
  input: {
    flex: 1,
    padding: '10px 14px',
    backgroundColor: '#0f172a',
    border: '1px solid #475569',
    borderRadius: 8,
    color: '#f8fafc',
    fontSize: 14,
  },
  buttonPrimary: {
    backgroundColor: '#ff6b00',
    color: '#ffffff',
    border: 'none',
    borderRadius: 8,
    padding: '10px 16px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  hint: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 8,
  },
  controlBanner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: '16px 20px',
    border: '1px solid #334155',
  },
  statusSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  statusDot: {
    width: 14,
    height: 14,
    borderRadius: '50%',
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: 600,
    color: '#f8fafc',
  },
  voiceSelectWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  select: {
    backgroundColor: '#0f172a',
    border: '1px solid #475569',
    borderRadius: 6,
    color: '#cbd5e1',
    padding: '4px 8px',
    fontSize: 12,
  },
  actionButtons: {
    display: 'flex',
    gap: 12,
  },
  connectButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: 'none',
    borderRadius: 12,
    padding: '12px 24px',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
  },
  disconnectButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ef4444',
    color: '#ffffff',
    border: 'none',
    borderRadius: 12,
    padding: '12px 20px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  muteButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: '#ffffff',
    border: 'none',
    borderRadius: 12,
    padding: '12px 18px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '1.1fr 1fr',
    gap: 20,
    minHeight: 480,
  },
  leftCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  rightCol: {
    display: 'flex',
    flexDirection: 'column',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    border: '1px solid #334155',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  cardDesc: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
    marginBottom: 16,
  },
  clearButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'transparent',
    border: '1px solid #475569',
    borderRadius: 6,
    color: '#94a3b8',
    padding: '4px 8px',
    fontSize: 12,
    cursor: 'pointer',
  },
  contextGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    marginTop: 10,
  },
  contextItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 13,
    backgroundColor: '#0f172a',
    padding: '6px 12px',
    borderRadius: 6,
  },
  contextLabel: {
    color: '#94a3b8',
  },
  contextVal: {
    color: '#f8fafc',
    fontWeight: 500,
  },
  chatLog: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    marginTop: 12,
    maxHeight: 320,
    overflowY: 'auto',
    paddingRight: 6,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    padding: '40px 16px',
    lineHeight: 1.6,
  },
  chatBubble: {
    maxWidth: '85%',
    padding: '10px 14px',
    borderRadius: 12,
    fontSize: 14,
    lineHeight: 1.4,
    color: '#f8fafc',
  },
  bubbleSender: {
    fontSize: 11,
    color: '#cbd5e1',
    fontWeight: 600,
    marginBottom: 4,
  },
  extractedList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    maxHeight: 360,
    overflowY: 'auto',
    marginBottom: 16,
  },
  dataCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: '10px 14px',
    border: '1px solid #334155',
  },
  dataCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dataCardTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#f8fafc',
  },
  dataCardDetails: {
    fontSize: 12,
    color: '#94a3b8',
    whiteSpace: 'pre-line',
  },
  badge: {
    fontSize: 11,
    backgroundColor: '#c2410c',
    color: '#ffffff',
    padding: '2px 8px',
    borderRadius: 10,
    fontWeight: 600,
  },
  emptyDataBox: {
    textAlign: 'center',
    padding: '40px 16px',
    fontSize: 13,
    color: '#64748b',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    border: '1px dashed #334155',
  },
  syncActionBox: {
    display: 'flex',
    gap: 10,
    paddingTop: 16,
    borderTop: '1px solid #334155',
  },
  syncButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ff6b00',
    color: '#ffffff',
    textDecoration: 'none',
    borderRadius: 10,
    padding: '12px 16px',
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
    textAlign: 'center',
  },
  copyButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#334155',
    color: '#f8fafc',
    border: 'none',
    borderRadius: 10,
    padding: '12px 16px',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  },
};
