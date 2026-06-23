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
  version: '1.1.4', // OTA識別用のバージョン文字列
  title: {
    ja: '種目詳細画面の1RM推移グラフ追加',
    en: 'Added Est. 1RM Chart to Exercise Details',
  },
  notes: {
    ja: [
      '種目詳細画面のグラフにおいて、これまでの「総ボリューム」に加えて「推定1RM最大値」の推移グラフを切り替えて表示できる機能を追加しました。',
      '「推定1RM」タブに切り替えることで、日・週・月ごとの最大1RMの成長履歴を確認できます。',
    ],
    en: [
      'Added an option to view the "Estimated 1RM Max" progression chart in addition to the "Total Volume" chart on the exercise details screen.',
      'Switching to the "Est. 1RM" tab allows you to check your maximum 1RM growth history by day, week, or month.',
    ]
  }
};
