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
  version: '1.1.63', // OTA識別用のバージョン文字列
  title: {
    ja: '24時間管理の機能改善（同時進行の割合スライダー調整）',
    en: '24-hour Lifelog Enhanced (Simultaneous ratio slider)',
  },
  notes: {
    ja: [
      '同時進行モードにおける時間割合の入力を、スワイプで動かせるスライダー形式に変更しました。',
      '10%単位でスムーズに調整でき、操作中の行をタップ・ドラッグした際にも自動的にアクティブ行に切り替わります。',
    ],
    en: [
      'Changed the time ratio input in simultaneous mode to a swipeable slider format.',
      'Adjust smoothly in 10% steps, and the row automatically becomes active when you tap or drag the slider.',
    ]
  }
};
