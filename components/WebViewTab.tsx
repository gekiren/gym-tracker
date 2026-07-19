import React, { useRef, useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getInitialDataForWebView, handleWebViewMessage } from '../src/services/lifelogSyncService';
import { useLifelogStore } from '../src/store/lifelogStore';

interface WebViewTabProps {
  html: string;
  currentDate: string;
}

export const WebViewTab: React.FC<WebViewTabProps> = React.memo(({ html, currentDate }) => {
  const webViewRef = useRef<WebView>(null);
  const [initialData, setInitialData] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const waterLogs = useLifelogStore((state) => state.waterLogs);

  // Load all initial data from SQLite
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const data = await getInitialDataForWebView();
        if (isMounted) {
          setInitialData(data);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load initial data for WebViewTab:', err);
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  // Inject initial data into the HTML string before rendering
  const htmlWithData = useMemo(() => {
    if (!initialData) return html;

    const initialStorage: Record<string, string> = {};
    Object.keys(initialData).forEach((key) => {
      const val = initialData[key];
      if (val !== undefined && val !== null) {
        initialStorage[key] = typeof val === 'string' ? val : JSON.stringify(val);
      }
    });

    const activeRoutineState = useLifelogStore.getState().activeRoutineState;
    const injectScript = `
      <script>
        (function() {
          window.__INITIAL_WEBVIEW_DATA__ = ${JSON.stringify(initialStorage)};
          window.__TARGET_DATE__ = "${currentDate}";
          window.__ACTIVE_ROUTINE_STATE__ = ${JSON.stringify(activeRoutineState)};
        })();
      </script>
    `;

    if (html.includes('<head>')) {
      return html.replace('<head>', `<head>\n${injectScript}`);
    }
    return injectScript + html;
  }, [html, initialData]);

  // Handle messages from the WebView
  const onMessage = async (event: any) => {
    try {
      console.log('[WebViewTab] onMessage raw data:', event.nativeEvent.data);
      const message = JSON.parse(event.nativeEvent.data);

      if (message.type === 'WEB_ERROR') {
        console.error(`[WebView JS Error]: ${message.message}`);
        return;
      }

      if (message.type === 'DATE_CHANGED') {
        const { date } = message;
        console.log(`[WebViewTab] DATE_CHANGED date=${date}`);
        await useLifelogStore.getState().setCurrentDate(date);
        return;
      }

      if (message.type === 'ROUTINE_STATE_CHANGE') {
        const { state } = message;
        console.log('[WebViewTab] ROUTINE_STATE_CHANGE state:', state);
        useLifelogStore.getState().setActiveRoutineState(state);
        return;
      }

      if (message.type === 'LOCAL_STORAGE_SET') {
        const { key, value } = message;
        console.log(`[WebViewTab] LOCAL_STORAGE_SET key=${key}, value length=${value ? value.length : 0}`);
        // Update database and store
        const responseValue = await handleWebViewMessage(key, value, currentDate);

        // If the service returns an updated list (e.g. for mapped habit-items IDs), inject it back!
        if (responseValue) {
          let updateAppScript = '';
          if (key === 'habit-items') {
            updateAppScript = `
              if (typeof loadData === 'function' && typeof render === 'function') {
                loadData();
                render();
              }
            `;
          }
          const injectScript = `
            (function() {
              window.isInitialSync = true;
              localStorage.setItem('${key}', ${JSON.stringify(responseValue)});
              ${updateAppScript}
              window.isInitialSync = false;
            })();
          `;
          webViewRef.current?.injectJavaScript(injectScript);
        }
      }
    } catch (e) {
      console.error('Error handling WebView message:', e);
    }
  };

  // Sync date changes from React Native to WebView
  useEffect(() => {
    if (webViewRef.current && !loading && initialData) {
      const injectScript = `
        (function() {
          window.__TARGET_DATE__ = "${currentDate}";
          
          // 1. Water Intake (Water.js)
          if (typeof state !== 'undefined' && state && typeof state.currentDate !== 'undefined') {
            state.currentDate = "${currentDate}";
            if (typeof updateUI === 'function') {
              updateUI();
            }
          }
          
          // 2. 24h Activity (ZikanKanri.js)
          var dateInput = document.getElementById('current-date');
          if (dateInput) {
            var formattedDate = "${currentDate}".replace(/\\//g, '-');
            if (dateInput.value !== formattedDate) {
              dateInput.value = formattedDate;
              dateInput.dispatchEvent(new Event('change'));
            }
          }
          
          // 3. Habit Counter (HabitCounter.js)
          if (typeof currentDateStr !== 'undefined') {
            currentDateStr = "${currentDate}";
            if (typeof render === 'function') {
              render();
            }
            if (typeof currentStatsDate !== 'undefined' && typeof parseDateStr === 'function') {
              currentStatsDate = parseDateStr(currentDateStr);
              if (typeof showStats === 'function' && typeof statsModal !== 'undefined' && !statsModal.classList.contains('hidden')) {
                showStats();
              }
            }
          }
          
          // 4. Routine Tracker (RoutineTracker.js)
          if (typeof loadRoutines === 'function') {
            loadRoutines();
          }
        })();
      `;
      webViewRef.current.injectJavaScript(injectScript);
    }
  }, [currentDate, loading, initialData]);

  // Sync database updates from React Native to WebView when waterLogs change
  useEffect(() => {
    if (webViewRef.current && !loading) {
      const formattedLogs = waterLogs.map((log) => ({
        id: log.timestamp,
        timestamp: log.timestamp,
        amount: log.amount,
        caffeine: log.caffeine || 0,
        date: log.date,
      }));
      const injectScript = `
        (function() {
          if (typeof localStorage !== 'undefined') {
            window.isInitialSync = true;
            localStorage.setItem('hydration_data_v1', ${JSON.stringify(JSON.stringify(formattedLogs))});
            if (typeof loadData === 'function' && typeof updateUI === 'function') {
              loadData();
              updateUI();
            }
            window.isInitialSync = false;
          }
        })();
      `;
      webViewRef.current.injectJavaScript(injectScript);
    }
  }, [waterLogs, loading]);

  if (loading || !initialData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0A84FF" />
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <WebView
        ref={webViewRef}
        source={{ html: htmlWithData }}
        originWhitelist={['*']}
        domStorageEnabled={true}
        javaScriptEnabled={true}
        allowFileAccess={true}
        onMessage={onMessage}
        style={styles.webview}
      />
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  webview: {
    flex: 1,
    backgroundColor: '#121212',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  loadingText: {
    marginTop: 10,
    color: '#e0e0e0',
    fontSize: 14,
  },
});
