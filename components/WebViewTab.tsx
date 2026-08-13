import React, { useRef, useState, useEffect, useMemo, useImperativeHandle, forwardRef } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, AppState, AppStateStatus } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getInitialDataForWebView, handleWebViewMessage, syncWidgetPunches, addSyncDiagnosticLog } from '../src/services/lifelogSyncService';
import { useLifelogStore } from '../src/store/lifelogStore';
import { useAppTheme } from '../src/theme';

export interface WebViewTabRef {
  injectJavaScript: (script: string) => void;
}

interface WebViewTabProps {
  html: string;
  currentDate: string;
  onModalStateChange?: (visible: boolean) => void;
}

export const WebViewTab = React.memo(forwardRef<WebViewTabRef, WebViewTabProps>(({ html, currentDate, onModalStateChange }, ref) => {
  const { colors, backgroundTheme } = useAppTheme();
  const webViewRef = useRef<WebView>(null);
  const [initialData, setInitialData] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const waterLogs = useLifelogStore((state) => state.waterLogs);
  const timeLogs = useLifelogStore((state) => state.timeLogs);
  const habitItems = useLifelogStore((state) => state.habitItems);
  const habitLogs = useLifelogStore((state) => state.habitLogs);

  useImperativeHandle(ref, () => ({
    injectJavaScript: (script: string) => {
      webViewRef.current?.injectJavaScript(script);
    },
  }));

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
          window.__BACKGROUND_THEME__ = "${backgroundTheme}";
        })();
      </script>
    `;

    if (html.includes('<head>')) {
      return html.replace('<head>', `<head>\n${injectScript}`);
    }
    return injectScript + html;
  }, [html, initialData, backgroundTheme]);

  // Handle messages from the WebView
  const onMessage = async (event: any) => {
    try {
      console.log('[WebViewTab] onMessage raw data:', event.nativeEvent.data);
      const message = JSON.parse(event.nativeEvent.data);

      if (message.type === 'WEB_ERROR') {
        console.error(`[WebView JS Error]: ${message.message}`);
        addSyncDiagnosticLog(`[WEB_ERROR] ${message.message}`);
        return;
      }

      if (message.type === 'MODAL_STATE_CHANGE') {
        const { visible } = message;
        console.log(`[WebViewTab] MODAL_STATE_CHANGE visible=${visible}`);
        onModalStateChange?.(!!visible);
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
        addSyncDiagnosticLog(`[WebViewTab] LOCAL_STORAGE_SET key=${key}, len=${value ? value.length : 0}`);
        // Update database and store
        const responseValue = await handleWebViewMessage(key, value, currentDate);

        // If the service returns an updated value (e.g. for specific keys), inject it back
        if (responseValue) {
          const injectScript = `
            (function() {
              window.isInitialSync = true;
              localStorage.setItem('${key}', ${JSON.stringify(responseValue)});
              if (typeof loadData === 'function') loadData();
              if (typeof render === 'function') render();
              window.isInitialSync = false;
            })();
          `;
          webViewRef.current?.injectJavaScript(injectScript);
        }
      }
    } catch (e) {
      console.error('Error handling WebView message:', e);
      addSyncDiagnosticLog(`[WebViewTab Error] ${String(e)}`);
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
            var existing = [];
            try {
              var saved = localStorage.getItem('hydration_data_v1');
              if (saved) {
                existing = JSON.parse(saved) || [];
              }
            } catch (e) {
              console.warn('Failed to parse existing hydration data in sync:', e);
            }
            
            var targetDate = "${currentDate}";
            var filtered = existing.filter(function(item) {
              return item.date !== targetDate;
            });
            
            var newLogs = ${JSON.stringify(formattedLogs)};
            var merged = filtered.concat(newLogs);
            
            localStorage.setItem('hydration_data_v1', JSON.stringify(merged));
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
  }, [waterLogs, loading, currentDate]);

  // Sync database updates from React Native to WebView when timeLogs change
  useEffect(() => {
    if (webViewRef.current && !loading) {
      const timeLogsMap: Record<string, any> = {};
      timeLogs.forEach((row) => {
        const key = `${row.date}_${row.start_time}_${row.end_time}`;
        if (!timeLogsMap[key]) {
          timeLogsMap[key] = {
            id: row.id,
            date: row.date,
            start: row.start_time,
            end: row.end_time,
            rows: [],
          };
        }
        timeLogsMap[key].rows.push(row);
      });

      const formattedLogs = Object.values(timeLogsMap).map((group: any) => {
        const totalDuration = group.rows.reduce((sum: number, r: any) => sum + r.duration_minutes, 0);
        const items = group.rows.map((r: any) => {
          const percent = totalDuration > 0 ? Math.round((r.duration_minutes / totalDuration) * 100) : 100;
          return {
            name: r.activity_name,
            percent,
          };
        });
        return {
          id: group.id,
          date: group.date,
          start: group.start,
          end: group.end,
          items,
        };
      });

      const injectScript = `
        (function() {
          if (typeof localStorage !== 'undefined') {
            window.isInitialSync = true;
            localStorage.setItem('zikankanri_logs', ${JSON.stringify(JSON.stringify(formattedLogs))});
            if (typeof logs !== 'undefined') {
              try {
                logs = JSON.parse(localStorage.getItem('zikankanri_logs')) || [];
              } catch (e) {}
            }
            if (typeof renderLogs === 'function') {
              renderLogs();
            }
            if (typeof updateDefaultStartTime === 'function') {
              updateDefaultStartTime();
            }
            window.isInitialSync = false;
          }
        })();
      `;
      webViewRef.current.injectJavaScript(injectScript);
    }
  }, [timeLogs, loading]);

  // Sync database updates from React Native to WebView when habitItems change (habitLogs removed to prevent log corruption & flickering)
  useEffect(() => {
    if (webViewRef.current && !loading) {
      const formattedItems = habitItems.map((item) => ({
        id: String(item.id),
        name: item.name,
        color: item.color,
        createdAt: item.created_at,
      }));

      const injectScript = `
        (function() {
          if (typeof localStorage !== 'undefined') {
            window.isInitialSync = true;
            localStorage.setItem('habit-items', ${JSON.stringify(JSON.stringify(formattedItems))});
            if (typeof loadData === 'function') {
              loadData();
            }
            if (typeof render === 'function') {
              render();
            }
            window.isInitialSync = false;
          }
        })();
      `;
      webViewRef.current.injectJavaScript(injectScript);
    }
  }, [habitItems, loading]);

  // Handle AppState changes to sync widget punches automatically when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('[WebViewTab] App came to foreground, syncing widget punches...');
        await syncWidgetPunches(currentDate);
        if (currentDate) {
          await useLifelogStore.getState().loadTimeData(currentDate);
          await useLifelogStore.getState().loadWaterData(currentDate);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [currentDate]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
      {loading || !initialData ? (
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color="#4facfe" />
          <Text style={[styles.loadingText, { color: colors.text }]}>読み込み中...</Text>
        </View>
      ) : (
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: htmlWithData }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowFileAccess={true}
          onMessage={onMessage}
          style={[styles.webview, { backgroundColor: colors.background }]}
        />
      )}
    </SafeAreaView>
  );
}));

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
