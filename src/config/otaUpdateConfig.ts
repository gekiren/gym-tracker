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
  version: '1.0.56', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      'ワークアウト中に誤って追加した種目を、種目名の長押し、または左右へのスワイプ（ゴミ箱アイコンタップ）で削除できるようになりました。完了したセットがある場合は誤削除を防ぐために削除できません。'
    ],
    en: [
      'You can now delete mistakenly added exercises by long-pressing the exercise name or swiping it to reveal a trash icon. Exercises with completed sets cannot be deleted to prevent accidental loss.'
    ]
  }
};
