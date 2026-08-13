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
  version: '1.8.56',
  title: {
    ja: 'AI通信バックデータログのクリップボードコピー機能の追加',
    en: 'Add Clipboard Copy Functionality for AI Debug Logs',
  },
  notes: {
    ja: [
      'AI食事解析や通信発生時のバックデータログをクリップボードにワンタップでコピーできる機能を追加しました。',
      '隠しデベロッパーメニューおよび食事解析画面から簡単にログを取得し共有可能になりました。',
    ],
    en: [
      'Added a feature to copy AI communication and debug logs to the clipboard with one tap.',
      'Easily export logs from the developer menu and meal analysis screens for AI sharing.',
    ],
  },
};
