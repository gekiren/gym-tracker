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
  version: '2.0.4',
  title: {
    ja: '🥗 ヘッダー表示 ＆ 写真のパン移動・ピンチズーム改善',
    en: '🥗 Header Layout & Photo Pan/Zoom Improvements',
  },
  notes: {
    ja: [
      '写真拡大画面およびギャラリー画面におけるヘッダーとステータスバーの重なり・裏透けを修正しました。',
      '全画面写真でのピンチズーム・ダブルタップ拡大後のドラッグ移動（パン表示）を両OSで滑らかに動作するよう改善しました。',
    ],
    en: [
      'Fixed header overlap and status bar area in photo viewer and gallery.',
      'Improved pinch zoom, double tap, and drag pan navigation for full-screen photo viewer on both Android and iOS.',
    ],
  },
};
