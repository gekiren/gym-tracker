export interface OTAUpdateConfig {
  version: string;
  title: {
    ja: string;
    en: string;
  };
  notes: {
    ja: string[];
    en: string[];
  };
}

export const CURRENT_OTA_CONFIG: OTAUpdateConfig = {
  version: '1.8.98',
  title: {
    ja: '🎙️ 音声AIアシスタントをダッシュボードに統合',
    en: '🎙️ Voice AI Assistant Integrated into Dashboard',
  },
  notes: {
    ja: [
      '音声AIアシスタント機能をアプリトップのダッシュボードに移設しました。水分・栄養・筋トレと同じ機能カードとして表示されます。',
      '設定画面の「機能管理」から音声AIアシスタントカードの表示/非表示を切り替えられるようになりました。',
    ],
    en: [
      'Voice AI Assistant has been moved to the main dashboard alongside water, nutrition, and workout cards.',
      'You can now toggle the Voice AI Assistant card visibility from Settings > Feature Management.',
    ],
  },
};
