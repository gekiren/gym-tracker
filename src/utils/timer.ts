import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import i18n from '../i18n';

// Behavior for local notifications when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let activeRestTimerNotificationId: string | null = null;

export const scheduleRestTimer = async (seconds: number) => {
  // Request permissions if not granted
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.warn('Failed to get push token for push notification!');
    return;
  }

  // Cancel any existing rest timer notification specifically
  if (activeRestTimerNotificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(activeRestTimerNotificationId);
    } catch (e) {
      console.warn('Failed to cancel scheduled notification:', e);
    }
    activeRestTimerNotificationId = null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('rest-timer', {
      name: 'Rest Timer',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4facfe',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
    });
  }

  const triggerDate = new Date(Date.now() + seconds * 1000);

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: i18n.t('ui.notifications.rest_finished_title'),
      body: i18n.t('ui.notifications.rest_finished_body'),
      sound: true, // Default notification sound
      priority: Notifications.AndroidNotificationPriority.MAX,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      channelId: 'rest-timer',
    },
  });
  activeRestTimerNotificationId = id;

  return triggerDate;
};

export const cancelRestTimer = async () => {
  if (activeRestTimerNotificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(activeRestTimerNotificationId);
    } catch (e) {
      console.warn('Failed to cancel scheduled notification:', e);
    }
    activeRestTimerNotificationId = null;
  }
};
