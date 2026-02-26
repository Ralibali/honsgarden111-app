import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Register for push notifications
export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  let token;
  
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Hönsgården',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#F59E0B',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted');
      return undefined;
    }
    
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      if (projectId) {
        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      } else {
        token = (await Notifications.getExpoPushTokenAsync()).data;
      }
    } catch (error) {
      console.error('Error getting push token:', error);
    }
  } else {
    console.log('Push notifications require a physical device');
  }

  return token;
}

// Schedule egg registration reminder
export async function scheduleEggReminder(hour: number = 17, minute: number = 0, enabled: boolean = true): Promise<string | undefined> {
  // Cancel existing egg reminders
  await cancelEggReminder();
  
  if (!enabled) return undefined;
  
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: '🥚 Dags att registrera ägg!',
      body: 'Glöm inte att logga dagens äggproduktion i Hönsgården.',
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: {
      hour,
      minute,
      repeats: true,
    },
  });
  
  return identifier;
}

// Cancel egg reminder
export async function cancelEggReminder(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of scheduled) {
    if (notification.content.title?.includes('ägg') || notification.content.title?.includes('egg')) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}

// Schedule health check reminder (weekly)
export async function scheduleHealthCheckReminder(dayOfWeek: number = 0, hour: number = 10, enabled: boolean = true): Promise<string | undefined> {
  await cancelHealthCheckReminder();
  
  if (!enabled) return undefined;
  
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: '🩺 Hälsokontroll',
      body: 'Dags att kontrollera dina hönors hälsa denna vecka.',
      sound: true,
    },
    trigger: {
      weekday: dayOfWeek + 1, // 1 = Sunday, 7 = Saturday
      hour,
      minute: 0,
      repeats: true,
    },
  });
  
  return identifier;
}

// Cancel health check reminder
export async function cancelHealthCheckReminder(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of scheduled) {
    if (notification.content.title?.includes('Hälso') || notification.content.title?.includes('Health')) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}

// Schedule hatching reminder (for specific date)
export async function scheduleHatchingReminder(hatchDate: Date, projectName: string): Promise<string | undefined> {
  // Schedule reminder 3 days before
  const threeDaysBefore = new Date(hatchDate);
  threeDaysBefore.setDate(threeDaysBefore.getDate() - 3);
  
  if (threeDaysBefore > new Date()) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🐣 Kläckning närmar sig!',
        body: `${projectName}: Endast 3 dagar kvar till kläckning.`,
        sound: true,
      },
      trigger: {
        date: threeDaysBefore,
      },
    });
  }
  
  // Schedule reminder 1 day before
  const oneDayBefore = new Date(hatchDate);
  oneDayBefore.setDate(oneDayBefore.getDate() - 1);
  
  if (oneDayBefore > new Date()) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🐣 Kläckning imorgon!',
        body: `${projectName}: Kläckning förväntas imorgon. Se till att allt är redo!`,
        sound: true,
      },
      trigger: {
        date: oneDayBefore,
      },
    });
  }
  
  // Schedule reminder on hatch day
  if (hatchDate > new Date()) {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🐣 Kläckningsdag!',
        body: `${projectName}: Idag är den stora dagen! Kolla dina ägg.`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        date: hatchDate,
      },
    });
    
    return identifier;
  }
  
  return undefined;
}

// Cancel all hatching reminders for a project
export async function cancelHatchingReminders(projectName: string): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of scheduled) {
    if (notification.content.body?.includes(projectName)) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}

// Send immediate test notification
export async function sendTestNotification(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🐔 Hönsgården',
      body: 'Push-notifikationer fungerar! Du får nu påminnelser.',
      sound: true,
    },
    trigger: null, // Immediate
  });
}

// Get all scheduled notifications
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  return await Notifications.getAllScheduledNotificationsAsync();
}

// Cancel all notifications
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Add notification listeners
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

export function addNotificationResponseReceivedListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}
