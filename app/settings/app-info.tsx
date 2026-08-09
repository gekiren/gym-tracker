import { useEffect } from 'react';
import { router } from 'expo-router';

// このページはアカウント & アプリ情報ページに統合されました
export default function AppInfoRedirect() {
  useEffect(() => {
    router.replace('/settings/account' as any);
  }, []);
  return null;
}
