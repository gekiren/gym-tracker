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
  version: '2.2.21',
  title: {
    ja: '🔧 セット時間・休憩時間の記録不具合修正',
    en: '🔧 Set & Rest Timer Fixes',
  },
  notes: {
    ja: [
      'セット完了チェック時にセット所要時間が「0秒」で記録・表示されてしまう不具合を修正しました。',
      '休憩時間およびセット時間の計測精度と表示を改善しました。',
    ],
    en: [
      'Fixed an issue where set work time was recorded as "0s" upon completing a set.',
      'Improved accuracy and display for set duration and rest timer tracking.',
    ],
  },
};
