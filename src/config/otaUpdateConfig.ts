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
  version: '1.8.62',
  title: {
    ja: 'ライフログデータの絶対全消去防止ガード＆同期競合の完全修復',
    en: 'Lifelog Data Wipe Safety Guard & Sync Fix',
  },
  notes: {
    ja: [
      'WebView起動時の非同期競合バグの修正に加え、空データ受信による実データベースの誤削除を物理的に遮断する二重安全ガードを実装しました。',
      '栄養管理（食事ログ）の日付クエリ表記揺れ（YYYY-MM-DD / YYYY/MM/DD）の吸収処理およびタイムゾーン補正を強化しました。',
    ],
    en: [
      'Added strict safety guards to prevent accidental table wipes upon receiving empty data from WebViews.',
      'Enhanced nutrition date query matching to seamlessly handle hyphen and slash date formats.',
    ],
  },
};
