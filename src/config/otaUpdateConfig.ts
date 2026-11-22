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
  version: '2.3.60',
  title: {
    ja: '⚙️ セット追加時のスタンス設定を追加',
    en: '⚙️ Added Set Stance Inheritance Setting',
  },
  notes: {
    ja: [
      'ワークアウト設定に、セット追加時のスタンスを「デフォルトスタンス固定」または「一つ前のセットと同じ」から選べる設定を追加しました。',
      '種目追加時に前のワークアウトのスタンスを引き継がず、種目のデフォルトスタンスが適用されるように改善しました。',
    ],
    en: [
      'Added a workout setting to choose whether newly added sets use the exercise\'s fixed default stance or match the previous set\'s stance.',
      'Updated exercise initialization so stances from previous workouts are no longer carried over; the exercise\'s default stance is applied instead.',
    ],
  },
};
