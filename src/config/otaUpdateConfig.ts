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
  version: '2.0.26',
  title: {
    ja: '💎 ポイント獲得通知のトースト化（自動消去）',
    en: '💎 Point Award Toast Notification',
  },
  notes: {
    ja: [
      '機能解放などに使えるPポイントを獲得した際、OKボタンを押さなくても画面上部にアプリ通知風トーストが表示され、約2.5秒で自動的に消えるようになりました。',
      '全画面を遮断することなく、記録画面やワークアウト中などアプリ内のどこでも快適にポイント獲得を確認できます。',
    ],
    en: [
      'Point award notices now appear as non-blocking toast notifications at the top of the screen and automatically dismiss after 2.5 seconds without needing to press OK.',
      'Seamlessly track earned points anywhere in the app without interrupting your workout or logging workflow.',
    ],
  },
};
