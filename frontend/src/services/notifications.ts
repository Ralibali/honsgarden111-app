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

// Schedule daily chores reminder
export async function scheduleDailyChoresReminder(hour: number = 7, minute: number = 30, enabled: boolean = true): Promise<string | undefined> {
  // Cancel existing chores reminders
  await cancelDailyChoresReminder();
  
  if (!enabled) return undefined;
  
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: '🐔 God morgon från Hönsgården!',
      body: 'Dags att kolla in dagens sysslor. Dina hönor väntar på dig!',
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

// Cancel daily chores reminder
export async function cancelDailyChoresReminder(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of scheduled) {
    if (notification.content.title?.includes('God morgon') || notification.content.title?.includes('sysslor')) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}

// Get all scheduled notifications
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  return await Notifications.getAllScheduledNotificationsAsync();
}

// Cancel all notifications
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ============ SMART NOTIFICATIONS ============

// Send immediate notification for achievements/warnings/updates
export async function sendSmartNotification(
  type: 'achievement' | 'warning' | 'celebration' | 'tip' | 'trend_up' | 'trend_down' | 'milestone',
  title: string,
  body: string
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      priority: type === 'warning' 
        ? Notifications.AndroidNotificationPriority.HIGH 
        : Notifications.AndroidNotificationPriority.DEFAULT,
    },
    trigger: null, // Immediate
  });
}

// Pre-defined smart notifications
export const SmartNotifications = {
  // ACHIEVEMENTS & MILESTONES
  firstEgg: () => sendSmartNotification(
    'celebration',
    '🎉 Första ägget!',
    'Grattis! Du har registrerat ditt första ägg i Hönsgården!'
  ),
  
  eggMilestone: (count: number) => sendSmartNotification(
    'milestone',
    `🏆 ${count} ägg!`,
    `Fantastiskt! Du har nu samlat totalt ${count} ägg. Fortsätt så!`
  ),
  
  weekStreak: (weeks: number) => sendSmartNotification(
    'achievement',
    `🔥 ${weeks} veckors streak!`,
    `Du har registrerat ägg varje dag i ${weeks} veckor. Imponerande!`
  ),
  
  perfectDay: (eggCount: number, henCount: number) => sendSmartNotification(
    'celebration',
    '⭐ Perfekt dag!',
    `Alla ${henCount} hönor värpte idag! ${eggCount} ägg totalt.`
  ),
  
  newRecord: (eggCount: number) => sendSmartNotification(
    'celebration',
    '🎊 Nytt rekord!',
    `${eggCount} ägg idag - ditt bästa resultat någonsin!`
  ),

  // POSITIVE TRENDS
  productionUp: (percent: number) => sendSmartNotification(
    'trend_up',
    '📈 Produktionen ökar!',
    `Äggproduktionen har ökat med ${percent}% senaste veckan. Bra jobbat!`
  ),
  
  healthyFlock: () => sendSmartNotification(
    'celebration',
    '💚 Frisk flock!',
    'Alla dina hönor verkar vara vid god hälsa. Fortsätt med den goda omsorgen!'
  ),
  
  profitUp: (amount: number) => sendSmartNotification(
    'trend_up',
    '💰 Ekonomin går uppåt!',
    `Din vinst har ökat med ${amount} kr denna månad. Snyggt!`
  ),

  // WARNINGS & ALERTS
  productionDown: (percent: number) => sendSmartNotification(
    'warning',
    '📉 Minskad produktion',
    `Äggproduktionen har minskat med ${percent}% senaste veckan. Kolla om allt är okej med hönorna.`
  ),
  
  noEggsToday: () => sendSmartNotification(
    'warning',
    '🥚 Inga ägg idag?',
    'Du har inte registrerat några ägg idag. Glömde du, eller är något fel?'
  ),
  
  henNotLaying: (henName: string, days: number) => sendSmartNotification(
    'warning',
    `⚠️ ${henName} värper inte`,
    `${henName} har inte värpt på ${days} dagar. Det kan vara värt att kolla upp.`
  ),
  
  lowProductivity: (henName: string) => sendSmartNotification(
    'warning',
    `📊 Låg produktivitet`,
    `${henName} har haft låg äggproduktion på sistone. Kanske dags för en hälsokoll?`
  ),
  
  expensesHigh: () => sendSmartNotification(
    'warning',
    '💸 Höga utgifter',
    'Dina utgifter för hönsgården är högre än vanligt denna månad.'
  ),

  // TIPS & REMINDERS
  seasonalTip: (tip: string) => sendSmartNotification(
    'tip',
    '💡 Säsongstips',
    tip
  ),
  
  weatherWarning: (message: string) => sendSmartNotification(
    'warning',
    '🌡️ Vädervarning',
    message
  ),
  
  // ENCOURAGEMENT
  keepGoing: () => sendSmartNotification(
    'tip',
    '🌟 Du gör det bra!',
    'Dina hönor har det fint tack vare din omsorg. Fortsätt så!'
  ),
  
  comeBack: (days: number) => sendSmartNotification(
    'tip',
    '🐔 Vi saknar dig!',
    `Det var ${days} dagar sedan du senast besökte Hönsgården. Dina hönor väntar!`
  ),
};

// Check and send smart notifications based on data
export async function checkAndSendSmartNotifications(data: {
  todayEggs?: number;
  yesterdayEggs?: number;
  weekAverage?: number;
  lastWeekAverage?: number;
  totalEggs?: number;
  henCount?: number;
  hensLaying?: number;
  monthlyProfit?: number;
  lastMonthProfit?: number;
  daysWithoutVisit?: number;
  newRecord?: boolean;
}): Promise<void> {
  const {
    todayEggs = 0,
    yesterdayEggs = 0,
    weekAverage = 0,
    lastWeekAverage = 0,
    totalEggs = 0,
    henCount = 0,
    hensLaying = 0,
    monthlyProfit,
    lastMonthProfit,
    daysWithoutVisit = 0,
    newRecord = false,
  } = data;

  // New record!
  if (newRecord && todayEggs > 0) {
    await SmartNotifications.newRecord(todayEggs);
    return; // Don't spam with multiple notifications
  }

  // Perfect day - all hens laid
  if (henCount > 0 && hensLaying === henCount && todayEggs >= henCount) {
    await SmartNotifications.perfectDay(todayEggs, henCount);
    return;
  }

  // Egg milestones
  const milestones = [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
  for (const milestone of milestones) {
    if (totalEggs >= milestone && totalEggs - todayEggs < milestone) {
      await SmartNotifications.eggMilestone(milestone);
      return;
    }
  }

  // Production trends
  if (lastWeekAverage > 0 && weekAverage > 0) {
    const percentChange = ((weekAverage - lastWeekAverage) / lastWeekAverage) * 100;
    
    if (percentChange >= 15) {
      await SmartNotifications.productionUp(Math.round(percentChange));
      return;
    } else if (percentChange <= -20) {
      await SmartNotifications.productionDown(Math.round(Math.abs(percentChange)));
      return;
    }
  }

  // Profit trends
  if (monthlyProfit !== undefined && lastMonthProfit !== undefined) {
    const profitIncrease = monthlyProfit - lastMonthProfit;
    if (profitIncrease > 100) {
      await SmartNotifications.profitUp(profitIncrease);
      return;
    } else if (monthlyProfit < -200 && lastMonthProfit >= 0) {
      await SmartNotifications.expensesHigh();
      return;
    }
  }

  // Come back reminder
  if (daysWithoutVisit >= 3) {
    await SmartNotifications.comeBack(daysWithoutVisit);
    return;
  }

  // Random encouragement (10% chance when nothing else triggers)
  if (Math.random() < 0.1 && todayEggs > 0) {
    await SmartNotifications.keepGoing();
  }
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
