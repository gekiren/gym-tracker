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
  version: '1.8.81',
  title: {
    ja: '🧬 体組成・骨格測定値の自動維持・永続化対応',
    en: '🧬 Body Measurements Persistence & Auto-Retention',
  },
  notes: {
    ja: [
      '体脂肪推定（首・ウエスト等）および生理的限界（手首・足首等）の入力数値を自動永続化し、画面切り替え・日付変更後も維持されるよう改善しました。',
    ],
    en: [
      'Persisted measurements for body fat estimation and muscular potential model across screens and dates.',
    ],
  },
};
