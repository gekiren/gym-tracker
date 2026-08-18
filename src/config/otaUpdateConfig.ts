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
  version: '1.8.84',
  title: {
    ja: '🧬 測定値入力欄の文字削除・編集の不具合修正',
    en: '🧬 Measurement Input & Deletion Fix',
  },
  notes: {
    ja: [
      '測定値入力欄での文字削除およびリアルタイム編集がスムーズに行えるよう入力同期ループを修正しました。',
    ],
    en: [
      'Fixed input sync loop to allow smooth editing and character deletion in measurement fields.',
    ],
  },
};
