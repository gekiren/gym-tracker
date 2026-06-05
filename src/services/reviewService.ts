import * as Linking from 'expo-linking';
import { Alert, Platform } from 'react-native';
import { getSettings, saveSetting, getDB } from '../db/database';

// expo-store-review はネイティブモジュールを静的にロードするため、バイナリ未ビルドの環境や
// EAS Update時のクラッシュを防ぐために try-catch を用いて動的に require します。
let StoreReview: any = null;
try {
  StoreReview = require('expo-store-review');
} catch (e) {
  console.warn('expo-store-review native module is not available in this binary', e);
}

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.gekirennomad.trenote';
// iOSのApp Store IDが取得できたら「YOUR_APP_ID」の部分を実際のIDに書き換えてください。
const APP_STORE_URL = 'https://apps.apple.com/app/idYOUR_APP_ID?action=write-review';
const FEEDBACK_MAIL = 'mailto:trenotesupport@gmail.com';

/**
 * 完了したワークアウト総数とレビュー表示フラグを確認し、条件を満たす場合にレビュー促進ダイアログをトリガーします。
 * (※SQLiteのデッドロックを防ぐため、トランザクション開始前のプレーンな文脈で呼び出してください)
 */
export const checkAndTriggerReviewFlow = async (): Promise<boolean> => {
  try {
    const db = getDB();
    // 1. ワークアウト総数を取得する
    const workoutCountRow = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM workouts');
    const workoutsCount = workoutCountRow ? workoutCountRow.count : 0;

    // 2. has_shown_review_prompt の値を取得する
    const settings = await getSettings();
    const hasShown = settings['has_shown_review_prompt'] === '1';

    if (hasShown) {
      return false;
    }

    // 3. 次回表示する閾値を取得（デフォルトは 10）
    const nextWorkoutCountStr = settings['review_prompt_next_workout_count'];
    const nextWorkoutCount = nextWorkoutCountStr ? parseInt(nextWorkoutCountStr, 10) : 10;

    // 4. 「ワークアウト総数が閾値以上」の場合のみダイアログを表示
    if (workoutsCount >= nextWorkoutCount) {
      showReviewDialog(workoutsCount);
      return true;
    }
  } catch (e) {
    console.error('Failed to execute checkAndTriggerReviewFlow', e);
  }
  return false;
};

/**
 * 第1段階（メイン質問）ダイアログを表示します。
 */
export const showReviewDialog = (currentWorkoutCount: number) => {
  Alert.alert(
    'TreNoteはいかがですか？',
    '',
    [
      {
        text: '⭕ 満足している！',
        onPress: async () => {
          // 満足/要望を選択した時点でフラグを1に更新して以降再表示を防ぐ
          try {
            await saveSetting('has_shown_review_prompt', '1');
          } catch (e) {
            console.error('Failed to update has_shown_review_prompt to 1', e);
          }
          showPositiveDialog();
        },
      },
      {
        text: '❌ 改善してほしい点がある',
        onPress: async () => {
          // 満足/要望を選択した時点でフラグを1に更新して以降再表示を防ぐ
          try {
            await saveSetting('has_shown_review_prompt', '1');
          } catch (e) {
            console.error('Failed to update has_shown_review_prompt to 1', e);
          }
          showNegativeDialog();
        },
      },
      {
        text: 'また今度',
        style: 'cancel',
        onPress: async () => {
          try {
            // また今度を選択された場合はさらに10回ワークアウト完了したときのみ再度表示する
            const nextCount = currentWorkoutCount + 10;
            await saveSetting('review_prompt_next_workout_count', String(nextCount));
          } catch (e) {
            console.error('Failed to update review_prompt_next_workout_count', e);
          }
        },
      },
    ],
    { cancelable: true }
  );
};

/**
 * 第2段階（ポジティブ分岐）ダイアログを表示します。
 */
const showPositiveDialog = () => {
  Alert.alert(
    'ありがとうございます！',
    '励みになりますのでストアで応援してください！',
    [
      {
        text: 'レビューする',
        onPress: async () => {
          try {
            // ネイティブのインアプレビューが利用可能な場合実行
            if (StoreReview && await StoreReview.isAvailableAsync()) {
              await StoreReview.requestReview();
            } else {
              // 非サポート端末の場合はブラウザ/外部アプリでストアを開く
              const url = Platform.OS === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;
              await Linking.openURL(url);
            }
          } catch (e) {
            console.warn('Failed to trigger in-app review, fallback to URL', e);
            const url = Platform.OS === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;
            try {
              await Linking.openURL(url);
            } catch (err) {
              console.error('Failed to open store review link via Linking', err);
            }
          }
        },
      },
      {
        text: '閉じる',
        style: 'cancel',
      },
    ],
    { cancelable: true }
  );
};

/**
 * 第2段階（ネガティブ分岐）ダイアログを表示します。
 */
const showNegativeDialog = () => {
  Alert.alert(
    'ご意見をお聞かせください',
    'ご不便をおかけしてすみません。直接開発者へご意見をお寄せください。',
    [
      {
        text: '意見を送る',
        onPress: async () => {
          try {
            await Linking.openURL(FEEDBACK_MAIL);
          } catch (e) {
            console.error('Failed to open mail client for feedback', e);
          }
        },
      },
      {
        text: '閉じる',
        style: 'cancel',
      },
    ],
    { cancelable: true }
  );
};
