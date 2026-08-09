import { useEffect } from 'react';
import { router } from 'expo-router';

/**
 * このページは旧Obsidian設定画面です。
 * 「データ出力 & Obsidian連携」画面（/settings/export）に統合されました。
 * 古いナビゲーションからアクセスされた場合に備えて、自動リダイレクトします。
 */
export default function ObsidianRedirect() {
  useEffect(() => {
    router.replace('/settings/export' as any);
  }, []);

  return null;
}
