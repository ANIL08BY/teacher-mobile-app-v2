import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Alert, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Accelerometer } from 'expo-sensors';
import * as Battery from 'expo-battery';
import * as Network from 'expo-network';
import * as Location from 'expo-location';
import * as Brightness from 'expo-brightness';

export default function SensorsScreen() {
  const [networkState, setNetworkState] = useState<Network.NetworkState | null>(null);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isBatteryCharging, setIsBatteryCharging] = useState<boolean>(false);
  const [shakeCount, setShakeCount] = useState(0);
  const [motionData, setMotionData] = useState({ x: 0, y: 0, z: 0 });

  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [address, setAddress] = useState<string>('Aranıyor...');
  const [brightnessLevel, setBrightnessLevel] = useState<number | null>(null);

  useEffect(() => {
    const checkNetwork = async () => {
      const netStatus = await Network.getNetworkStateAsync();
      setNetworkState(netStatus);
    };
    checkNetwork();
    const networkInterval = setInterval(checkNetwork, 2000);

    const checkBattery = async () => {
      if (Platform.OS !== 'web') {
        const level = await Battery.getBatteryLevelAsync();
        const state = await Battery.getBatteryStateAsync();
        setBatteryLevel(level * 100); 
        setIsBatteryCharging(state === Battery.BatteryState.CHARGING);
      }
    };
    checkBattery();
    const batteryInterval = setInterval(checkBattery, 5000);

    Accelerometer.setUpdateInterval(500); 
    const subscription = Accelerometer.addListener(accelerometerData => {
      setMotionData(accelerometerData);
      const { x, y, z } = accelerometerData;
      const acceleration = Math.sqrt(x * x + y * y + z * z); 
      if (acceleration > 1.2) {
        setShakeCount(prev => prev + 1);
        Alert.alert("🚨 Sarsıntı Algılandı!", "Telefonu salladınız. Bu bir fiziksel kısayoldur.");
      }
    });

    const checkLocation = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setAddress('Konum izni reddedildi ❌');
        return;
      }

      try {
        let locationData = await Location.getCurrentPositionAsync({});
        setLocation(locationData);

        let reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: locationData.coords.latitude,
          longitude: locationData.coords.longitude
        });

        if (reverseGeocode.length > 0) {
          const place = reverseGeocode[0];
          setAddress(`${place.city || place.subregion || ''}, ${place.street || place.name || ''}`);
        } else {
          setAddress('Adres metne çevrilemedi.');
        }
      } catch (error) {
        setAddress('Konum alınamadı (Emülatörde GPS kapalı olabilir)');
      }
    };
    checkLocation();

    const checkBrightness = async () => {
      const { status } = await Brightness.requestPermissionsAsync();
      if (status === 'granted') {
        const currentBrightness = await Brightness.getBrightnessAsync();
        setBrightnessLevel(currentBrightness);
      }
    };
    checkBrightness();

    return () => {
      clearInterval(networkInterval);
      clearInterval(batteryInterval);
      subscription.remove();
    };
  }, []);

  const maximizeBrightness = async () => {
    try {
      await Brightness.setBrightnessAsync(1);
      setBrightnessLevel(1);
      Alert.alert("Parlaklık Artırıldı ☀️", "Ekran parlaklığı barkod/QR okutma işlemi için maksimum seviyeye getirildi!");
    } catch (error) {
      Alert.alert("Hata", "Parlaklık değiştirilemedi.");
    }
  };

  const isOffline = networkState && !networkState.isConnected;
  const isLowBattery = batteryLevel !== null && batteryLevel < 20 && !isBatteryCharging;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.headerTitle}>Donanım ve Sensörler</Text>
      <Text style={styles.subText}>Bu sayfa cihazdaki 5 farklı donanım verisini okur ve işler.</Text>

      <View style={[styles.card, styles.normalCard]}>
        <View style={styles.cardHeader}>
          <Ionicons name="location" size={28} color="#007AFF" />
          <Text style={styles.cardTitle}>GPS ve Konum</Text>
        </View>
        <Text style={styles.cardData}>
          Enlem: {location ? location.coords.latitude.toFixed(4) : "Bulunuyor..."}
        </Text>
        <Text style={styles.cardData}>
          Boylam: {location ? location.coords.longitude.toFixed(4) : "Bulunuyor..."}
        </Text>
        <Text style={[styles.cardData, { fontWeight: 'bold', marginTop: 5 }]}>
          📍 Yaklaşık Adres: {address}
        </Text>
        <Text style={styles.solutionText}>
          💡 Çözüm: Konum verisi, yeni öğretmen eklerken adres alanını otomatik doldurmak ve acil durumlarda okul nöbet bölgesini teyit etmek için kullanılır.
        </Text>
      </View>

      <View style={[styles.card, styles.normalCard]}>
        <View style={styles.cardHeader}>
          <Ionicons name="sunny" size={28} color="#FFD700" />
          <Text style={styles.cardTitle}>Ekran Parlaklığı</Text>
        </View>
        <Text style={styles.cardData}>
          Mevcut Seviye: {brightnessLevel !== null ? `%${(brightnessLevel * 100).toFixed(0)}` : "Okunuyor..."}
        </Text>
        <Text style={styles.solutionText}>
          💡 Çözüm: Turnikelerden geçerken veya dijital öğretmen kimliğini okuturken ekranın tam parlak olması gerekir.
        </Text>
        
        <Pressable style={styles.actionBtn} onPress={maximizeBrightness}>
          <Ionicons name="barcode-outline" size={20} color="white" style={{ marginRight: 8 }} />
          <Text style={styles.btnText}>QR Okutmak İçin Parlaklığı Fulle</Text>
        </Pressable>
      </View>

      <View style={[styles.card, isOffline ? styles.warningCard : styles.successCard]}>
        <View style={styles.cardHeader}>
          <Ionicons name={isOffline ? "wifi-outline" : "wifi"} size={28} color={isOffline ? "#FF3B30" : "#34C759"} />
          <Text style={styles.cardTitle}>Ağ Bağlantısı</Text>
        </View>
        <Text style={styles.cardData}>Durum: {networkState?.isConnected ? "Bağlı" : "Çevrimdışı"}</Text>
        <Text style={styles.cardData}>İnternet Erişimi: {networkState?.isInternetReachable ? "Var" : "Yok"}</Text>
        {isOffline && (
          <Text style={styles.solutionText}>
            💡 Çözüm: Çevrimdışı moda geçildi. Değişiklikler AsyncStorage'a kaydedilecek.
          </Text>
        )}
      </View>

      <View style={[styles.card, isLowBattery ? styles.warningCard : styles.normalCard]}>
        <View style={styles.cardHeader}>
          <Ionicons name={isBatteryCharging ? "battery-charging" : (isLowBattery ? "battery-dead" : "battery-full")} size={28} color={isLowBattery ? "#FF3B30" : "#007AFF"} />
          <Text style={styles.cardTitle}>Batarya Durumu</Text>
        </View>
        <Text style={styles.cardData}>Seviye: {batteryLevel !== null ? `%${batteryLevel.toFixed(0)}` : "Okunuyor..."}</Text>
        <Text style={styles.cardData}>Şarjda mı?: {isBatteryCharging ? "Evet ⚡" : "Hayır"}</Text>
        {isLowBattery && (
          <Text style={styles.solutionText}>
            💡 Çözüm: Şarjınız çok düşük! Arka plan senkronizasyonları durduruldu.
          </Text>
        )}
      </View>

      <View style={[styles.card, styles.normalCard, { marginBottom: 40 }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="phone-portrait-outline" size={28} color="#FF9500" />
          <Text style={styles.cardTitle}>İvmeölçer (Accelerometer)</Text>
        </View>
        <Text style={styles.cardData}>X: {motionData.x.toFixed(2)} | Y: {motionData.y.toFixed(2)} | Z: {motionData.z.toFixed(2)}</Text>
        
        <View style={styles.divider} />
        <Text style={styles.solutionText}>
          💡 Çözüm (Kısayol): Verileri yenilemek veya acil menüsünü açmak için cihazı şiddetli sallayın! 
        </Text>
        <Text style={[styles.cardData, { marginTop: 5 }]}>Sallama Sayısı: {shakeCount}</Text>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: '#f0f2f5' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  subText: { fontSize: 14, color: '#666', marginBottom: 20 },
  card: { padding: 15, borderRadius: 12, marginBottom: 15, elevation: 3 },
  normalCard: { backgroundColor: 'white' },
  successCard: { backgroundColor: '#F0FFF0', borderColor: '#34C759', borderWidth: 1 },
  warningCard: { backgroundColor: '#FFF0F0', borderColor: '#FF3B30', borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 10, color: '#333' },
  cardData: { fontSize: 16, color: '#555', marginBottom: 4 },
  solutionText: { marginTop: 10, padding: 10, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 8, color: '#333', fontStyle: 'italic', fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
  actionBtn: { flexDirection: 'row', backgroundColor: '#34C759', padding: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 14 }
});