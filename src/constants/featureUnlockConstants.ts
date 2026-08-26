import { FeatureId } from '../store/settingsStore';
import { Ionicons } from '@expo/vector-icons';

export interface FeatureUnlockMeta {
  id: FeatureId;
  title: string;
  shortDesc: string;
  fullDesc: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  badgeColor: string;
  route: string;
}

export const ALL_FEATURE_IDS: FeatureId[] = [
  'workout',
  'water',
  'nutrition',
  'body',
  'routine',
  'habit',
  'zikan',
  'voice_ai',
];

export const FEATURE_UNLOCK_METAS: Record<FeatureId, FeatureUnlockMeta> = {
  workout: {
    id: 'workout',
    title: '筋トレ記録',
    shortDesc: 'ワークアウトの記録・タイマー・履歴',
    fullDesc: '日々の筋トレの重量・回数・セット数を記録し、インターバルタイマーや過去ログを追跡します。',
    icon: 'barbell',
    iconColor: '#4facfe',
    badgeColor: 'rgba(79, 172, 254, 0.15)',
    route: '/(tabs)',
  },
  water: {
    id: 'water',
    title: '水分＆カフェイン管理',
    shortDesc: '毎日の水分摂取・カフェイン量の記録',
    fullDesc: 'ワンタップで水分補給とカフェイン摂取を記録し、1日の目標達成度を可視化します。',
    icon: 'water',
    iconColor: '#00d2ff',
    badgeColor: 'rgba(0, 210, 255, 0.15)',
    route: '/lifelog/water',
  },
  nutrition: {
    id: 'nutrition',
    title: '栄養＆食事管理',
    shortDesc: 'カロリーおよびPFCバランスの記録',
    fullDesc: '食事のカロリー、タンパク質・脂質・炭水化物を記録し、理想の体づくりを食事面からサポートします。',
    icon: 'restaurant',
    iconColor: '#10b981',
    badgeColor: 'rgba(16, 185, 129, 0.15)',
    route: '/lifelog/nutrition',
  },
  body: {
    id: 'body',
    title: '体組成＆筋肥大限界',
    shortDesc: '体重・体脂肪率・骨格限界モデルの追跡',
    fullDesc: '体重や体脂肪率の推移を記録し、手首・足首サイズから遺伝的・骨格的な筋肉成長限界を診断します。',
    icon: 'body',
    iconColor: '#38bdf8',
    badgeColor: 'rgba(56, 189, 248, 0.15)',
    route: '/lifelog/body',
  },
  routine: {
    id: 'routine',
    title: 'ルーティン管理',
    shortDesc: '日々のルーティンの達成記録',
    fullDesc: '朝の習慣やトレーニング前後の日課など、日々のルーティンをチェック形式で確実に達成します。',
    icon: 'repeat',
    iconColor: '#4caf50',
    badgeColor: 'rgba(76, 175, 80, 0.15)',
    route: '/lifelog/routine',
  },
  habit: {
    id: 'habit',
    title: '習慣カウンター',
    shortDesc: '日々の習慣・行動のタップカウントと継続記録',
    fullDesc: 'プロテイン摂取やストレッチなど、継続したい行動をワンタップでカウントして習慣化します。',
    icon: 'checkmark-circle',
    iconColor: '#e91e63',
    badgeColor: 'rgba(233, 30, 99, 0.15)',
    route: '/lifelog/habit',
  },
  zikan: {
    id: 'zikan',
    title: '24時間管理',
    shortDesc: '1日の時間内訳・行動ログ',
    fullDesc: '睡眠、仕事、トレーニングなど、24時間の時間の使い方をブロック単位で記録・分析します。',
    icon: 'time',
    iconColor: '#ff9800',
    badgeColor: 'rgba(255, 152, 0, 0.15)',
    route: '/lifelog/zikan',
  },
  voice_ai: {
    id: 'voice_ai',
    title: '音声AIアシスタント',
    shortDesc: 'Gemini Live による音声リアルタイム対話・自動記録',
    fullDesc: '話しかけるだけでトレーニングや食事、水分を自動記録。最先端AIと音声でリアルタイムに対話できます。',
    icon: 'mic',
    iconColor: '#64b4ff',
    badgeColor: 'rgba(100, 180, 255, 0.15)',
    route: '/lifelog/voice-assistant',
  },
};

// 機能アンロックに必要なポイント設定（アンロック済み機能数に応じたコスト）
// 2つ解放済み(次3つ目): 10P, 4つ目: 15P, 5つ目: 20P, 6つ目: 25P, 7つ目: 30P, 8つ目: 35P
export const UNLOCK_COSTS: Record<number, number> = {
  2: 10,
  3: 15,
  4: 20,
  5: 25,
  6: 30,
  7: 35,
};

export const getUnlockCost = (currentUnlockedCount: number): number => {
  return UNLOCK_COSTS[currentUnlockedCount] || 35;
};

// ポイント獲得設定
export const POINT_REWARDS = {
  INITIAL_BONUS: 5,        // 初期ボーナス
  FIRST_RECORD_BONUS: 5,   // 各機能の初回記録
  DAILY_RECORD_BONUS: 1,   // 各機能の1日1回記録
  WORKOUT_COMPLETE: 2,     // ワークアウト完了
};

// ポイント消費設定
export const POINT_COSTS = {
  AI_VOICE_PER_USE: 1,     // 音声AIアシスタント1回利用
  AI_COACH_PER_USE: 1,     // AI Coach 1回利用
};
