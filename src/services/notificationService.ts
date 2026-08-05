import * as Notifications from 'expo-notifications';
import { useWorkoutStore } from '../store/workoutStore';
import { scheduleRestTimer, cancelRestTimer } from '../utils/timer';
import i18n from '../i18n';

export const REST_TIMER_CATEGORY = 'WORKOUT_REST_TIMER';

export const ACTION_NEXT_SET = 'NEXT_SET';
export const ACTION_ADD_30S = 'ADD_30S';

/**
 * 通知アクションカテゴリの初期化
 */
export const initNotificationCategories = async () => {
  try {
    await Notifications.setNotificationCategoryAsync(REST_TIMER_CATEGORY, [
      {
        identifier: ACTION_NEXT_SET,
        buttonTitle: i18n.t('ui.notifications.action_next_set') || '次のセットへ',
        options: {
          isAuthenticationRequired: false,
          isDestructive: false,
        },
      },
      {
        identifier: ACTION_ADD_30S,
        buttonTitle: i18n.t('ui.notifications.action_add_30s') || '+30秒',
        options: {
          isAuthenticationRequired: false,
          isDestructive: false,
        },
      },
    ]);
    console.log('Notification categories initialized successfully.');
  } catch (error) {
    console.warn('Failed to set notification categories:', error);
  }
};

/**
 * バックグラウンド・腕元からの通知アクション応答リスナーをセットアップ
 */
export const setupNotificationResponseListener = (): (() => void) => {
  const subscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
    const { actionIdentifier } = response;

    if (actionIdentifier === ACTION_NEXT_SET) {
      console.log('Notification Action: Next Set pressed');
      const store = useWorkoutStore.getState();
      store.stopRestTimer();
      await cancelRestTimer();
    } else if (actionIdentifier === ACTION_ADD_30S) {
      console.log('Notification Action: Add 30s pressed');
      const store = useWorkoutStore.getState();
      const currentRemaining = store.restTimer.remaining;
      const newRemaining = (currentRemaining > 0 ? currentRemaining : 0) + 30;
      
      store.adjustRestTimer(30);
      await scheduleRestTimer(newRemaining);
    }
  });

  return () => {
    subscription.remove();
  };
};
