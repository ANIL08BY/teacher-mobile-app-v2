import { Platform, ToastAndroid, Alert } from 'react-native';

// 15. HAFTA: PLATFORM SPESİFİK KODLAMA (Platform.OS ve Platform.select)
export const showNativeMessage = (message: string) => {
  Platform.select({
    ios: () => {
      // iOS sistemlerinde yerleşik Toast olmadığı için Apple'ın Native Alert yapısı tetiklenir
      Alert.alert('🍎 iOS Native Bildirim', message);
    },
    android: () => {
      // Android sistemlerinde doğrudan işletim sisteminin çekirdeğindeki Toast mesajı tetiklenir
      ToastAndroid.showWithGravity(
        `🤖 Android: ${message}`,
        ToastAndroid.SHORT,
        ToastAndroid.BOTTOM
      );
    },
    default: () => {
      Alert.alert('Sistem Mesajı', message);
    }
  })(); // Fonksiyonu anında çalıştırır
};

// Cihazın Hangi İşletim Sistemi Olduğunu Döndüren Yardımcı
export const getDevicePlatform = () => {
  return Platform.OS === 'ios' ? 'Apple iOS' : 'Google Android';
};