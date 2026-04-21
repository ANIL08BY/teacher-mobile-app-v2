import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export async function registerForPushNotificationsAsync() {
  let token;

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Bildirim izni verilmedi!');
      return;
    }

    // Hatanın çözümü burada: projectId'yi daha kapsamlı arıyoruz
    const projectId = 
      Constants?.expoConfig?.extra?.eas?.projectId ?? 
      Constants?.easConfig?.projectId ?? 
      "5ca70ce0-aa4d-4423-a458-ea855d2eb35f"; // Sizin app.json'daki ID'niz

    try {
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      console.log("FCM Token Alındı:", token);
    } catch (e) {
      console.error("Token alma hatası:", e);
    }
  } else {
    console.log('Fiziksel cihaz gerekli.');
  }
  
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return token;
}