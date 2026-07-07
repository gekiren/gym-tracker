import React, { useRef, useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getInitialDataForWebView, handleWebViewMessage } from '../src/services/lifelogSyncService';

interface WebViewTabProps {
  html: string;
  currentDate: string;
}

export const WebViewTab: React.FC<WebViewTabProps> = React.memo(({ html, currentDate }) => {
  const webViewRef = useRef<WebView>(null);
  const [initialData, setInitialData] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);

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

    const injectScript = `
      <script>
        (function() {
          window.__INITIAL_WEBVIEW_DATA__ = ${JSON.stringify(initialStorage)};
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
