import React, { useState, useEffect, useMemo } from 'react';
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

interface ThemeColors {
  background: string;
  card: string;
  cardSubtle: string;
  border: string;
  borderSubtle: string;
  text: string;
  textMuted: string;
  inputBg: string;
  badgeBg: string;
  accent: string;
  primary: string;
  success: string;
  danger: string;
}

const getThemeTokens = (mode: 'dark' | 'pureBlack' = 'dark'): ThemeColors => {
  if (mode === 'pureBlack') {
    return {
      background: '#000000',
      card: '#080808',
      cardSubtle: 'rgba(255, 255, 255, 0.03)',
      border: '#1f1f1f',
      borderSubtle: 'rgba(255, 255, 255, 0.05)',
      text: '#ffffff',
      textMuted: '#888888',
      inputBg: '#000000',
      badgeBg: '#1a1a1a',
      accent: '#ff6b00',
      primary: '#4facfe',
      success: '#4cd964',
      danger: '#ff3b30',
    };
  }
  return {
    background: '#121212',
    card: '#1e1e1e',
    cardSubtle: 'rgba(255, 255, 255, 0.03)',
    border: '#333333',
    borderSubtle: 'rgba(255, 255, 255, 0.05)',
    text: '#ffffff',
    textMuted: '#888888',
    inputBg: '#161616',
    badgeBg: '#262626',
    accent: '#ff6b00',
    primary: '#4facfe',
    success: '#4cd964',
    danger: '#ff3b30',
  };
};

export default function App() {
  const [voiceName, setVoiceName] = useState<string>('Aoede');
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
      lastWorkout: null,
      currentWaterMl: 0,
      waterGoalMl: 2000,
      bodyWeight: null,
      theme: 'dark',
      date: new Date().toISOString().split('T')[0],
    };
  });

  // テーマモードの決定 (URLパラメータ または context から取得)
  const themeMode: 'dark' | 'pureBlack' = useMemo(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlTheme = urlParams.get('theme') as 'dark' | 'pureBlack';
      if (urlTheme === 'pureBlack' || urlTheme === 'dark') return urlTheme;
    } catch (_) {}
    return initialContext.theme || 'dark';
  }, [initialContext.theme]);

  const themeTokens = useMemo(() => getThemeTokens(themeMode), [themeMode]);
  const styles = useMemo(() => getStyles(themeTokens), [themeTokens]);

  const [showDebugLogs, setShowDebugLogs] = useState<boolean>(false);
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

  // HTML body の背景色をテーマに同期
  useEffect(() => {
    document.body.style.backgroundColor = themeTokens.background;
    document.documentElement.style.backgroundColor = themeTokens.background;
  }, [themeTokens]);

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
    initialContext,
    voiceName,
  });

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
            <Dumbbell size={18} color="#ff6b00" />
          </div>
          <div>
            <h1 style={styles.title} className="res-title">TreNote 音声AIパートナー</h1>
            <p style={styles.subtitle} className="res-subtitle">
              水・栄養・トレーニング・雑記を話すだけでリアルタイム自動記録
            </p>
          </div>
        </div>
      </header>

      {/* 4大記録カテゴリーの提示チップ */}
      <div style={styles.categoryChipsRow}>
        <div style={{...styles.categoryChip, borderColor: 'rgba(79, 172, 254, 0.3)', backgroundColor: 'rgba(79, 172, 254, 0.08)'}}>
          <Droplets size={13} color="#4facfe" />
          <span style={{color: '#4facfe'}}>💧 水</span>
        </div>
        <div style={{...styles.categoryChip, borderColor: 'rgba(76, 217, 100, 0.3)', backgroundColor: 'rgba(76, 217, 100, 0.08)'}}>
          <Utensils size={13} color="#4cd964" />
          <span style={{color: '#4cd964'}}>🥗 栄養</span>
        </div>
        <div style={{...styles.categoryChip, borderColor: 'rgba(255, 107, 0, 0.3)', backgroundColor: 'rgba(255, 107, 0, 0.08)'}}>
          <Dumbbell size={13} color="#ff6b00" />
          <span style={{color: '#ff8c33'}}>🏋️ トレーニング</span>
        </div>
        <div style={{...styles.categoryChip, borderColor: 'rgba(167, 139, 250, 0.3)', backgroundColor: 'rgba(167, 139, 250, 0.08)'}}>
          <BookOpen size={13} color="#a78bfa" />
          <span style={{color: '#a78bfa'}}>📝 雑記・メモ</span>
        </div>
      </div>

      {!isSecureContextSupported && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', padding: '12px 16px', borderRadius: 8, margin: '8px 0', fontSize: 13, lineHeight: 1.5, border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <strong>⚠️ ブラウザのマイク利用制限について:</strong><br />
          現在非HTTPS環境のためブラウザによりマイクがブロックされている可能性があります。
        </div>
      )}

      {/* 1. 接続状態 (Control Banner) */}
      <div style={styles.controlBanner} className="res-banner">
        <div style={styles.statusSection} className="res-status-section">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  ...styles.statusDot,
                  backgroundColor: isConnected
                    ? themeTokens.success
                    : isConnecting
                    ? '#f59e0b'
                    : themeTokens.textMuted,
                  boxShadow: isConnected ? `0 0 10px ${themeTokens.success}` : 'none',
                }}
              />
              <div style={styles.statusLabel}>{statusText}</div>
            </div>
            
            <div style={styles.voiceSelectWrapper} className="res-voice-select">
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="res-select-group">
                <Volume2 size={14} color={themeTokens.textMuted} />
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="res-select-group">
                  <Mic size={14} color={themeTokens.textMuted} />
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    disabled={isConnecting}
                    style={{...styles.select, flex: 1}}
                    className="res-select"
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
                  backgroundColor: themeTokens.cardSubtle,
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: `1px solid ${micVolume > 0 ? themeTokens.success : themeTokens.border}`,
                  transition: 'border-color 0.1s',
                }}
                title="マイク入力音量レベル"
              >
                <Mic size={16} color={micVolume > 0 ? themeTokens.success : themeTokens.textMuted} />
                <div
                  style={{
                    width: 50,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${Math.max(micVolume > 0 ? 5 : 0, Math.min(100, micVolume))}%`,
                      height: '100%',
                      backgroundColor: themeTokens.success,
                      transition: 'width 0.05s ease-out',
                    }}
                  />
                </div>
              </div>

              <button
                style={{...styles.muteButton, backgroundColor: isMuted ? themeTokens.danger : themeTokens.cardSubtle}}
                className="res-btn"
                onClick={toggleMute}
              >
                {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                <span>{isMuted ? '消音中' : 'マイクON'}</span>
              </button>

              <button
                style={styles.disconnectButton}
                className="res-btn"
                onClick={disconnect}
              >
                <PhoneOff size={18} />
                <span>終了</span>
              </button>
            </>
          ) : (
            <button
              style={{...styles.connectButton, opacity: isConnecting ? 0.7 : 1}}
              className="res-btn"
              disabled={isConnecting}
              onClick={() => connect(selectedDeviceId)}
            >
              <PhoneCall size={18} />
              <span>{isConnecting ? '接続中...' : '音声対話を開始'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. 対話ログ (Chat / Interaction Log) */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>
          <Volume2 size={16} color="#ff6b00" />
          リアルタイム対話ログ
        </h2>
        <div style={styles.chatLog}>
          {messages.length === 0 ? (
            <div style={styles.emptyText}>
              {isConnected
                ? 'AIがあなたの声をお待ちしています。「水」「栄養」「トレーニング」「雑記（メモ・気づき）」について自由にお話しください。\n例: 「水500ml」「プロテイン飲んだ」「ベンチプレス80kg10回3セット」「肩の調子がすごく良い」'
                : '「音声対話を開始」ボタンを押すと、ハンズフリーで会話がスタートします。\n水・栄養・トレーニング・雑記（体調・メモ）を話すだけで自動で分類・記録されます。'}
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                style={{
                  ...styles.chatBubble,
                  alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                  backgroundColor:
                    m.sender === 'user' ? themeTokens.accent : themeTokens.cardSubtle,
                  border: m.sender === 'user' ? 'none' : `1px solid ${themeTokens.borderSubtle}`,
                }}
              >
                <div style={styles.bubbleSender}>
                  {m.sender === 'user' ? 'あなた' : 'TreNote AI'}
                </div>
                <div style={{ color: '#ffffff' }}>{m.text}</div>
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
              borderTop: `1px solid ${themeTokens.border}`,
            }}
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="テキストでも話しかけられます（例: ベンチ100kg10回3セット）"
              style={{
                flex: 1,
                backgroundColor: themeTokens.inputBg,
                border: `1px solid ${themeTokens.border}`,
                borderRadius: 8,
                padding: '8px 12px',
                color: themeTokens.text,
                fontSize: 13,
              }}
            />
            <button
              type="submit"
              disabled={!inputMessage.trim()}
              style={{
                backgroundColor: themeTokens.accent,
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

      {/* 3. 自動抽出データ (Extracted Data - TreNote Sync Preview) */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>
            <BookOpen size={16} color={themeTokens.primary} />
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
                <Droplets size={18} color="#4facfe" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={styles.dataCardTitle}>水分摂取</div>
                <div style={styles.dataCardDetails}>
                  +{wt.amount_ml} ml
                  {wt.has_caffeine ? '（カフェイン有）' : ''}
                </div>
              </div>
              <span style={{ ...styles.badge, backgroundColor: 'rgba(79, 172, 254, 0.15)', color: '#4facfe', borderColor: 'rgba(79, 172, 254, 0.3)' }}>
                水分
              </span>
            </div>
          ))}

          {/* Meals */}
          {extractedData.meals.map((m) => (
            <div key={m.id} style={styles.dataCard}>
              <div style={styles.dataCardIcon}>
                <Utensils size={18} color="#4cd964" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={styles.dataCardTitle}>{m.meal_name}</div>
                <div style={styles.dataCardDetails}>
                  {m.calories ? `${m.calories} kcal ` : ''}
                  {m.protein ? `(P: ${m.protein}g)` : ''}
                </div>
              </div>
              <span style={{ ...styles.badge, backgroundColor: 'rgba(76, 217, 100, 0.15)', color: '#4cd964', borderColor: 'rgba(76, 217, 100, 0.3)' }}>
                食事
              </span>
            </div>
          ))}

          {/* Daily Notes */}
          {extractedData.dailyNotes.map((n) => (
            <div key={n.id} style={styles.dataCard}>
              <div style={styles.dataCardIcon}>
                <BookOpen size={18} color="#a78bfa" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={styles.dataCardTitle}>デイリーノート</div>
                <div style={styles.dataCardDetails}>
                  {n.condition && `【体調】${n.condition}\n`}
                  {n.summary}
                </div>
              </div>
              <span style={{ ...styles.badge, backgroundColor: 'rgba(167, 139, 250, 0.15)', color: '#a78bfa', borderColor: 'rgba(167, 139, 250, 0.3)' }}>
                日記
              </span>
            </div>
          ))}

          {!hasData && (
            <div style={styles.emptyDataBox}>
              まだデータが記録されていません。音声でトレーニングや水分・食事の内容を伝えてみてください。
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
              opacity: hasData ? 1 : 0.4,
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
            <span>{copied ? '完了' : 'JSON'}</span>
          </button>
        </div>
      </div>

      {/* 4. 動作ログ (Debug Logs Footer Card) */}
      <div style={{ ...styles.card, marginTop: 4 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
          }}
          onClick={() => setShowDebugLogs(!showDebugLogs)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: themeTokens.textMuted }}>
            <span>🛠 リアルタイム動作ログ (最新{debugLogs.length}件)</span>
          </div>
          <span style={{ fontSize: 12, color: themeTokens.textMuted }}>
            {showDebugLogs ? '▲ 閉じる' : '▼ ログを表示'}
          </span>
        </div>

        {showDebugLogs && (
          <div
            style={{
              marginTop: 10,
              backgroundColor: themeTokens.background === '#000000' ? '#000000' : '#0a0a0a',
              borderRadius: 8,
              padding: '10px 12px',
              fontFamily: 'monospace',
              fontSize: 12,
              color: '#4cd964',
              border: `1px solid ${themeTokens.borderSubtle}`,
              maxHeight: 180,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            {debugLogs.length === 0 ? (
              <span style={{ color: themeTokens.textMuted }}>まだログはありません。「音声対話を開始」を押すとここにログが出ます。</span>
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

const getStyles = (colors: ThemeColors): { [key: string]: React.CSSProperties } => ({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    backgroundColor: colors.background,
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottom: `1px solid ${colors.border}`,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.cardSubtle,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(255, 107, 0, 0.4)',
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
  },
  categoryChipsRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: -4,
    marginBottom: 4,
  },
  categoryChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '4px 10px',
    borderRadius: 8,
    border: '1px solid',
    fontSize: 12,
    fontWeight: 600,
  },
  controlBanner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: '14px 18px',
    border: `1px solid ${colors.border}`,
  },
  statusSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: '50%',
  },
  statusLabel: {
    fontSize: 15,
    fontWeight: 600,
    color: colors.text,
  },
  voiceSelectWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  select: {
    backgroundColor: colors.inputBg,
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
    color: colors.text,
    padding: '4px 8px',
    fontSize: 12,
  },
  actionButtons: {
    display: 'flex',
    gap: 10,
  },
  connectButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.success,
    color: '#000000',
    border: 'none',
    borderRadius: 10,
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(76, 217, 100, 0.25)',
  },
  disconnectButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.danger,
    color: '#ffffff',
    border: 'none',
    borderRadius: 10,
    padding: '10px 18px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  muteButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: colors.text,
    border: `1px solid ${colors.border}`,
    borderRadius: 10,
    padding: '10px 16px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    border: `1px solid ${colors.border}`,
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: colors.text,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  cardDesc: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: 14,
  },
  clearButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'transparent',
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
    color: colors.textMuted,
    padding: '4px 8px',
    fontSize: 12,
    cursor: 'pointer',
  },
  chatLog: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginTop: 10,
    maxHeight: 240,
    overflowY: 'auto',
    paddingRight: 4,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    padding: '24px 16px',
    lineHeight: 1.6,
  },
  chatBubble: {
    maxWidth: '85%',
    padding: '10px 14px',
    borderRadius: 12,
    fontSize: 14,
    lineHeight: 1.4,
    color: colors.text,
  },
  bubbleSender: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: 600,
    marginBottom: 4,
  },
  extractedList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    maxHeight: 280,
    overflowY: 'auto',
    marginBottom: 14,
  },
  dataCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.cardSubtle,
    borderRadius: 10,
    padding: '10px 14px',
    border: `1px solid ${colors.borderSubtle}`,
  },
  dataCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dataCardTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.text,
  },
  dataCardDetails: {
    fontSize: 12,
    color: colors.textMuted,
    whiteSpace: 'pre-line',
  },
  badge: {
    fontSize: 11,
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    color: '#ff8c33',
    padding: '2px 8px',
    borderRadius: 6,
    fontWeight: 600,
    border: '1px solid rgba(255, 107, 0, 0.3)',
  },
  emptyDataBox: {
    textAlign: 'center',
    padding: '28px 16px',
    fontSize: 13,
    color: colors.textMuted,
    backgroundColor: colors.cardSubtle,
    borderRadius: 10,
    border: `1px dashed ${colors.border}`,
  },
  syncActionBox: {
    display: 'flex',
    gap: 10,
    paddingTop: 12,
    borderTop: `1px solid ${colors.border}`,
  },
  syncButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0284c7',
    color: '#ffffff',
    textDecoration: 'none',
    borderRadius: 10,
    padding: '12px 16px',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    textAlign: 'center',
  },
  copyButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.cardSubtle,
    color: colors.text,
    border: `1px solid ${colors.border}`,
    borderRadius: 10,
    padding: '12px 16px',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  },
});
