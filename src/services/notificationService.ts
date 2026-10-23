import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications should behave when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Initializes Android notification channels and requests permissions
 * so notifications appear as high-priority heads-up banners on mobile (like WhatsApp messages).
 */
export async function setupSystemNotifications(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('powersense-alerts', {
        name: 'PowerSense Smart Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#00E5FF',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });

      await Notifications.setNotificationChannelAsync('powersense-energy', {
        name: 'PowerSense Energy Updates',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 150, 150],
        lightColor: '#7C4DFF',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch (error) {
    console.warn('[NotificationService] setup error:', error);
    return false;
  }
}

/**
 * Triggers a native heads-up system notification in the phone's notification bar
 * even when viewing other apps or running in background/foreground.
 */
export async function triggerSystemNotification({
  title,
  message,
  type = 'alert',
  data = {},
}: {
  title: string;
  message: string;
  type?: 'alert' | 'warning' | 'info' | 'goal' | 'bill';
  data?: Record<string, any>;
}): Promise<string | null> {
  try {
    const isAlert = type === 'alert' || type === 'warning';
    const channelId = isAlert ? 'powersense-alerts' : 'powersense-energy';

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body: message,
        data: { ...data, type },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        badge: 1,
        ...(Platform.OS === 'android' ? { channelId } : {}),
      },
      trigger: null, // deliver immediately
    });

    return notificationId;
  } catch (error) {
    console.warn('[NotificationService] Failed to schedule notification:', error);
    return null;
  }
}
