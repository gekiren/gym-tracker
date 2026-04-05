import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

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

  // Cancel any existing rest timer
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('rest-timer', {
      name: 'Rest Timer',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4facfe',
    });
  }

  // Schedule a new one
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "休憩終了！",
      body: "次のセットを始めましょう🔥",
      sound: true, // Default notification sound
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: seconds,
    },
  });

  return new Date(Date.now() + seconds * 1000);
};

export const cancelRestTimer = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};
