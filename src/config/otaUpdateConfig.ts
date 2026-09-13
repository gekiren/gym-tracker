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
  version: '2.2.2',
  title: {
    ja: '⏱️ トレッドミル表示レイアウトの最適化',
    en: '⏱️ Treadmill Row Layout Optimization',
  },
  notes: {
    ja: [
      '時間ボタン内のカウントダウン表示が2行に折り返される不具合を修正し、1行で美しくセンタリングされるように調整しました。',
      'ヘッダーの「セット」列の改行を防止し、全体の表示バランスを改善しました。',
    ],
    en: [
      'Fixed 2-line text wrap inside treadmill timer button and aligned layout into a clean single row.',
      'Prevented header text wrapping and optimized table column widths.',
    ],
  },
};
