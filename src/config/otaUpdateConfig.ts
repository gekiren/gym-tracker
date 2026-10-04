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
  version: '2.3.16',
  title: {
    ja: '⏱️ ワークアウト：セット時間（動作時間）の記録修正',
    en: '⏱️ Workout: Fixed Set Work Duration Tracking',
  },
  notes: {
    ja: [
      '筋トレ種目において、1セット目の動作時間（セット時間）が2セット目以降にも同じ秒数として複製記録されてしまう不具合を修正しました。',
      '各セットごとにリアルタイムで計測された実際の動作時間が正確に個別記録されます。',
    ],
    en: [
      'Fixed an issue where the work duration of set 1 was duplicated across subsequent sets for strength exercises.',
      'Each set now independently and accurately records its own measured work duration.',
    ],
  },
};
